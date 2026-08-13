import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const EXPORT_TABLES = [
  "workspaces", "memberships", "clients", "pools", "service_series", "services",
  "service_tasks", "tasks", "contracts", "invoices", "invoice_lines", "documents",
  "notifications", "activity_logs",
];

/**
 * Exporte l'ensemble des données d'un workspace en JSON et le dépose dans le bucket 'backups',
 * organisé Année / Mois / Jour. Renvoie le chemin de stockage.
 * À appeler avec un client service_role (admin).
 */
export async function runWorkspaceBackup(
  admin: SupabaseClient,
  workspaceId: string,
  kind: "auto" | "manual",
): Promise<{ path: string; size: number } | null> {
  const dump: Record<string, unknown> = { workspace_id: workspaceId, generated_at: new Date().toISOString(), tables: {} };
  const tables = dump.tables as Record<string, unknown>;

  for (const table of EXPORT_TABLES) {
    const { data } = await admin.from(table).select("*").eq(table === "workspaces" ? "id" : "workspace_id", workspaceId);
    tables[table] = data ?? [];
  }

  const json = JSON.stringify(dump, null, 2);
  const buffer = Buffer.from(json, "utf-8");
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const path = `${workspaceId}/${y}/${m}/${d}/backup-${now.getTime()}.json`;

  const { error: upErr } = await admin.storage.from("backups").upload(path, buffer, {
    contentType: "application/json",
    upsert: true,
  });
  if (upErr) {
    await admin.from("backups").insert({ workspace_id: workspaceId, kind, status: "failed" });
    return null;
  }

  await admin.from("backups").insert({
    workspace_id: workspaceId,
    storage_path: path,
    kind,
    size_bytes: buffer.byteLength,
    status: "completed",
  });

  return { path, size: buffer.byteLength };
}
