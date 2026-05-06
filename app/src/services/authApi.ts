import type { Session, User } from '@supabase/supabase-js';

import { ApiRequestError, authorizedFetch, invalidateClientSession, parseJsonResponse } from './api';
import { clearAccessToken, isAccessTokenHeaderSafe, setAccessToken } from './authToken';
import { buildSupabaseBrowserRedirectUrl, supabase } from './supabase';

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  name?: string | null;
  avatarUrl: string | null;
  role: string;
  roles: Array<{ id: string; name: string }>;
  zoneId?: string | null;
  zoneName?: string | null;
  zoneCode?: string | null;
  depotLabel?: string | null;
  depotLatitude?: string | null;
  depotLongitude?: string | null;
  isActive: boolean;
  provider: 'local' | 'google';
};

type AuthSuccess = {
  accessToken: string;
  user: AuthUser;
};

type AuthCodeResponse = {
  code: string;
  accessToken?: string;
  user?: AuthUser;
};

type RepairedSupabaseSessionResponse = {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  expiresIn?: number | null;
  tokenType?: string | null;
};

type ResetPasswordParams = {
  password: string;
  code?: string | null;
  token?: string | null;
};

const DEFAULT_ROLE = 'citizen';
const MAX_JWT_AVATAR_METADATA_LENGTH = 2_048;
const PROFILE_IMAGE_METADATA_KEYS = ['avatar_url', 'picture'] as const;
const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpeg|jpg|webp);base64,/i;

const resolveAuthRequestPath = (path: string) => (path.startsWith('/api') ? path : `/api${path}`);

const resolveAuthErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return `HTTP ${status}`;
};

async function authRequest(
  path: string,
  init: RequestInit = {},
  options: { invalidateSessionOnUnauthorized?: boolean } = {},
) {
  const response = await authorizedFetch(resolveAuthRequestPath(path), init);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 401 && options.invalidateSessionOnUnauthorized) {
      invalidateClientSession();
    }

    throw new ApiRequestError(
      resolveAuthErrorMessage(payload, response.status),
      response.status,
      payload,
    );
  }

  return payload;
}

const resolveSupabaseErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

const createSupabaseError = (error: unknown, fallback: string) =>
  new Error(resolveSupabaseErrorMessage(error, fallback));

const normalizeMetadataString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeProfileAvatarMetadataString = (value: unknown) => {
  const normalized = normalizeMetadataString(value);
  if (!normalized) {
    return null;
  }

  if (
    DATA_IMAGE_URL_PATTERN.test(normalized) ||
    normalized.length > MAX_JWT_AVATAR_METADATA_LENGTH
  ) {
    return null;
  }

  return normalized;
};

const normalizeMetadataBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const resolveSupabaseUserMetadata = (user: User | null | undefined) =>
  (user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {}) as Record<string, unknown>;

const resolveSupabaseAppMetadata = (user: User | null | undefined) =>
  (user?.app_metadata && typeof user.app_metadata === 'object'
    ? user.app_metadata
    : {}) as Record<string, unknown>;

const resolveMetadataRoleEntries = (...sources: Array<unknown>) => {
  const entries: Array<{ id: string; name: string }> = [];
  const seenRoleNames = new Set<string>();

  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const entry of source) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        const normalizedName = entry.trim();
        const dedupeKey = normalizedName.toLowerCase();
        if (seenRoleNames.has(dedupeKey)) {
          continue;
        }

        seenRoleNames.add(dedupeKey);
        entries.push({
          id: `role:${dedupeKey}`,
          name: normalizedName,
        });
        continue;
      }

      if (!entry || typeof entry !== 'object') {
        continue;
      }

      const roleName = normalizeMetadataString((entry as Record<string, unknown>).name);
      if (!roleName) {
        continue;
      }

      const dedupeKey = roleName.toLowerCase();
      if (seenRoleNames.has(dedupeKey)) {
        continue;
      }

      seenRoleNames.add(dedupeKey);
      entries.push({
        id:
          normalizeMetadataString((entry as Record<string, unknown>).id) ??
          `role:${dedupeKey}`,
        name: roleName,
      });
    }
  }

  return entries;
};

const decodeBase64UrlJson = (value: string) => {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const binaryValue = globalThis.atob(paddedBase64);
    const jsonValue = decodeURIComponent(
      Array.from(binaryValue)
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );

    return JSON.parse(jsonValue) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const decodeJwtPayload = (accessToken: string) => {
  const [, payload] = accessToken.split('.');
  return payload ? decodeBase64UrlJson(payload) : null;
};

const resolveJwtUserMetadata = (accessToken: string) => {
  const payload = decodeJwtPayload(accessToken);
  const userMetadata = payload?.user_metadata;
  return userMetadata && typeof userMetadata === 'object'
    ? (userMetadata as Record<string, unknown>)
    : {};
};

const hasProfileImageMetadataValue = (metadata: Record<string, unknown>) =>
  PROFILE_IMAGE_METADATA_KEYS.some((key) => {
    const value = metadata[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

const hasBulkyProfileImageMetadataValue = (metadata: Record<string, unknown>) =>
  PROFILE_IMAGE_METADATA_KEYS.some((key) => {
    const value = metadata[key];
    return (
      typeof value === 'string' &&
      (DATA_IMAGE_URL_PATTERN.test(value.trim()) || value.trim().length > MAX_JWT_AVATAR_METADATA_LENGTH)
    );
  });

const shouldRepairProfileImageMetadata = (session: Session, accessToken: string) => {
  const sessionMetadata = resolveSupabaseUserMetadata(session.user);
  const jwtMetadata = resolveJwtUserMetadata(accessToken);

  return (
    hasBulkyProfileImageMetadataValue(sessionMetadata) ||
    hasBulkyProfileImageMetadataValue(jwtMetadata) ||
    (!isAccessTokenHeaderSafe(accessToken) &&
      (hasProfileImageMetadataValue(sessionMetadata) || hasProfileImageMetadataValue(jwtMetadata)))
  );
};

let activeProfileMetadataRepair: Promise<Session | null> | null = null;

const refreshCurrentSupabaseSession = async () => {
  const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    throw createSupabaseError(refreshError, 'Unable to refresh your Supabase session.');
  }

  if (refreshedData.session) {
    return refreshedData.session;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw createSupabaseError(error, 'Unable to read your refreshed Supabase session.');
  }

  return data.session;
};

const applyRepairedSupabaseSession = async (repair: RepairedSupabaseSessionResponse) => {
  const accessToken = repair.accessToken?.trim() ?? '';
  const refreshToken = repair.refreshToken?.trim() ?? '';

  if (!accessToken || !refreshToken || !isAccessTokenHeaderSafe(accessToken)) {
    throw new Error('EcoTrack could not create a compact Supabase session.');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw createSupabaseError(error, 'Unable to store repaired Supabase session.');
  }

  return data.session ?? refreshCurrentSupabaseSession();
};

const repairSupabaseProfileImageMetadata = (session: Session) => {
  activeProfileMetadataRepair ??= (async () => {
    const refreshToken = session.refresh_token?.trim() ?? '';
    if (!refreshToken) {
      throw new Error(
        'Your Supabase session cannot be repaired because the refresh token is missing. Sign in again.',
      );
    }

    const repair = (await authRequest('/auth/supabase/session/repair-profile-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })) as RepairedSupabaseSessionResponse;

    return applyRepairedSupabaseSession(repair);
  })().finally(() => {
    activeProfileMetadataRepair = null;
  });

  return activeProfileMetadataRepair;
};

const resolveSafeSupabaseSession = async (
  session: Session | null,
  missingSessionMessage: string,
) => {
  const accessToken = session?.access_token?.trim() ?? '';
  if (!session || !accessToken) {
    throw new Error(missingSessionMessage);
  }

  if (isAccessTokenHeaderSafe(accessToken)) {
    return session;
  }

  if (shouldRepairProfileImageMetadata(session, accessToken)) {
    const repairedSession = await repairSupabaseProfileImageMetadata(session);
    const repairedAccessToken = repairedSession?.access_token?.trim() ?? '';

    if (repairedSession && repairedAccessToken && isAccessTokenHeaderSafe(repairedAccessToken)) {
      return repairedSession;
    }
  }

  clearAccessToken();
  throw new Error(
    'Your Supabase session token is too large to send to the EcoTrack API. Remove bulky profile metadata and sign in again.',
  );
};

const resolveSupabaseUserProvider = (user: User | null | undefined): AuthUser['provider'] => {
  const appMetadata = resolveSupabaseAppMetadata(user);
  const providerCandidates = [
    appMetadata.provider,
    ...(Array.isArray(appMetadata.providers) ? appMetadata.providers : []),
    ...(Array.isArray(user?.identities) ? user.identities.map((identity) => identity?.provider) : []),
  ];

  return providerCandidates.some((provider) => provider === 'google') ? 'google' : 'local';
};

const resolveSupabaseDisplayName = (user: User | null | undefined) => {
  const userMetadata = resolveSupabaseUserMetadata(user);
  const displayNameCandidates = [
    userMetadata.display_name,
    userMetadata.full_name,
    userMetadata.name,
    user?.email?.split('@')[0],
  ];

  for (const candidate of displayNameCandidates) {
    const normalized = normalizeMetadataString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return 'EcoTrack User';
};

const resolveSupabaseLegacyUserId = (user: User | null | undefined) => {
  const userMetadata = resolveSupabaseUserMetadata(user);
  const appMetadata = resolveSupabaseAppMetadata(user);

  return (
    normalizeMetadataString(userMetadata.legacy_user_id) ??
    normalizeMetadataString(appMetadata.legacy_user_id)
  );
};

export const resolveSupabaseSessionUser = (session: Session | null): AuthUser | null => {
  const supabaseUser = session?.user ?? null;
  const email = normalizeMetadataString(supabaseUser?.email);
  if (!supabaseUser || !email) {
    return null;
  }

  const userMetadata = resolveSupabaseUserMetadata(supabaseUser);
  const appMetadata = resolveSupabaseAppMetadata(supabaseUser);
  const role =
    normalizeMetadataString(appMetadata.role) ??
    normalizeMetadataString(userMetadata.role) ??
    DEFAULT_ROLE;
  const roles = resolveMetadataRoleEntries(appMetadata.roles, userMetadata.roles);
  const resolvedRoles =
    roles.length > 0
      ? roles
      : [
          {
            id: `role:${role.toLowerCase()}`,
            name: role,
          },
        ];

  return {
    id: resolveSupabaseLegacyUserId(supabaseUser) ?? supabaseUser.id,
    email,
    displayName: resolveSupabaseDisplayName(supabaseUser),
    name:
      normalizeMetadataString(userMetadata.full_name) ??
      normalizeMetadataString(userMetadata.name) ??
      resolveSupabaseDisplayName(supabaseUser),
    avatarUrl:
      normalizeProfileAvatarMetadataString(userMetadata.avatar_url) ??
      normalizeProfileAvatarMetadataString(userMetadata.picture),
    role,
    roles: resolvedRoles,
    zoneId:
      normalizeMetadataString(userMetadata.zone_id) ??
      normalizeMetadataString(appMetadata.zone_id),
    zoneName:
      normalizeMetadataString(userMetadata.zone_name) ??
      normalizeMetadataString(appMetadata.zone_name),
    zoneCode:
      normalizeMetadataString(userMetadata.zone_code) ??
      normalizeMetadataString(appMetadata.zone_code),
    depotLabel:
      normalizeMetadataString(userMetadata.depot_label) ??
      normalizeMetadataString(appMetadata.depot_label),
    depotLatitude:
      normalizeMetadataString(userMetadata.depot_latitude) ??
      normalizeMetadataString(appMetadata.depot_latitude),
    depotLongitude:
      normalizeMetadataString(userMetadata.depot_longitude) ??
      normalizeMetadataString(appMetadata.depot_longitude),
    isActive: normalizeMetadataBoolean(userMetadata.is_active ?? appMetadata.is_active, true),
    provider: resolveSupabaseUserProvider(supabaseUser),
  };
};

const resolveAuthenticatedSession = async (
  missingSessionMessage = 'Unable to establish your EcoTrack session.',
): Promise<AuthSuccess> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createSupabaseError(error, 'Unable to read the current Supabase session.');
  }

  const session = await resolveSafeSupabaseSession(data.session ?? null, missingSessionMessage);
  const accessToken = session.access_token.trim();

  const user = resolveSupabaseSessionUser(session);
  if (!user) {
    throw new Error('Unable to resolve your EcoTrack session user.');
  }

  if (!setAccessToken(accessToken)) {
    throw new Error('Your Supabase session token is too large to send to the EcoTrack API.');
  }

  return { accessToken, user };
};

const syncSupabaseProfileMetadata = async (displayName: string, avatarUrl?: string | null) => {
  const normalizedAvatarUrl = normalizeProfileAvatarMetadataString(avatarUrl);
  const { error } = await supabase.auth.updateUser({
    data: {
      avatar_url: normalizedAvatarUrl,
      display_name: displayName,
      full_name: displayName,
      name: displayName,
      picture: normalizedAvatarUrl,
    },
  });

  if (error) {
    throw createSupabaseError(error, 'Unable to update your Supabase profile.');
  }

  const session = await refreshCurrentSupabaseSession();
  const accessToken = session?.access_token?.trim();
  if (accessToken) {
    setAccessToken(accessToken);
  }
};

export const authApi = {
  signup: async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName ?? null,
          full_name: displayName ?? null,
          is_active: true,
          name: displayName ?? null,
          role: DEFAULT_ROLE,
          roles: [
            {
              id: `role:${DEFAULT_ROLE}`,
              name: DEFAULT_ROLE,
            },
          ],
        },
      },
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to create your EcoTrack account.');
    }

    return resolveAuthenticatedSession(
      'Account created. Check your email to finish confirming the sign-in flow.',
    );
  },

  login: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to sign in.');
    }

    return resolveAuthenticatedSession();
  },

  startGoogleSignIn: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildSupabaseBrowserRedirectUrl('/auth/callback'),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw createSupabaseError(error, 'Unable to start Google sign-in.');
    }

    return data.url;
  },

  exchange: async (code: string) => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw createSupabaseError(error, 'Unable to complete sign-in.');
    }

    return resolveAuthenticatedSession();
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearAccessToken();
    }
  },

  resolveSessionUser: resolveSupabaseSessionUser,

  resolveCurrentSession: resolveAuthenticatedSession,

  me: () =>
    authRequest('/me', {}, { invalidateSessionOnUnauthorized: true }) as Promise<{ user: AuthUser }>,

  updateProfile: async (displayName: string, avatarUrl?: string | null) => {
    await syncSupabaseProfileMetadata(displayName, avatarUrl);

    return authRequest(
      '/me',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        }),
      },
      { invalidateSessionOnUnauthorized: true },
    ) as Promise<{ user: AuthUser }>;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      current_password: currentPassword,
      password: newPassword,
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to update your password.');
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token?.trim();
    if (accessToken) {
      setAccessToken(accessToken);
    }

    return { success: true };
  },

  forgotPassword: async (email: string): Promise<{ devResetUrl?: string; success?: boolean } | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildSupabaseBrowserRedirectUrl('/reset-password'),
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to process password reset request.');
    }

    return { success: true };
  },

  resetPassword: async ({ code, password, token }: ResetPasswordParams) => {
    if (code && code.trim().length > 0) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code.trim());
      if (exchangeError) {
        throw createSupabaseError(exchangeError, 'Unable to verify your password reset link.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw createSupabaseError(updateError, 'Unable to reset your password.');
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token?.trim();
      if (accessToken) {
        setAccessToken(accessToken);
      }

      return { success: true };
    }

    if (token && token.trim().length > 0) {
      return authRequest('/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      }) as Promise<{ success: boolean }>;
    }

    throw new Error('Missing password reset code. Open the reset link again and retry.');
  },
};

export type { AuthUser, AuthSuccess, AuthCodeResponse, ResetPasswordParams };
