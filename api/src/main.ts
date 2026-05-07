import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { Duplex } from 'node:stream';

import type { LogLevel } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { resolveApiPort } from './config/api-port.js';
import { isCorsOriginAllowed, resolveCorsOrigins } from './config/cors-origins.js';
import { ensureApiEnvLoaded } from './config/env-file.js';
import { buildLivenessPayload } from './modules/health/health.payloads.js';
import { startTelemetry } from './observability/tracing.js';

type ClientErrorWithPacket = Error & {
  code?: string;
  bytesParsed?: number;
  rawPacket?: Buffer;
};

type ClientErrorSocket = Duplex & {
  remoteAddress?: string;
};

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

const CORS_ALLOWED_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
const CORS_DEFAULT_ALLOWED_HEADERS =
  'Authorization,Content-Type,Accept,Origin,X-Requested-With,Sentry-Trace,Baggage';
const CORS_EXPOSED_HEADERS = 'X-Request-Id';
const CORS_PREFLIGHT_MAX_AGE_SECONDS = '600';

const resolveNestLoggerOption = (
  nodeEnv: string | undefined,
  logLevel: string | undefined,
): false | LogLevel[] => {
  const normalizedEnv = nodeEnv?.trim().toLowerCase() ?? 'development';
  const normalizedLevel = logLevel?.trim().toLowerCase();

  if (normalizedEnv === 'production') {
    return ['error', 'warn', 'log'];
  }

  if (normalizedLevel === 'debug' || normalizedLevel === 'trace') {
    return ['error', 'warn', 'log', 'debug', 'verbose'];
  }

  return false;
};

const extractRawHeaderValue = (rawPacket: Buffer | undefined, headerName: string) => {
  if (!rawPacket) {
    return null;
  }

  const rawRequest = rawPacket.toString('latin1');
  const normalizedHeaderName = headerName.toLowerCase();
  const headerLines = rawRequest.split(/\r?\n/).slice(1);

  for (const line of headerLines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim().toLowerCase();
    if (name === normalizedHeaderName) {
      return line.slice(separatorIndex + 1).trim();
    }
  }

  return null;
};

const extractRawRequestLine = (rawPacket: Buffer | undefined) => {
  if (!rawPacket) {
    return null;
  }

  const rawRequest = rawPacket.toString('latin1');
  const requestLine = rawRequest.split(/\r?\n/, 1)[0] ?? '';
  return /^[A-Z]{3,12}\s+\S+\s+HTTP\/\d(?:\.\d)?$/.test(requestLine) ? requestLine : null;
};

const resolveAllowedClientErrorOrigin = (rawPacket: Buffer | undefined) => {
  const origin = extractRawHeaderValue(rawPacket, 'origin');
  if (!origin) {
    return null;
  }

  let allowedOrigins: string[];
  try {
    allowedOrigins = resolveCorsOrigins({
      corsOrigins: process.env.CORS_ORIGINS,
      clientOrigin: process.env.CLIENT_ORIGIN,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch {
    return null;
  }

  return isCorsOriginAllowed({
    origin,
    allowedOrigins,
    nodeEnv: process.env.NODE_ENV,
  })
    ? origin
    : null;
};

const createCorsOriginDelegate =
  (allowedOrigins: string[]) => (origin: string | undefined, callback: CorsOriginCallback) => {
    callback(
      null,
      isCorsOriginAllowed({
        origin,
        allowedOrigins,
        nodeEnv: process.env.NODE_ENV,
      }),
    );
  };

const createBootstrapCorsMiddleware =
  (allowedOrigins: string[]) => (request: Request, response: Response, next: NextFunction) => {
    const origin =
      typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
    const isAllowed = isCorsOriginAllowed({
      origin,
      allowedOrigins,
      nodeEnv: process.env.NODE_ENV,
    });

    if (origin && isAllowed) {
      // The request origin is emitted only after resolveCorsOrigins/isCorsOriginAllowed allow-list validation.
      response.setHeader('Access-Control-Allow-Origin', origin); // nosemgrep: javascript.express.security.cors-misconfiguration.cors-misconfiguration
      response.vary('Origin');
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS);
      response.setHeader('Access-Control-Expose-Headers', CORS_EXPOSED_HEADERS);

      const requestedHeaders = request.headers['access-control-request-headers'];
      response.setHeader(
        'Access-Control-Allow-Headers',
        typeof requestedHeaders === 'string' && requestedHeaders.trim().length > 0
          ? requestedHeaders
          : CORS_DEFAULT_ALLOWED_HEADERS,
      );
      response.setHeader('Access-Control-Max-Age', CORS_PREFLIGHT_MAX_AGE_SECONDS);
    }

    if (request.method === 'OPTIONS' && origin && isAllowed) {
      response.status(204).end();
      return;
    }

    next();
  };

const writeClientErrorResponse = ({
  socket,
  statusCode,
  requestId,
  corsOrigin,
}: {
  socket: ClientErrorSocket;
  statusCode: number;
  requestId: string;
  corsOrigin: string | null;
}) => {
  if (!socket.writable) {
    return;
  }

  const statusText =
    statusCode === 431 ? 'Request Header Fields Too Large' : 'Bad Request';
  const payload = JSON.stringify({
    statusCode,
    message: statusText,
    requestId,
  });
  const corsHeaders = corsOrigin
    ? `Access-Control-Allow-Origin: ${corsOrigin}\r\nVary: Origin\r\n`
    : '';

  socket.end(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
      'Content-Type: application/json; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(payload)}\r\n` +
      'Connection: close\r\n' +
      `X-Request-Id: ${requestId}\r\n` +
      corsHeaders +
      '\r\n' +
      payload,
  );
};

const attachClientErrorLogging = (server: Server) => {
  server.on('clientError', (error: ClientErrorWithPacket, socket) => {
    const clientSocket = socket as ClientErrorSocket;
    const requestId = randomUUID();
    const statusCode = error.code === 'HPE_HEADER_OVERFLOW' ? 431 : 400;
    const corsOrigin = resolveAllowedClientErrorOrigin(error.rawPacket);

    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'request rejected before Nest middleware',
        requestId,
        statusCode,
        code: error.code ?? null,
        error: error.message,
        bytesParsed: error.bytesParsed ?? null,
        rawPacketBytes: error.rawPacket?.byteLength ?? null,
        requestLine: extractRawRequestLine(error.rawPacket),
        origin: extractRawHeaderValue(error.rawPacket, 'origin'),
        remoteAddress: clientSocket.remoteAddress ?? null,
      }),
    );

    writeClientErrorResponse({
      socket: clientSocket,
      statusCode,
      requestId,
      corsOrigin,
    });
  });
};

async function bootstrap() {
  ensureApiEnvLoaded();
  const port = resolveApiPort(process.env as Record<string, unknown>);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const expressModule = await import('express');
  const expressFactory = expressModule.default;
  const expressApp = expressFactory();
  const { json, urlencoded } = expressModule;
  const origins = resolveCorsOrigins({
    corsOrigins: process.env.CORS_ORIGINS,
    clientOrigin: process.env.CLIENT_ORIGIN,
    nodeEnv: process.env.NODE_ENV,
  });

  const writeLivenessResponse = (_request: Request, response: Response) => {
    response.status(200).json(buildLivenessPayload());
  };

  expressApp.set('trust proxy', 1);
  expressApp.use(createBootstrapCorsMiddleware(origins));
  expressApp.get('/health', writeLivenessResponse);
  expressApp.get('/healthz', writeLivenessResponse);
  expressApp.get('/startupz', writeLivenessResponse);

  const telemetry = await startTelemetry(process.env);
  let telemetryShutdownRegistered = false;
  let telemetryShutdownStarted = false;
  let server: Server | null = null;

  const shutdownTelemetry = async () => {
    if (telemetryShutdownStarted) {
      return;
    }

    telemetryShutdownStarted = true;
    await telemetry.shutdown();
  };

  try {
    const [
      nestCommon,
      nestCore,
      platformExpressImport,
      compressionModule,
      helmetModule,
      nestPino,
      appModuleImport,
      exceptionFilterImport,
      requestIdMiddlewareImport,
      traceContextMiddlewareImport,
      healthServiceImport,
      rootHealthRoutesImport,
    ] = await Promise.all([
      import('@nestjs/common'),
      import('@nestjs/core'),
      import('@nestjs/platform-express'),
      import('compression'),
      import('helmet'),
      import('nestjs-pino'),
      import('./app.module.js'),
      import('./common/filters/http-exception.filter.js'),
      import('./common/middleware/request-id.middleware.js'),
      import('./common/middleware/trace-context.middleware.js'),
      import('./modules/health/health.service.js'),
      import('./modules/health/root-health-routes.js'),
    ]);

    const { Logger: NestLogger, ValidationPipe } = nestCommon;
    const { NestFactory } = nestCore;
    const { ExpressAdapter } = platformExpressImport;
    const compression = compressionModule.default;
    const helmet = helmetModule.default;
    const { Logger } = nestPino;
    const { AppModule } = appModuleImport;
    const { HttpExceptionFilter } = exceptionFilterImport;
    const { requestIdMiddleware } = requestIdMiddlewareImport;
    const { traceContextMiddleware } = traceContextMiddlewareImport;
    const { HealthService } = healthServiceImport;
    const { attachRootHealthRoutes } = rootHealthRoutesImport;
    const { shouldCompressResponse } = await import('./modules/performance/response-compression.js');

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        bufferLogs: true,
        logger: resolveNestLoggerOption(process.env.NODE_ENV, process.env.LOG_LEVEL),
      },
    );

    app.useLogger(app.get(Logger));
    app.flushLogs();

    app.use(traceContextMiddleware);
    app.use(requestIdMiddleware);
    app.use(json({ limit: '5mb' }));
    app.use(
      urlencoded({
        extended: true,
        limit: '5mb',
      }),
    );
    app.use(
      helmet({
        contentSecurityPolicy: false,
      }),
    );
    if (process.env.RESPONSE_COMPRESSION_ENABLED?.trim().toLowerCase() !== 'false') {
      const thresholdBytes = Number(process.env.RESPONSE_COMPRESSION_THRESHOLD_BYTES ?? 1024);
      const level = Number(process.env.RESPONSE_COMPRESSION_LEVEL ?? 6);
      app.use(
        compression({
          filter: (request, response) => {
            if (
              !shouldCompressResponse({
                acceptHeader: request.headers.accept,
                requestPath: request.originalUrl ?? request.url,
              })
            ) {
              return false;
            }

            return compression.filter(request, response);
          },
          level: Number.isInteger(level) && level >= -1 && level <= 9 ? level : 6,
          threshold: Number.isFinite(thresholdBytes) && thresholdBytes > 0 ? thresholdBytes : 1024,
        }),
      );
    }

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableCors({
      origin: createCorsOriginDelegate(origins),
      credentials: true,
    });

    if (!telemetryShutdownRegistered) {
      telemetryShutdownRegistered = true;
      process.once('SIGINT', () => {
        void shutdownTelemetry();
      });
      process.once('SIGTERM', () => {
        void shutdownTelemetry();
      });
      process.once('beforeExit', () => {
        void shutdownTelemetry();
      });
    }

    attachRootHealthRoutes(expressApp, app.get(HealthService));
    await app.listen(port, host);
    server = app.getHttpServer() as Server;
    attachClientErrorLogging(server);

    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    NestLogger.log(`API listening on http://${displayHost}:${port}/api`, 'Bootstrap');
  } catch (error) {
    const activeServer = server;
    if (activeServer?.listening) {
      await new Promise<void>((resolve) => {
        activeServer.close(() => resolve());
      });
    }
    await shutdownTelemetry();
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('[Bootstrap] Failed to bootstrap API', error);
  process.exitCode = 1;
});
