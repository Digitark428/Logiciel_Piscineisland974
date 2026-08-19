"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replySupportConversation, setSupportStatus } from "@/lib/actions/superadmin-assistance";
import { SUPPORT_STATUSES, SUPPORT_MESSAGE_MAX } from "@/lib/assistance";
import type { SupportStatus } from "@/lib/db/types";

export function ConversationActions({ conversationId, status }: { conversationId: string; status: SupportStatus }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await replySupportConversation(conversationId, reply);
      if (!res.ok) { setError(res.message ?? "Envoi impossible."); return; }
      setReply("");
      router.refresh();
    });
  }

  function changeStatus(next: SupportStatus) {
    setError(null);
    startTransition(async () => {
      const res = await setSupportStatus(conversationId, next);
      if (!res.ok) { setError(res.message ?? "Action impossible."); return; }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Répondre à la demande</label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
          rows={4}
          placeholder="Votre réponse apparaîtra directement dans cette discussion…"
          className="input resize-none"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        <button
          onClick={send}
          disabled={reply.trim().length === 0 || pending}
          className="btn-primary mt-2"
        >
          {pending ? "Envoi…" : "Envoyer la réponse"}
        </button>
      </div>

      <div>
        <div className="label">Statut</div>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => changeStatus(s.key)}
              disabled={pending || s.key === status}
              className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                s.key === status
                  ? "border-pool-400 bg-pool-100 text-graphite-900"
                  : "border-graphite-200 bg-white text-graphite-600 hover:bg-graphite-50"
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
