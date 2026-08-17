import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWorkspaceBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sauvegarde automatique quotidienne (déclenchée à 23h00 par un planificateur externe,
 * ex. Vercel Cron ou pg_cron appelant cette route). Protégée par CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const valid = Boolean(secret && provided && Buffer.byteLength(secret) === Buffer.byteLength(provided)
    && crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(provided)));
  if (!valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id").eq("status", "active");

  let ok = 0;
  let failed = 0;
  for (const w of workspaces ?? []) {
    const result = await runWorkspaceBackup(admin, w.id, "auto");
    if (result) ok++;
    else failed++;
  }

  return NextResponse.json({ ok, failed, total: (workspaces ?? []).length });
}
