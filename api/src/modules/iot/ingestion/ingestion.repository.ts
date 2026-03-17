import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  containers,
  measurements,
  sensorDevices,
  type DatabaseClient,
} from 'ecotrack-database';

import { DRIZZLE } from '../../../database/database.constants.js';

import type { IngestMeasurementDto } from './dto/ingest-measurement.dto.js';

export interface QueuedMeasurement {
  sensorDeviceId: string | null;
  containerId: string | null;
  measuredAt: Date;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: string;
  sourcePayload: Record<string, unknown>;
  receivedAt: Date;
}

export interface ProcessedMeasurement {
  measurement: QueuedMeasurement;
  deviceUid?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}

interface SensorDeviceRow {
  id: string;
  deviceUid: string;
  containerId: string | null;
}

@Injectable()
export class IngestionRepository {
  private readonly logger = new Logger(IngestionRepository.name);

  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async batchInsertMeasurements(
    measurementsToInsert: ProcessedMeasurement[],
    batchSize: number = 500,
  ): Promise<{ inserted: number; failed: number }> {
    if (measurementsToInsert.length === 0) {
      return { inserted: 0, failed: 0 };
    }

    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < measurementsToInsert.length; i += batchSize) {
      const batch = measurementsToInsert.slice(i, i + batchSize);

      try {
        const result = await this.db.transaction(async (tx) => {
          const resolvedBatch: ProcessedMeasurement[] = [];

          const deviceUids = [...new Set(batch.filter((m) => m.deviceUid).map((m) => m.deviceUid!))];

          const existingSensors: SensorDeviceRow[] = deviceUids.length > 0
            ? await tx
                .select({
                  id: sensorDevices.id,
                  deviceUid: sensorDevices.deviceUid,
                  containerId: sensorDevices.containerId,
                })
                .from(sensorDevices)
                .where(sql`${sensorDevices.deviceUid} IN ${deviceUids}`)
            : [];

          const sensorMap = new Map<string, SensorDeviceRow>();
          for (const s of existingSensors) {
            sensorMap.set(s.deviceUid, s);
          }

          for (const item of batch) {
            const resolvedItem: ProcessedMeasurement = { ...item, measurement: { ...item.measurement } };

            if (item.deviceUid && !resolvedItem.measurement.sensorDeviceId) {
              const existingSensor = sensorMap.get(item.deviceUid);
              if (existingSensor) {
                resolvedItem.measurement.sensorDeviceId = existingSensor.id;
                resolvedItem.measurement.containerId = existingSensor.containerId;
              } else {
                try {
                  const [newSensor] = await tx
                    .insert(sensorDevices)
                    .values({
                      deviceUid: item.deviceUid,
                      installStatus: 'active',
                      lastSeenAt: resolvedItem.measurement.measuredAt,
                      installedAt: resolvedItem.measurement.measuredAt,
                    })
                    .returning({
                      id: sensorDevices.id,
                      containerId: sensorDevices.containerId,
                    });

                  if (newSensor) {
                    resolvedItem.measurement.sensorDeviceId = newSensor.id;
                    resolvedItem.measurement.containerId = newSensor.containerId;
                    sensorMap.set(item.deviceUid, { id: newSensor.id, deviceUid: item.deviceUid, containerId: newSensor.containerId });
                  }
                } catch (err) {
                  this.logger.warn(`Failed to create sensor for deviceUid: ${item.deviceUid}, error: ${err instanceof Error ? err.message : 'Unknown'}`);
                }
              }
            }

            if (resolvedItem.measurement.sensorDeviceId) {
              await tx
                .update(sensorDevices)
                .set({
                  batteryPercent: resolvedItem.measurement.batteryPercent,
                  lastSeenAt: resolvedItem.measurement.measuredAt,
                  updatedAt: new Date(),
                })
                .where(eq(sensorDevices.id, resolvedItem.measurement.sensorDeviceId));
            }

            resolvedBatch.push(resolvedItem);
          }

          const measurementValues = resolvedBatch.map((item) => ({
            sensorDeviceId: item.measurement.sensorDeviceId,
            containerId: item.measurement.containerId,
            measuredAt: item.measurement.measuredAt,
            fillLevelPercent: item.measurement.fillLevelPercent,
            temperatureC: item.measurement.temperatureC,
            batteryPercent: item.measurement.batteryPercent,
            signalStrength: item.measurement.signalStrength,
            measurementQuality: item.measurement.measurementQuality,
            sourcePayload: item.measurement.sourcePayload,
            receivedAt: item.measurement.receivedAt,
          }));

          const insertedMeasurements = await tx
            .insert(measurements)
            .values(measurementValues)
            .returning({
              id: measurements.id,
              containerId: measurements.containerId,
              fillLevelPercent: measurements.fillLevelPercent,
            });

          const containerUpdates = new Map<string, { fillLevelPercent: number; warningThreshold: number; criticalThreshold: number }>();

          for (const m of resolvedBatch) {
            if (m.measurement.containerId && m.warningThreshold !== undefined && m.criticalThreshold !== undefined) {
              const existing = containerUpdates.get(m.measurement.containerId);
              if (!existing || m.measurement.measuredAt > new Date()) {
                containerUpdates.set(m.measurement.containerId, {
                  fillLevelPercent: m.measurement.fillLevelPercent,
                  warningThreshold: m.warningThreshold,
                  criticalThreshold: m.criticalThreshold,
                });
              }
            }
          }

          for (const [containerId, update] of containerUpdates) {
            await tx
              .update(containers)
              .set({
                fillLevelPercent: update.fillLevelPercent,
                status: this.resolveOperationalStatus(
                  update.fillLevelPercent,
                  update.warningThreshold,
                  update.criticalThreshold,
                ),
                updatedAt: new Date(),
              })
              .where(eq(containers.id, containerId));
          }

          return insertedMeasurements.length;
        });

        inserted += result;
      } catch (error) {
        failed += batch.length;
        this.logger.error(
          `Failed to insert batch of ${batch.length} measurements: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { inserted, failed };
  }

  async getPendingCount(): Promise<number> {
    const result = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(measurements)
      .where(sql`${measurements.receivedAt} > NOW() - INTERVAL '1 hour'`);

    return result[0]?.value ?? 0;
  }

  async getProcessedLastHour(): Promise<number> {
    const result = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(measurements)
      .where(sql`${measurements.receivedAt} > NOW() - INTERVAL '1 hour'`);

    return result[0]?.value ?? 0;
  }

  transformDtoToMeasurement(dto: IngestMeasurementDto): QueuedMeasurement {
    const sourcePayload: Record<string, unknown> = {
      source: 'iot-ingestion-api',
      deviceUid: dto.deviceUid,
    };

    if (dto.idempotencyKey) {
      sourcePayload.idempotencyKey = dto.idempotencyKey;
    }

    return {
      sensorDeviceId: dto.sensorDeviceId ?? null,
      containerId: dto.containerId ?? null,
      measuredAt: new Date(dto.measuredAt),
      fillLevelPercent: dto.fillLevelPercent,
      temperatureC: dto.temperatureC ?? null,
      batteryPercent: dto.batteryPercent ?? null,
      signalStrength: dto.signalStrength ?? null,
      measurementQuality: dto.measurementQuality ?? 'valid',
      sourcePayload,
      receivedAt: new Date(),
    };
  }

  private resolveOperationalStatus(
    fillLevelPercent: number,
    warningThreshold: number,
    criticalThreshold: number,
  ): string {
    if (fillLevelPercent >= criticalThreshold) {
      return 'critical';
    }
    if (fillLevelPercent >= warningThreshold) {
      return 'attention_required';
    }
    return 'available';
  }
}
