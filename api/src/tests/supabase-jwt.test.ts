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
    });

    expect(createRemoteJwkSetMock).toHaveBeenCalledWith(
      new URL('https://ecotrack.supabase.co/auth/v1/.well-known/jwks.json'),
    );
    expect(jwtVerifyMock).toHaveBeenCalledWith('bearer-token', 'jwks', {
      issuer: 'https://ecotrack.supabase.co/auth/v1',
    });
  });
});
