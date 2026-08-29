"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { attachWorkflowRun, createBackupJob } from "@/lib/backups/queue";
import { professionalBackupWorkflow } from "@/workflows/professional-backup";

const backupIdSchema = z.string().uuid();

export async function createManualBackup(): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé au gérant de l’entreprise.");

  const admin = createAdminClient();
  let backupId: string | null = null;
  try {
    const job = await createBackupJob(admin, {
      workspaceId: ctx.workspace.id,
      workspaceName: ctx.workspace.name,
      timeZone: ctx.workspace.timezone ?? "Indian/Reunion",
      kind: "manual",
      requestedBy: ctx.membership.id,
    });
    backupId = job.id;
    const run = await start(professionalBackupWorkflow, [{ backupId, workspaceId: ctx.workspace.id }]);
    await attachWorkflowRun(admin, backupId, ctx.workspace.id, run.runId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    if (backupId) {
      await admin.from("backups").update({
        status: "failed",
        progress_stage: "failed",
        failure_message: message.slice(0, 500),
        completed_at: new Date().toISOString(),
      }).eq("id", backupId).eq("workspace_id", ctx.workspace.id);
    }
    return fail("Le démarrage de la sauvegarde a échoué. Réessayez dans un instant.");
  }
  await logActivity(ctx, { action: "backup", entity_type: "workspace", entity_id: backupId, summary: "Sauvegarde manuelle demandée" });
  revalidatePath("/app/backups");
  return ok("Sauvegarde lancée. Vous pouvez suivre sa progression dans l’historique.", { backupId });
}

/** URL signée de téléchargement d'une sauvegarde (contrôle d'appartenance). */
export async function getBackupDownloadUrl(backupId: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin || !backupIdSchema.safeParse(backupId).success) return fail("Non autorisé.");

  const admin = createAdminClient();
  const { data: backup } = await admin
    .from("backups")
    .select("storage_path, workspace_id, file_name, mime_type, status")
    .eq("id", backupId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!backup?.storage_path || backup.status !== "completed") return fail("Sauvegarde indisponible.");

  const downloadName = backup.file_name || (backup.mime_type === "application/json" ? "sauvegarde-historique.json" : "sauvegarde-LETI.zip");
  const { data } = await admin.storage.from("backups").createSignedUrl(backup.storage_path, 300, { download: downloadName });
  if (!data?.signedUrl) return fail("Lien indisponible.");
  return ok(undefined, { url: data.signedUrl, fileName: downloadName });
}

export async function deleteBackup(backupId: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin || !backupIdSchema.safeParse(backupId).success) return fail("Non autorisé.");

  const admin = createAdminClient();
  const { data: backup } = await admin.from("backups")
    .select("id, status, storage_path")
    .eq("id", backupId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!backup) return fail("Sauvegarde introuvable.");
  if (backup.status === "queued" || backup.status === "running") return fail("Une sauvegarde en cours ne peut pas être supprimée.");

  const paths: string[] = [];
  if (backup.storage_path) paths.push(backup.storage_path);
  const jobFolder = `${ctx.workspace.id}/jobs/${backupId}`;
  const { data: temporary } = await admin.storage.from("backups").list(jobFolder, { limit: 100 });
  paths.push(...(temporary ?? []).filter((item) => item.name && item.id).map((item) => `${jobFolder}/${item.name}`));
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from("backups").remove(paths);
    if (storageError) return fail("Suppression des fichiers impossible.");
  }
  const { error } = await admin.from("backups").delete().eq("id", backupId).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression de l’historique impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "backup", entity_id: backupId, summary: "Sauvegarde supprimée" });
  revalidatePath("/app/backups");
  return ok("Sauvegarde supprimée.");
}
