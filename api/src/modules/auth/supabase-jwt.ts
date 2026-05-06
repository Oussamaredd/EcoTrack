import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { AuthUser } from './auth.types.js';
import { getEnvValue } from './auth.utils.js';

type SupabaseJwtPayload = JWTPayload & {
  email?: string | null;
  app_metadata?: {
    provider?: string;
    providers?: string[];
    role?: string | null;
    roles?: unknown;
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
const MAX_JWT_AVATAR_METADATA_LENGTH = 2_048;
const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpeg|jpg|webp);base64,/i;

const trimTrailingSlashes = (value: string) => {
  let endIndex = value.length;

  while (endIndex > 0 && value.charCodeAt(endIndex - 1) === 47) {
    endIndex -= 1;
  }

  return endIndex === value.length ? value : value.slice(0, endIndex);
};

const getSupabaseUrl = () => {
  const configuredUrl = getEnvValue('SUPABASE_URL');
  if (!configuredUrl) {
    return null;
  }

  return trimTrailingSlashes(configuredUrl);
};

const getSupabaseServerApiKey = () =>
  getEnvValue('SUPABASE_SERVICE_ROLE_KEY') ?? getEnvValue('SUPABASE_PUBLISHABLE_KEY');

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
    if (typeof candidate === 'string') {
      const normalizedCandidate = candidate.trim();
      if (
        normalizedCandidate.length > 0 &&
        normalizedCandidate.length <= MAX_JWT_AVATAR_METADATA_LENGTH &&
        !DATA_IMAGE_URL_PATTERN.test(normalizedCandidate)
      ) {
        return normalizedCandidate;
      }
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
      const normalizedCandidate = candidate.trim();
      if (
        normalizedCandidate.length <= MAX_JWT_AVATAR_METADATA_LENGTH &&
        !DATA_IMAGE_URL_PATTERN.test(normalizedCandidate)
      ) {
        return normalizedCandidate;
      }
    }
  }

  return null;
};

const appendRoleName = (roleNames: string[], seenRoleNames: Set<string>, roleName: string) => {
  const normalizedRoleName = roleName.trim().toLowerCase();
  if (!normalizedRoleName || seenRoleNames.has(normalizedRoleName)) {
    return;
  }

  seenRoleNames.add(normalizedRoleName);
  roleNames.push(normalizedRoleName);
};

const resolveSupabaseRoleNames = (payload: SupabaseJwtPayload) => {
  const roleNames: string[] = [];
  const seenRoleNames = new Set<string>();
  const appMetadata = payload.app_metadata;

  if (typeof appMetadata?.role === 'string') {
    appendRoleName(roleNames, seenRoleNames, appMetadata.role);
  }

  if (Array.isArray(appMetadata?.roles)) {
    for (const role of appMetadata.roles) {
      if (typeof role === 'string') {
        appendRoleName(roleNames, seenRoleNames, role);
        continue;
      }

      if (!role || typeof role !== 'object') {
        continue;
      }

      const name = (role as { name?: unknown }).name;
      if (typeof name === 'string') {
        appendRoleName(roleNames, seenRoleNames, name);
      }
    }
  }

  return roleNames;
};

const mapSupabasePayloadToAuthUser = (payload: SupabaseJwtPayload): AuthUser | null => {
  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    return null;
  }

  return {
    id: payload.sub,
    authUserId: payload.sub,
    provider: resolveSupabaseProvider(payload),
    email: typeof payload.email === 'string' ? payload.email : null,
    name: resolveSupabaseDisplayName(payload),
    avatarUrl: resolveSupabaseAvatarUrl(payload),
    roleNames: resolveSupabaseRoleNames(payload),
  };
};

type SupabaseUserResponse = {
  id?: string | null;
  email?: string | null;
  app_metadata?: SupabaseJwtPayload['app_metadata'];
  user_metadata?: SupabaseJwtPayload['user_metadata'];
};

const verifySupabaseAccessTokenWithAuthApi = async (
  normalizedToken: string,
  supabaseUrl: string,
): Promise<AuthUser | null> => {
  const apiKey = getSupabaseServerApiKey();
  if (!apiKey || typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${normalizedToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as SupabaseUserResponse;
    return mapSupabasePayloadToAuthUser({
      sub: typeof user.id === 'string' ? user.id : undefined,
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    });
  } catch {
    return null;
  }
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
    return mapSupabasePayloadToAuthUser(payload as SupabaseJwtPayload);
  } catch {
    return verifySupabaseAccessTokenWithAuthApi(normalizedToken, supabaseUrl);
  }
}
