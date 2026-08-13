"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument, deleteDocument } from "@/lib/actions/documents";
import { formatBytes, formatDate } from "@/lib/utils/format";

export function UploadBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="card p-5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("file", file);
          fd.set("entity_type", "workspace");
          start(async () => {
            const r = await uploadDocument(fd);
            setMsg(r.message ?? null);
            if (inputRef.current) inputRef.current.value = "";
            router.refresh();
          });
        }}
      />
      <button className="btn-primary w-full" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? "Téléversement…" : "+ Ajouter un document"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-graphite-500">{msg}</p>}
      <p className="mt-2 text-center text-xs text-graphite-400">Max 20 Mo. Stockage privé et sécurisé.</p>
    </div>
  );
}

export function DocRow({ doc, url }: { doc: any; url: string | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-6">
      <span className="text-graphite-300">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-graphite-900">{doc.name}</div>
        <div className="text-xs text-graphite-400">{formatBytes(doc.size_bytes)} · {formatDate(doc.created_at)}</div>
      </div>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary">Ouvrir</a>}
      <button
        disabled={pending}
        className="btn-ghost p-2 text-graphite-300 hover:text-red-500"
        onClick={() => start(async () => { if (confirm("Supprimer ce document ?")) { await deleteDocument(doc.id); router.refresh(); } })}
        aria-label="Supprimer"
      >✕</button>
    </li>
  );
}
