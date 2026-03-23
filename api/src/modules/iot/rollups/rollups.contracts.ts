export type MeasurementRollupSnapshot = {
  validatedEventId: string;
  deviceUid: string;
  containerId: string | null;
  sensorDeviceId: string | null;
  windowStart: string;
  windowEnd: string;
  measurementCount: number;
  averageFillLevelPercent: number;
  fillLevelDeltaPercent: number;
  sensorHealthScore: number;
  schemaVersion: string;
};

export type MeasurementRollupFilters = {
  containerId?: string;
  deviceUid?: string;
  limit?: number;
};
