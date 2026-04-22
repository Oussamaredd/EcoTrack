import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDirectDatabaseUrl } from './ensure-direct-database-url.mjs';

const inputArg = process.argv[2];

if (!inputArg) {
  throw new Error('Usage: node ./scripts/import-data-only.mjs <path-to-data-dump.sql>');
}

const inputPath = path.resolve(inputArg);

if (!fs.existsSync(inputPath)) {
  throw new Error(`Data import file does not exist: ${inputPath}`);
}

const databaseUrl = resolveDirectDatabaseUrl();
const result = spawnSync(
  process.platform === 'win32' ? 'psql.exe' : 'psql',
  ['--file', inputPath, '--set', 'ON_ERROR_STOP=1', '--single-transaction', databaseUrl],
  {
    stdio: 'inherit',
  },
);

if (result.error) {
  throw new Error(
    `Failed to run psql. Install PostgreSQL client tools and ensure psql is on PATH. ${
      result.error instanceof Error ? result.error.message : ''
    }`.trim(),
  );
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Imported ${inputPath}`);
