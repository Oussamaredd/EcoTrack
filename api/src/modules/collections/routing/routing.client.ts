import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type OsrmRouteResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: number[][];
    };
  }>;
};

export type RouteResult = {
  geometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  distanceKm: number | null;
  durationMinutes: number | null;
  source: 'live';
  provider: string;
  resolvedAt: string;
};

type CircuitBreakerState = 'closed' | 'open' | 'half-open';

type CircuitBreakerMetrics = {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  consecutiveSuccesses: number;
};

interface CircuitBreakerConfig {
  timeoutMs: number;
  failureThreshold: number;
  resetWindowMs: number;
}

@Injectable()
export class RoutingClient {
  private readonly logger = new Logger(RoutingClient.name);

  private readonly baseUrl: string;
  private readonly circuitBreakerConfig: CircuitBreakerConfig;

  private metrics: CircuitBreakerMetrics = {
    state: 'closed',
    failures: 0,
    lastFailureTime: null,
    lastSuccessTime: null,
    consecutiveSuccesses: 0,
  };

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('routing.baseUrl') ?? 'https://router.project-osrm.org';
    this.circuitBreakerConfig = {
      timeoutMs: (this.configService.get<number>('routing.circuitBreaker.timeoutMs') ?? 10_000),
      failureThreshold: (this.configService.get<number>('routing.circuitBreaker.failureThreshold') ?? 5),
      resetWindowMs: (this.configService.get<number>('routing.circuitBreaker.resetWindowMs') ?? 30_000),
    };

    this.logger.log(
      `Circuit breaker configured: timeout=${this.circuitBreakerConfig.timeoutMs}ms, ` +
        `failureThreshold=${this.circuitBreakerConfig.failureThreshold}, ` +
        `resetWindow=${this.circuitBreakerConfig.resetWindowMs}ms`,
    );
  }

  async fetchRoute(coordinates: Array<{ longitude: number; latitude: number }>): Promise<RouteResult | null> {
    if (this.isCircuitOpen()) {
      this.logger.warn(
        `Circuit breaker is open, skipping remote call. State: ${this.metrics.state}, ` +
          `failures: ${this.metrics.failures}, lastFailure: ${this.metrics.lastFailureTime}`,
      );
      return null;
    }

    const routeCoordinates = coordinates
      .map((coord) => `${coord.longitude.toFixed(6)},${coord.latitude.toFixed(6)}`)
      .join(';');

    const url = this.buildRouteUrl(routeCoordinates);

    try {
      const result = await this.executeWithTimeout(url.toString());
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  getCircuitState(): CircuitBreakerState {
    this.updateState();
    this.isCircuitOpen();
    return this.metrics.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    this.updateState();
    return { ...this.metrics };
  }

  private isCircuitOpen(): boolean {
    this.updateState();

    if (this.metrics.state === 'open') {
      const now = Date.now();
      const timeSinceLastFailure = this.metrics.lastFailureTime
        ? now - this.metrics.lastFailureTime
        : Infinity;

      if (timeSinceLastFailure >= this.circuitBreakerConfig.resetWindowMs) {
        this.logger.log(
          `Circuit breaker resetting to half-open after ${timeSinceLastFailure}ms ` +
            `(resetWindow: ${this.circuitBreakerConfig.resetWindowMs}ms)`,
        );
        this.metrics.state = 'half-open';
        return false;
      }

      return true;
    }

    if (this.metrics.state === 'half-open') {
      return false;
    }

    return false;
  }

  private updateState(): void {
    if (this.metrics.state === 'closed') {
      if (this.metrics.failures >= this.circuitBreakerConfig.failureThreshold) {
        this.logger.warn(
          `Circuit breaker opening after ${this.metrics.failures} failures ` +
            `(threshold: ${this.circuitBreakerConfig.failureThreshold})`,
        );
        this.metrics.state = 'open';
      }
    } else if (this.metrics.state === 'half-open') {
      const successThreshold = Math.ceil(this.circuitBreakerConfig.failureThreshold / 2);
      if (this.metrics.consecutiveSuccesses >= successThreshold) {
        this.logger.log(
          `Circuit breaker closing after ${this.metrics.consecutiveSuccesses} consecutive successes`,
        );
        this.metrics.state = 'closed';
        this.metrics.failures = 0;
        this.metrics.consecutiveSuccesses = 0;
      }
    }
  }

  private async executeWithTimeout(url: string): Promise<RouteResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.circuitBreakerConfig.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Routing request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as OsrmRouteResponse;

      const route = payload.routes?.[0];
      const geometry = route?.geometry;
      const coordinates =
        geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)
          ? geometry.coordinates
              .filter(
                (coordinate): coordinate is [number, number] =>
                  Array.isArray(coordinate) &&
                  coordinate.length >= 2 &&
                  Number.isFinite(coordinate[0]) &&
                  Number.isFinite(coordinate[1]),
              )
              .map((coordinate) => [coordinate[0], coordinate[1]] as [number, number])
          : [];

      if (coordinates.length < 2) {
        throw new Error('Routing API did not return a usable LineString geometry.');
      }

      return {
        geometry: {
          type: 'LineString',
          coordinates,
        },
        distanceKm:
          typeof route?.distance === 'number' && Number.isFinite(route.distance)
            ? Number(route.distance / 1000)
            : null,
        durationMinutes:
          typeof route?.duration === 'number' && Number.isFinite(route.duration)
            ? Math.max(1, Math.round(route.duration / 60))
            : null,
        source: 'live',
        provider: this.getProviderName(),
        resolvedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildRouteUrl(routeCoordinates: string): URL {
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    const url = new URL(`route/v1/driving/${routeCoordinates}`, baseUrl);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('steps', 'false');
    url.searchParams.set('annotations', 'false');
    return url;
  }

  private getProviderName(): string {
    try {
      const parsed = new URL(this.baseUrl);
      return parsed.hostname || 'osrm';
    } catch {
      return 'osrm';
    }
  }

  private recordSuccess(): void {
    const now = Date.now();
    this.metrics.lastSuccessTime = now;
    this.metrics.consecutiveSuccesses += 1;

    this.logger.debug(
      `Request succeeded. State: ${this.metrics.state}, consecutiveSuccesses: ${this.metrics.consecutiveSuccesses}`,
    );
  }

  private recordFailure(errorMessage: string): void {
    const now = Date.now();
    this.metrics.failures += 1;
    this.metrics.lastFailureTime = now;
    this.metrics.consecutiveSuccesses = 0;

    this.logger.warn(
      `Request failed: ${errorMessage}. State: ${this.metrics.state}, failures: ${this.metrics.failures}`,
    );
  }
}