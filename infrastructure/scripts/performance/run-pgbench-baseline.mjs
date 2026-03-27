#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { resolveRepoPath } from './lib/resolve-local-bin.mjs';

const parseArgs = (argv) => {
  const options = {
    clients: 50,
    databaseUrl: process.env.DATABASE_URL ?? '',
    duration: 60,
    jobs: 10,
    outputDir: resolveRepoPath('tmp', 'performance', 'pgbench'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--database-url') {
      options.databaseUrl = argv[++index] ?? options.databaseUrl;
      continue;
    }

    if (token === '--clients') {
      options.clients = Number(argv[++index] ?? options.clients);
      continue;
    }

    if (token === '--jobs') {
      options.jobs = Number(argv[++index] ?? options.jobs);
      continue;
    }

    if (token === '--duration') {
      options.duration = Number(argv[++index] ?? options.duration);
      continue;
    }

    if (token === '--output-dir') {
      options.outputDir = path.resolve(argv[++index] ?? options.outputDir);
    }
  }

  if (!options.databaseUrl) {
    throw new Error('Provide --database-url or set DATABASE_URL before running pgbench.');
  }

  return options;
};

const options = parseArgs(process.argv);
fs.mkdirSync(options.outputDir, { recursive: true });

const outputPath = path.join(
  options.outputDir,
  `pgbench-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.txt`,
);

const args = [
  '-c',
  String(options.clients),
  '-j',
  String(options.jobs),
  '-T',
  String(options.duration),
  options.databaseUrl,
];

const child = spawn('pgbench', args, {
  cwd: resolveRepoPath(),
  shell: process.platform === 'win32',
  stdio: ['inherit', 'pipe', 'inherit'],
});

let stdoutBuffer = '';
child.stdout.on('data', (chunk) => {
  const output = chunk.toString();
  stdoutBuffer += output;
  process.stdout.write(output);
});

child.on('close', (exitCode) => {
  if (exitCode !== 0) {
    process.exitCode = exitCode ?? 1;
    return;
  }

  fs.writeFileSync(outputPath, stdoutBuffer, 'utf8');
  console.log(`[perf:pgbench] wrote ${outputPath}`);
});
