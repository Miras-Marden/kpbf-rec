import { IsString, MinLength } from "class-validator";

export class LinkSupabaseDto {
  @IsString()
  @MinLength(20)
  supabaseAccessToken!: string;
}

