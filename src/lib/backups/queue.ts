import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { backupFileName } from "@/lib/backups/format";
import type { BackupKind } from "@/lib/backups/types";

export async function createBackupJob(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    workspaceName: string;
    timeZone: string;
    kind: BackupKind;
    requestedBy?: string | null;
    scheduledLocalDate?: string | null;
    now?: Date;
  },
): Promise<{ id: string; alreadyExists: boolean }> {
  const now = input.now ?? new Date();
  const fileName = backupFileName(input.workspaceName, now, input.timeZone);
  const { data, error } = await admin.from("backups").insert({
    workspace_id: input.workspaceId,
    kind: input.kind,
    status: "queued",
    progress_stage: "queued",
    file_name: fileName,
    mime_type: "application/zip",
    requested_by: input.requestedBy ?? null,
    scheduled_local_date: input.scheduledLocalDate ?? null,
    created_at: now.toISOString(),
  }).select("id").single();

  if (!error && data) return { id: data.id, alreadyExists: false };
  if (input.kind === "auto" && input.scheduledLocalDate && error?.code === "23505") {
    const { data: existing } = await admin.from("backups")
      .select("id, status, created_at, workflow_run_id")
      .eq("workspace_id", input.workspaceId)
      .eq("kind", "auto")
      .eq("scheduled_local_date", input.scheduledLocalDate)
      .maybeSingle();
    if (existing) {
      const orphanedQueuedJob = existing.status === "queued"
        && !existing.workflow_run_id
        && now.getTime() - new Date(existing.created_at).getTime() > 15 * 60 * 1000;
      if (existing.status === "failed" || orphanedQueuedJob) {
        const { error: retryError } = await admin.from("backups").update({
          status: "queued",
          progress_stage: "queued",
          failure_message: null,
          completed_at: null,
          workflow_run_id: null,
        }).eq("id", existing.id).eq("workspace_id", input.workspaceId);
        if (retryError) throw new Error(`Relance de la sauvegarde impossible: ${retryError.message}`);
        return { id: existing.id, alreadyExists: false };
      }
      return { id: existing.id, alreadyExists: true };
    }
  }
  throw new Error(`Création de la sauvegarde impossible: ${error?.message ?? "erreur inconnue"}`);
}

export async function attachWorkflowRun(
  admin: SupabaseClient,
  backupId: string,
  workspaceId: string,
  runId: string,
): Promise<void> {
  const { error } = await admin.from("backups").update({ workflow_run_id: runId }).eq("id", backupId).eq("workspace_id", workspaceId);
  if (error) throw new Error("Association du traitement durable impossible.");
}
