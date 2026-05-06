import { randomUUID } from 'node:crypto';

import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { getRequestIdFromRequest, RESPONSE_REQUEST_ID_HEADER } from '../request-id.js';

type StandardErrorBody = {
  statusCode: number;
  message: string;
  path: string;
  method: string;
  timestamp: string;
  requestId: string;
  details?: unknown;
};

type ErrorDiagnostics = {
  cause?: string;
  code?: unknown;
  severity?: unknown;
  detail?: unknown;
  hint?: unknown;
  schema_name?: unknown;
  table_name?: unknown;
  column_name?: unknown;
};

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const timestamp = new Date().toISOString();
    const requestId = getRequestIdFromRequest(request) ?? randomUUID();

    const normalizedError = this.normalizeException(exception);
    const body: StandardErrorBody = {
      statusCode: normalizedError.statusCode,
      message: normalizedError.message,
      path: request.originalUrl ?? request.url,
      method: request.method,
      timestamp,
      requestId,
      ...(normalizedError.details !== undefined ? { details: normalizedError.details } : {}),
    };

    if (response.headersSent) {
      if (normalizedError.statusCode >= 500) {
        this.logServerError(request, normalizedError, requestId);
      }

      return;
    }

    response.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);
    response.status(normalizedError.statusCode).json(body);

    if (normalizedError.statusCode >= 500) {
      this.logServerError(request, normalizedError, requestId);
    }
  }

  private logServerError(
    request: Request,
    normalizedError: {
      statusCode: number;
      message: string;
      details?: unknown;
      logStack?: string;
      diagnostics?: ErrorDiagnostics;
    },
    requestId: string,
  ) {
    this.logger.error(
      JSON.stringify({
        message: `${request.method} ${request.originalUrl ?? request.url} ${normalizedError.statusCode} (${requestId})`,
        requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode: normalizedError.statusCode,
        error: normalizedError.message,
        ...(normalizedError.diagnostics ?? {}),
      }),
      normalizedError.logStack,
    );
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    message: string;
    details?: unknown;
    logStack?: string;
    diagnostics?: ErrorDiagnostics;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        return { statusCode, message: responseBody };
      }

      if (responseBody && typeof responseBody === 'object') {
        const payload = responseBody as Record<string, unknown>;
        const payloadMessage = payload.message;
        const payloadError = payload.error;

        if (Array.isArray(payloadMessage)) {
          return {
            statusCode,
            message: statusCode === HttpStatus.BAD_REQUEST ? 'Validation failed' : 'Request failed',
            details: payloadMessage,
          };
        }

        if (typeof payloadMessage === 'string') {
          return { statusCode, message: payloadMessage };
        }

        if (typeof payloadError === 'string') {
          return { statusCode, message: payloadError };
        }
      }

      return { statusCode, message: exception.message || 'Request failed' };
    }

    const fallbackMessage =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : exception instanceof Error && exception.message
          ? exception.message
          : 'Internal server error';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: fallbackMessage,
      logStack: exception instanceof Error ? exception.stack : undefined,
      diagnostics: this.extractErrorDiagnostics(exception),
    };
  }

  private extractErrorDiagnostics(exception: unknown): ErrorDiagnostics | undefined {
    const exceptionRecord = this.asErrorRecord(exception);
    const causeRecord = this.asErrorRecord(
      exception instanceof Error ? exception.cause : exceptionRecord?.cause,
    );
    const source = causeRecord ?? exceptionRecord;

    if (!source) {
      return undefined;
    }

    const diagnostics: ErrorDiagnostics = {};
    const causeMessage = this.readErrorMessage(exception instanceof Error ? exception.cause : source.cause);
    if (causeMessage) {
      diagnostics.cause = causeMessage;
    }

    for (const key of [
      'code',
      'severity',
      'detail',
      'hint',
      'schema_name',
      'table_name',
      'column_name',
    ] as const) {
      const value = source[key] ?? exceptionRecord?.[key];
      if (value !== undefined) {
        diagnostics[key] = value;
      }
    }

    return Object.keys(diagnostics).length > 0 ? diagnostics : undefined;
  }

  private asErrorRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? value as Record<string, unknown> : null;
  }

  private readErrorMessage(value: unknown): string | undefined {
    if (value instanceof Error && value.message.trim().length > 0) {
      return value.message;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    const record = this.asErrorRecord(value);
    const message = record?.message;
    return typeof message === 'string' && message.trim().length > 0 ? message : undefined;
  }
}
