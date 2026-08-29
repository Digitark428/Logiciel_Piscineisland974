import "server-only";

import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import { finished } from "node:stream/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BackupSnapshot, JsonRecord } from "@/lib/backups/types";
import { backupFileName, recordText, safeFileSegment } from "@/lib/backups/format";

interface StoredFile {
  bucket: "backups" | "documents" | "community-media" | "workspace-assets";
  path: string;
  zipPath: string;
  required?: boolean;
}

function mimeExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  };
  return extensions[mimeType] ?? "";
}

function withExtension(name: string, mimeType: string): string {
  const safe = safeFileSegment(name, "fichier");
  return /\.[a-z0-9]{1,8}$/i.test(safe) ? safe : `${safe}${mimeExtension(mimeType)}`;
}

function uniqueZipPath(path: string, id: string, used: Set<string>): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const dot = path.lastIndexOf(".");
  const suffix = safeFileSegment(id, "copie").slice(0, 8);
  const next = dot > path.lastIndexOf("/") ? `${path.slice(0, dot)}-${suffix}${path.slice(dot)}` : `${path}-${suffix}`;
  used.add(next);
  return next;
}

function documentFolder(entityType: string): string {
  const folders: Record<string, string> = {
    contract: "Contrats",
    invoice: "Factures",
    client: "Clients",
    pool: "Piscines",
    service: "Entretiens",
    member: "Equipe",
    workspace: "Entreprise",
  };
  return folders[entityType] ?? "Autres";
}

function archiveFiles(
  snapshot: BackupSnapshot,
  pdfPath: string,
  xlsxPath: string,
  root: string,
): StoredFile[] {
  const usedPaths = new Set<string>();
  const files: StoredFile[] = [
    { bucket: "backups", path: pdfPath, zipPath: `${root}/Dossier-Entreprise-LETI.pdf`, required: true },
    { bucket: "backups", path: xlsxPath, zipPath: `${root}/Donnees-LETI.xlsx`, required: true },
  ];

  for (const document of snapshot.tables.documents ?? []) {
    const path = recordText(document, "storage_path");
    if (!path.startsWith(`${snapshot.workspaceId}/`)) continue;
    const name = withExtension(recordText(document, "name") || `document-${recordText(document, "id")}`, recordText(document, "mime_type"));
    const zipPath = uniqueZipPath(`${root}/Documents/${documentFolder(recordText(document, "entity_type"))}/${name}`, recordText(document, "id"), usedPaths);
    files.push({ bucket: "documents", path, zipPath });
  }

  for (const contract of snapshot.tables.contracts ?? []) {
    const path = recordText(contract, "document_path");
    if (!path.startsWith(`${snapshot.workspaceId}/`) || files.some((file) => file.bucket === "documents" && file.path === path)) continue;
    const name = withExtension(recordText(contract, "title") || `contrat-${recordText(contract, "id")}`, "application/pdf");
    const zipPath = uniqueZipPath(`${root}/Documents/Contrats/${name}`, recordText(contract, "id"), usedPaths);
    files.push({ bucket: "documents", path, zipPath });
  }

  for (const media of snapshot.tables.community_post_media ?? []) {
    const originalPath = recordText(media, "original_storage_path");
    const normalizedPath = recordText(media, "storage_path");
    const path = originalPath || normalizedPath;
    if (!path.startsWith(`${snapshot.workspaceId}/`)) continue;
    const createdAt = recordText(media, "created_at");
    const date = /^\d{4}-\d{2}/.test(createdAt) ? createdAt : "Sans-date";
    const folder = date === "Sans-date" ? date : `${date.slice(0, 4)}/${date.slice(5, 7)}`;
    const mime = recordText(media, "original_mime_type") || "image/webp";
    const name = withExtension(recordText(media, "original_name") || `photo-${recordText(media, "id")}`, mime);
    const zipPath = uniqueZipPath(`${root}/Galerie/${folder}/${name}`, recordText(media, "id"), usedPaths);
    files.push({ bucket: "community-media", path, zipPath });
  }

  const workspace = snapshot.tables.workspaces?.[0];
  const settings = workspace?.settings;
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    const logoPath = (settings as JsonRecord).company_logo_path;
    if (typeof logoPath === "string" && logoPath.startsWith(`${snapshot.workspaceId}/`)) {
      files.push({ bucket: "workspace-assets", path: logoPath, zipPath: `${root}/Documents/Entreprise/logo-entreprise.webp` });
    }
  }
  return files;
}

async function storageResponse(admin: SupabaseClient, file: StoredFile): Promise<Response | null> {
  const { data, error } = await admin.storage.from(file.bucket).createSignedUrl(file.path, 3600);
  if (error || !data?.signedUrl) {
    if (file.required) throw new Error(`Fichier requis indisponible: ${file.path}`);
    return null;
  }
  const response = await fetch(data.signedUrl);
  if (!response.ok || !response.body) {
    if (file.required) throw new Error(`Lecture du fichier requis impossible: ${file.path}`);
    return null;
  }
  return response;
}

function localDateParts(snapshot: BackupSnapshot): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: snapshot.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(snapshot.generatedAt));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { year: get("year"), month: get("month"), day: get("day") };
}

export async function uploadGeneratedArtifact(
  admin: SupabaseClient,
  workspaceId: string,
  backupId: string,
  name: "dossier.pdf" | "donnees.xlsx",
  body: Buffer,
): Promise<string> {
  const path = `${workspaceId}/jobs/${backupId}/${name}`;
  const contentType = name.endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const { error } = await admin.storage.from("backups").upload(path, body, { contentType, cacheControl: "3600", upsert: true });
  if (error) throw new Error(`Écriture de ${name} impossible: ${error.message}`);
  return path;
}

export async function assembleBackupArchive(
  admin: SupabaseClient,
  snapshot: BackupSnapshot,
  backupId: string,
  pdfPath: string,
  xlsxPath: string,
): Promise<{ path: string; size: number; fileName: string; missing: string[] }> {
  const workspaceName = recordText(snapshot.tables.workspaces?.[0], "name") || "Entreprise";
  const { data: backup, error: backupError } = await admin
    .from("backups")
    .select("file_name")
    .eq("id", backupId)
    .eq("workspace_id", snapshot.workspaceId)
    .maybeSingle();
  if (backupError || !backup) throw new Error("Sauvegarde introuvable avant assemblage.");
  const fileName = backup.file_name || backupFileName(workspaceName, new Date(snapshot.generatedAt), snapshot.timeZone);
  const root = safeFileSegment(fileName.replace(/\.zip$/i, ""), "LETI-Sauvegarde");
  const date = localDateParts(snapshot);
  const path = `${snapshot.workspaceId}/${date.year}/${date.month}/${date.day}/${backupId}/${safeFileSegment(fileName, "LETI-Sauvegarde.zip")}`;
  const files = archiveFiles(snapshot, pdfPath, xlsxPath, root);
  const missing: string[] = [];
  const archive = archiver("zip", { zlib: { level: 6 } });
  const output = new PassThrough();
  archive.pipe(output);
  const archiveFailure = new Promise<never>((_resolve, reject) => {
    archive.once("error", reject);
    output.once("error", reject);
  });

  const uploadPromise = admin.storage.from("backups").upload(path, output, {
    contentType: "application/zip",
    cacheControl: "3600",
    upsert: true,
  });

  try {
    for (const file of files) {
      const response = await storageResponse(admin, file);
      if (!response?.body) {
        missing.push(`${file.bucket}:${file.path}`);
        continue;
      }
      const stream = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream<Uint8Array>);
      archive.append(stream, { name: file.zipPath });
      await Promise.race([finished(stream), archiveFailure]);
    }
    if (missing.length > 0) {
      archive.append(
        `Certains fichiers référencés dans LETI n’étaient plus disponibles au moment de la sauvegarde.\n\n${missing.join("\n")}\n`,
        { name: `${root}/Fichiers-indisponibles.txt` },
      );
    }
    await archive.finalize();
    const { error: uploadError } = await uploadPromise;
    if (uploadError) throw new Error(`Import du ZIP impossible: ${uploadError.message}`);
  } catch (error) {
    archive.abort();
    output.destroy();
    await uploadPromise.catch(() => undefined);
    throw error;
  }

  const size = archive.pointer();
  if (size <= 0) throw new Error("Archive ZIP vide.");
  const folder = path.slice(0, path.lastIndexOf("/"));
  const { data: stored, error: listError } = await admin.storage.from("backups").list(folder, { search: path.slice(path.lastIndexOf("/") + 1), limit: 1 });
  const storedSize = Number(stored?.[0]?.metadata?.size ?? size);
  if (listError || storedSize <= 0) throw new Error("Vérification du ZIP impossible.");
  return { path, size: storedSize, fileName, missing };
}

export async function removeBackupTemporaryFiles(admin: SupabaseClient, paths: string[]): Promise<void> {
  const scoped = paths.filter((path) => path.includes("/jobs/"));
  if (scoped.length === 0) return;
  const { error } = await admin.storage.from("backups").remove(scoped);
  if (error) console.warn("[backup.cleanup]", error.message);
}
