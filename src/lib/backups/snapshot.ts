import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BACKUP_TABLES } from "@/lib/backups/catalog";
import type { BackupSnapshot, BackupTableDefinition, JsonRecord } from "@/lib/backups/types";

const PAGE_SIZE = 1000;

function sanitizeRows(rows: JsonRecord[], definition: BackupTableDefinition): JsonRecord[] {
  if (!definition.excludedColumns?.length) return rows;
  const excluded = new Set(definition.excludedColumns);
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !excluded.has(key))));
}

async function readTable(
  admin: SupabaseClient,
  workspaceId: string,
  definition: BackupTableDefinition,
): Promise<JsonRecord[]> {
  const output: JsonRecord[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = admin
      .from(definition.table)
      .select("*")
      .eq(definition.table === "workspaces" ? "id" : "workspace_id", workspaceId)
      .range(from, from + PAGE_SIZE - 1);
    if (definition.filter === "professional_tasks") query = query.eq("category", "professional");
    if (definition.filter === "exclude_pool_documents") query = query.neq("entity_type", "pool");
    const { data, error } = await query;
    if (error) throw new Error(`Lecture de ${definition.table} impossible: ${error.message}`);
    const page = (data ?? []) as JsonRecord[];
    output.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return sanitizeRows(output, definition);
}

export async function collectBackupSnapshot(
  admin: SupabaseClient,
  workspaceId: string,
  generatedAt = new Date(),
): Promise<BackupSnapshot> {
  const tables: Record<string, JsonRecord[]> = {};
  const parallelism = 4;
  for (let index = 0; index < BACKUP_TABLES.length; index += parallelism) {
    const group = BACKUP_TABLES.slice(index, index + parallelism);
    const rows = await Promise.all(group.map((definition) => readTable(admin, workspaceId, definition)));
    group.forEach((definition, groupIndex) => { tables[definition.table] = rows[groupIndex]; });
  }
  const workspace = tables.workspaces?.[0];
  const timeZone = typeof workspace?.timezone === "string" ? workspace.timezone : "Indian/Reunion";
  return {
    schemaVersion: 1,
    workspaceId,
    generatedAt: generatedAt.toISOString(),
    timeZone,
    tables,
  };
}

export async function uploadBackupSnapshot(
  admin: SupabaseClient,
  snapshot: BackupSnapshot,
  backupId: string,
): Promise<string> {
  const path = `${snapshot.workspaceId}/jobs/${backupId}/snapshot.json`;
  const body = Buffer.from(JSON.stringify(snapshot), "utf8");
  const { error } = await admin.storage.from("backups").upload(path, body, {
    contentType: "application/json",
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(`Écriture du cliché impossible: ${error.message}`);
  return path;
}

export async function downloadBackupSnapshot(
  admin: SupabaseClient,
  workspaceId: string,
  path: string,
): Promise<BackupSnapshot> {
  if (!path.startsWith(`${workspaceId}/jobs/`)) throw new Error("Chemin de cliché hors entreprise.");
  const { data, error } = await admin.storage.from("backups").download(path);
  if (error || !data) throw new Error("Cliché de sauvegarde introuvable.");
  const parsed = JSON.parse(await data.text()) as BackupSnapshot;
  if (parsed.schemaVersion !== 1 || parsed.workspaceId !== workspaceId || !parsed.tables) {
    throw new Error("Cliché de sauvegarde invalide.");
  }
  return parsed;
}
