import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import {
  alertEvents,
  citizenReports,
  containers,
  gamificationProfiles,
  type DatabaseClient,
  tours,
  validatedMeasurementEvents,
  zoneAggregates10m,
  zoneCurrentState,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

type ZoneAnalyticsFilters = {
  zoneId?: string;
  limit?: number;
};

type ZoneAggregateUpsertInput = {
  zoneId: string;
  windowStart: Date;
  windowEnd: Date;
  measurementsCount: number;
  averageFillLevelPercent: number;
  minFillLevelPercent: number;
  maxFillLevelPercent: number;
  highFillCount: number;
  trendSlopePerHour: number;
  schemaVersion: string;
  sourcePayload: {
    zoneId: string;
    windowStart: string;
    windowEnd: string;
    measurementsCount: number;
    averageFillLevelPercent: number;
    minFillLevelPercent: number;
    maxFillLevelPercent: number;
    highFillCount: number;
    trendSlopePerHour: number;
    schemaVersion: string;
  };
};

type AnomalyAlertInput = {
  sourceEventKey: string;
  containerId: string | null;
  zoneId: string | null;
  eventType: string;
  severity: string;
  triggeredAt: Date;
  payloadSnapshot: Record<string, unknown>;
};

const normalizeLimit = (value: number | undefined, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.trunc(value), 100));
};

@Injectable()
export class AnalyticsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getSummary() {
    const [containersCount, zonesCount, toursCount, reportsCount, gamificationProfilesCount] =
      await Promise.all([
        this.db.select({ value: sql<number>`count(*)` }).from(containers),
        this.db.select({ value: sql<number>`count(*)` }).from(zones),
        this.db.select({ value: sql<number>`count(*)` }).from(tours),
        this.db.select({ value: sql<number>`count(*)` }).from(citizenReports),
        this.db.select({ value: sql<number>`count(*)` }).from(gamificationProfiles),
      ]);

    return {
      containers: Number(containersCount[0]?.value ?? 0),
      zones: Number(zonesCount[0]?.value ?? 0),
      tours: Number(toursCount[0]?.value ?? 0),
      citizenReports: Number(reportsCount[0]?.value ?? 0),
      gamificationProfiles: Number(gamificationProfilesCount[0]?.value ?? 0),
    };
  }

  async listZoneCurrentState(filters: ZoneAnalyticsFilters = {}) {
    const conditions: SQL[] = [];
    if (filters.zoneId?.trim()) {
      conditions.push(eq(zoneCurrentState.zoneId, filters.zoneId.trim()));
    }

    const rows = await this.db
      .select({
        zoneId: zoneCurrentState.zoneId,
        zoneName: zones.name,
        latestAggregateId: zoneCurrentState.latestAggregateId,
        windowStart: zoneCurrentState.windowStart,
        windowEnd: zoneCurrentState.windowEnd,
        measurementsCount: zoneCurrentState.measurementsCount,
        averageFillLevelPercent: zoneCurrentState.averageFillLevelPercent,
        minFillLevelPercent: zoneCurrentState.minFillLevelPercent,
        maxFillLevelPercent: zoneCurrentState.maxFillLevelPercent,
        highFillCount: zoneCurrentState.highFillCount,
        trendSlopePerHour: zoneCurrentState.trendSlopePerHour,
        schemaVersion: zoneCurrentState.schemaVersion,
        updatedAt: zoneCurrentState.updatedAt,
      })
      .from(zoneCurrentState)
      .innerJoin(zones, eq(zoneCurrentState.zoneId, zones.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(zoneCurrentState.updatedAt))
      .limit(normalizeLimit(filters.limit, 20));

    return rows.map((row) => ({
      ...row,
      windowStart: row.windowStart.toISOString(),
      windowEnd: row.windowEnd.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async listZoneAggregates(filters: ZoneAnalyticsFilters = {}) {
    const conditions: SQL[] = [];
    if (filters.zoneId?.trim()) {
      conditions.push(eq(zoneAggregates10m.zoneId, filters.zoneId.trim()));
    }

    const rows = await this.db
      .select({
        id: zoneAggregates10m.id,
        zoneId: zoneAggregates10m.zoneId,
        zoneName: zones.name,
        windowStart: zoneAggregates10m.windowStart,
        windowEnd: zoneAggregates10m.windowEnd,
        measurementsCount: zoneAggregates10m.measurementsCount,
        averageFillLevelPercent: zoneAggregates10m.averageFillLevelPercent,
        minFillLevelPercent: zoneAggregates10m.minFillLevelPercent,
        maxFillLevelPercent: zoneAggregates10m.maxFillLevelPercent,
        highFillCount: zoneAggregates10m.highFillCount,
        trendSlopePerHour: zoneAggregates10m.trendSlopePerHour,
        schemaVersion: zoneAggregates10m.schemaVersion,
        updatedAt: zoneAggregates10m.updatedAt,
      })
      .from(zoneAggregates10m)
      .innerJoin(zones, eq(zoneAggregates10m.zoneId, zones.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(zoneAggregates10m.windowEnd))
      .limit(normalizeLimit(filters.limit, 50));

    return rows.map((row) => ({
      ...row,
      windowStart: row.windowStart.toISOString(),
      windowEnd: row.windowEnd.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async resolveZoneContext(containerId: string | null) {
    if (!containerId) {
      return null;
    }

    const [row] = await this.db
      .select({
        containerId: containers.id,
        containerCode: containers.code,
        zoneId: containers.zoneId,
        zoneName: zones.name,
      })
      .from(containers)
      .leftJoin(zones, eq(containers.zoneId, zones.id))
      .where(eq(containers.id, containerId))
      .limit(1);

    return row ?? null;
  }

  async listZoneWindowMeasurements(zoneId: string, windowStart: Date, windowEnd: Date) {
    return this.db
      .select({
        fillLevelPercent: validatedMeasurementEvents.fillLevelPercent,
        measuredAt: validatedMeasurementEvents.measuredAt,
      })
      .from(validatedMeasurementEvents)
      .innerJoin(containers, eq(validatedMeasurementEvents.containerId, containers.id))
      .where(
        and(
          eq(containers.zoneId, zoneId),
          gte(validatedMeasurementEvents.measuredAt, windowStart),
          lt(validatedMeasurementEvents.measuredAt, windowEnd),
        ),
      )
      .orderBy(validatedMeasurementEvents.measuredAt);
  }

  async listContainerMeasurements(containerId: string, windowStart: Date, windowEnd: Date) {
    return this.db
      .select({
        fillLevelPercent: validatedMeasurementEvents.fillLevelPercent,
        measuredAt: validatedMeasurementEvents.measuredAt,
      })
      .from(validatedMeasurementEvents)
      .where(
        and(
          eq(validatedMeasurementEvents.containerId, containerId),
          gte(validatedMeasurementEvents.measuredAt, windowStart),
          lt(validatedMeasurementEvents.measuredAt, windowEnd),
        ),
      )
      .orderBy(validatedMeasurementEvents.measuredAt);
  }

  async upsertZoneAggregate(input: ZoneAggregateUpsertInput) {
    const [aggregate] = await this.db
      .insert(zoneAggregates10m)
      .values({
        zoneId: input.zoneId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        measurementsCount: input.measurementsCount,
        averageFillLevelPercent: input.averageFillLevelPercent,
        minFillLevelPercent: input.minFillLevelPercent,
        maxFillLevelPercent: input.maxFillLevelPercent,
        highFillCount: input.highFillCount,
        trendSlopePerHour: input.trendSlopePerHour,
        schemaVersion: input.schemaVersion,
        sourcePayload: input.sourcePayload,
      })
      .onConflictDoUpdate({
        target: [zoneAggregates10m.zoneId, zoneAggregates10m.windowStart],
        set: {
          windowEnd: input.windowEnd,
          measurementsCount: input.measurementsCount,
          averageFillLevelPercent: input.averageFillLevelPercent,
          minFillLevelPercent: input.minFillLevelPercent,
          maxFillLevelPercent: input.maxFillLevelPercent,
          highFillCount: input.highFillCount,
          trendSlopePerHour: input.trendSlopePerHour,
          schemaVersion: input.schemaVersion,
          sourcePayload: input.sourcePayload,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: zoneAggregates10m.id,
        zoneId: zoneAggregates10m.zoneId,
        windowStart: zoneAggregates10m.windowStart,
        windowEnd: zoneAggregates10m.windowEnd,
        measurementsCount: zoneAggregates10m.measurementsCount,
        averageFillLevelPercent: zoneAggregates10m.averageFillLevelPercent,
        minFillLevelPercent: zoneAggregates10m.minFillLevelPercent,
        maxFillLevelPercent: zoneAggregates10m.maxFillLevelPercent,
        highFillCount: zoneAggregates10m.highFillCount,
        trendSlopePerHour: zoneAggregates10m.trendSlopePerHour,
        schemaVersion: zoneAggregates10m.schemaVersion,
      });

    if (!aggregate) {
      throw new Error('Failed to persist zone aggregate projection.');
    }

    await this.db
      .insert(zoneCurrentState)
      .values({
        zoneId: input.zoneId,
        latestAggregateId: aggregate.id,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        measurementsCount: input.measurementsCount,
        averageFillLevelPercent: input.averageFillLevelPercent,
        minFillLevelPercent: input.minFillLevelPercent,
        maxFillLevelPercent: input.maxFillLevelPercent,
        highFillCount: input.highFillCount,
        trendSlopePerHour: input.trendSlopePerHour,
        schemaVersion: input.schemaVersion,
      })
      .onConflictDoUpdate({
        target: zoneCurrentState.zoneId,
        set: {
          latestAggregateId: aggregate.id,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          measurementsCount: input.measurementsCount,
          averageFillLevelPercent: input.averageFillLevelPercent,
          minFillLevelPercent: input.minFillLevelPercent,
          maxFillLevelPercent: input.maxFillLevelPercent,
          highFillCount: input.highFillCount,
          trendSlopePerHour: input.trendSlopePerHour,
          schemaVersion: input.schemaVersion,
          updatedAt: new Date(),
        },
      });

    return aggregate;
  }

  async upsertAnomalyAlert(input: AnomalyAlertInput) {
    const [alert] = await this.db
      .insert(alertEvents)
      .values({
        sourceEventKey: input.sourceEventKey,
        containerId: input.containerId,
        zoneId: input.zoneId,
        eventType: input.eventType,
        severity: input.severity,
        triggeredAt: input.triggeredAt,
        currentStatus: 'open',
        payloadSnapshot: input.payloadSnapshot,
      })
      .onConflictDoNothing({
        target: alertEvents.sourceEventKey,
      })
      .returning({
        id: alertEvents.id,
      });

    return alert?.id ?? null;
  }
}
