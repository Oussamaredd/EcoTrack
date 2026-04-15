import { execFileSync } from 'node:child_process';
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

function canReachTcpHost(host: string, port: number): boolean {
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

function resolveWslHostGateway(): string | undefined {
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
  if (canReachTcpHost(parsedUrl.hostname, targetPort)) {
    return rawUrl;
  }

  const gatewayHost = resolveWslHostGateway();
  if (!gatewayHost || !canReachTcpHost(gatewayHost, targetPort)) {
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
