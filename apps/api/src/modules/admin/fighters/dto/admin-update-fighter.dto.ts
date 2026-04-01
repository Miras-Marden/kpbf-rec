import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AdminUpdateFighterDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  photoUrl?: string | null;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  nationality?: string | null;

  @IsOptional()
  @IsString()
  regionCity?: string | null;

  @IsOptional()
  @IsString()
  weightCategoryId?: string | null;

  @IsOptional()
  @IsString()
  moderationNote?: string | null;
}

