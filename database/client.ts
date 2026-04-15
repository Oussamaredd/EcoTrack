import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import { parseDatabaseEnv } from './env.js';

export type DatabaseConfig = {
  url?: string;
  maxConnections?: number;
};

export type DatabaseInstance = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  dispose: () => Promise<void>;
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const LOOPBACK_IPV4_ADDRESSES = new Set(['00000000', '0100007F']);
const LOOPBACK_IPV6_ADDRESSES = new Set([
  '00000000000000000000000000000000',
  '00000000000000000000000000000001',
  '00000000000000000000000001000000',
]);

function isWsl(): boolean {
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

function hasListeningSocket(
  procNetPath: string,
  portHex: string,
  allowedAddresses: Set<string>,
): boolean {
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

function hasLocalWslListener(port: number): boolean {
  const portHex = port.toString(16).toUpperCase().padStart(4, '0');
  return (
    hasListeningSocket('/proc/net/tcp', portHex, LOOPBACK_IPV4_ADDRESSES) ||
    hasListeningSocket('/proc/net/tcp6', portHex, LOOPBACK_IPV6_ADDRESSES)
  );
}

function decodeRouteGateway(hexValue: string): string | undefined {
  if (!/^[0-9A-Fa-f]{8}$/.test(hexValue)) {
    return undefined;
  }

  const octets = hexValue.match(/../g);
  if (!octets || octets.length !== 4) {
    return undefined;
  }

  return octets.reverse().map((octet) => Number.parseInt(octet, 16)).join('.');
}

function resolveWslHostGateway(): string | undefined {
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

function normalizeDatabaseUrl(rawUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (!isWsl() || !LOOPBACK_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    return rawUrl;
  }

  const targetPort = Number(parsedUrl.port || '5432');
  if (hasLocalWslListener(targetPort)) {
    return rawUrl;
  }

  const gatewayHost = resolveWslHostGateway();
  if (!gatewayHost) {
    return rawUrl;
  }

  parsedUrl.hostname = gatewayHost;
  return parsedUrl.toString();
}

function resolveDatabaseUrl(explicitUrl?: string): string | undefined {
  if (explicitUrl) {
    return normalizeDatabaseUrl(explicitUrl);
  }

  if (process.env.DATABASE_URL) {
    return normalizeDatabaseUrl(process.env.DATABASE_URL);
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const envCandidates = [
    path.resolve(moduleDir, '.env'),
    path.resolve(moduleDir, '..', '.env'),
    path.resolve(moduleDir, '..', '..', '.env'),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    dotenv.config({ path: envPath });
    if (process.env.DATABASE_URL) {
      return normalizeDatabaseUrl(process.env.DATABASE_URL);
    }
  }

  return undefined;
}

export function createDatabaseInstance(config: DatabaseConfig = {}): DatabaseInstance {
  const env = parseDatabaseEnv({
    DATABASE_URL: resolveDatabaseUrl(config.url),
  });

  const sql = postgres(env.DATABASE_URL, {
    max: config.maxConnections ?? 5,
    prepare: false,
  });

  const db = drizzle(sql, { schema });

  return {
    db,
    dispose: () => sql.end({ timeout: 5 }).catch(() => undefined),
  };
}

export type DatabaseClient = DatabaseInstance['db'];
