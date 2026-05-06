import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import jwtPkg from 'jsonwebtoken';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../modules/auth/auth.service.js';

const MOCK_HASH_VALUE = ['fixture', 'hash'].join('-');
const { sign } = jwtPkg as any;
const { verifySupabaseAccessTokenMock } = vi.hoisted(() => ({
  verifySupabaseAccessTokenMock: vi.fn(),
}));

vi.mock('../modules/auth/supabase-jwt.js', () => ({
  verifySupabaseAccessToken: verifySupabaseAccessTokenMock,
}));

describe('AuthService', () => {
  const originalEnv = { ...process.env };

  const usersServiceMock = {
    findByEmail: vi.fn(),
    createLocalUser: vi.fn(),
    getRolesForUser: vi.fn(),
    getZoneAssignmentForUser: vi.fn(),
    ensureUserForAuth: vi.fn(),
    updateUserProfile: vi.fn(),
    findById: vi.fn(),
    createPasswordResetToken: vi.fn(),
    consumeAllPasswordResetTokensForUser: vi.fn(),
    findValidPasswordResetTokenByHash: vi.fn(),
    updatePasswordHash: vi.fn(),
    consumePasswordResetToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'oauth-secret';
    process.env.JWT_ACCESS_SECRET = 'local-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.CLIENT_ORIGIN = 'http://localhost:5173';
    delete process.env.NODE_ENV;
    usersServiceMock.getZoneAssignmentForUser.mockResolvedValue(null);
    verifySupabaseAccessTokenMock.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and parses local bearer token from Authorization header', async () => {
    const service = new AuthService(usersServiceMock as any);

    const token = service.createLocalAccessToken({
      id: 'user-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    await expect(service.getAuthUserFromAuthorizationHeader(`Bearer ${token}`)).resolves.toEqual({
      id: 'user-1',
      provider: 'local',
      email: 'local@example.com',
      name: 'Local User',
      avatarUrl: null,
    });
  });

  it('accepts Supabase bearer tokens when legacy local verification misses', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'supabase-user-1',
          email: 'google@example.com',
          app_metadata: {
            provider: 'google',
          },
          user_metadata: {
            name: 'Google User',
            avatar_url: 'https://example.com/avatar.png',
          },
        }),
      }),
    );
    verifySupabaseAccessTokenMock.mockResolvedValueOnce({
      id: 'supabase-user-1',
      authUserId: 'supabase-user-1',
      provider: 'google',
      email: 'google@example.com',
      name: 'Google User',
      avatarUrl: 'https://example.com/avatar.png',
    });

    const service = new AuthService(usersServiceMock as any);

    await expect(service.getAuthUserFromAuthorizationHeader('Bearer supabase-token')).resolves.toEqual({
      id: 'supabase-user-1',
      authUserId: 'supabase-user-1',
      provider: 'google',
      email: 'google@example.com',
      name: 'Google User',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('repairs bulky Supabase profile image metadata through server-side refresh token flow', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co///';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const bulkyImageValue = `data:image/png;base64,${'a'.repeat(24_000)}`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: `oversized.${'a'.repeat(24_000)}.token`,
            refresh_token: 'rotated-refresh-token-1',
            token_type: 'bearer',
            user: {
              id: 'supabase-user-1',
              email: 'google@example.com',
              user_metadata: {
                avatar_url: bulkyImageValue,
                display_name: 'Google User',
                picture: bulkyImageValue,
                role: 'agent',
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'supabase-user-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'compact-access-token',
            refresh_token: 'rotated-refresh-token-2',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: 'supabase-user-1',
              email: 'google@example.com',
              user_metadata: {
                display_name: 'Google User',
                role: 'agent',
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const service = new AuthService(usersServiceMock as any);

    await expect(
      service.repairOversizedSupabaseProfileMetadata({
        refreshToken: 'refresh-token-1',
      }),
    ).resolves.toEqual({
      accessToken: 'compact-access-token',
      refreshToken: 'rotated-refresh-token-2',
      expiresAt: null,
      expiresIn: 3600,
      tokenType: 'bearer',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://project.supabase.co/auth/v1/token?grant_type=refresh_token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'refresh-token-1' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://project.supabase.co/auth/v1/admin/users/supabase-user-1',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          apikey: 'service-role-key',
          Authorization: 'Bearer service-role-key',
        }),
      }),
    );
    const adminRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(adminRequest.body))).toEqual({
      user_metadata: {
        avatar_url: null,
        display_name: 'Google User',
        picture: null,
        role: 'agent',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://project.supabase.co/auth/v1/token?grant_type=refresh_token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'rotated-refresh-token-1' }),
      }),
    );
  });

  it('rejects oauth session tokens on bearer-protected APIs', async () => {
    const service = new AuthService(usersServiceMock as any);
    const oauthToken = service.createAuthToken({
      id: 'google-user-1',
      provider: 'google',
      email: 'google@example.com',
      name: 'Google User',
      avatarUrl: null,
    });

    await expect(service.getAuthUserFromAuthorizationHeader(`Bearer ${oauthToken}`)).resolves.toBeNull();
  });

  it('rejects local bearer tokens when read from cookie-backed oauth session helpers', () => {
    const service = new AuthService(usersServiceMock as any);
    const localToken = service.createLocalAccessToken({
      id: 'user-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    expect(service.getAuthUserFromCookie(`auth_token=${localToken}`)).toBeNull();
  });

  it('rejects expired bearer tokens', async () => {
    const service = new AuthService(usersServiceMock as any);
    const expiredAccessToken = sign(
      {
        sub: 'user-1',
        provider: 'local',
        email: 'local@example.com',
        name: 'Expired Local User',
        picture: null,
        tokenType: 'access',
      },
      process.env.JWT_ACCESS_SECRET ?? 'local-secret',
      { expiresIn: -1 },
    );

    await expect(service.getAuthUserFromAuthorizationHeader(`Bearer ${expiredAccessToken}`)).resolves.toBeNull();
  });

  it('does not accept access_token query fallback', async () => {
    const service = new AuthService(usersServiceMock as any);
    const token = service.createLocalAccessToken({
      id: 'user-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    await expect(
      service.getAuthUserFromRequest({
        headers: {},
        query: { access_token: token } as any,
        path: '/api/planning/stream',
      } as any),
    ).resolves.toBeNull();
  });

  it('accepts planning stream session token only for planning stream path', async () => {
    const service = new AuthService(usersServiceMock as any);
    const session = service.issuePlanningStreamSession('user-1');

    await expect(
      service.getAuthUserFromRequest({
        headers: {},
        query: { stream_session: session.token } as any,
        path: '/api/planning/stream',
      } as any),
    ).resolves.toMatchObject({
      id: 'user-1',
      provider: 'local',
    });

    await expect(
      service.getAuthUserFromRequest({
        headers: {},
        query: { stream_session: session.token } as any,
        path: '/api/planning/dashboard',
      } as any),
    ).resolves.toBeNull();
  });

  it('issues and validates planning websocket session token', () => {
    const service = new AuthService(usersServiceMock as any);
    const session = service.issuePlanningWebSocketSession('user-1');

    const decoded = service.getAuthUserFromPlanningWebSocketSessionToken(session.token);
    expect(decoded).toMatchObject({
      id: 'user-1',
      provider: 'local',
    });
  });

  it('blocks local signup when email already belongs to Google account', async () => {
    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'google',
      passwordHash: null,
      displayName: 'Google User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
    });

    const service = new AuthService(usersServiceMock as any);

    await expect(service.signupLocal('local@example.com', 'Password123!')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('assigns citizen as the default role for self-service local signup', async () => {
    usersServiceMock.findByEmail.mockResolvedValueOnce(null);
    usersServiceMock.createLocalUser.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
      passwordHash: MOCK_HASH_VALUE,
      displayName: 'Local User',
      avatarUrl: null,
      role: 'citizen',
      isActive: true,
    });
    usersServiceMock.getRolesForUser.mockResolvedValueOnce([{ id: 'role-citizen', name: 'citizen' }]);

    const service = new AuthService(usersServiceMock as any);
    const result = await service.signupLocal('local@example.com', 'Password123!', 'Local User');

    expect(usersServiceMock.createLocalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'local@example.com',
        displayName: 'Local User',
        defaultRoleName: 'citizen',
      }),
    );
    expect(result.user).toMatchObject({
      role: 'citizen',
      roles: [{ id: 'role-citizen', name: 'citizen' }],
      provider: 'local',
    });
  });

  it('returns Unauthorized for invalid local login credentials', async () => {
    const { default: bcryptPkg } = await import('bcryptjs');
    const validPasswordHash = await bcryptPkg.hash('Password123!', 10);

    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
      passwordHash: validPasswordHash,
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
    });

    const service = new AuthService(usersServiceMock as any);
    await expect(service.loginLocal('local@example.com', 'WrongPass123!')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns dev reset URL outside production and stores only token hash', async () => {
    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
    });

    const service = new AuthService(usersServiceMock as any);
    const response = await service.createPasswordReset('local@example.com');

    expect(response.statusCode).toBe(200);
    expect((response.body as any).devResetUrl).toContain('/reset-password?token=');

    const createCall = usersServiceMock.createPasswordResetToken.mock.calls[0]?.[0];
    expect(createCall.tokenHash).toBeTypeOf('string');
    expect(createCall.tokenHash).not.toContain('http');
  });

  it('returns 204 in production for forgot-password without reset URL', async () => {
    process.env.NODE_ENV = 'production';
    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
    });

    const service = new AuthService(usersServiceMock as any);
    const response = await service.createPasswordReset('local@example.com');

    expect(response).toEqual({ statusCode: 204 });
  });

  it('issues a one-time exchange code for local login and exchanges it for JWT + user', async () => {
    const { default: bcryptPkg } = await import('bcryptjs');
    const validPasswordHash = await bcryptPkg.hash('Password123!', 10);

    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
      passwordHash: validPasswordHash,
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
    });
    usersServiceMock.getRolesForUser.mockResolvedValue([{ id: 'role-1', name: 'agent' }]);

    const service = new AuthService(usersServiceMock as any);
    const loginResponse = await service.loginLocal('local@example.com', 'Password123!');
    expect(loginResponse.code).toBeTypeOf('string');
    expect(loginResponse.accessToken).toBeTypeOf('string');
    expect(loginResponse.user).toMatchObject({
      id: 'u-1',
      provider: 'local',
      roles: [{ id: 'role-1', name: 'agent' }],
    });

    const session = await service.exchangeCode(loginResponse.code);
    expect(session.accessToken).toBeTypeOf('string');
    expect(session.user).toMatchObject({
      id: 'u-1',
      provider: 'local',
      roles: [{ id: 'role-1', name: 'agent' }],
    });

    await expect(service.exchangeCode(loginResponse.code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('updates current user profile display name for local bearer user', async () => {
    const service = new AuthService(usersServiceMock as any);
    const accessToken = service.createLocalAccessToken({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
    });
    usersServiceMock.updateUserProfile.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Updated Name',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
    });
    usersServiceMock.getRolesForUser.mockResolvedValueOnce([{ id: 'role-1', name: 'agent' }]);

    await expect(
      service.updateCurrentUserProfile(
        { headers: { authorization: `Bearer ${accessToken}` } } as any,
        {
          displayName: 'Updated Name',
          avatarUrl: 'https://cdn.ecotrack.dev/updated.png',
        },
      ),
    ).resolves.toMatchObject({
      id: 'u-1',
      displayName: 'Updated Name',
      roles: [{ id: 'role-1', name: 'agent' }],
    });

    expect(usersServiceMock.updateUserProfile).toHaveBeenCalledWith('u-1', {
      displayName: 'Updated Name',
      avatarUrl: 'https://cdn.ecotrack.dev/updated.png',
    });
  });

  it('changes password for local bearer user and revokes reset tokens', async () => {
    const { default: bcryptPkg } = await import('bcryptjs');
    const currentPasswordHash = await bcryptPkg.hash('CurrentPass123!', 10);
    const service = new AuthService(usersServiceMock as any);
    const accessToken = service.createLocalAccessToken({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      authProvider: 'local',
      passwordHash: currentPasswordHash,
    });
    usersServiceMock.updatePasswordHash.mockResolvedValueOnce({ id: 'u-1' });

    await expect(
      service.changeCurrentUserPassword(
        { headers: { authorization: `Bearer ${accessToken}` } } as any,
        {
          currentPassword: 'CurrentPass123!',
          newPassword: 'UpdatedPass123!',
        },
      ),
    ).resolves.toEqual({ success: true });

    expect(usersServiceMock.updatePasswordHash).toHaveBeenCalledTimes(1);
    expect(usersServiceMock.consumeAllPasswordResetTokensForUser).toHaveBeenCalledWith('u-1');
  });

  it('rejects password change for Google account users', async () => {
    const service = new AuthService(usersServiceMock as any);
    const accessToken = service.createLocalAccessToken({
      id: 'u-1',
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: null,
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      authProvider: 'google',
      passwordHash: null,
    });

    await expect(
      service.changeCurrentUserPassword(
        { headers: { authorization: `Bearer ${accessToken}` } } as any,
        {
          currentPassword: 'CurrentPass123!',
          newPassword: 'UpdatedPass123!',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects password change when new password matches current password', async () => {
    const { default: bcryptPkg } = await import('bcryptjs');
    const currentPasswordHash = await bcryptPkg.hash('CurrentPass123!', 10);
    const service = new AuthService(usersServiceMock as any);
    const accessToken = service.createLocalAccessToken({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      authProvider: 'local',
      passwordHash: currentPasswordHash,
    });

    await expect(
      service.changeCurrentUserPassword(
        { headers: { authorization: `Bearer ${accessToken}` } } as any,
        {
          currentPassword: 'CurrentPass123!',
          newPassword: 'CurrentPass123!',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});


