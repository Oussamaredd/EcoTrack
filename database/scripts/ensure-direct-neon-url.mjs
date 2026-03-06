import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(scriptDir, '..', '..', '.env');

if (!process.env.DATABASE_URL && fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before running database migration or seed commands.');
}

let parsedUrl;

try {
  parsedUrl = new URL(databaseUrl);
} catch (error) {
  throw new Error(
    `DATABASE_URL must be a valid Postgres connection string before running migration or seed commands. ${
      error instanceof Error ? error.message : ''
    }`.trim(),
  );
}

const hostname = parsedUrl.hostname.toLowerCase();
const isNeonHost = hostname.endsWith('.neon.tech');
const isPooledNeonHost = hostname.includes('-pooler.');

if (isNeonHost && isPooledNeonHost) {
  throw new Error(
    'DATABASE_URL points at a pooled Neon host. Use the direct Neon connection string for migrations and seed execution.',
  );
}
