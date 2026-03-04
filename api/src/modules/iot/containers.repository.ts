import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import {
  containerTypes,
  containers,
  type DatabaseClient,
  measurements,
  sensorDevices,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

import type { CreateContainerDto } from './dto/create-container.dto.js';
import type { RecordContainerMeasurementDto } from './dto/record-container-measurement.dto.js';
import type { UpdateContainerDto } from './dto/update-container.dto.js';
import type { UpsertContainerSensorDto } from './dto/upsert-container-sensor.dto.js';

type ContainerFilters = {
  search?: string;
  zoneId?: string;
  status?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ContainersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async list(filters: ContainerFilters) {
    const where = this.buildWhere(filters);

    const listQuery = this.db
      .select({
        id: containers.id,
        code: containers.code,
        label: containers.label,
        status: containers.status,
        fillLevelPercent: containers.fillLevelPercent,
        latitude: containers.latitude,
        longitude: containers.longitude,
        containerTypeId: containers.containerTypeId,
        containerTypeCode: containerTypes.code,
        containerTypeLabel: containerTypes.label,
        zoneId: containers.zoneId,
        zoneName: zones.name,
        createdAt: containers.createdAt,
        updatedAt: containers.updatedAt,
      })
      .from(containers)
      .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
      .leftJoin(zones, eq(containers.zoneId, zones.id))
      .orderBy(asc(containers.code))
      .limit(filters.limit)
      .offset(filters.offset);

    const totalQuery = this.db.select({ value: count() }).from(containers);

    const [items, totalRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? items.length,
    };
  }

  async create(dto: CreateContainerDto) {
    const [created] = await this.db
      .insert(containers)
      .values({
        code: dto.code.trim(),
        label: dto.label.trim(),
        status: dto.status?.trim() || 'available',
        fillLevelPercent: dto.fillLevelPercent ?? 0,
        zoneId: dto.zoneId ?? null,
        containerTypeId: dto.containerTypeId ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      })
      .returning();

    return created;
  }

  async update(id: string, dto: UpdateContainerDto) {
    const [updated] = await this.db
      .update(containers)
      .set({
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status.trim() } : {}),
        ...(dto.fillLevelPercent !== undefined ? { fillLevelPercent: dto.fillLevelPercent } : {}),
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(dto.containerTypeId !== undefined ? { containerTypeId: dto.containerTypeId } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        updatedAt: new Date(),
      })
      .where(eq(containers.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Container ${id} not found`);
    }

    return updated;
  }

  async listTypes() {
    return this.db
      .select({
        id: containerTypes.id,
        code: containerTypes.code,
        label: containerTypes.label,
        wasteStream: containerTypes.wasteStream,
        nominalCapacityLiters: containerTypes.nominalCapacityLiters,
        defaultFillAlertPercent: containerTypes.defaultFillAlertPercent,
        defaultCriticalAlertPercent: containerTypes.defaultCriticalAlertPercent,
        colorCode: containerTypes.colorCode,
        isActive: containerTypes.isActive,
      })
      .from(containerTypes)
      .where(eq(containerTypes.isActive, true))
      .orderBy(asc(containerTypes.label));
  }

  async getTelemetry(containerId: string, limit: number) {
    const [container] = await this.db
      .select({
        id: containers.id,
        code: containers.code,
        label: containers.label,
        status: containers.status,
        fillLevelPercent: containers.fillLevelPercent,
        latitude: containers.latitude,
        longitude: containers.longitude,
        zoneId: containers.zoneId,
        zoneName: zones.name,
        containerTypeId: containers.containerTypeId,
        containerTypeCode: containerTypes.code,
        containerTypeLabel: containerTypes.label,
        warningFillPercent: containerTypes.defaultFillAlertPercent,
        criticalFillPercent: containerTypes.defaultCriticalAlertPercent,
      })
      .from(containers)
      .leftJoin(zones, eq(containers.zoneId, zones.id))
      .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
      .where(eq(containers.id, containerId))
      .limit(1);

    if (!container) {
      throw new NotFoundException(`Container ${containerId} not found`);
    }

    const safeLimit = Math.max(1, Math.min(limit, 100));

    const [sensors, recentMeasurements] = await Promise.all([
      this.db
        .select({
          id: sensorDevices.id,
          deviceUid: sensorDevices.deviceUid,
          hardwareModel: sensorDevices.hardwareModel,
          firmwareVersion: sensorDevices.firmwareVersion,
          installStatus: sensorDevices.installStatus,
          batteryPercent: sensorDevices.batteryPercent,
          lastSeenAt: sensorDevices.lastSeenAt,
          installedAt: sensorDevices.installedAt,
          createdAt: sensorDevices.createdAt,
          updatedAt: sensorDevices.updatedAt,
        })
        .from(sensorDevices)
        .where(eq(sensorDevices.containerId, containerId))
        .orderBy(desc(sensorDevices.updatedAt)),
      this.db
        .select({
          id: measurements.id,
          sensorDeviceId: measurements.sensorDeviceId,
          containerId: measurements.containerId,
          measuredAt: measurements.measuredAt,
          fillLevelPercent: measurements.fillLevelPercent,
          temperatureC: measurements.temperatureC,
          batteryPercent: measurements.batteryPercent,
          signalStrength: measurements.signalStrength,
          measurementQuality: measurements.measurementQuality,
          receivedAt: measurements.receivedAt,
        })
        .from(measurements)
        .where(eq(measurements.containerId, containerId))
        .orderBy(desc(measurements.measuredAt))
        .limit(safeLimit),
    ]);

    const latestMeasurement = recentMeasurements[0] ?? null;

    return {
      container,
      sensors,
      latestMeasurement,
      measurements: recentMeasurements,
      telemetryStatus: {
        sensorCount: sensors.length,
        hasRecentMeasurement: latestMeasurement != null,
        lastMeasuredAt: latestMeasurement?.measuredAt ?? null,
      },
    };
  }

  async upsertSensor(containerId: string, dto: UpsertContainerSensorDto) {
    await this.ensureContainerExists(containerId);

    const [sensor] = await this.db
      .insert(sensorDevices)
      .values({
        containerId,
        deviceUid: dto.deviceUid.trim(),
        hardwareModel: dto.hardwareModel?.trim() ?? null,
        firmwareVersion: dto.firmwareVersion?.trim() ?? null,
        installStatus: dto.installStatus?.trim() ?? 'active',
        batteryPercent: dto.batteryPercent ?? null,
        lastSeenAt: dto.lastSeenAt ? new Date(dto.lastSeenAt) : null,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
      })
      .onConflictDoUpdate({
        target: sensorDevices.deviceUid,
        set: {
          containerId,
          hardwareModel: dto.hardwareModel?.trim() ?? null,
          firmwareVersion: dto.firmwareVersion?.trim() ?? null,
          installStatus: dto.installStatus?.trim() ?? 'active',
          batteryPercent: dto.batteryPercent ?? null,
          lastSeenAt: dto.lastSeenAt ? new Date(dto.lastSeenAt) : null,
          installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!sensor) {
      throw new Error('Failed to upsert sensor device');
    }

    return sensor;
  }

  async recordMeasurement(containerId: string, dto: RecordContainerMeasurementDto) {
    return this.db.transaction(async (tx) => {
      const [container] = await tx
        .select({
          id: containers.id,
          containerTypeId: containers.containerTypeId,
          warningFillPercent: containerTypes.defaultFillAlertPercent,
          criticalFillPercent: containerTypes.defaultCriticalAlertPercent,
        })
        .from(containers)
        .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
        .where(eq(containers.id, containerId))
        .limit(1);

      if (!container) {
        throw new NotFoundException(`Container ${containerId} not found`);
      }

      const measuredAt = dto.measuredAt ? new Date(dto.measuredAt) : new Date();
      let resolvedSensorId = dto.sensorDeviceId ?? null;

      if (!resolvedSensorId && dto.deviceUid) {
        const [existingSensor] = await tx
          .select({
            id: sensorDevices.id,
          })
          .from(sensorDevices)
          .where(eq(sensorDevices.deviceUid, dto.deviceUid.trim()))
          .limit(1);

        if (existingSensor) {
          resolvedSensorId = existingSensor.id;
        } else {
          const [createdSensor] = await tx
            .insert(sensorDevices)
            .values({
              containerId,
              deviceUid: dto.deviceUid.trim(),
              installStatus: 'active',
              batteryPercent: dto.batteryPercent ?? null,
              lastSeenAt: measuredAt,
              installedAt: measuredAt,
            })
            .returning({
              id: sensorDevices.id,
            });

          resolvedSensorId = createdSensor?.id ?? null;
        }
      }

      if (resolvedSensorId) {
        await tx
          .update(sensorDevices)
          .set({
            containerId,
            batteryPercent: dto.batteryPercent ?? null,
            lastSeenAt: measuredAt,
            updatedAt: new Date(),
          })
          .where(eq(sensorDevices.id, resolvedSensorId));
      }

      const [createdMeasurement] = await tx
        .insert(measurements)
        .values({
          sensorDeviceId: resolvedSensorId,
          containerId,
          measuredAt,
          fillLevelPercent: dto.fillLevelPercent,
          temperatureC: dto.temperatureC ?? null,
          batteryPercent: dto.batteryPercent ?? null,
          signalStrength: dto.signalStrength ?? null,
          measurementQuality: dto.measurementQuality?.trim() ?? 'valid',
          sourcePayload: {
            source: 'api',
            deviceUid: dto.deviceUid?.trim() ?? null,
          },
          receivedAt: new Date(),
        })
        .returning();

      const warningThreshold = container.warningFillPercent ?? 80;
      const criticalThreshold = container.criticalFillPercent ?? 95;

      await tx
        .update(containers)
        .set({
          fillLevelPercent: dto.fillLevelPercent,
          status: this.resolveOperationalStatus(dto.fillLevelPercent, warningThreshold, criticalThreshold),
          updatedAt: new Date(),
        })
        .where(eq(containers.id, containerId));

      if (!createdMeasurement) {
        throw new Error('Failed to record container measurement');
      }

      return {
        measurement: createdMeasurement,
        telemetrySummary: {
          warningThreshold,
          criticalThreshold,
          severity:
            dto.fillLevelPercent >= criticalThreshold
              ? 'critical'
              : dto.fillLevelPercent >= warningThreshold
                ? 'warning'
                : 'normal',
        },
      };
    });
  }

  private buildWhere(filters: ContainerFilters) {
    const conditions = [];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(sql`${containers.code} ilike ${pattern} OR ${containers.label} ilike ${pattern}`);
    }

    if (filters.zoneId) {
      conditions.push(eq(containers.zoneId, filters.zoneId));
    }

    if (filters.status) {
      conditions.push(eq(containers.status, filters.status));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private async ensureContainerExists(containerId: string) {
    const [container] = await this.db
      .select({ id: containers.id })
      .from(containers)
      .where(eq(containers.id, containerId))
      .limit(1);

    if (!container) {
      throw new NotFoundException(`Container ${containerId} not found`);
    }

    return container;
  }

  private resolveOperationalStatus(fillLevelPercent: number, warningThreshold: number, criticalThreshold: number) {
    if (fillLevelPercent >= criticalThreshold) {
      return 'critical';
    }

    if (fillLevelPercent >= warningThreshold) {
      return 'attention_required';
    }

    return 'available';
  }
}

