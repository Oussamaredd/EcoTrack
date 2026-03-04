import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateCitizenReportDto {
  @IsUUID()
  containerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @Matches(/^https?:\/\/\S+$/i, {
    message: 'photoUrl must be a valid http/https URL',
  })
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;
}

