import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertAlertRuleDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsIn(['global', 'zone', 'container_type', 'container'])
  @MaxLength(32)
  scopeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scopeKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  warningFillPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  criticalFillPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  anomalyTypeCode?: string;

  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(['email', 'sms', 'push', 'in_app'], { each: true })
  notifyChannels!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  recipientRole?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
