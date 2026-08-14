import "server-only";

import { createClient } from "@/lib/supabase/server";

/** URL signée de courte durée pour un objet d'un bucket privé. */
export async function signedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const supabase = createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

/** URL signée forçant le téléchargement (Content-Disposition: attachment) avec un nom de fichier. */
export async function signedDownloadUrl(
  bucket: string,
  path: string | null | undefined,
  downloadName?: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, { download: downloadName ?? true });
  return data?.signedUrl ?? null;
}
