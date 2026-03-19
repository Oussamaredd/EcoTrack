import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class IngestMeasurementDto {
  @IsOptional()
  @IsUUID()
  sensorDeviceId?: string;

  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deviceUid!: string;

  @IsDefined()
  @IsDateString()
  measuredAt!: string;

  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  fillLevelPercent!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-50)
  @Max(100)
  temperatureC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  batteryPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-120)
  @Max(0)
  signalStrength?: number;

  @IsOptional()
  @IsString()
  @IsIn(['valid', 'suspect', 'rejected'])
  @MaxLength(32)
  measurementQuality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class BatchIngestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngestMeasurementDto)
  measurements!: IngestMeasurementDto[];
}
