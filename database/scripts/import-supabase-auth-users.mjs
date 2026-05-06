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

  metadata.is_active = user.is_active !== false;
  metadata.legacy_user_id = user.id;
  return metadata;
}

function buildAppMetadata(user) {
  const roleNames = normalizeRoleNames(user);
  const metadata = {
    legacy_user_id: user.id,
    legacy_auth_provider: user.auth_provider,
    role: roleNames[0] ?? user.role ?? 'citizen',
    roles: roleNames,
  };

  if (user.google_id) {
    metadata.legacy_google_id = user.google_id;
  }

  return metadata;
}

function normalizeRoleNames(user) {
  const rawRoleNames = Array.isArray(user.role_names) ? user.role_names : [];
  const normalizedRoleNames = [];
  const seenRoleNames = new Set();

  for (const roleName of [user.role, ...rawRoleNames]) {
    if (typeof roleName !== 'string') {
      continue;
    }

    const normalizedRoleName = roleName.trim().toLowerCase();
    if (!normalizedRoleName || seenRoleNames.has(normalizedRoleName)) {
      continue;
    }

    seenRoleNames.add(normalizedRoleName);
    normalizedRoleNames.push(normalizedRoleName);
  }

  return normalizedRoleNames.length > 0 ? normalizedRoleNames : ['citizen'];
}

async function syncSupabaseAppMetadata(authUserId, user) {
  const { data, error } = await supabase.auth.admin.getUserById(authUserId);
  if (error) {
    throw new Error(`Failed to read Supabase auth user ${authUserId}: ${error.message}`);
  }

  const currentAppMetadata =
    data.user?.app_metadata && typeof data.user.app_metadata === 'object'
      ? data.user.app_metadata
      : {};
  const nextAppMetadata = {
    ...currentAppMetadata,
    ...buildAppMetadata(user),
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: nextAppMetadata,
  });
  if (updateError) {
    throw new Error(`Failed to update Supabase app_metadata for ${user.email}: ${updateError.message}`);
  }
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
          "identity"."users"."id",
          "identity"."users"."email",
          "identity"."users"."password_hash",
          "identity"."users"."auth_provider",
          "identity"."users"."google_id",
          "identity"."users"."display_name",
          "identity"."users"."avatar_url",
          "identity"."users"."role",
          "identity"."users"."is_active",
          "identity"."users"."auth_user_id",
          coalesce(
            array_agg(distinct "roles"."name") filter (where "roles"."name" is not null),
            array[]::text[]
          ) as "role_names"
        from "identity"."users"
        left join "identity"."user_roles" on "identity"."user_roles"."user_id" = "identity"."users"."id"
        left join "identity"."roles" on "identity"."roles"."id" = "identity"."user_roles"."role_id"
        where lower("identity"."users"."email") = ${args.email}
        group by "identity"."users"."id"
        order by "identity"."users"."created_at" asc
        ${args.limit > 0 ? sql`limit ${args.limit}` : sql``}
      `
    : sql`
        select
          "identity"."users"."id",
          "identity"."users"."email",
          "identity"."users"."password_hash",
          "identity"."users"."auth_provider",
          "identity"."users"."google_id",
          "identity"."users"."display_name",
          "identity"."users"."avatar_url",
          "identity"."users"."role",
          "identity"."users"."is_active",
          "identity"."users"."auth_user_id",
          coalesce(
            array_agg(distinct "roles"."name") filter (where "roles"."name" is not null),
            array[]::text[]
          ) as "role_names"
        from "identity"."users"
        left join "identity"."user_roles" on "identity"."user_roles"."user_id" = "identity"."users"."id"
        left join "identity"."roles" on "identity"."roles"."id" = "identity"."user_roles"."role_id"
        group by "identity"."users"."id"
        order by "identity"."users"."created_at" asc
        ${args.limit > 0 ? sql`limit ${args.limit}` : sql``}
      `;

  const appUsers = await usersQuery;
  const stats = {
    processed: 0,
    linkedExisting: 0,
    createdAuthUsers: 0,
    alreadyLinked: 0,
    appMetadataSynced: 0,
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
        if (!args.dryRun) {
          await syncSupabaseAppMetadata(authUser.id, user);
        }
        stats.appMetadataSynced += 1;
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

      if (!args.dryRun) {
        await syncSupabaseAppMetadata(authUser.id, user);
      }
      stats.appMetadataSynced += 1;
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

    stats.appMetadataSynced += 1;
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
