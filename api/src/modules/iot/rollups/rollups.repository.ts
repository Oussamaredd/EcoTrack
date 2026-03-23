import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import {
  measurementRollups10m,
  type DatabaseClient,
  validatedMeasurementEvents,
} from 'ecotrack-database';

import { DRIZZLE } from '../../../database/database.constants.js';
import type { ClaimedValidatedEventDelivery } from '../validated-consumer/validated-consumer.contracts.js';

import type { MeasurementRollupFilters } from './rollups.contracts.js';

const TEN_MINUTES_MS = 10 * 60 * 1000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

@Injectable()
export class MeasurementRollupsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async projectValidatedEventRollup(
    delivery: ClaimedValidatedEventDelivery,
    schemaVersion: string,
  ) {
    const windowStart = new Date(delivery.measuredAt.getTime() - TEN_MINUTES_MS);
    const windowEnd = delivery.measuredAt;
    const recentEvents = await this.db
      .select({
        fillLevelPercent: validatedMeasurementEvents.fillLevelPercent,
        batteryPercent: validatedMeasurementEvents.batteryPercent,
        signalStrength: validatedMeasurementEvents.signalStrength,
        measuredAt: validatedMeasurementEvents.measuredAt,
      })
      .from(validatedMeasurementEvents)
      .where(
        and(
          eq(validatedMeasurementEvents.deviceUid, delivery.deviceUid),
          gte(validatedMeasurementEvents.measuredAt, windowStart),
          lte(validatedMeasurementEvents.measuredAt, windowEnd),
        ),
      )
      .orderBy(validatedMeasurementEvents.measuredAt);

    const measurementCount = Math.max(1, recentEvents.length);
    const oldestFillLevel = recentEvents[0]?.fillLevelPercent ?? delivery.fillLevelPercent;
    const totalFillLevel = recentEvents.reduce((total, event) => total + event.fillLevelPercent, 0);
    const averageFillLevelPercent = Math.round(totalFillLevel / measurementCount);
    const fillLevelDeltaPercent = delivery.fillLevelPercent - oldestFillLevel;
    const batterySamples = recentEvents
      .map((event) => event.batteryPercent)
      .filter((value): value is number => value !== null);
    const signalSamples = recentEvents
      .map((event) => event.signalStrength)
      .filter((value): value is number => value !== null);
    const averageBatteryPercent =
      batterySamples.length > 0
        ? Math.round(batterySamples.reduce((total, value) => total + value, 0) / batterySamples.length)
        : (delivery.batteryPercent ?? 50);
    const averageSignalStrength =
      signalSamples.length > 0
        ? Math.round(signalSamples.reduce((total, value) => total + value, 0) / signalSamples.length)
        : (delivery.signalStrength ?? -60);
    const signalScore = clamp(Math.round(((averageSignalStrength + 120) / 120) * 100), 0, 100);
    const qualityScore = delivery.measurementQuality === 'suspect' ? 60 : 100;
    const sensorHealthScore = clamp(
      Math.round((averageBatteryPercent + signalScore + qualityScore) / 3),
      0,
      100,
    );
    const sourcePayload = {
      validatedEventId: delivery.validatedEventId,
      deviceUid: delivery.deviceUid,
      containerId: delivery.containerId,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      measurementCount,
      averageFillLevelPercent,
      fillLevelDeltaPercent,
      sensorHealthScore,
      schemaVersion,
    } as const;

    const [record] = await this.db
      .insert(measurementRollups10m)
      .values({
        validatedEventId: delivery.validatedEventId,
        deviceUid: delivery.deviceUid,
        sensorDeviceId: delivery.sensorDeviceId,
        containerId: delivery.containerId,
        windowStart,
        windowEnd,
        measurementCount,
        averageFillLevelPercent,
        fillLevelDeltaPercent,
        sensorHealthScore,
        schemaVersion,
        sourcePayload,
      })
      .onConflictDoUpdate({
        target: measurementRollups10m.validatedEventId,
        set: {
          sensorDeviceId: delivery.sensorDeviceId,
          containerId: delivery.containerId,
          windowStart,
          windowEnd,
          measurementCount,
          averageFillLevelPercent,
          fillLevelDeltaPercent,
          sensorHealthScore,
          schemaVersion,
          sourcePayload,
          updatedAt: new Date(),
        },
      })
      .returning({
        validatedEventId: measurementRollups10m.validatedEventId,
        measurementCount: measurementRollups10m.measurementCount,
        averageFillLevelPercent: measurementRollups10m.averageFillLevelPercent,
        fillLevelDeltaPercent: measurementRollups10m.fillLevelDeltaPercent,
        sensorHealthScore: measurementRollups10m.sensorHealthScore,
      });

    return record ?? null;
  }

  async listLatestRollups(filters: MeasurementRollupFilters = {}) {
    const normalizedLimit =
      typeof filters.limit === 'number' && Number.isFinite(filters.limit) ? filters.limit : 20;
    const limit = Math.max(1, Math.min(normalizedLimit, 100));
    const conditions: SQL[] = [];

    if (filters.containerId?.trim()) {
      conditions.push(eq(measurementRollups10m.containerId, filters.containerId.trim()));
    }

    if (filters.deviceUid?.trim()) {
      conditions.push(eq(measurementRollups10m.deviceUid, filters.deviceUid.trim()));
    }

    const rows = await this.db
      .select({
        validatedEventId: measurementRollups10m.validatedEventId,
        deviceUid: measurementRollups10m.deviceUid,
        containerId: measurementRollups10m.containerId,
        sensorDeviceId: measurementRollups10m.sensorDeviceId,
        windowStart: measurementRollups10m.windowStart,
        windowEnd: measurementRollups10m.windowEnd,
        measurementCount: measurementRollups10m.measurementCount,
        averageFillLevelPercent: measurementRollups10m.averageFillLevelPercent,
        fillLevelDeltaPercent: measurementRollups10m.fillLevelDeltaPercent,
        sensorHealthScore: measurementRollups10m.sensorHealthScore,
        schemaVersion: measurementRollups10m.schemaVersion,
      })
      .from(measurementRollups10m)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(measurementRollups10m.windowEnd))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      windowStart: row.windowStart.toISOString(),
      windowEnd: row.windowEnd.toISOString(),
    }));
  }
}
