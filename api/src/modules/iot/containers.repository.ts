import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  containerTypes,
  containers,
  type DatabaseClient,
  measurements,
  sensorDevices,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

import { ContainerFillSimulationService } from './container-fill-simulation.service.js';
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
    const statusFilter = filters.status?.trim().toLowerCase();
    const now = new Date();

    const createListQuery = () => this.db
      .select({
        id: containers.id,
        code: containers.code,
        label: containers.label,
        status: containers.status,
        fillLevelPercent: containers.fillLevelPercent,
        fillRatePerHour: containers.fillRatePerHour,
        lastMeasurementAt: containers.lastMeasurementAt,
        lastCollectedAt: containers.lastCollectedAt,
        latitude: containers.latitude,
        longitude: containers.longitude,
        containerTypeId: containers.containerTypeId,
        containerTypeCode: containerTypes.code,
        containerTypeLabel: containerTypes.label,
        warningFillPercent: containerTypes.defaultFillAlertPercent,
        criticalFillPercent: containerTypes.defaultCriticalAlertPercent,
        zoneId: containers.zoneId,
        zoneName: zones.name,
        createdAt: containers.createdAt,
        updatedAt: containers.updatedAt,
      })
      .from(containers)
      .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
      .leftJoin(zones, eq(containers.zoneId, zones.id))
      .orderBy(asc(containers.code));

    const totalQuery = this.db.select({ value: count() }).from(containers);

    if (statusFilter) {
      const unfilteredItems = await (where ? createListQuery().where(where) : createListQuery());
      const filteredItems = this.mapListItems(unfilteredItems, now).filter(
        (item) => item.status.trim().toLowerCase() === statusFilter,
      );

      return {
        items: filteredItems.slice(filters.offset, filters.offset + filters.limit),
        total: filteredItems.length,
      };
    }

    const listQuery = createListQuery().limit(filters.limit).offset(filters.offset);
    const [items, totalRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items: this.mapListItems(items, now),
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
        latitude: dto.latitude.trim(),
        longitude: dto.longitude.trim(),
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
        ...(dto.fillLevelPercent !== undefined
          ? { fillLevelPercent: dto.fillLevelPercent, lastMeasurementAt: new Date() }
          : {}),
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(dto.containerTypeId !== undefined ? { containerTypeId: dto.containerTypeId } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude.trim() } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude.trim() } : {}),
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
        fillRatePerHour: containers.fillRatePerHour,
        lastMeasurementAt: containers.lastMeasurementAt,
        lastCollectedAt: containers.lastCollectedAt,
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
    const effectiveFillLevel = ContainerFillSimulationService.calculateEffectiveFillLevel({
      fillLevelPercent: container.fillLevelPercent,
      fillRatePerHour: container.fillRatePerHour,
      lastMeasurementAt: container.lastMeasurementAt,
    });
    const warningThreshold = container.warningFillPercent ?? 80;
    const criticalThreshold = container.criticalFillPercent ?? 95;
    const effectiveStatus = ContainerFillSimulationService.deriveOperationalStatus(effectiveFillLevel, {
      warningThreshold,
      criticalThreshold,
    });

    return {
      container: {
        ...container,
        fillLevelPercent: effectiveFillLevel,
        lastMeasuredFillLevelPercent: container.fillLevelPercent,
        status: effectiveStatus,
      },
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

      const duplicateConditions = [
        eq(measurements.containerId, containerId),
        eq(measurements.measuredAt, measuredAt),
        eq(measurements.fillLevelPercent, dto.fillLevelPercent),
        resolvedSensorId ? eq(measurements.sensorDeviceId, resolvedSensorId) : isNull(measurements.sensorDeviceId),
      ];
      const [existingMeasurement] = await tx
        .select()
        .from(measurements)
        .where(and(...duplicateConditions))
        .limit(1);

      const [createdMeasurement] = existingMeasurement
        ? [existingMeasurement]
        : await tx
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
      const [newerMeasurement] = await tx
        .select({
          id: measurements.id,
        })
        .from(measurements)
        .where(
          and(
            eq(measurements.containerId, containerId),
            gt(measurements.measuredAt, measuredAt),
          ),
        )
        .limit(1);

      if (!newerMeasurement) {
        await tx
          .update(containers)
          .set({
            fillLevelPercent: dto.fillLevelPercent,
            lastMeasurementAt: measuredAt,
            lastCollectedAt: dto.fillLevelPercent === 0 ? measuredAt : sql`${containers.lastCollectedAt}`,
            status: ContainerFillSimulationService.deriveOperationalStatus(dto.fillLevelPercent, {
              warningThreshold,
              criticalThreshold,
            }),
            updatedAt: new Date(),
          })
          .where(eq(containers.id, containerId));
      }

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

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private mapListItems<T extends {
    fillLevelPercent: number;
    fillRatePerHour: number;
    lastMeasurementAt: Date | string | null;
    warningFillPercent: number | null;
    criticalFillPercent: number | null;
  }>(items: T[], now: Date) {
    return items.map((item) => {
      const warningThreshold = item.warningFillPercent ?? 80;
      const criticalThreshold = item.criticalFillPercent ?? 95;
      const effectiveFillLevel = ContainerFillSimulationService.calculateEffectiveFillLevel(
        {
          fillLevelPercent: item.fillLevelPercent,
          fillRatePerHour: item.fillRatePerHour,
          lastMeasurementAt: item.lastMeasurementAt,
        },
        now,
      );

      return {
        ...item,
        fillLevelPercent: effectiveFillLevel,
        lastMeasuredFillLevelPercent: item.fillLevelPercent,
        status: ContainerFillSimulationService.deriveOperationalStatus(effectiveFillLevel, {
          warningThreshold,
          criticalThreshold,
        }),
      };
    });
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

}


