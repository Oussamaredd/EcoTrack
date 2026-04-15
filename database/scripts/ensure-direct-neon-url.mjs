import { execFileSync } from 'node:child_process';
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

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function isWsl() {
  if (process.platform !== 'linux') {
    return false;
  }

  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
    return true;
  }

  try {
    return fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8').toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

function canReachTcpHost(host, port) {
  const normalizedHost = host === '::1' || host === '[::1]' ? '127.0.0.1' : host;

  try {
    execFileSync(
      'bash',
      ['-lc', `timeout 1 bash -lc '</dev/tcp/${normalizedHost}/${port}' >/dev/null 2>&1`],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

function resolveWslHostGateway() {
  try {
    const routeOutput = execFileSync('ip', ['route', 'show', 'default'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const gateway = routeOutput.trim().split(/\s+/)[2];
    return gateway || undefined;
  } catch {
    return undefined;
  }
}

if (isWsl() && LOOPBACK_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
  const targetPort = Number(parsedUrl.port || '5432');

  if (!canReachTcpHost(parsedUrl.hostname, targetPort)) {
    const gatewayHost = resolveWslHostGateway();

    if (gatewayHost && canReachTcpHost(gatewayHost, targetPort)) {
      parsedUrl.hostname = gatewayHost;
      process.env.DATABASE_URL = parsedUrl.toString();
      console.warn(
        `[ensure-direct-neon-url] WSL detected and localhost was unreachable; using Windows host gateway ${gatewayHost} for this command.`,
      );
    }
  }
}

const hostname = parsedUrl.hostname.toLowerCase();
const isNeonHost = hostname.endsWith('.neon.tech');
const isPooledNeonHost = hostname.includes('-pooler.');

if (isNeonHost && isPooledNeonHost) {
  throw new Error(
    'DATABASE_URL points at a pooled Neon host. Use the direct Neon connection string for migrations and seed execution.',
  );
}
