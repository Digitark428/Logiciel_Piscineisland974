import { createAdminClient } from "@/lib/supabase/admin";
import { assembleBackupArchive, removeBackupTemporaryFiles, uploadGeneratedArtifact } from "@/lib/backups/archive";
import { generateProfessionalPdf } from "@/lib/backups/pdf";
import { collectBackupSnapshot, downloadBackupSnapshot, uploadBackupSnapshot } from "@/lib/backups/snapshot";
import { generateProfessionalXlsx } from "@/lib/backups/xlsx";

export async function collectSnapshotStep(backupId: string, workspaceId: string): Promise<string> {
  "use step";

  const admin = createAdminClient();
  const { data: backup, error } = await admin
    .from("backups")
    .select("id, attempt_count, status")
    .eq("id", backupId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !backup) throw new Error("Sauvegarde introuvable.");
  if (backup.status === "completed") throw new Error("Cette sauvegarde est déjà terminée.");
  await admin.from("backups").update({
    status: "running",
    progress_stage: "collecting",
    started_at: new Date().toISOString(),
    completed_at: null,
    failure_message: null,
    attempt_count: Number(backup.attempt_count ?? 0) + 1,
  }).eq("id", backupId).eq("workspace_id", workspaceId);

  const snapshot = await collectBackupSnapshot(admin, workspaceId);
  const path = await uploadBackupSnapshot(admin, snapshot, backupId);
  const { error: updateError } = await admin.from("backups")
    .update({ progress_stage: "pdf" })
    .eq("id", backupId)
    .eq("workspace_id", workspaceId);
  if (updateError) throw new Error("Progression de la sauvegarde impossible.");
  return path;
}

export async function generatePdfStep(backupId: string, workspaceId: string, snapshotPath: string): Promise<string> {
  "use step";

  const admin = createAdminClient();
  const snapshot = await downloadBackupSnapshot(admin, workspaceId, snapshotPath);
  const pdf = await generateProfessionalPdf(admin, snapshot);
  const path = await uploadGeneratedArtifact(admin, workspaceId, backupId, "dossier.pdf", pdf);
  const { error } = await admin.from("backups").update({ progress_stage: "xlsx" }).eq("id", backupId).eq("workspace_id", workspaceId);
  if (error) throw new Error("Progression PDF impossible.");
  return path;
}

export async function generateXlsxStep(backupId: string, workspaceId: string, snapshotPath: string): Promise<string> {
  "use step";

  const admin = createAdminClient();
  const snapshot = await downloadBackupSnapshot(admin, workspaceId, snapshotPath);
  const xlsx = await generateProfessionalXlsx(snapshot);
  const path = await uploadGeneratedArtifact(admin, workspaceId, backupId, "donnees.xlsx", xlsx);
  const { error } = await admin.from("backups").update({ progress_stage: "archive" }).eq("id", backupId).eq("workspace_id", workspaceId);
  if (error) throw new Error("Progression XLSX impossible.");
  return path;
}

export async function assembleArchiveStep(
  backupId: string,
  workspaceId: string,
  snapshotPath: string,
  pdfPath: string,
  xlsxPath: string,
): Promise<{ path: string; size: number; fileName: string; missingCount: number }> {
  "use step";

  const admin = createAdminClient();
  const snapshot = await downloadBackupSnapshot(admin, workspaceId, snapshotPath);
  const archive = await assembleBackupArchive(admin, snapshot, backupId, pdfPath, xlsxPath);
  const completedAt = new Date().toISOString();
  const { error } = await admin.from("backups").update({
    storage_path: archive.path,
    file_name: archive.fileName,
    mime_type: "application/zip",
    size_bytes: archive.size,
    status: "completed",
    progress_stage: "completed",
    completed_at: completedAt,
    failure_message: archive.missing.length > 0
      ? `${archive.missing.length} fichier(s) référencé(s) indisponible(s), listé(s) dans le ZIP.`
      : null,
  }).eq("id", backupId).eq("workspace_id", workspaceId);
  if (error) throw new Error("Finalisation de la sauvegarde impossible.");
  return { path: archive.path, size: archive.size, fileName: archive.fileName, missingCount: archive.missing.length };
}

export async function cleanupTemporaryFilesStep(workspaceId: string, paths: string[]): Promise<void> {
  "use step";
  if (paths.some((path) => !path.startsWith(`${workspaceId}/jobs/`))) throw new Error("Nettoyage hors entreprise refusé.");
  await removeBackupTemporaryFiles(createAdminClient(), paths);
}

export async function markBackupFailedStep(backupId: string, workspaceId: string, reason: string): Promise<void> {
  "use step";

  const admin = createAdminClient();
  const { data } = await admin.from("backups").select("status").eq("id", backupId).eq("workspace_id", workspaceId).maybeSingle();
  if (!data || data.status === "completed") return;
  const message = reason.replace(/\s+/g, " ").slice(0, 500) || "Erreur inconnue";
  await admin.from("backups").update({
    status: "failed",
    progress_stage: "failed",
    failure_message: message,
    completed_at: new Date().toISOString(),
  }).eq("id", backupId).eq("workspace_id", workspaceId);
}
