#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(moduleDir, '..', '..', '..', '..');

export const resolveRepoPath = (...parts) => path.resolve(repoRoot, ...parts);

export const resolveLocalBin = (name) => {
  const executableName = process.platform === 'win32' ? `${name}.cmd` : name;
  const executablePath = resolveRepoPath('node_modules', '.bin', executableName);

  if (!fs.existsSync(executablePath)) {
    throw new Error(`Unable to find local binary '${name}' at ${executablePath}.`);
  }

  return executablePath;
};
