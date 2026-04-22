#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(workspaceDir, '..');
const rootEnvPath = path.resolve(repoRoot, '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const DEFAULT_LIMIT = 0;

function getEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    email: undefined,
    limit: DEFAULT_LIMIT,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--email') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--email requires a value.');
      }
      args.email = value.trim().toLowerCase();
      index += 1;
      continue;
    }

    if (token === '--limit') {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('--limit must be a non-negative integer.');
      }
      args.limit = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function buildUserMetadata(user) {
  const metadata = {};

  if (user.display_name) {
    metadata.display_name = user.display_name;
  }

  if (user.avatar_url) {
    metadata.avatar_url = user.avatar_url;
  }

  if (user.role) {
    metadata.role = user.role;
  }

  metadata.is_active = user.is_active !== false;
  metadata.legacy_user_id = user.id;
  return metadata;
}

function buildAppMetadata(user) {
  const metadata = {
    legacy_user_id: user.id,
    legacy_auth_provider: user.auth_provider,
  };

  if (user.google_id) {
    metadata.legacy_google_id = user.google_id;
  }

  return metadata;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

const args = parseArgs(process.argv);
const supabaseUrl = getEnvValue('SUPABASE_URL');
const supabaseServiceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');
const databaseUrl = getEnvValue('DATABASE_POOLER_URL', 'DATABASE_URL');

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
}

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DATABASE_POOLER_URL is required.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

try {
  const usersQuery = args.email
    ? sql`
        select
          "id",
          "email",
          "password_hash",
          "auth_provider",
          "google_id",
          "display_name",
          "avatar_url",
          "role",
          "is_active",
          "auth_user_id"
        from "identity"."users"
        where lower("email") = ${args.email}
        order by "created_at" asc
        ${args.limit > 0 ? sql`limit ${args.limit}` : sql``}
      `
    : sql`
        select
          "id",
          "email",
          "password_hash",
          "auth_provider",
          "google_id",
          "display_name",
          "avatar_url",
          "role",
          "is_active",
          "auth_user_id"
        from "identity"."users"
        order by "created_at" asc
        ${args.limit > 0 ? sql`limit ${args.limit}` : sql``}
      `;

  const appUsers = await usersQuery;
  const stats = {
    processed: 0,
    linkedExisting: 0,
    createdAuthUsers: 0,
    alreadyLinked: 0,
  };

  for (const user of appUsers) {
    stats.processed += 1;

    let authUser = null;

    if (user.auth_user_id) {
      const [existingById] = await sql`
        select "id", "email"
        from "auth"."users"
        where "id" = ${user.auth_user_id}::uuid
        limit 1
      `;

      if (existingById) {
        authUser = existingById;
      }
    }

    if (!authUser) {
      const [existingByEmail] = await sql`
        select "id", "email"
        from "auth"."users"
        where lower("email") = ${normalizeEmail(user.email)}
        limit 1
      `;

      if (existingByEmail) {
        authUser = existingByEmail;
      }
    }

    if (authUser) {
      if (user.auth_user_id === authUser.id) {
        stats.alreadyLinked += 1;
        continue;
      }

      if (!args.dryRun) {
        await sql`
          update "identity"."users"
          set "auth_user_id" = ${authUser.id}::uuid,
              "updated_at" = now()
          where "id" = ${user.id}::uuid
        `;
      }

      stats.linkedExisting += 1;
      continue;
    }

    const createUserAttributes = {
      email: user.email,
      email_confirm: true,
      user_metadata: buildUserMetadata(user),
      app_metadata: buildAppMetadata(user),
      ...(user.password_hash ? { password_hash: user.password_hash } : {}),
    };

    if (args.dryRun) {
      stats.createdAuthUsers += 1;
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser(createUserAttributes);

    if (error) {
      throw new Error(`Failed to create Supabase auth user for ${user.email}: ${error.message}`);
    }

    const createdAuthUserId = data.user?.id;
    if (!createdAuthUserId) {
      throw new Error(`Supabase auth user creation for ${user.email} did not return a user id.`);
    }

    await sql`
      update "identity"."users"
      set "auth_user_id" = ${createdAuthUserId}::uuid,
          "updated_at" = now()
      where "id" = ${user.id}::uuid
    `;

    stats.createdAuthUsers += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        filterEmail: args.email ?? null,
        limit: args.limit,
        stats,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 5 }).catch(() => undefined);
}
