import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDirectDatabaseUrl } from './ensure-direct-database-url.mjs';

const APP_SCHEMAS = [
  'identity',
  'core',
  'iot',
  'ops',
  'analytics',
  'integration',
  'incident',
  'notify',
  'billing',
  'game',
  'audit',
  'admin',
  'export',
  'support',
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const timestamp = new Date().toISOString().replaceAll(':', '-');
const defaultOutputPath = path.resolve(repoRoot, 'tmp', 'database-exports', `${timestamp}-app-data.sql`);
const outputPath = path.resolve(process.argv[2] ? process.argv[2] : defaultOutputPath);
const outputDir = path.dirname(outputPath);

if (!outputPath.endsWith('.sql')) {
  throw new Error('Data export output path must end with .sql.');
}

fs.mkdirSync(outputDir, { recursive: true });

const databaseUrl = resolveDirectDatabaseUrl();
const result = spawnSync(
  process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump',
  [
    '--data-only',
    '--file',
    outputPath,
    '--no-owner',
    '--no-privileges',
    '--quote-all-identifiers',
    ...APP_SCHEMAS.flatMap((schemaName) => ['--schema', schemaName]),
    databaseUrl,
  ],
  {
    stdio: 'inherit',
  },
);

if (result.error) {
  throw new Error(
    `Failed to run pg_dump. Install PostgreSQL client tools and ensure pg_dump is on PATH. ${
      result.error instanceof Error ? result.error.message : ''
    }`.trim(),
  );
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
