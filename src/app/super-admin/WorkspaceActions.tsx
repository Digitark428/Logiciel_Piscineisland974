"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWorkspaceStatus, deleteWorkspace } from "@/lib/actions/superadmin";

export function WorkspaceActions({ id, name, status }: { id: string; name: string; status: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={pending}
        className="btn-secondary py-1.5 text-xs"
        onClick={() => start(async () => { await setWorkspaceStatus(id, status === "active" ? "disabled" : "active"); router.refresh(); })}
      >
        {status === "active" ? "Désactiver" : "Réactiver"}
      </button>

      {confirming ? (
          <span className="flex items-center gap-1">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={`Tapez "${name}"`}
              className="input py-1 text-xs w-40"
            />
            <button
              disabled={pending || typed !== name}
              className="btn-danger py-1.5 text-xs"
              onClick={() => start(async () => {
                const r = await deleteWorkspace(id, typed);
                if (!r.ok) alert(r.message);
                setConfirming(false);
                router.refresh();
              })}
            >
              Confirmer
            </button>
            <button className="btn-ghost py-1.5 text-xs" onClick={() => setConfirming(false)}>Annuler</button>
          </span>
        ) : (
          <button className="btn-ghost py-1.5 text-xs text-red-600" onClick={() => setConfirming(true)}>Supprimer</button>
        )}
    </div>
  );
}
