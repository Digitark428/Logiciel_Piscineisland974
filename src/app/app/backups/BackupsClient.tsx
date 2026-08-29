"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualBackup, deleteBackup, getBackupDownloadUrl } from "@/lib/actions/backups";
import { formatBytes } from "@/lib/utils/format";

export interface BackupListItem {
  id: string;
  kind: "auto" | "manual";
  status: "queued" | "running" | "completed" | "failed";
  progress_stage: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  failure_message: string | null;
  created_at: string;
  completed_at: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  queued: "En attente",
  collecting: "Collecte des données",
  pdf: "Création du PDF",
  xlsx: "Création du classeur",
  archive: "Assemblage du ZIP",
  completed: "Disponible",
  failed: "Échec",
};

export function backupDateTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone }).format(date);
}

export function BackupAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return null;
}

export function ManualBackupButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setMessage(null);
          const result = await createManualBackup();
          setMessage(result.message ?? null);
          router.refresh();
        })}
      >
        {pending ? "Mise en file…" : "Sauvegarder maintenant"}
      </button>
      {message ? <span className="max-w-sm text-right text-xs text-graphite-500" role="status">{message}</span> : null}
    </div>
  );
}

export function DownloadButton({ backupId, label = "Télécharger" }: { backupId: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-secondary whitespace-nowrap"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const result = await getBackupDownloadUrl(backupId);
        if (!result.ok || !result.data?.url) {
          window.alert(result.message ?? "Téléchargement impossible.");
          return;
        }
        const anchor = document.createElement("a");
        anchor.href = String(result.data.url);
        anchor.download = String(result.data.fileName ?? "sauvegarde-LETI.zip");
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      })}
    >
      {pending ? "Préparation…" : label}
    </button>
  );
}

export function DeleteBackupButton({ backupId }: { backupId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-ghost whitespace-nowrap px-2 text-xs text-graphite-500 hover:text-red-600"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer définitivement cette sauvegarde et son fichier ?")) return;
        startTransition(async () => {
          const result = await deleteBackup(backupId);
          if (!result.ok) window.alert(result.message ?? "Suppression impossible.");
          router.refresh();
        });
      }}
    >
      {pending ? "Suppression…" : "Supprimer"}
    </button>
  );
}

export function BackupRow({ backup, timeZone }: { backup: BackupListItem; timeZone: string }) {
  const inProgress = backup.status === "queued" || backup.status === "running";
  const isLegacy = backup.mime_type === "application/json" || backup.storage_path?.endsWith(".json");
  const stage = STAGE_LABELS[backup.progress_stage ?? backup.status] ?? "Traitement";
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-graphite-800">{backupDateTime(backup.created_at, timeZone)}</p>
          <span className={`badge ${backup.kind === "manual" ? "bg-coral-50 text-coral-700" : "bg-pool-50 text-pool-700"}`}>
            {backup.kind === "manual" ? "Manuelle" : "Automatique"}
          </span>
          {isLegacy ? <span className="badge bg-graphite-100 text-graphite-500">Ancien format JSON</span> : null}
        </div>
        <p className="mt-1 truncate text-xs text-graphite-500">{backup.file_name || "Sauvegarde LETI"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-graphite-400">
          <span>{backup.status === "completed" ? formatBytes(backup.size_bytes) : stage}</span>
          {inProgress ? <span className="inline-flex items-center gap-1.5 text-pool-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pool-500" />Traitement sécurisé en cours</span> : null}
        </div>
        {backup.failure_message ? (
          <p className={`mt-2 text-xs ${backup.status === "failed" ? "text-red-600" : "text-amber-700"}`}>
            {backup.failure_message}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {backup.status === "completed" && backup.storage_path ? <DownloadButton backupId={backup.id} /> : null}
        {backup.status === "failed" ? <span className="badge bg-red-50 text-red-600">Échec</span> : null}
        {!inProgress ? <DeleteBackupButton backupId={backup.id} /> : null}
      </div>
    </li>
  );
}
