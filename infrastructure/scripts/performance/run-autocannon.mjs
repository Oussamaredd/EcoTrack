#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { resolveLocalBin, resolveRepoPath } from './lib/resolve-local-bin.mjs';

const defaults = {
  connections: 50,
  duration: 30,
  outputDir: resolveRepoPath('tmp', 'performance', 'autocannon'),
  scenario: 'default',
  url: 'http://localhost:3001/api/health/ready',
};

const parseArgs = (argv) => {
  const options = {
    ...defaults,
    headers: [],
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--url') {
      options.url = argv[++index] ?? options.url;
      continue;
    }

    if (token === '--connections') {
      options.connections = Number(argv[++index] ?? options.connections);
      continue;
    }

    if (token === '--duration') {
      options.duration = Number(argv[++index] ?? options.duration);
      continue;
    }

    if (token === '--scenario') {
      options.scenario = argv[++index] ?? options.scenario;
      continue;
    }

    if (token === '--output-dir') {
      options.outputDir = path.resolve(argv[++index] ?? options.outputDir);
      continue;
    }

    if (token === '--header') {
      const headerValue = argv[++index];
      if (headerValue) {
        options.headers.push(headerValue);
      }
    }
  }

  return options;
};

const options = parseArgs(process.argv);
fs.mkdirSync(options.outputDir, { recursive: true });

const outputPath = path.join(
  options.outputDir,
  `${options.scenario}-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.json`,
);

const args = [
  '--renderStatusCodes',
  '--json',
  '-c',
  String(options.connections),
  '-d',
  String(options.duration),
];

for (const header of options.headers) {
  args.push('-H', header);
}

args.push(options.url);

const autocannonBinary = resolveLocalBin('autocannon');
const child = spawn(autocannonBinary, args, {
  cwd: resolveRepoPath(),
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
  console.log(`[perf:autocannon] wrote ${outputPath}`);
});
