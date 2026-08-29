import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachWorkflowRun, createBackupJob } from "@/lib/backups/queue";
import { isValidIanaTimezone, nextDailyRun } from "@/lib/timezone";
import { professionalBackupWorkflow } from "@/workflows/professional-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Répartiteur quotidien compatible avec le plan Hobby : chaque entreprise est
 * mise en file une fois, puis son workflow dort sans consommer de ressources
 * jusqu'au prochain 21h00 dans son propre fuseau IANA.
 */
async function handleCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const valid = Boolean(secret && provided && Buffer.byteLength(secret) === Buffer.byteLength(provided)
    && crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(provided)));
  if (!valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: workspaces, error } = await admin.from("workspaces").select("id, name, timezone").eq("status", "active");
  if (error) return NextResponse.json({ error: "Lecture des entreprises impossible" }, { status: 500 });

  const now = new Date();
  let queued = 0;
  let skipped = 0;
  let failed = 0;
  for (const w of workspaces ?? []) {
    const timeZone = isValidIanaTimezone(w.timezone) ? w.timezone : "Indian/Reunion";
    const schedule = nextDailyRun(now, timeZone, 21);
    let jobId: string | null = null;
    try {
      const job = await createBackupJob(admin, {
        workspaceId: w.id,
        workspaceName: w.name,
        timeZone,
        kind: "auto",
        scheduledLocalDate: schedule.localDate,
        now: schedule.at,
      });
      if (job.alreadyExists) {
        skipped += 1;
        continue;
      }
      jobId = job.id;
      const run = await start(professionalBackupWorkflow, [{
        backupId: job.id,
        workspaceId: w.id,
        scheduledAt: schedule.at.toISOString(),
      }]);
      await attachWorkflowRun(admin, job.id, w.id, run.runId);
      queued += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error("[backup.cron]", w.id, message);
      if (jobId) {
        await admin.from("backups").update({
          status: "failed",
          progress_stage: "failed",
          failure_message: message.replace(/\s+/g, " ").slice(0, 500),
          completed_at: new Date().toISOString(),
        }).eq("id", jobId).eq("workspace_id", w.id);
      }
      failed += 1;
    }
  }

  return NextResponse.json({ queued, skipped, failed, total: (workspaces ?? []).length, dispatchedAt: now.toISOString() });
}

export const GET = handleCron;
export const POST = handleCron;
