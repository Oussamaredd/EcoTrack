import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { AuthUser } from './auth.types.js';
import { getEnvValue } from './auth.utils.js';

type SupabaseJwtPayload = JWTPayload & {
  email?: string | null;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  } | null;
  user_metadata?: {
    display_name?: string | null;
    full_name?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    picture?: string | null;
  } | null;
};

let cachedSupabaseUrl: string | null = null;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const getSupabaseUrl = () => {
  const configuredUrl = getEnvValue('SUPABASE_URL');
  if (!configuredUrl) {
    return null;
  }

  return trimTrailingSlashes(configuredUrl);
};

const getSupabaseJwks = (supabaseUrl: string) => {
  if (!cachedJwks || cachedSupabaseUrl !== supabaseUrl) {
    cachedSupabaseUrl = supabaseUrl;
    cachedJwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }

  return cachedJwks;
};

const resolveSupabaseProvider = (payload: SupabaseJwtPayload): AuthUser['provider'] => {
  const appMetadata = payload.app_metadata;
  const providerCandidates = [
    appMetadata?.provider,
    ...(Array.isArray(appMetadata?.providers) ? appMetadata.providers : []),
  ];

  return providerCandidates.some((provider) => provider === 'google') ? 'google' : 'local';
};

const resolveSupabaseDisplayName = (payload: SupabaseJwtPayload) => {
  const metadata = payload.user_metadata;
  const candidates = [metadata?.display_name, metadata?.full_name, metadata?.name];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  if (typeof payload.email === 'string' && payload.email.includes('@')) {
    return payload.email.split('@')[0] ?? null;
  }

  return null;
};

const resolveSupabaseAvatarUrl = (payload: SupabaseJwtPayload) => {
  const metadata = payload.user_metadata;
  const candidates = [metadata?.avatar_url, metadata?.picture];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

export async function verifySupabaseAccessToken(token: string): Promise<AuthUser | null> {
  const normalizedToken = token.trim();
  const supabaseUrl = getSupabaseUrl();

  if (!normalizedToken || !supabaseUrl) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(normalizedToken, getSupabaseJwks(supabaseUrl), {
      issuer: `${supabaseUrl}/auth/v1`,
    });
    const jwtPayload = payload as SupabaseJwtPayload;

    if (typeof jwtPayload.sub !== 'string' || jwtPayload.sub.trim().length === 0) {
      return null;
    }

    return {
      id: jwtPayload.sub,
      authUserId: jwtPayload.sub,
      provider: resolveSupabaseProvider(jwtPayload),
      email: typeof jwtPayload.email === 'string' ? jwtPayload.email : null,
      name: resolveSupabaseDisplayName(jwtPayload),
      avatarUrl: resolveSupabaseAvatarUrl(jwtPayload),
    };
  } catch {
    return null;
  }
}
