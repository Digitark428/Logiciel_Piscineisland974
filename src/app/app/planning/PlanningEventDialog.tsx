"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createPlanningEvent,
  deletePlanningEvent,
  updatePlanningEvent,
} from "@/lib/actions/planning-events";
import { idle } from "@/lib/actions/result";
import type { PlanningEvent } from "@/lib/db/types";
import { planningTimeLabel } from "@/lib/planning-events";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { cn } from "@/lib/utils/cn";

interface DialogState {
  event: PlanningEvent | null;
  date: string;
}

interface PlanningEventContextValue {
  openCreate: (date?: string) => void;
  openEdit: (event: PlanningEvent) => void;
}

const PlanningEventContext = createContext<PlanningEventContextValue | null>(null);

function usePlanningEventDialog(): PlanningEventContextValue {
  const value = useContext(PlanningEventContext);
  if (!value) throw new Error("PlanningEventProvider manquant.");
  return value;
}

export function PlanningEventProvider({ children, defaultDate }: { children: ReactNode; defaultDate: string }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const rememberOpener = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  const close = useCallback(() => {
    setDialog(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);
  const openCreate = useCallback((date?: string) => {
    rememberOpener();
    setDialog({ event: null, date: date ?? defaultDate });
  }, [defaultDate, rememberOpener]);
  const openEdit = useCallback((event: PlanningEvent) => {
    rememberOpener();
    setDialog({ event, date: event.event_date });
  }, [rememberOpener]);

  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled])",
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
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, dialog]);

  return (
    <PlanningEventContext.Provider value={{ openCreate, openEdit }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-graphite-950/35 p-2 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={dialog.event ? "Modifier l'événement" : "Ajouter un événement"}
            className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-graphite-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-float sm:p-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <EventForm
              key={dialog.event?.id ?? `new-${dialog.date}`}
              event={dialog.event}
              date={dialog.date}
              onClose={close}
            />
          </div>
        </div>
      )}
    </PlanningEventContext.Provider>
  );
}

export function AddPlanningEventButton({ date }: { date?: string }) {
  const { openCreate } = usePlanningEventDialog();
  return (
    <button type="button" className="btn-secondary px-3" onClick={() => openCreate(date)}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-coral-500" />
      Ajouter un événement
    </button>
  );
}

export function PlanningEventButton({ event, compact = false }: { event: PlanningEvent; compact?: boolean }) {
  const { openEdit } = usePlanningEventDialog();
  const time = planningTimeLabel(event.start_time, event.end_time, event.all_day);
  return (
    <button
      type="button"
      onClick={() => openEdit(event)}
      className={cn(
        "group w-full text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500",
        compact
          ? "flex items-center gap-1 rounded px-0.5 py-0.5"
          : "flex items-center gap-2 rounded-lg border border-coral-100 bg-coral-50/45 px-2 py-1.5 hover:border-coral-200 hover:bg-coral-50",
      )}
      aria-label={`Consulter l'événement ${event.title}`}
    >
      <span className={cn("shrink-0 rounded-full bg-coral-500", compact ? "h-1.5 w-1.5" : "h-2 w-2")} />
      {!compact && <span className="w-20 shrink-0 truncate text-[11px] font-medium text-coral-700">{time}</span>}
      <span className={cn("min-w-0 flex-1 truncate text-graphite-800", compact ? "text-[11px]" : "text-sm font-medium")}>{event.title}</span>
    </button>
  );
}

function EventForm({ event, date, onClose }: { event: PlanningEvent | null; date: string; onClose: () => void }) {
  const router = useRouter();
  const action = event ? updatePlanningEvent : createPlanningEvent;
  const [state, formAction] = useFormState(action, idle);
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [onClose, router, state]);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="leti-eyebrow">Événement personnel</div>
          <h2 className="mt-1 text-lg font-semibold text-graphite-900">{event ? "Modifier l'événement" : "Ajouter un événement"}</h2>
        </div>
        <button type="button" className="btn-ghost h-11 w-11 shrink-0 p-0" onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      <form action={formAction} className="space-y-4">
        {event && <input type="hidden" name="id" value={event.id} />}
        {state.message && !state.ok && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200" role="status">{state.message}</p>
        )}
        <div>
          <label htmlFor="planning-event-title" className="label">Titre</label>
          <input
            id="planning-event-title"
            name="title"
            required
            maxLength={240}
            className="input"
            defaultValue={event?.title ?? ""}
            placeholder="Ex : Rendez-vous fournisseur"
          />
        </div>
        <div>
          <label htmlFor="planning-event-date" className="label">Date</label>
          <input id="planning-event-date" name="event_date" type="date" required className="input" defaultValue={event?.event_date ?? date} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm font-medium text-graphite-700">
          <input name="all_day" type="checkbox" checked={allDay} onChange={(change) => setAllDay(change.target.checked)} className="h-4 w-4 accent-pool-600" />
          Toute la journée
        </label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="planning-event-start" className="label">Début</label>
              <input id="planning-event-start" name="start_time" type="time" required className="input" defaultValue={event?.start_time?.slice(0, 5) ?? "09:00"} />
            </div>
            <div>
              <label htmlFor="planning-event-end" className="label">Fin</label>
              <input id="planning-event-end" name="end_time" type="time" required className="input" defaultValue={event?.end_time?.slice(0, 5) ?? "10:00"} />
            </div>
          </div>
        )}
        <div>
          <label htmlFor="planning-event-description" className="label">Note <span className="font-normal text-graphite-400">(facultative)</span></label>
          <textarea
            id="planning-event-description"
            name="description"
            rows={3}
            maxLength={4000}
            className="input resize-none"
            defaultValue={event?.description ?? ""}
            placeholder="Ajoutez uniquement le détail utile…"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-graphite-100 pt-4">
          <button type="button" className="btn-ghost px-3" onClick={onClose}>Annuler</button>
          <SubmitButton>{event ? "Enregistrer" : "Ajouter"}</SubmitButton>
        </div>
      </form>

      {event && (
        <div className="mt-4 border-t border-graphite-100 pt-4">
          {!confirmDelete ? (
            <button type="button" className="text-sm font-medium text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
              Supprimer cet événement
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
              <p className="text-sm text-red-800">Supprimer définitivement cet événement personnel ?</p>
              {deleteError && <p className="mt-1 text-xs text-red-700" role="status">{deleteError}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="btn-secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Conserver</button>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={deleting}
                  onClick={() => startDeleting(async () => {
                    setDeleteError(null);
                    const result = await deletePlanningEvent(event.id);
                    if (!result.ok) {
                      setDeleteError(result.message ?? "Suppression impossible.");
                      return;
                    }
                    router.refresh();
                    onClose();
                  })}
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
