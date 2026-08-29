"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createPlanningEvent,
  deletePlanningEvent,
  updatePlanningEvent,
} from "@/lib/actions/planning-events";
import { idle } from "@/lib/actions/result";
import type { PlanningEvent } from "@/lib/db/types";
import { planningTimeLabel } from "@/lib/planning-events";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { Avatar } from "@/components/ui";

export interface PlanningMemberOption {
  id: string;
  label: string;
  roleLabel: string;
  avatarUrl: string | null;
}

interface DialogState {
  event: PlanningEvent | null;
  date: string;
}

interface PlanningEventContextValue {
  openCreate: (date?: string) => void;
  openEdit: (event: PlanningEvent) => void;
  members: PlanningMemberOption[];
  canAssign: boolean;
  currentMembershipId: string;
}

const PlanningEventContext = createContext<PlanningEventContextValue | null>(null);

function usePlanningEventDialog(): PlanningEventContextValue {
  const value = useContext(PlanningEventContext);
  if (!value) throw new Error("PlanningEventProvider manquant.");
  return value;
}

export function PlanningEventProvider({
  children,
  defaultDate,
  members,
  canAssign,
  currentMembershipId,
}: {
  children: ReactNode;
  defaultDate: string;
  members: PlanningMemberOption[];
  canAssign: boolean;
  currentMembershipId: string;
}) {
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
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
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
    <PlanningEventContext.Provider value={{ openCreate, openEdit, members, canAssign, currentMembershipId }}>
      {children}
      {dialog && (
        <OverlayPortal>
        <div
          className="fixed inset-0 z-[var(--leti-layer-modal)] flex items-end justify-center bg-graphite-950/35 p-2 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={close}
          data-leti-overlay="modal"
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
        </OverlayPortal>
      )}
    </PlanningEventContext.Provider>
  );
}

export function AddPlanningEventButton({ date }: { date?: string }) {
  const { openCreate } = usePlanningEventDialog();
  return (
    <button type="button" className="btn-secondary rounded-xl px-3.5 text-[13px] shadow-[0_1px_4px_rgba(24,58,89,0.035)]" onClick={() => openCreate(date)}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-coral-500" />
      Ajouter un événement
    </button>
  );
}

export function PlanningEventButton({ event, compact = false }: { event: PlanningEvent; compact?: boolean }) {
  const { openEdit, members } = usePlanningEventDialog();
  const time = planningTimeLabel(event.start_time, event.end_time, event.all_day);
  const assignee = members.find((member) => member.id === event.assigned_membership_id);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openEdit(event)}
        className="group flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500"
        aria-label={`Consulter l'événement ${event.title}`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[11px] text-graphite-800">{event.title}</span>
        {assignee ? <span className="sr-only"> — {assignee.label}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openEdit(event)}
      className="relative block w-full overflow-hidden rounded-[0.9rem] border border-coral-100/90 bg-gradient-to-br from-white to-coral-50/75 px-2.5 py-2.5 text-left shadow-[0_1px_2px_rgba(24,58,89,0.02)] transition hover:border-coral-200 hover:bg-coral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2"
      aria-label={`Consulter l'événement ${event.title}`}
    >
      <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-full bg-coral-400" aria-hidden />
      <span className="block truncate text-[13px] font-semibold leading-4 text-graphite-800">{event.title}</span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" aria-hidden />
        <span className="truncate text-[10px] font-medium text-coral-700">{time}</span>
      </span>
      <span className="mt-1.5 block truncate text-[10px] text-graphite-500">
        {assignee ? assignee.label : "Aucune personne assignée"}
      </span>
    </button>
  );
}

function EventForm({ event, date, onClose }: { event: PlanningEvent | null; date: string; onClose: () => void }) {
  const { members, canAssign, currentMembershipId } = usePlanningEventDialog();
  const router = useRouter();
  const action = event ? updatePlanningEvent : createPlanningEvent;
  const [state, formAction] = useActionState(action, idle);
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();
  const [assignedMembershipId, setAssignedMembershipId] = useState(event?.assigned_membership_id ?? "");
  const selectedMember = members.find((member) => member.id === assignedMembershipId) ?? null;
  const editable = !event || event.owner_membership_id === currentMembershipId;

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [onClose, router, state]);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="leti-eyebrow">Événement du planning</div>
          <h2 className="mt-1 text-lg font-semibold text-graphite-900">{event ? editable ? "Modifier l'événement" : "Détail de l’événement" : "Ajouter un événement"}</h2>
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
            disabled={!editable}
            maxLength={240}
            className="input"
            defaultValue={event?.title ?? ""}
            placeholder="Ex : Rendez-vous fournisseur"
          />
        </div>
        <div>
          <label htmlFor="planning-event-date" className="label">Date</label>
          <input id="planning-event-date" name="event_date" type="date" required disabled={!editable} className="input" defaultValue={event?.event_date ?? date} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm font-medium text-graphite-700 has-[:disabled]:cursor-default has-[:disabled]:opacity-70">
          <Checkbox name="all_day" checked={allDay} disabled={!editable} onChange={(change) => setAllDay(change.target.checked)} tone="selection" className="-my-2 -ml-2" />
          Toute la journée
        </label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="planning-event-start" className="label">Début</label>
              <input id="planning-event-start" name="start_time" type="time" required disabled={!editable} className="input" defaultValue={event?.start_time?.slice(0, 5) ?? "09:00"} />
            </div>
            <div>
              <label htmlFor="planning-event-end" className="label">Fin</label>
              <input id="planning-event-end" name="end_time" type="time" required disabled={!editable} className="input" defaultValue={event?.end_time?.slice(0, 5) ?? "10:00"} />
            </div>
          </div>
        )}
        {(canAssign || event?.assigned_membership_id) && (
          <div>
            <label htmlFor="planning-event-assignee" className="label">Personne concernée</label>
            {canAssign && editable ? (
              <select
                id="planning-event-assignee"
                name="assigned_membership_id"
                className="input"
                value={assignedMembershipId}
                onChange={(change) => setAssignedMembershipId(change.target.value)}
              >
                <option value="">Aucune personne assignée</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.label} — {member.roleLabel}</option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="assigned_membership_id" value={assignedMembershipId} />
            )}
            <div className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-graphite-100 bg-graphite-50/70 px-3 py-2">
              {selectedMember ? (
                <>
                  <Avatar name={selectedMember.label} src={selectedMember.avatarUrl} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-graphite-800">{selectedMember.label}</span>
                    <span className="block truncate text-xs text-graphite-400">{selectedMember.roleLabel}</span>
                  </span>
                </>
              ) : (
                <span className="text-sm text-graphite-400">Aucune personne assignée</span>
              )}
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
            disabled={!editable}
            defaultValue={event?.description ?? ""}
            placeholder="Ajoutez uniquement le détail utile…"
          />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-graphite-100 pt-4">
          <button type="button" className={editable ? "btn-ghost px-3" : "btn-secondary px-3"} onClick={onClose}>{editable ? "Annuler" : "Fermer"}</button>
          {editable ? <SubmitButton>{event ? "Enregistrer" : "Ajouter"}</SubmitButton> : null}
        </div>
      </form>

      {event && editable && (
        <div className="mt-4 border-t border-graphite-100 pt-4">
          {!confirmDelete ? (
            <button type="button" className="text-sm font-medium text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
              Supprimer cet événement
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
              <p className="text-sm text-red-800">Supprimer définitivement cet événement ?</p>
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
