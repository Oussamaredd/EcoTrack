import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AuthenticatedUserGuard } from '../modules/auth/authenticated-user.guard.js';

describe('AuthenticatedUserGuard permission resolution', () => {
  it('does not inject fallback permissions when DB roles have none', async () => {
    const request: Record<string, unknown> = {};
    const authServiceMock = {
      resolveActiveUserFromRequest: vi.fn().mockResolvedValue({
        id: 'oauth-user-1',
        email: 'manager@example.com',
        displayName: 'Manager',
        role: 'manager',
        roles: [{ id: 'role-manager', name: 'manager' }],
        permissions: [],
        isActive: true,
      }),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(request.authUser).toEqual(
      expect.objectContaining({
        id: 'oauth-user-1',
        role: 'manager',
        permissions: [],
      }),
    );
  });

  it('aggregates only explicit DB role permissions', async () => {
    const request: Record<string, unknown> = {};
    const authServiceMock = {
      resolveActiveUserFromRequest: vi.fn().mockResolvedValue({
        id: 'oauth-user-2',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        roles: [{ id: 'role-admin', name: 'admin' }],
        permissions: ['tickets.read', 'tickets.write'],
        isActive: true,
      }),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(request.authUser).toEqual(
      expect.objectContaining({
        permissions: ['tickets.read', 'tickets.write'],
      }),
    );
  });

  it('returns forbidden for inactive users', async () => {
    const authServiceMock = {
      resolveActiveUserFromRequest: vi
        .fn()
        .mockRejectedValue(new ForbiddenException('User account is inactive')),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns unauthorized when auth identity is missing', async () => {
    const authServiceMock = {
      resolveActiveUserFromRequest: vi.fn().mockResolvedValue(null),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

