import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListReplayableDeliveriesDto {
  @IsOptional()
  @IsIn(['failed', 'retry'])
  status?: 'failed' | 'retry';

  @IsOptional()
  @IsString()
  consumerName?: string;

  @IsOptional()
  @IsUUID()
  validatedEventId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
