import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  depotLabel!: string;

  @IsLatitude()
  depotLatitude!: string;

  @IsLongitude()
  depotLongitude!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

