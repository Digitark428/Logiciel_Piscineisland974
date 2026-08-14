"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveClient, deleteClientPermanently } from "@/lib/actions/clients";

export function ArchiveButton({ clientId, archived }: { clientId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-secondary"
      onClick={() =>
        start(async () => {
          const ok = archived
            ? true
            : confirm("Archiver ce client ? Il n'apparaîtra plus dans la liste active, mais ses données sont conservées.");
          if (!ok) return;
          await archiveClient(clientId, !archived);
          router.refresh();
        })
      }
    >
      {pending ? "…" : archived ? "Réactiver" : "Archiver"}
    </button>
  );
}

/** Suppression définitive avec confirmation explicite (permission clients.delete). */
export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button type="button" className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setOpen(true)}>
        Supprimer totalement
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-graphite-900/50" onClick={() => !pending && setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-float">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">⚠️</span>
              <h3 className="text-lg font-bold text-graphite-900">Suppression définitive</h3>
            </div>
            <p className="text-sm text-graphite-600">
              Attention, ce client va totalement disparaître, vous n'aurez plus aucune trace de lui.
            </p>
            <p className="mt-2 text-sm text-graphite-500">
              Ses prestations, contrats, factures, documents et notes seront également supprimés
              définitivement. Cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" disabled={pending} onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteClientPermanently(clientId);
                    if (r && !r.ok) {
                      alert(r.message);
                      setOpen(false);
                    } else {
                      router.push("/app/clients");
                    }
                  })
                }
              >
                {pending ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
