import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { FightMethod, FightOutcome } from "@prisma/client";

export class AdminUpdateBoutDto {
  @IsOptional()
  @IsString()
  fighterAId?: string;

  @IsOptional()
  @IsString()
  fighterBId?: string;

  @IsOptional()
  @IsDateString()
  boutDate?: string;

  @IsOptional()
  @IsString()
  weightCategoryId?: string | null;

  @IsOptional()
  @IsString()
  eventId?: string | null;

  @IsOptional()
  @IsEnum(FightOutcome)
  result?: FightOutcome;

  @IsOptional()
  @IsEnum(FightMethod)
  method?: FightMethod;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  venue?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referee?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderationNote?: string | null;
}

