import { Injectable } from '@nestjs/common';

import type { ClaimedValidatedEventDelivery } from '../iot/validated-consumer/validated-consumer.contracts.js';
import { CACHE_NAMESPACES } from '../performance/cache.constants.js';
import { CacheService } from '../performance/cache.service.js';

import { AnalyticsRepository } from './analytics.repository.js';

const TEMPERATURE_CRITICAL_C = 50;
const BATTERY_WARNING_PERCENT = 10;
const BATTERY_CRITICAL_PERCENT = 5;
const FILL_SURGE_THRESHOLD_PERCENT = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class AnomalyAlertProjectionService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async projectValidatedMeasurement(delivery: ClaimedValidatedEventDelivery) {
    const zoneContext = await this.repository.resolveZoneContext(delivery.containerId);
    const createdAlertIds: string[] = [];

    if (delivery.temperatureC !== null && delivery.temperatureC > TEMPERATURE_CRITICAL_C) {
      const alertId = await this.repository.upsertAnomalyAlert({
        sourceEventKey: `${delivery.validatedEventId}:temperature_high`,
        containerId: delivery.containerId,
        zoneId: zoneContext?.zoneId ?? null,
        eventType: 'iot_temperature_high',
        severity: 'critical',
        triggeredAt: delivery.measuredAt,
        payloadSnapshot: {
          validatedEventId: delivery.validatedEventId,
          deviceUid: delivery.deviceUid,
          containerCode: zoneContext?.containerCode ?? null,
          temperatureC: delivery.temperatureC,
          thresholdC: TEMPERATURE_CRITICAL_C,
        },
      });

      if (alertId) {
        createdAlertIds.push(alertId);
      }
    }

    if (delivery.batteryPercent !== null && delivery.batteryPercent < BATTERY_WARNING_PERCENT) {
      const alertId = await this.repository.upsertAnomalyAlert({
        sourceEventKey: `${delivery.validatedEventId}:battery_low`,
        containerId: delivery.containerId,
        zoneId: zoneContext?.zoneId ?? null,
        eventType: 'iot_battery_low',
        severity:
          delivery.batteryPercent < BATTERY_CRITICAL_PERCENT ? 'critical' : 'warning',
        triggeredAt: delivery.measuredAt,
        payloadSnapshot: {
          validatedEventId: delivery.validatedEventId,
          deviceUid: delivery.deviceUid,
          containerCode: zoneContext?.containerCode ?? null,
          batteryPercent: delivery.batteryPercent,
          thresholdPercent: BATTERY_WARNING_PERCENT,
        },
      });

      if (alertId) {
        createdAlertIds.push(alertId);
      }
    }

    if (delivery.containerId) {
      const priorSamples = await this.repository.listContainerMeasurements(
        delivery.containerId,
        new Date(delivery.measuredAt.getTime() - ONE_HOUR_MS),
        new Date(delivery.measuredAt.getTime() + 1),
      );
      const oldestSample = priorSamples[0];
      const fillDelta =
        oldestSample == null ? 0 : delivery.fillLevelPercent - oldestSample.fillLevelPercent;

      if (fillDelta >= FILL_SURGE_THRESHOLD_PERCENT) {
        const alertId = await this.repository.upsertAnomalyAlert({
          sourceEventKey: `${delivery.validatedEventId}:fill_level_surge`,
          containerId: delivery.containerId,
          zoneId: zoneContext?.zoneId ?? null,
          eventType: 'iot_fill_level_surge',
          severity: fillDelta >= 35 ? 'critical' : 'warning',
          triggeredAt: delivery.measuredAt,
          payloadSnapshot: {
            validatedEventId: delivery.validatedEventId,
            deviceUid: delivery.deviceUid,
            containerCode: zoneContext?.containerCode ?? null,
            fillLevelPercent: delivery.fillLevelPercent,
            previousFillLevelPercent: oldestSample?.fillLevelPercent ?? null,
            deltaPercent: fillDelta,
            thresholdPercent: FILL_SURGE_THRESHOLD_PERCENT,
          },
        });

        if (alertId) {
          createdAlertIds.push(alertId);
        }
      }
    }

    const result = {
      createdAlerts: createdAlertIds.length,
      alertIds: createdAlertIds,
    };

    if (createdAlertIds.length > 0) {
      await this.cacheService.invalidateNamespaces([
        CACHE_NAMESPACES.analytics,
        CACHE_NAMESPACES.planning,
      ]);
    }

    return result;
  }
}
