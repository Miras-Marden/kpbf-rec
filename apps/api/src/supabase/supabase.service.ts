import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private client?: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  /**
   * Server-side Supabase client using service role key.
   * Only use this on the API (never in web).
   */
  admin(): SupabaseClient {
    if (this.client) return this.client;
    const url = this.config.get<string>("SUPABASE_URL", { infer: true })?.trim();
    const serviceRoleKey = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY", { infer: true })?.trim();
    if (!url || !serviceRoleKey) {
      throw new Error("Supabase admin client not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)");
    }
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    return this.client;
  }

  async createSignedMediaUpload(params: {
    path: string;
    contentType?: string;
    expiresInSeconds?: number;
    bucket?: string;
  }) {
    const bucket = params.bucket?.trim() || this.config.get<string>("SUPABASE_STORAGE_BUCKET_MEDIA", { infer: true }) || "media";

    const supabase = this.admin();
    // supabase-js v2 createSignedUploadUrl currently takes (path, options)
    // Expiration is managed server-side; we keep this minimal for the migration bridge.
    void params.expiresInSeconds;
    void params.contentType;
    const res = await supabase.storage.from(bucket).createSignedUploadUrl(params.path, { upsert: false });
    if (res.error) {
      throw new Error(`Supabase createSignedUploadUrl failed: ${res.error.message}`);
    }
    return {
      bucket,
      path: params.path,
      token: res.data.token,
      signedUrl: res.data.signedUrl
    };
  }

  getPublicMediaUrl(path: string, bucket?: string) {
    const resolvedBucket =
      bucket?.trim() ||
      this.config.get<string>("SUPABASE_STORAGE_BUCKET_MEDIA", { infer: true }) ||
      "media";
    const { data } = this.admin().storage.from(resolvedBucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

