#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { resolveLocalBin, resolveRepoPath } from './lib/resolve-local-bin.mjs';

const ALLOWED_MODES = new Set(['doctor', 'flame', 'bubbleprof', 'heapprofiler']);
const DEFAULT_LOAD_COMMAND =
  'node ./infrastructure/scripts/performance/run-autocannon.mjs --scenario clinic-smoke --url http://localhost:3001/api/health/ready --connections 40 --duration 20';

const parseArgs = (argv) => {
  const options = {
    dest: null,
    mode: 'doctor',
    onPort: DEFAULT_LOAD_COMMAND,
    targetCommand: ['node', 'api/dist/main.js'],
  };

  const separatorIndex = argv.indexOf('--');
  const cliArgs = separatorIndex >= 0 ? argv.slice(2, separatorIndex) : argv.slice(2);
  const targetCommand = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : options.targetCommand;

  for (let index = 0; index < cliArgs.length; index += 1) {
    const token = cliArgs[index];

    if (token === '--mode') {
      options.mode = cliArgs[++index] ?? options.mode;
      continue;
    }

    if (token === '--dest') {
      options.dest = path.resolve(cliArgs[++index] ?? '');
      continue;
    }

    if (token === '--on-port') {
      options.onPort = cliArgs[++index] ?? options.onPort;
    }
  }

  if (!ALLOWED_MODES.has(options.mode)) {
    throw new Error(`Unsupported clinic mode '${options.mode}'.`);
  }

  if (!Array.isArray(targetCommand) || targetCommand.length === 0) {
    throw new Error('Missing target command. Pass it after --.');
  }

  options.targetCommand = targetCommand;
  options.dest =
    options.dest ??
    resolveRepoPath('tmp', 'performance', 'clinic', options.mode, new Date().toISOString().replaceAll(':', '-'));

  return options;
};

const options = parseArgs(process.argv);
fs.mkdirSync(options.dest, { recursive: true });

const clinicBinary = resolveLocalBin('clinic');
const args = [
  options.mode,
  '--dest',
  options.dest,
  '--on-port',
  options.onPort,
  '--',
  ...options.targetCommand,
];

const child = spawn(clinicBinary, args, {
  cwd: resolveRepoPath(),
  shell: false,
  stdio: 'inherit',
});

child.on('close', (exitCode) => {
  if (exitCode !== 0) {
    process.exitCode = exitCode ?? 1;
    return;
  }

  console.log(`[perf:clinic] report saved under ${options.dest}`);
});
