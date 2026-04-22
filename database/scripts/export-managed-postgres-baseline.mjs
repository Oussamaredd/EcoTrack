import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.resolve(workspaceDir, 'migrations', 'baselines');
const outputPath = path.resolve(outputDir, 'managed-postgres-current.sql');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const manualSqlBlocks = [
  {
    name: 'iot.measurements_default',
    sql: [
      '-- Manual supplement for historical partitioned storage not represented in Drizzle export.',
      'CREATE TABLE IF NOT EXISTS "iot"."measurements_default" PARTITION OF "iot"."measurements" DEFAULT;',
      '',
    ].join('\n'),
  },
];

fs.mkdirSync(outputDir, { recursive: true });

const result = spawnSync(
  npxCommand,
  ['drizzle-kit', 'export', '--sql', '--config', 'drizzle.config.ts'],
  {
    cwd: workspaceDir,
    encoding: 'utf8',
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr ?? '');
  process.exit(result.status ?? 1);
}

const header = [
  '-- Managed Postgres baseline for blank provider-managed Postgres targets.',
  '-- Generated from database/schema/index.ts via `drizzle-kit export`.',
  '-- Regenerate with `npm run db:baseline:managed --workspace=ecotrack-database`.',
  '-- Apply this baseline only to blank managed targets that already reserve provider-owned schemas such as `auth`.',
  '-- Do not apply this file on an existing repo-managed database that already tracks numbered Drizzle migrations.',
  '',
].join('\n');

const exportedSql = (result.stdout ?? '').trimStart();
const partitionedMeasurementsSql = exportedSql.replace(
  /CREATE TABLE "iot"\."measurements" \(([\s\S]*?)\n\);/m,
  'CREATE TABLE "iot"."measurements" ($1\n) PARTITION BY RANGE ("measured_at");',
);
const manualSupplement = manualSqlBlocks.map((block) => block.sql).join('');
fs.writeFileSync(outputPath, `${header}${partitionedMeasurementsSql}\n\n${manualSupplement}`);
console.log(`Wrote ${path.relative(workspaceDir, outputPath)}`);
