import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PlanningGateway } from '../modules/routes/planning.gateway.js';

describe('PlanningGateway', () => {
  let activeWebSocketConnections = 0;

  const planningServiceMock = {
    subscribeRealtimeEvents: vi.fn(),
    createKeepaliveEvent: vi.fn(),
    getRealtimeDashboardSnapshotEvent: vi.fn(),
    hasActiveWebSocketConnections: vi.fn(),
    hasRealtimeRoleAccess: vi.fn(),
    registerWebSocketConnection: vi.fn(),
    unregisterWebSocketConnection: vi.fn(),
    registerWebSocketAuthFailure: vi.fn(),
    recordEmittedEvent: vi.fn(),
  };

  const authServiceMock = {
    resolveActiveUserFromPlanningWebSocketSessionToken: vi.fn(),
  };

  const serverEmit = vi.fn();
  const unsubscribe = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    activeWebSocketConnections = 0;

    planningServiceMock.subscribeRealtimeEvents.mockReturnValue(unsubscribe);
    planningServiceMock.createKeepaliveEvent.mockReturnValue({
      id: 'keepalive-1',
      event: 'system.keepalive',
      data: { timestamp: '2026-02-23T00:00:00.000Z' },
    });
    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockResolvedValue({
      id: 'snapshot-1',
      event: 'planning.dashboard.snapshot',
      data: { timestamp: '2026-02-23T00:00:00.000Z' },
    });
    planningServiceMock.hasActiveWebSocketConnections.mockImplementation(
      () => activeWebSocketConnections > 0,
    );
    planningServiceMock.hasRealtimeRoleAccess.mockReturnValue(true);
    planningServiceMock.registerWebSocketConnection.mockImplementation(() => {
      activeWebSocketConnections += 1;
    });
    planningServiceMock.unregisterWebSocketConnection.mockImplementation(() => {
      activeWebSocketConnections = Math.max(0, activeWebSocketConnections - 1);
    });

    authServiceMock.resolveActiveUserFromPlanningWebSocketSessionToken.mockResolvedValue({
      id: 'user-1',
      email: null,
      displayName: 'Manager',
      role: 'manager',
      roles: [{ id: 'r1', name: 'manager' }],
      permissions: [],
      isActive: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits planning events and periodic snapshots only while websocket clients are connected', async () => {
    const gateway = new PlanningGateway(planningServiceMock as any, authServiceMock as any);
    (gateway as any).server = { emit: serverEmit };

    gateway.onModuleInit();

    const listener = planningServiceMock.subscribeRealtimeEvents.mock.calls[0]?.[0];
    listener?.({ id: 'evt-1', event: 'planning.tour.updated', data: { tourId: 't1' } });
    expect(serverEmit).not.toHaveBeenCalled();

    const client = {
      handshake: { auth: { sessionToken: 'ws-token' }, query: {} },
      data: {},
      disconnect: vi.fn(),
      emit: vi.fn(),
    } as any;

    await gateway.handleConnection(client);

    listener?.({ id: 'evt-2', event: 'planning.tour.updated', data: { tourId: 't2' } });
    expect(serverEmit).toHaveBeenCalledWith('planning.tour.updated', {
      id: 'evt-2',
      event: 'planning.tour.updated',
      data: { tourId: 't2' },
    });
    expect(planningServiceMock.recordEmittedEvent).toHaveBeenCalledWith('planning.tour.updated');

    vi.advanceTimersByTime(300_000);
    await Promise.resolve();
    expect(serverEmit).toHaveBeenCalledWith('planning.dashboard.snapshot', expect.any(Object));

    serverEmit.mockClear();
    gateway.handleDisconnect(client);
    vi.advanceTimersByTime(300_000);
    await Promise.resolve();
    expect(serverEmit).not.toHaveBeenCalled();

    gateway.onModuleDestroy();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('disconnects socket when auth token is invalid', async () => {
    authServiceMock.resolveActiveUserFromPlanningWebSocketSessionToken.mockResolvedValue(null);

    const gateway = new PlanningGateway(planningServiceMock as any, authServiceMock as any);

    const disconnect = vi.fn();
    const client = {
      handshake: { auth: { sessionToken: 'bad-token' }, query: {} },
      data: {},
      disconnect,
      emit: vi.fn(),
    } as any;

    await gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalledWith(true);
    expect(planningServiceMock.registerWebSocketAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('authorizes socket and sends initial snapshot', async () => {
    const gateway = new PlanningGateway(planningServiceMock as any, authServiceMock as any);

    const emit = vi.fn();
    const client = {
      handshake: { auth: { sessionToken: 'ws-token' }, query: {} },
      data: {},
      disconnect: vi.fn(),
      emit,
    } as any;

    await gateway.handleConnection(client);

    expect(client.data.authUserId).toBe('user-1');
    expect(planningServiceMock.registerWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('planning.dashboard.snapshot', expect.any(Object));

    gateway.handleDisconnect(client);
    expect(planningServiceMock.unregisterWebSocketConnection).toHaveBeenCalledTimes(1);
  });

  it('cleans up the active websocket count when the initial snapshot fails', async () => {
    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockRejectedValueOnce(
      new Error('snapshot unavailable'),
    );

    const gateway = new PlanningGateway(planningServiceMock as any, authServiceMock as any);

    const client = {
      handshake: { auth: { sessionToken: 'ws-token' }, query: {} },
      data: {},
      disconnect: vi.fn(),
      emit: vi.fn(),
    } as any;

    await gateway.handleConnection(client);

    expect(planningServiceMock.registerWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(planningServiceMock.unregisterWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(activeWebSocketConnections).toBe(0);
    expect(client.data.authUserId).toBeUndefined();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('logs the underlying snapshot error during interval refresh failures', async () => {
    const gateway = new PlanningGateway(planningServiceMock as any, authServiceMock as any);
    const loggerWarnSpy = vi
      .spyOn((gateway as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const client = {
      handshake: { auth: { sessionToken: 'ws-token' }, query: {} },
      data: {},
      disconnect: vi.fn(),
      emit: vi.fn(),
    } as any;

    await gateway.handleConnection(client);

    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockRejectedValueOnce(
      new Error('snapshot unavailable'),
    );

    vi.advanceTimersByTime(300_000);
    await Promise.resolve();

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Failed to publish websocket dashboard snapshot: snapshot unavailable',
    );

    gateway.onModuleDestroy();
  });
});

