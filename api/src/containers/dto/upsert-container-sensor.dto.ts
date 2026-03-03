import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertContainerSensorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deviceUid!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hardwareModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  firmwareVersion?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'maintenance', 'retired'])
  @MaxLength(32)
  installStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryPercent?: number;

  @IsOptional()
  @IsDateString()
  lastSeenAt?: string;

  @IsOptional()
  @IsDateString()
  installedAt?: string;
}
