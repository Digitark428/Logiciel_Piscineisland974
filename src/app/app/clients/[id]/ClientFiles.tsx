"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument, deleteDocument } from "@/lib/actions/documents";
import { formatBytes, formatDate } from "@/lib/utils/format";

export interface FileEntry {
  id: string;
  name: string;
  size_bytes: number | null;
  created_at: string;
  viewUrl: string | null;
  downloadUrl: string | null;
}

/**
 * Section de fichiers d'un client (Factures / Contrats / autres documents).
 * Import (ordinateur, téléphone, photo, PDF), consultation, téléchargement, suppression.
 * Réutilise le bucket privé « documents » et ses permissions (upload/suppression =
 * documents.manage). Piscine Island ne GÉNÈRE pas ces documents : il les stocke.
 */
export function ClientFiles({
  title,
  category,
  clientId,
  entries,
  canManage,
  nameLabel,
  namePlaceholder,
  emptyLabel,
}: {
  title: string;
  category: "invoice" | "contract" | "other";
  clientId: string;
  entries: FileEntry[];
  canManage: boolean;
  nameLabel?: string;
  namePlaceholder?: string;
  emptyLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const onFile = (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("entity_type", "client");
    fd.set("entity_id", clientId);
    fd.set("category", category);
    if (nameRef.current?.value.trim()) fd.set("doc_name", nameRef.current.value.trim());
    start(async () => {
      const r = await uploadDocument(fd);
      setMsg(r.message ?? null);
      if (inputRef.current) inputRef.current.value = "";
      if (nameRef.current) nameRef.current.value = "";
      router.refresh();
    });
  };

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-base font-semibold text-graphite-900">{title}</h2>

      {entries.length === 0 ? (
        <p className="py-2 text-sm text-graphite-400">{emptyLabel}</p>
      ) : (
        <ul className="mb-3 divide-y divide-graphite-100">
          {entries.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2.5">
              <span className="text-graphite-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-graphite-900">{f.name}</div>
                <div className="text-xs text-graphite-400">{formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</div>
              </div>
              {f.viewUrl && (
                <a href={f.viewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2 py-1 text-xs" title="Consulter">Consulter</a>
              )}
              {f.downloadUrl && (
                <a href={f.downloadUrl} className="btn-ghost px-2 py-1 text-xs" title="Télécharger">Télécharger</a>
              )}
              {canManage && (
                <button
                  disabled={pending}
                  className="btn-ghost p-1.5 text-graphite-300 hover:text-red-500"
                  onClick={() => start(async () => { if (confirm("Supprimer ce document ?")) { await deleteDocument(f.id); router.refresh(); } })}
                  aria-label="Supprimer"
                >✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="space-y-2 border-t border-graphite-100 pt-3">
          {nameLabel && (
            <input ref={nameRef} className="input text-sm" placeholder={namePlaceholder ?? nameLabel} aria-label={nameLabel} />
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.heic"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); }}
          />
          <button className="btn-secondary w-full text-sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? "Import…" : "+ Ajouter un document"}
          </button>
          <p className="text-center text-xs text-graphite-400">Photo, PDF ou fichier — depuis l'ordinateur ou le téléphone. Max 20 Mo.</p>
          {msg && <p className="text-center text-xs text-graphite-500">{msg}</p>}
        </div>
      )}
    </div>
  );
}
