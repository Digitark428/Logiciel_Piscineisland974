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

/** URLs signées en lot pour limiter les allers-retours Storage sur les listes. */
export async function signedUrls(
  bucket: string,
  paths: Array<string | null | undefined>,
  expiresIn = 3600,
): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((path): path is string => Boolean(path))));
  if (uniquePaths.length === 0) return new Map();

  const supabase = createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, expiresIn);
  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
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
