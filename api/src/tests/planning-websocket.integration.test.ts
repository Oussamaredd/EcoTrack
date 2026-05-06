import type { AddressInfo } from 'node:net';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type AuthServiceModule = typeof import('../modules/auth/auth.service.js');
type PlanningControllerModule = typeof import('../modules/routes/planning.controller.js');
type PlanningGatewayModule = typeof import('../modules/routes/planning.gateway.js');
type PlanningServiceModule = typeof import('../modules/routes/planning.service.js');

const originalPlanningWebsocketEnabled = process.env.PLANNING_WEBSOCKET_ENABLED;
const originalPlanningRealtimeIntervalMs = process.env.PLANNING_REALTIME_INTERVAL_MS;

const restoreEnv = (key: 'PLANNING_WEBSOCKET_ENABLED' | 'PLANNING_REALTIME_INTERVAL_MS', value?: string) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

const waitForSocketEvent = <T = unknown>(socket: Socket, event: string, timeoutMs = 2_500) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for socket event: ${event}`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(event, handleEvent);
      socket.off('connect_error', handleError);
    };

    const handleEvent = (payload: T) => {
      cleanup();
      resolve(payload);
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once(event, handleEvent);
    socket.once('connect_error', handleError);
  });

describe('Planning websocket transport', () => {
  const authUser = {
    id: 'ce320a88-fec0-4b2a-914a-242f8844f74f',
    role: 'manager',
    roles: [{ id: 'role-manager', name: 'manager' }],
    permissions: ['ecotrack.analytics.read'],
  };
  const planningServiceMock = {
    subscribeRealtimeEvents: vi.fn(),
    hasActiveWebSocketConnections: vi.fn(),
    hasRealtimeRoleAccess: vi.fn(),
    registerWebSocketConnection: vi.fn(),
    unregisterWebSocketConnection: vi.fn(),
    registerWebSocketAuthFailure: vi.fn(),
    recordEmittedEvent: vi.fn(),
    getRealtimeDashboardSnapshotEvent: vi.fn(),
    issueWebSocketSession: vi.fn(),
  };
  const authServiceMock = {
    resolveActiveUserFromRequest: vi.fn(),
    resolveActiveUserFromPlanningWebSocketSessionToken: vi.fn(),
  };

  let app: INestApplication;
  let baseUrl: string;
  let PlanningController: PlanningControllerModule['PlanningController'];
  let PlanningGateway: PlanningGatewayModule['PlanningGateway'];
  let PlanningService: PlanningServiceModule['PlanningService'];
  let AuthService: AuthServiceModule['AuthService'];

  beforeAll(async () => {
    vi.resetModules();
    process.env.PLANNING_WEBSOCKET_ENABLED = 'true';
    process.env.PLANNING_REALTIME_INTERVAL_MS = '1000';

    ({ AuthService } = await import('../modules/auth/auth.service.js'));
    ({ PlanningController } = await import('../modules/routes/planning.controller.js'));
    ({ PlanningGateway } = await import('../modules/routes/planning.gateway.js'));
    ({ PlanningService } = await import('../modules/routes/planning.service.js'));

    const moduleRef = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        PlanningGateway,
        { provide: PlanningService, useValue: planningServiceMock },
        { provide: AuthService, useValue: authServiceMock },
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
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    planningServiceMock.subscribeRealtimeEvents.mockReturnValue(() => undefined);
    planningServiceMock.hasActiveWebSocketConnections.mockReturnValue(true);
    planningServiceMock.hasRealtimeRoleAccess.mockReturnValue(true);
    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockResolvedValue({
      id: 'evt-1',
      event: 'planning.dashboard.snapshot',
      data: { timestamp: '2026-05-06T00:00:00.000Z' },
    });
    planningServiceMock.issueWebSocketSession.mockReturnValue({
      token: 'ws-token',
      expiresAt: '2026-05-06T00:02:00.000Z',
      expiresInSeconds: 120,
    });
    authServiceMock.resolveActiveUserFromRequest.mockResolvedValue(authUser);
    authServiceMock.resolveActiveUserFromPlanningWebSocketSessionToken.mockResolvedValue(authUser);
  });

  afterAll(async () => {
    restoreEnv('PLANNING_WEBSOCKET_ENABLED', originalPlanningWebsocketEnabled);
    restoreEnv('PLANNING_REALTIME_INTERVAL_MS', originalPlanningRealtimeIntervalMs);
    await app?.close();
    vi.resetModules();
  });

  it('issues an authorized websocket session and accepts a Socket.IO connection on the planning path', async () => {
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/planning/ws-session')
      .expect(201);

    expect(sessionResponse.body).toEqual(
      expect.objectContaining({
        token: 'ws-token',
        expiresInSeconds: 120,
      }),
    );

    const socket = io(baseUrl, {
      auth: { sessionToken: sessionResponse.body.token },
      forceNew: true,
      path: '/api/planning/ws',
      timeout: 2_500,
      transports: ['websocket'],
    });

    try {
      await waitForSocketEvent(socket, 'connect');
      const snapshot = await waitForSocketEvent(socket, 'planning.dashboard.snapshot');
      expect(snapshot).toEqual(
        expect.objectContaining({
          event: 'planning.dashboard.snapshot',
        }),
      );
      expect(authServiceMock.resolveActiveUserFromPlanningWebSocketSessionToken).toHaveBeenCalledWith('ws-token');
      expect(planningServiceMock.registerWebSocketConnection).toHaveBeenCalledTimes(1);
    } finally {
      socket.disconnect();
    }
  });

  it('rejects websocket connections that omit the planning session token', async () => {
    const socket = io(baseUrl, {
      forceNew: true,
      path: '/api/planning/ws',
      timeout: 2_500,
      transports: ['websocket'],
    });

    try {
      await waitForSocketEvent(socket, 'disconnect');
      expect(planningServiceMock.registerWebSocketAuthFailure).toHaveBeenCalledTimes(1);
    } finally {
      socket.disconnect();
    }
  });

  it('handles the Socket.IO handshake path outside Nest REST routing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/planning/ws/')
      .query({ EIO: '4', transport: 'polling' });

    expect(response.status).not.toBe(404);
    expect(response.text).not.toContain('Cannot GET /api/planning/ws/');
  });
});
