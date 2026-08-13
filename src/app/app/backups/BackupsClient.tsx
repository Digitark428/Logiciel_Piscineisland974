"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualBackup, getBackupDownloadUrl } from "@/lib/actions/backups";
import { formatDateTime, formatBytes } from "@/lib/utils/format";

export function ManualBackupButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <button className="btn-primary" disabled={pending} onClick={() => start(async () => { const r = await createManualBackup(); setMsg(r.message ?? null); router.refresh(); })}>
        {pending ? "Sauvegarde…" : "Sauvegarder maintenant"}
      </button>
      {msg && <span className="text-sm text-graphite-500">{msg}</span>}
    </div>
  );
}

export function DownloadButton({ backupId, label = "Télécharger" }: { backupId: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await getBackupDownloadUrl(backupId);
          if (r.ok && r.data?.url) window.open(String(r.data.url), "_blank");
          else alert(r.message ?? "Téléchargement impossible.");
        })
      }
    >
      {pending ? "…" : label}
    </button>
  );
}

export function BackupRow({ backup }: { backup: any }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-graphite-800">{formatDateTime(backup.created_at)}</div>
        <div className="text-xs text-graphite-400">{backup.kind === "manual" ? "Manuelle" : "Automatique"} · {formatBytes(backup.size_bytes)}</div>
      </div>
      {backup.status === "completed" && backup.storage_path ? (
        <DownloadButton backupId={backup.id} />
      ) : (
        <span className="badge bg-red-50 text-red-600">Échec</span>
      )}
    </li>
  );
}
