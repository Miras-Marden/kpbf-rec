import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSignedMediaUploadDto {
  @IsString()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  bucket?: string;
}
