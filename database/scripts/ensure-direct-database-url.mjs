import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(scriptDir, '..', '..', '.env');
const POOLED_HOST_INDICATORS = ['-pooler.', '.pooler.'];
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const LOOPBACK_IPV4_ADDRESSES = new Set(['00000000', '0100007F']);
const LOOPBACK_IPV6_ADDRESSES = new Set([
  '00000000000000000000000000000000',
  '00000000000000000000000000000001',
  '00000000000000000000000001000000',
]);

function loadRootEnvIfNeeded() {
  if (!process.env.DATABASE_URL && fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }
}

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

function hasListeningSocket(procNetPath, portHex, allowedAddresses) {
  try {
    const content = fs.readFileSync(procNetPath, 'utf8');
    return content
      .split('\n')
      .slice(1)
      .some((line) => {
        const columns = line.trim().split(/\s+/);
        if (columns.length < 4 || columns[3] !== '0A') {
          return false;
        }

        const [localAddress, localPort] = columns[1]?.split(':') ?? [];
        return localPort === portHex && allowedAddresses.has(localAddress);
      });
  } catch {
    return false;
  }
}

function hasLocalWslListener(port) {
  const portHex = port.toString(16).toUpperCase().padStart(4, '0');
  return (
    hasListeningSocket('/proc/net/tcp', portHex, LOOPBACK_IPV4_ADDRESSES) ||
    hasListeningSocket('/proc/net/tcp6', portHex, LOOPBACK_IPV6_ADDRESSES)
  );
}

function decodeRouteGateway(hexValue) {
  if (!/^[0-9A-Fa-f]{8}$/.test(hexValue)) {
    return undefined;
  }

  const octets = hexValue.match(/../g);
  if (!octets || octets.length !== 4) {
    return undefined;
  }

  return octets.reverse().map((octet) => Number.parseInt(octet, 16)).join('.');
}

function resolveWslHostGateway() {
  try {
    const routeLines = fs.readFileSync('/proc/net/route', 'utf8').trim().split('\n').slice(1);
    for (const line of routeLines) {
      const columns = line.trim().split(/\s+/);
      const destination = columns[1];
      const gateway = columns[2];
      if (destination === '00000000' && gateway && gateway !== '00000000') {
        return decodeRouteGateway(gateway);
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function resolveDirectDatabaseUrl() {
  loadRootEnvIfNeeded();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required before running database migration, seed, export, or import commands.');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw new Error(
      `DATABASE_URL must be a valid Postgres connection string before running database migration, seed, export, or import commands. ${
        error instanceof Error ? error.message : ''
      }`.trim(),
    );
  }

  if (isWsl() && LOOPBACK_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    const targetPort = Number(parsedUrl.port || '5432');

    if (!hasLocalWslListener(targetPort)) {
      const gatewayHost = resolveWslHostGateway();
      if (gatewayHost) {
        parsedUrl.hostname = gatewayHost;
        console.warn(
          `[ensure-direct-database-url] WSL detected and localhost was unreachable; using Windows host gateway ${gatewayHost} for this command.`,
        );
      }
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isPooledHost = POOLED_HOST_INDICATORS.some((indicator) => hostname.includes(indicator));

  if (isPooledHost) {
    throw new Error(
      'DATABASE_URL points at a pooled database host. Use the direct Postgres connection string for migrations, seed, export, and import execution.',
    );
  }

  return parsedUrl.toString();
}

function runCommandWithDirectDatabaseUrl(command, commandArgs) {
  const databaseUrl = resolveDirectDatabaseUrl();
  const result = spawnSync(command, commandArgs, {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  process.exit(result.status ?? 0);
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const [command, ...commandArgs] = process.argv.slice(2);

  if (!command) {
    resolveDirectDatabaseUrl();
  } else {
    runCommandWithDirectDatabaseUrl(command, commandArgs);
  }
}
