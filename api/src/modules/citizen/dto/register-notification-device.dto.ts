import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterNotificationDeviceDto {
  @IsIn(['expo'])
  provider!: 'expo';

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @IsString()
  @MaxLength(512)
  pushToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceLabel?: string;
}
