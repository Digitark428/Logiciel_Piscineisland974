"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveClient, deleteClientPermanently } from "@/lib/actions/clients";
import { OverlayPortal } from "@/components/ui/OverlayPortal";

export function ArchiveButton({ clientId, archived }: { clientId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-secondary shadow-none"
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open, pending]);

  return (
    <>
      <button ref={triggerRef} type="button" className="btn min-h-11 border-red-100 bg-red-50/35 text-red-700 shadow-none hover:border-red-200 hover:bg-red-50" onClick={() => setOpen(true)}>
        Supprimer totalement
      </button>

      {open && (
        <OverlayPortal>
        <div className="fixed inset-0 z-[var(--leti-layer-modal)] flex items-center justify-center px-4" data-leti-overlay="modal">
          <button type="button" className="absolute inset-0 cursor-default bg-graphite-900/50" onClick={() => !pending && close()} aria-label="Fermer la confirmation" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-client-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-float">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">⚠️</span>
              <h3 id="delete-client-title" className="text-lg font-bold text-graphite-900">Suppression définitive</h3>
            </div>
            <p className="text-sm text-graphite-600">
              Attention, ce client va totalement disparaître, vous n'aurez plus aucune trace de lui.
            </p>
            <p className="mt-2 text-sm text-graphite-500">
              Ses prestations, contrats, factures, documents et notes seront également supprimés
              définitivement. Cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" disabled={pending} onClick={close}>
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
                      close();
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
        </OverlayPortal>
      )}
    </>
  );
}
