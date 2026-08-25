"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SERVICE_STATUSES } from "@/lib/services/constants";

interface MemberOption {
  id: string;
  label: string;
}

export function ServicesFilterPanel({
  date,
  query,
  assignee,
  status,
  members,
  showAssignee,
}: {
  date: string;
  query: string;
  assignee: string;
  status: string;
  members: MemberOption[];
  showAssignee: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const activeCount = [query, showAssignee ? assignee : "", status].filter(Boolean).length;

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])",
      ));
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
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLInputElement>("input[name=q]")?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary px-3"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Rechercher
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pool-100 px-1 text-[11px] font-bold text-pool-800">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-graphite-950/20 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
            onClick={close}
            aria-label="Fermer les filtres"
          />
          <form
            ref={panelRef}
            action="/app/services"
            role="dialog"
            aria-modal="true"
            aria-label="Recherche et filtres des entretiens"
            className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 rounded-2xl border border-graphite-200 bg-white p-4 shadow-float sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem]"
          >
            <input type="hidden" name="date" value={date} />
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-graphite-900">Recherche & filtres</h3>
                <p className="text-xs text-graphite-400">Affinez la semaine affichée.</p>
              </div>
              <button type="button" className="btn-ghost h-11 w-11 p-0" onClick={close} aria-label="Fermer">✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="service-search" className="label">Client ou entretien</label>
                <input
                  id="service-search"
                  name="q"
                  className="input"
                  defaultValue={query}
                  placeholder="Rechercher un client…"
                />
              </div>
              {showAssignee && (
                <div>
                  <label htmlFor="service-assignee" className="label">Technicien</label>
                  <select id="service-assignee" name="assignee" className="input" defaultValue={assignee}>
                    <option value="">Tous les techniciens</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
                  </select>
                </div>
              )}
              <div className={showAssignee ? "" : "sm:col-span-2"}>
                <label htmlFor="service-status" className="label">Statut</label>
                <select id="service-status" name="status" className="input" defaultValue={status}>
                  <option value="">Tous les statuts</option>
                  {SERVICE_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link href={`/app/services?date=${date}`} className="btn-ghost px-3" onClick={close}>Réinitialiser</Link>
              <button type="submit" className="btn-primary">Afficher</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
