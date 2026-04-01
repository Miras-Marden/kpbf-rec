import { apiFetch } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type SignedUpload = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
};

export async function createSignedMediaUpload(params: {
  path: string;
  contentType?: string;
}): Promise<{ upload: SignedUpload; publicUrl: string }> {
  return apiFetch<{ upload: SignedUpload; publicUrl: string }>({
    path: "/storage/supabase/signed-upload",
    method: "POST",
    body: {
      path: params.path,
      contentType: params.contentType || undefined
    }
  });
}

export async function uploadFileToSignedUrl(params: {
  upload: SignedUpload;
  file: File;
  contentType?: string;
}): Promise<{ publicUrl: string; bucket: string; path: string }> {
  const supabase = getSupabaseBrowserClient();
  const contentType = params.contentType || params.file.type || undefined;

  const res = await supabase.storage
    .from(params.upload.bucket)
    .uploadToSignedUrl(params.upload.path, params.upload.token, params.file, {
      contentType
    });

  if (res.error) {
    throw new Error(`Supabase signed upload failed: ${res.error.message}`);
  }

  // Backend is the source of truth for public URL shape.
  return {
    publicUrl: (await supabase.storage.from(params.upload.bucket).getPublicUrl(params.upload.path)).data.publicUrl,
    bucket: params.upload.bucket,
    path: params.upload.path
  };
}

