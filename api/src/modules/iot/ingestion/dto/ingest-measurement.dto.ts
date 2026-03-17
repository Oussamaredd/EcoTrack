import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, IsInt, IsDateString, Min, Max } from 'class-validator';

export class IngestMeasurementDto {
  @IsOptional()
  @IsUUID()
  sensorDeviceId?: string;

  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsString()
  deviceUid!: string;

  @IsDateString()
  measuredAt!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  fillLevelPercent!: number;

  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  batteryPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(-120)
  @Max(0)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  signalStrength?: number;

  @IsOptional()
  @IsString()
  measurementQuality?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class BatchIngestDto {
  measurements!: IngestMeasurementDto[];
}
