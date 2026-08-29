export type BackupKind = "auto" | "manual";
export type BackupStatus = "queued" | "running" | "completed" | "failed";
export type BackupProgressStage =
  | "queued"
  | "collecting"
  | "pdf"
  | "xlsx"
  | "archive"
  | "completed"
  | "failed";

export type JsonRecord = Record<string, unknown>;

export interface BackupSnapshot {
  schemaVersion: 1;
  workspaceId: string;
  generatedAt: string;
  timeZone: string;
  tables: Record<string, JsonRecord[]>;
}

export interface BackupTableDefinition {
  table: string;
  sheet: string;
  title: string;
  description: string;
  excludedColumns?: readonly string[];
  filter?: "professional_tasks";
}

export interface BackupWorkflowInput {
  backupId: string;
  workspaceId: string;
}
