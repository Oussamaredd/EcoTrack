import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createRemoteJwkSetMock, jwtVerifyMock } = vi.hoisted(() => ({
  createRemoteJwkSetMock: vi.fn(),
  jwtVerifyMock: vi.fn(),
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: createRemoteJwkSetMock,
  jwtVerify: jwtVerifyMock,
}));

describe('supabase-jwt', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.unstubAllGlobals();
  });

  it('trims trailing slashes from SUPABASE_URL before building issuer and JWKS URL', async () => {
    process.env.SUPABASE_URL = 'https://ecotrack.supabase.co///';
    createRemoteJwkSetMock.mockReturnValue('jwks');
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'user-1',
        email: 'citizen@example.com',
      },
    });

    const { verifySupabaseAccessToken } = await import('../modules/auth/supabase-jwt.js');

    await expect(verifySupabaseAccessToken(' bearer-token ')).resolves.toEqual({
      id: 'user-1',
      authUserId: 'user-1',
      provider: 'local',
      email: 'citizen@example.com',
      name: 'citizen',
      avatarUrl: null,
      roleNames: [],
    });

    expect(createRemoteJwkSetMock).toHaveBeenCalledWith(
      new URL('https://ecotrack.supabase.co/auth/v1/.well-known/jwks.json'),
    );
    expect(jwtVerifyMock).toHaveBeenCalledWith('bearer-token', 'jwks', {
      issuer: 'https://ecotrack.supabase.co/auth/v1',
    });
  });

  it('falls back to Supabase Auth user lookup when JWKS verification fails', async () => {
    process.env.SUPABASE_URL = 'https://ecotrack.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-api-key';
    createRemoteJwkSetMock.mockReturnValue('jwks');
    jwtVerifyMock.mockRejectedValueOnce(new Error('JWKS verification failed'));
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'supabase-user-1',
          email: 'citizen@example.com',
          app_metadata: {
            provider: 'email',
            role: 'agent',
          },
          user_metadata: {
            full_name: 'Citizen User',
            avatar_url: 'https://example.com/avatar.png',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { verifySupabaseAccessToken } = await import('../modules/auth/supabase-jwt.js');

    await expect(verifySupabaseAccessToken(' bearer-token ')).resolves.toEqual({
      id: 'supabase-user-1',
      authUserId: 'supabase-user-1',
      provider: 'local',
      email: 'citizen@example.com',
      name: 'Citizen User',
      avatarUrl: 'https://example.com/avatar.png',
      roleNames: ['agent'],
    });

    expect(fetchMock).toHaveBeenCalledWith('https://ecotrack.supabase.co/auth/v1/user', {
      method: 'GET',
      headers: {
        apikey: 'server-api-key',
        Authorization: 'Bearer bearer-token',
      },
    });
  });

  it('ignores bulky profile image metadata when mapping Supabase JWTs', async () => {
    process.env.SUPABASE_URL = 'https://ecotrack.supabase.co';
    createRemoteJwkSetMock.mockReturnValue('jwks');
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'user-1',
        email: 'citizen@example.com',
        user_metadata: {
          full_name: 'Citizen User',
          avatar_url: `data:image/png;base64,${'a'.repeat(24_000)}`,
          picture: `data:image/png;base64,${'a'.repeat(24_000)}`,
        },
      },
    });

    const { verifySupabaseAccessToken } = await import('../modules/auth/supabase-jwt.js');

    await expect(verifySupabaseAccessToken('bearer-token')).resolves.toMatchObject({
      id: 'user-1',
      avatarUrl: null,
      name: 'Citizen User',
    });
  });
});
