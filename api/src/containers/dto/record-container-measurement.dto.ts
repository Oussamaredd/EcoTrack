import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordContainerMeasurementDto {
  @IsOptional()
  @IsUUID()
  sensorDeviceId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deviceUid?: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  fillLevelPercent!: number;

  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(120)
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryPercent?: number;

  @IsOptional()
  @IsInt()
  signalStrength?: number;

  @IsOptional()
  @IsString()
  @IsIn(['valid', 'suspect', 'rejected'])
  @MaxLength(32)
  measurementQuality?: string;
}
