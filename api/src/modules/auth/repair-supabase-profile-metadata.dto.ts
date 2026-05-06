import { IsString, MinLength } from 'class-validator';

export class RepairSupabaseProfileMetadataDto {
  @IsString()
  @MinLength(8)
  refreshToken!: string;
}
