import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AnyAuthGuard } from "../auth/any-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../rbac/roles.decorator";
import { CreateSignedMediaUploadDto } from "./dto/create-signed-media-upload.dto";
import { SupabaseService } from "./supabase.service";

function isSafeStoragePath(path: string) {
  const v = path.trim();
  if (!v || v.startsWith("/")) return false;
  if (v.includes("..")) return false;
  return true;
}

@UseGuards(AnyAuthGuard)
@Controller("storage/supabase")
export class SupabaseStorageController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post("signed-upload")
  @Roles(Role.ADMIN, Role.EDITOR)
  async createSignedUpload(
    @CurrentUser() _user: { sub: string },
    @Body() dto: CreateSignedMediaUploadDto
  ) {
    if (!isSafeStoragePath(dto.path)) {
      throw new BadRequestException("Invalid storage path");
    }

    const upload = await this.supabase.createSignedMediaUpload({
      path: dto.path,
      contentType: dto.contentType,
      bucket: dto.bucket
    });

    return {
      upload,
      publicUrl: this.supabase.getPublicMediaUrl(upload.path, upload.bucket)
    };
  }
}
