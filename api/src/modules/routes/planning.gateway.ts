import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { isCorsOriginAllowed, resolveCorsOrigins } from '../../config/cors-origins.js';
import { loadPlanningRealtimeConfig } from '../../config/runtime-features.js';
import { AuthService } from '../auth/auth.service.js';

import { PlanningService, type PlanningStreamEvent } from './planning.service.js';

const PLANNING_REALTIME_CONFIG = loadPlanningRealtimeConfig(process.env as Record<string, unknown>);
const WS_SNAPSHOT_INTERVAL_MS = PLANNING_REALTIME_CONFIG.messageIntervalMs;
const WS_PING_INTERVAL_MS = PLANNING_REALTIME_CONFIG.messageIntervalMs;
const WS_PING_TIMEOUT_MS = 60_000;
const WS_ALLOWED_ORIGINS = resolveCorsOrigins({
  corsOrigins: process.env.CORS_ORIGINS,
  clientOrigin: process.env.CLIENT_ORIGIN,
  nodeEnv: process.env.NODE_ENV,
});
const isPlanningWebSocketOriginAllowed = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => {
  callback(
    null,
    isCorsOriginAllowed({
      origin,
      allowedOrigins: WS_ALLOWED_ORIGINS,
      nodeEnv: process.env.NODE_ENV,
    }),
  );
};

@Injectable()
@WebSocketGateway({
  path: '/api/planning/ws',
  transports: ['websocket'],
  pingInterval: WS_PING_INTERVAL_MS,
  pingTimeout: WS_PING_TIMEOUT_MS,
  cors: {
    origin: isPlanningWebSocketOriginAllowed,
    credentials: true,
  },
})
export class PlanningGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer() private server!: Server;

  private readonly logger = new Logger(PlanningGateway.name);
  private unsubscribePlanningEvents: (() => void) | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(PlanningService)
    private readonly planningService: PlanningService,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  onModuleInit() {
    if (!PLANNING_REALTIME_CONFIG.websocketEnabled) {
      return;
    }

    this.unsubscribePlanningEvents = this.planningService.subscribeRealtimeEvents((event) => {
      if (!this.planningService.hasActiveWebSocketConnections()) {
        return;
      }

      this.emitEvent(event);
    });
  }

  onModuleDestroy() {
    if (this.unsubscribePlanningEvents) {
      this.unsubscribePlanningEvents();
      this.unsubscribePlanningEvents = null;
    }

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  async handleConnection(client: Socket) {
    if (!PLANNING_REALTIME_CONFIG.websocketEnabled) {
      client.disconnect(true);
      return;
    }

    let isAuthorized = false;
    let registeredConnection = false;

    try {
      const token = this.extractWebSocketSessionToken(client);
      if (!token) {
        throw new UnauthorizedException();
      }

      const authUser = await this.authService.resolveActiveUserFromPlanningWebSocketSessionToken(token);
      if (!authUser) {
        throw new UnauthorizedException();
      }
      const canAccessRealtime = this.planningService.hasRealtimeRoleAccess(
        authUser.role,
        authUser.roles.map((role) => role.name),
      );
      if (!canAccessRealtime) {
        throw new UnauthorizedException();
      }

      isAuthorized = true;
      client.data.authUserId = authUser.id;
      this.planningService.registerWebSocketConnection();
      registeredConnection = true;
      this.ensureSnapshotInterval();
      const snapshotEvent = await this.planningService.getRealtimeDashboardSnapshotEvent();
      this.emitEvent(snapshotEvent, client);
    } catch {
      if (registeredConnection) {
        this.planningService.unregisterWebSocketConnection();
        this.clearSnapshotIntervalIfIdle();
        delete client.data.authUserId;
      }

      if (!isAuthorized) {
        this.planningService.registerWebSocketAuthFailure();
      }

      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (typeof client.data.authUserId === 'string' && client.data.authUserId.length > 0) {
      this.planningService.unregisterWebSocketConnection();
      this.clearSnapshotIntervalIfIdle();
    }

    delete client.data.authUserId;
  }

  private emitEvent(event: PlanningStreamEvent, targetClient?: Socket) {
    if (!targetClient && !this.planningService.hasActiveWebSocketConnections()) {
      return;
    }

    this.planningService.recordEmittedEvent(event.event);

    if (targetClient) {
      targetClient.emit(event.event, event);
      return;
    }

    if (!this.server) {
      return;
    }

    this.server.emit(event.event, event);
  }

  private extractWebSocketSessionToken(client: Socket) {
    const authToken = client.handshake.auth?.sessionToken;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const queryToken = client.handshake.query?.stream_session;
    if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
      return queryToken.trim();
    }

    return null;
  }

  private ensureSnapshotInterval() {
    if (this.snapshotInterval || !this.planningService.hasActiveWebSocketConnections()) {
      return;
    }

    this.snapshotInterval = setInterval(async () => {
      if (!this.planningService.hasActiveWebSocketConnections()) {
        this.clearSnapshotIntervalIfIdle();
        return;
      }

      try {
        const snapshotEvent = await this.planningService.getRealtimeDashboardSnapshotEvent();
        this.emitEvent(snapshotEvent);
      } catch (error) {
        this.logger.warn(
          `Failed to publish websocket dashboard snapshot: ${this.describeError(error)}`,
        );
      }
    }, WS_SNAPSHOT_INTERVAL_MS);
  }

  private clearSnapshotIntervalIfIdle() {
    if (this.snapshotInterval && !this.planningService.hasActiveWebSocketConnections()) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  private describeError(error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Unknown error';
  }
}

