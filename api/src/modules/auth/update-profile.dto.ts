import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const AVATAR_URL_ALLOWED_PATTERN = /^https?:\/\//i;

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(AVATAR_URL_ALLOWED_PATTERN, {
    message: 'avatarUrl must be an http/https URL.',
  })
  avatarUrl?: string;
}

