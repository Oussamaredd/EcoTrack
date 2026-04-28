type FillSimulationInput = {
  fillLevelPercent: number;
  fillRatePerHour: number;
  lastMeasurementAt: Date | string | null;
};

type StatusDerivationInput = {
  warningThreshold: number;
  criticalThreshold: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toDateOrNull = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export class ContainerFillSimulationService {
  static calculateEffectiveFillLevel(input: FillSimulationInput, now: Date = new Date()) {
    const baseFillLevel = clamp(Math.round(input.fillLevelPercent), 0, 100);
    const fillRatePerHour = Math.max(0, input.fillRatePerHour);
    const lastMeasurementAt = toDateOrNull(input.lastMeasurementAt);
    if (!lastMeasurementAt) {
      return baseFillLevel;
    }

    const elapsedMs = Math.max(0, now.getTime() - lastMeasurementAt.getTime());
    const elapsedHours = elapsedMs / (60 * 60 * 1000);

    return clamp(Math.round(baseFillLevel + fillRatePerHour * elapsedHours), 0, 100);
  }

  static deriveOperationalStatus(fillLevelPercent: number, thresholds: StatusDerivationInput) {
    const normalizedFillLevel = clamp(Math.round(fillLevelPercent), 0, 100);
    if (normalizedFillLevel >= thresholds.criticalThreshold) {
      return 'critical';
    }

    if (normalizedFillLevel >= thresholds.warningThreshold) {
      return 'attention_required';
    }

    return 'available';
  }
}
