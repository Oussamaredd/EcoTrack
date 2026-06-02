import { describe, expect, it } from 'vitest';

import { ContainerFillSimulationService } from '../modules/iot/container-fill-simulation.service.js';

describe('ContainerFillSimulationService', () => {
  describe('calculateEffectiveFillLevel', () => {
    it('rounds and clamps the base fill level when no valid measurement date exists', () => {
      expect(
        ContainerFillSimulationService.calculateEffectiveFillLevel({
          fillLevelPercent: 42.6,
          fillRatePerHour: 3,
          lastMeasurementAt: null,
        }),
      ).toBe(43);

      expect(
        ContainerFillSimulationService.calculateEffectiveFillLevel({
          fillLevelPercent: -8,
          fillRatePerHour: 3,
          lastMeasurementAt: 'not-a-date',
        }),
      ).toBe(0);
    });

    it('projects fill level from elapsed hours and clamps at full capacity', () => {
      const now = new Date('2026-06-02T12:00:00.000Z');

      expect(
        ContainerFillSimulationService.calculateEffectiveFillLevel(
          {
            fillLevelPercent: 40,
            fillRatePerHour: 7.5,
            lastMeasurementAt: '2026-06-02T08:00:00.000Z',
          },
          now,
        ),
      ).toBe(70);

      expect(
        ContainerFillSimulationService.calculateEffectiveFillLevel(
          {
            fillLevelPercent: 96,
            fillRatePerHour: 10,
            lastMeasurementAt: new Date('2026-06-02T11:00:00.000Z'),
          },
          now,
        ),
      ).toBe(100);
    });

    it('does not reduce fill level for negative rates or future measurements', () => {
      const now = new Date('2026-06-02T12:00:00.000Z');

      expect(
        ContainerFillSimulationService.calculateEffectiveFillLevel(
          {
            fillLevelPercent: 64,
            fillRatePerHour: -12,
            lastMeasurementAt: '2026-06-02T10:00:00.000Z',
          },
          now,
        ),
      ).toBe(64);

      expect(
        ContainerFillSimulationService.calculateEffectiveFillLevel(
          {
            fillLevelPercent: 64,
            fillRatePerHour: 12,
            lastMeasurementAt: '2026-06-02T14:00:00.000Z',
          },
          now,
        ),
      ).toBe(64);
    });
  });

  describe('deriveOperationalStatus', () => {
    const thresholds = {
      warningThreshold: 70,
      criticalThreshold: 90,
    };

    it('derives available, attention, and critical statuses from rounded fill levels', () => {
      expect(ContainerFillSimulationService.deriveOperationalStatus(69.4, thresholds)).toBe(
        'available',
      );
      expect(ContainerFillSimulationService.deriveOperationalStatus(69.6, thresholds)).toBe(
        'attention_required',
      );
      expect(ContainerFillSimulationService.deriveOperationalStatus(90, thresholds)).toBe(
        'critical',
      );
    });

    it('normalizes out-of-range levels before applying thresholds', () => {
      expect(ContainerFillSimulationService.deriveOperationalStatus(-10, thresholds)).toBe(
        'available',
      );
      expect(ContainerFillSimulationService.deriveOperationalStatus(150, thresholds)).toBe(
        'critical',
      );
    });
  });
});
