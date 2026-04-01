import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Default bucket name; configure RLS in Supabase for this bucket. */
const DEFAULT_BUCKET = "media";

export type UploadMediaResult = {
  bucket: string;
  path: string;
  publicUrl: string;
};

/**
 * Direct upload to Supabase Storage using the anon key (client + RLS policies).
 * No Nest API or service role on the client.
 */
export async function uploadMediaFile(params: {
  path: string;
  file: File;
  bucket?: string;
  upsert?: boolean;
}): Promise<UploadMediaResult> {
  const supabase = getSupabaseBrowserClient();
  const bucket = params.bucket?.trim() || DEFAULT_BUCKET;
  const { data, error } = await supabase.storage.from(bucket).upload(params.path, params.file, {
    upsert: params.upsert ?? false,
    contentType: params.file.type || undefined
  });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return {
    bucket,
    path: data.path,
    publicUrl: pub.publicUrl
  };
}

export function getMediaPublicUrl(path: string, bucket: string = DEFAULT_BUCKET): string {
  const supabase = getSupabaseBrowserClient();
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
