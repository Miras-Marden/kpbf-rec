import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AdminCreateFighterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  photoUrl?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  regionCity?: string;

  @IsOptional()
  @IsString()
  weightCategoryId?: string;
}

