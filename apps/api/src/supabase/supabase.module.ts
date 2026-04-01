import { Module } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";
import { SupabaseStorageController } from "./supabase-storage.controller";

@Module({
  controllers: [SupabaseStorageController],
  providers: [SupabaseService],
  exports: [SupabaseService]
})
export class SupabaseModule {}

