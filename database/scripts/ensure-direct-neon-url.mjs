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
const LOOPBACK_IPV4_ADDRESSES = new Set(['00000000', '0100007F']);
const LOOPBACK_IPV6_ADDRESSES = new Set([
  '00000000000000000000000000000000',
  '00000000000000000000000000000001',
  '00000000000000000000000001000000',
]);

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

if (isWsl() && LOOPBACK_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
  const targetPort = Number(parsedUrl.port || '5432');

  if (!hasLocalWslListener(targetPort)) {
    const gatewayHost = resolveWslHostGateway();
    if (gatewayHost) {
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
