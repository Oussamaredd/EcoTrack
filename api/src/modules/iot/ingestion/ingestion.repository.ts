import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  containerTypes,
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

    for (let index = 0; index < measurementsToInsert.length; index += batchSize) {
      const batch = measurementsToInsert.slice(index, index + batchSize);

      try {
        const result = await this.db.transaction(async (tx) => {
          const resolvedBatch: ProcessedMeasurement[] = [];

          const deviceUids = [
            ...new Set(
              batch
                .map((measurement) => measurement.deviceUid)
                .filter((deviceUid): deviceUid is string => Boolean(deviceUid)),
            ),
          ];

          const existingSensors: SensorDeviceRow[] =
            deviceUids.length > 0
              ? await tx
                  .select({
                    id: sensorDevices.id,
                    deviceUid: sensorDevices.deviceUid,
                    containerId: sensorDevices.containerId,
                  })
                  .from(sensorDevices)
                  .where(inArray(sensorDevices.deviceUid, deviceUids))
              : [];

          const sensorMap = new Map(existingSensors.map((sensor) => [sensor.deviceUid, sensor]));

          const thresholdMap = await this.loadThresholds(
            tx,
            [
              ...batch.map((measurement) => measurement.measurement.containerId),
              ...existingSensors.map((sensor) => sensor.containerId),
            ].filter((containerId): containerId is string => containerId != null),
          );

          for (const item of batch) {
            const resolvedItem: ProcessedMeasurement = {
              ...item,
              measurement: { ...item.measurement },
            };
            let resolvedSensor = item.deviceUid ? sensorMap.get(item.deviceUid) : undefined;
            let resolvedContainerId =
              resolvedItem.measurement.containerId ?? resolvedSensor?.containerId ?? null;

            if (item.deviceUid && !resolvedItem.measurement.sensorDeviceId) {
              if (resolvedSensor) {
                resolvedItem.measurement.sensorDeviceId = resolvedSensor.id;
              } else {
                try {
                  const [newSensor] = await tx
                    .insert(sensorDevices)
                    .values({
                      containerId: resolvedContainerId,
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
                    resolvedContainerId = resolvedContainerId ?? newSensor.containerId;
                    resolvedSensor = {
                      id: newSensor.id,
                      deviceUid: item.deviceUid,
                      containerId: resolvedContainerId,
                    };
                    resolvedItem.measurement.sensorDeviceId = newSensor.id;
                    sensorMap.set(item.deviceUid, resolvedSensor);
                  }
                } catch (error) {
                  this.logger.warn(
                    `Failed to create sensor for deviceUid ${item.deviceUid}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  );
                }
              }
            }

            if (resolvedSensor) {
              resolvedContainerId = resolvedContainerId ?? resolvedSensor.containerId;
              resolvedItem.measurement.sensorDeviceId =
                resolvedItem.measurement.sensorDeviceId ?? resolvedSensor.id;
            }

            resolvedItem.measurement.containerId = resolvedContainerId;

            const thresholds = resolvedContainerId ? thresholdMap.get(resolvedContainerId) : undefined;
            resolvedItem.warningThreshold = thresholds?.warningThreshold;
            resolvedItem.criticalThreshold = thresholds?.criticalThreshold;

            if (resolvedItem.measurement.sensorDeviceId) {
              await tx
                .update(sensorDevices)
                .set({
                  containerId: resolvedContainerId,
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
            });

          const containerUpdates = new Map<
            string,
            {
              fillLevelPercent: number;
              warningThreshold: number;
              criticalThreshold: number;
              measuredAt: Date;
            }
          >();

          for (const measurement of resolvedBatch) {
            if (
              measurement.measurement.containerId &&
              measurement.warningThreshold !== undefined &&
              measurement.criticalThreshold !== undefined
            ) {
              const existing = containerUpdates.get(measurement.measurement.containerId);
              if (!existing || measurement.measurement.measuredAt > existing.measuredAt) {
                containerUpdates.set(measurement.measurement.containerId, {
                  fillLevelPercent: measurement.measurement.fillLevelPercent,
                  warningThreshold: measurement.warningThreshold,
                  criticalThreshold: measurement.criticalThreshold,
                  measuredAt: measurement.measurement.measuredAt,
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

    if (dto.sensorDeviceId) {
      sourcePayload.sensorDeviceId = dto.sensorDeviceId;
    }

    if (dto.containerId) {
      sourcePayload.containerId = dto.containerId;
    }

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
      measurementQuality: dto.measurementQuality?.trim() ?? 'valid',
      sourcePayload,
      receivedAt: new Date(),
    };
  }

  private async loadThresholds(
    tx: Parameters<DatabaseClient['transaction']>[0] extends (arg: infer T) => unknown ? T : never,
    containerIds: string[],
  ): Promise<Map<string, { warningThreshold: number; criticalThreshold: number }>> {
    const uniqueContainerIds = [...new Set(containerIds)];
    if (uniqueContainerIds.length === 0) {
      return new Map();
    }

    const rows = await tx
      .select({
        id: containers.id,
        warningThreshold: containerTypes.defaultFillAlertPercent,
        criticalThreshold: containerTypes.defaultCriticalAlertPercent,
      })
      .from(containers)
      .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
      .where(inArray(containers.id, uniqueContainerIds));

    return new Map(
      rows.map((row) => [
        row.id,
        {
          warningThreshold: this.normalizeThreshold(row.warningThreshold, 80),
          criticalThreshold: this.normalizeThreshold(row.criticalThreshold, 95),
        },
      ]),
    );
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

  private normalizeThreshold(value: number | null | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }
}
