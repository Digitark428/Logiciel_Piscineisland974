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
 * documents.manage). LETI ne GÉNÈRE pas ces documents : il les stocke.
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
  const [adding, setAdding] = useState(false);
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
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-graphite-800">{title}</h3>
        {canManage ? (
          <button
            type="button"
            className="min-h-11 rounded-lg px-2.5 text-xs font-semibold text-pool-700 transition hover:bg-pool-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300"
            aria-expanded={adding}
            onClick={() => setAdding((value) => !value)}
          >
            {adding ? "Fermer" : "+ Ajouter"}
          </button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-graphite-100 bg-graphite-50/45 px-4 py-4 text-sm text-graphite-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-graphite-100">
          {entries.map((f) => (
            <li key={f.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-graphite-50 text-graphite-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-graphite-900">{f.name}</div>
                  <div className="mt-0.5 text-xs text-graphite-400">{formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {f.viewUrl ? <a href={f.viewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-2.5 py-1 text-xs" title="Consulter">Consulter</a> : null}
                {f.downloadUrl ? <a href={f.downloadUrl} className="btn-ghost min-h-11 px-2.5 py-1 text-xs" title="Télécharger">Télécharger</a> : null}
                {canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-ghost min-h-11 px-2.5 py-1 text-xs text-graphite-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => start(async () => { if (confirm("Supprimer ce document ?")) { await deleteDocument(f.id); router.refresh(); } })}
                    aria-label={`Supprimer ${f.name}`}
                  >Supprimer</button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && adding ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-pool-100 bg-pool-50/25 p-4">
          {nameLabel && (
            <input ref={nameRef} className="input bg-white text-sm" placeholder={namePlaceholder ?? nameLabel} aria-label={nameLabel} />
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.heic"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); }}
          />
          <button type="button" className="btn-secondary w-full text-sm shadow-none" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? "Import…" : "+ Ajouter un document"}
          </button>
          <p className="text-center text-xs text-graphite-400">Photo, PDF ou fichier — depuis l'ordinateur ou le téléphone. Max 20 Mo.</p>
          {msg && <p className="text-center text-xs text-graphite-500">{msg}</p>}
        </div>
      ) : null}
    </section>
  );
}
