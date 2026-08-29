import { sleep } from "workflow";
import type { BackupWorkflowInput } from "@/lib/backups/types";
import {
  assembleArchiveStep,
  cleanupTemporaryFilesStep,
  collectSnapshotStep,
  generatePdfStep,
  generateXlsxStep,
  markBackupFailedStep,
} from "./steps";

export async function professionalBackupWorkflow(input: BackupWorkflowInput) {
  "use workflow";

  const temporaryPaths: string[] = [];
  try {
    if (input.scheduledAt) await sleep(new Date(input.scheduledAt));
    const snapshotPath = await collectSnapshotStep(input.backupId, input.workspaceId);
    temporaryPaths.push(snapshotPath);
    const pdfPath = await generatePdfStep(input.backupId, input.workspaceId, snapshotPath);
    temporaryPaths.push(pdfPath);
    const xlsxPath = await generateXlsxStep(input.backupId, input.workspaceId, snapshotPath);
    temporaryPaths.push(xlsxPath);
    const result = await assembleArchiveStep(input.backupId, input.workspaceId, snapshotPath, pdfPath, xlsxPath);
    await cleanupTemporaryFilesStep(input.workspaceId, temporaryPaths);
    return { status: "completed" as const, ...result };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await markBackupFailedStep(input.backupId, input.workspaceId, reason);
    if (temporaryPaths.length > 0) {
      await cleanupTemporaryFilesStep(input.workspaceId, temporaryPaths);
    }
    return { status: "failed" as const, reason };
  }
}
