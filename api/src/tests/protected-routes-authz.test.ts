import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../modules/auth/auth.service.js';
import { AuthenticatedUserGuard } from '../modules/auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../modules/auth/permissions.guard.js';
import { DashboardController } from '../modules/dashboard/dashboard.controller.js';
import { DashboardService } from '../modules/dashboard/dashboard.service.js';
import { TicketsController } from '../modules/tickets/tickets.controller.js';
import { TicketsService } from '../modules/tickets/tickets.service.js';
import { UsersService } from '../modules/users/users.service.js';

describe('Protected API route authorization', () => {
  const authCookie = 'auth_token=valid';
  const authUser = {
    provider: 'google' as const,
    id: 'google-user-1',
    email: 'agent@example.com',
    name: 'Agent User',
    avatarUrl: null,
  };

  const baseDbUser = {
    id: 'e03d7d10-509f-45bc-b22d-98cb8b016f03',
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'agent',
    isActive: true,
  };

  const authServiceMock = {
    resolveActiveUserFromRequest: vi.fn(),
  };

  const usersServiceMock = {
    ensureUserForAuth: vi.fn(),
    getRolesForUser: vi.fn(),
  };

  const ticketsServiceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    listComments: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    listActivity: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const dashboardServiceMock = {
    getDashboard: vi.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController, DashboardController],
      providers: [
        { provide: TicketsService, useValue: ticketsServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        AuthenticatedUserGuard,
        PermissionsGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    usersServiceMock.ensureUserForAuth.mockResolvedValue(baseDbUser);
    usersServiceMock.getRolesForUser.mockResolvedValue([]);
    authServiceMock.resolveActiveUserFromRequest.mockImplementation(
      async (request?: { headers?: { cookie?: string } }) => {
        if (!request?.headers?.cookie) {
          return null;
        }

        const dbUser = await usersServiceMock.ensureUserForAuth(authUser);
        if (!dbUser) {
          return null;
        }

        const roles = await usersServiceMock.getRolesForUser(dbUser.id);
        const permissions = Array.from(
          new Set(
            roles.flatMap((role: { permissions?: unknown }) =>
              Array.isArray(role.permissions)
                ? role.permissions
                    .filter((permission): permission is string => typeof permission === 'string')
                    .map((permission) => permission.trim().toLowerCase())
                : [],
            ),
          ),
        );

        return {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.displayName,
          role: dbUser.role,
          roles: roles.map((role: { id: string; name: string }) => ({
            id: role.id,
            name: role.name,
          })),
          permissions,
          isActive: dbUser.isActive,
        };
      },
    );

    ticketsServiceMock.findAll.mockResolvedValue({ tickets: [], total: 0 });
    ticketsServiceMock.create.mockResolvedValue({ id: 'ticket-1', title: 'New ticket' });
    dashboardServiceMock.getDashboard.mockResolvedValue({
      summary: { total: 0, open: 0, completed: 0, assigned: 0 },
      statusBreakdown: {},
      recentActivity: [],
      recentTickets: [],
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 401 on protected route when auth cookie is missing', async () => {
    await request(app.getHttpServer()).get('/api/tickets').expect(401);
    expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated user lacks required read permission', async () => {
    usersServiceMock.ensureUserForAuth.mockResolvedValue({ ...baseDbUser, role: 'auditor' });
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-auditor', name: 'auditor', permissions: [] },
    ]);

    await request(app.getHttpServer()).get('/api/dashboard').set('Cookie', authCookie).expect(403);
    expect(dashboardServiceMock.getDashboard).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated user lacks required write permission', async () => {
    usersServiceMock.ensureUserForAuth.mockResolvedValue({ ...baseDbUser, role: 'manager' });
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-manager', name: 'manager', permissions: ['tickets.read'] },
    ]);

    await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Cookie', authCookie)
      .send({ title: 'Blocked write' })
      .expect(403);

    expect(ticketsServiceMock.create).not.toHaveBeenCalled();
  });

  it('allows read-only ticket users to create comments', async () => {
    usersServiceMock.ensureUserForAuth.mockResolvedValue({ ...baseDbUser, role: 'manager' });
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-manager', name: 'manager', permissions: ['tickets.read'] },
    ]);
    ticketsServiceMock.addComment.mockResolvedValue({
      id: '9d938f2e-3cd4-49c8-a3a7-c5fb63f4cb3c',
      body: 'Visibility update',
    });

    await request(app.getHttpServer())
      .post('/api/tickets/48c60b65-434f-4a08-bb5a-bf1fa5c0eabc/comments')
      .set('Cookie', authCookie)
      .send({ body: 'Visibility update' })
      .expect(201);

    expect(ticketsServiceMock.addComment).toHaveBeenCalledWith(
      '48c60b65-434f-4a08-bb5a-bf1fa5c0eabc',
      'Visibility update',
      {
        id: baseDbUser.id,
        role: 'manager',
        roles: [{ id: 'role-manager', name: 'manager' }],
      },
    );
  });

  it('returns 403 for dashboard when user lacks analytics permission', async () => {
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-agent', name: 'agent', permissions: ['tickets.read'] },
    ]);

    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Cookie', authCookie)
      .expect(403);
  });

  it('allows authenticated user with analytics permission to access protected read endpoints', async () => {
    usersServiceMock.ensureUserForAuth.mockResolvedValue({ ...baseDbUser, role: 'manager' });
    usersServiceMock.getRolesForUser.mockResolvedValue([
      {
        id: 'role-manager',
        name: 'manager',
        permissions: ['tickets.read', 'ecotrack.analytics.read'],
      },
    ]);

    await request(app.getHttpServer()).get('/api/tickets').set('Cookie', authCookie).expect(200);
    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Cookie', authCookie)
      .expect(200);
  });

  it('allows authenticated user with write permission to access protected write endpoints', async () => {
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-agent', name: 'agent', permissions: ['tickets.read', 'tickets.write'] },
    ]);

    await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Cookie', authCookie)
      .send({ title: 'New ticket' })
      .expect(201);

    expect(ticketsServiceMock.create).toHaveBeenCalledWith({ title: 'New ticket' });
  });
});


