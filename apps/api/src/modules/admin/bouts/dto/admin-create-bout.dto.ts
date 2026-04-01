import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { FightMethod, FightOutcome } from "@prisma/client";

export class AdminCreateBoutDto {
  @IsString()
  fighterAId!: string;

  @IsString()
  fighterBId!: string;

  @IsDateString()
  boutDate!: string;

  @IsOptional()
  @IsString()
  weightCategoryId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsEnum(FightOutcome)
  result!: FightOutcome;

  @IsEnum(FightMethod)
  method!: FightMethod;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  venue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referee?: string;
}

