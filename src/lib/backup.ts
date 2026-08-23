import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const EXPORT_COLUMNS: Record<string, string> = {
  workspaces: "id, company_code, name, address_line1, address_line2, postal_code, city, country, phone, email, siret, vat_number, legal_form, legal_info, settings, status, plan, trial_ends_at, created_at, updated_at",
  memberships: "id, workspace_id, user_id, role, member_type, status, first_name, last_name, email, phone, photo_path, job_title, professional_info, created_at, updated_at",
  clients: "id, workspace_id, first_name, last_name, company_name, phone, email, address_line1, address_line2, postal_code, city, country, status, created_at, updated_at",
  pools: "*", service_series: "*", services: "*", service_financials: "*", service_tasks: "*", service_client_notes: "*", tasks: "*", contracts: "*", invoices: "*", invoice_lines: "*",
  documents: "id, workspace_id, name, storage_path, mime_type, size_bytes, entity_type, entity_id, category, uploaded_by, created_at",
  notifications: "*", activity_logs: "*",
};

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

  for (const [table, columns] of Object.entries(EXPORT_COLUMNS)) {
    const { data } = await admin.from(table).select(columns).eq(table === "workspaces" ? "id" : "workspace_id", workspaceId);
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
