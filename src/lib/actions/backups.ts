"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { runWorkspaceBackup } from "@/lib/backup";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

export async function createManualBackup(): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin && (!ctx.permissions.has("backups.manage") || !ctx.permissions.has("sensitive.view"))) return fail("Non autorisé.");

  const admin = createAdminClient();
  const result = await runWorkspaceBackup(admin, ctx.workspace.id, "manual");
  if (!result) return fail("La sauvegarde a échoué.");
  await logActivity(ctx, { action: "backup", entity_type: "workspace", summary: "Sauvegarde manuelle" });
  revalidatePath("/app/backups");
  return ok("Sauvegarde créée.");
}

/** URL signée de téléchargement d'une sauvegarde (contrôle d'appartenance). */
export async function getBackupDownloadUrl(backupId: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin && (!ctx.permissions.has("backups.manage") || !ctx.permissions.has("sensitive.view"))) return fail("Non autorisé.");

  const admin = createAdminClient();
  const { data: backup } = await admin
    .from("backups")
    .select("storage_path, workspace_id")
    .eq("id", backupId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!backup?.storage_path) return fail("Sauvegarde introuvable.");

  const { data } = await admin.storage.from("backups").createSignedUrl(backup.storage_path, 300);
  if (!data?.signedUrl) return fail("Lien indisponible.");
  return ok(undefined, { url: data.signedUrl });
}
