"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPortalServiceNote } from "@/lib/actions/portalNotes";
import { Checkbox } from "@/components/ui/Checkbox";

export function PortalServiceNote({ token, serviceId }: { token: string; serviceId: string }) {
  const [content, setContent] = useState("");
  const [important, setImportant] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () => {
    if (!content.trim()) return;
    start(async () => {
      const r = await addPortalServiceNote(token, serviceId, content, important);
      setMsg(r.message ?? null);
      setOk(!!r.ok);
      if (r.ok) {
        setContent("");
        setImportant(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="input"
        placeholder="Ex : Le code du portail a changé, il est désormais 4589. Merci de passer par l'entrée arrière."
      />
      <label className="flex items-center gap-2 text-sm text-graphite-600">
        <Checkbox
          checked={important}
          onChange={(e) => setImportant(e.target.checked)}
          tone="selection"
          className="-my-2 -ml-2"
        />
        Information importante (nouveau code, changement d'accès…)
      </label>
      <div className="flex items-center justify-between">
        {msg ? <p className={`text-xs ${ok ? "text-emerald-600" : "text-red-600"}`}>{msg}</p> : <span />}
        <button onClick={submit} disabled={pending || !content.trim()} className="btn-primary">
          {pending ? "Envoi…" : "Envoyer à l'équipe"}
        </button>
      </div>
    </div>
  );
}
