import { apiFetch } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type SignedUpload = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
};

export type SignedMediaUpload = { upload: SignedUpload; publicUrl: string };

export async function createSignedMediaUpload(params: {
  path: string;
  contentType?: string;
}): Promise<SignedMediaUpload> {
  return apiFetch<SignedMediaUpload>({
    path: "/storage/supabase/signed-upload",
    method: "POST",
    body: {
      path: params.path,
      contentType: params.contentType || undefined
    }
  });
}

export async function uploadFileToSignedUrl(params: {
  signed: SignedMediaUpload;
  file: File;
  contentType?: string;
}): Promise<{ publicUrl: string; bucket: string; path: string }> {
  const supabase = getSupabaseBrowserClient();
  const contentType = params.contentType || params.file.type || undefined;

  const res = await supabase.storage
    .from(params.signed.upload.bucket)
    .uploadToSignedUrl(params.signed.upload.path, params.signed.upload.token, params.file, {
      contentType
    });

  if (res.error) {
    throw new Error(`Supabase signed upload failed: ${res.error.message}`);
  }

  return {
    publicUrl: params.signed.publicUrl,
    bucket: params.signed.upload.bucket,
    path: params.signed.upload.path
  };
}

