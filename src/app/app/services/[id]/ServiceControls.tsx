"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { saveServiceReport, setServiceStatus, setWeeklyOccurrenceStatus, toggleServiceTask, updateOccurrenceException } from "@/lib/actions/services";
import type { ServiceStatus, ServiceTask } from "@/lib/db/types";

export interface OccurrenceActionRef {
  serviceId?: string;
  seriesId?: string;
  occurrenceDate?: string;
}

export function StatusActions({
  occurrence,
  status,
  canComplete,
  canEdit = false,
}: {
  occurrence: OccurrenceActionRef;
  status: ServiceStatus;
  canComplete: boolean;
  canEdit?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!canComplete) return null;

  const run = (nextStatus: ServiceStatus) =>
    start(async () => {
      try {
        const result = occurrence.serviceId
          ? await setServiceStatus(occurrence.serviceId, nextStatus)
          : await setWeeklyOccurrenceStatus(occurrence.seriesId!, occurrence.occurrenceDate!, nextStatus);
        const materializedId = result.data?.serviceId;
        if (result.ok && typeof materializedId === "string" && !occurrence.serviceId) {
          router.replace(`/app/services/${materializedId}`);
          return;
        }
        if (!result.ok) window.alert(result.message ?? "Action impossible.");
        router.refresh();
      } catch {
        window.alert("Action impossible. Vérifiez votre connexion puis réessayez.");
      }
    });

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap" aria-live="polite">
      {status === "planned" && (
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => run("in_progress")} className="btn-secondary border-pool-200 text-pool-800">Démarrer</button>
      )}
      {(status === "planned" || status === "in_progress" || status === "postponed") && (
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => run("completed")} className="btn border border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100">
          ✓ Terminer l'entretien
        </button>
      )}
      {status === "completed" && (
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => run("planned")} className="btn-secondary">Rouvrir l'entretien</button>
      )}
      {canEdit && status !== "cancelled" && status !== "completed" && (
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => run("cancelled")} className="btn border border-red-100 bg-white text-red-700 hover:border-red-200 hover:bg-red-50">Annuler</button>
      )}
      {canEdit && status === "cancelled" && (
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => run("planned")} className="btn-secondary">Rétablir le passage</button>
      )}
    </div>
  );
}

export function TasksChecklist({
  serviceId,
  tasks,
  editable,
}: {
  serviceId: string;
  tasks: ServiceTask[];
  editable: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [doneById, setDoneById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((task) => [task.id, task.done])),
  );

  useEffect(() => {
    setDoneById(Object.fromEntries(tasks.map((task) => [task.id, task.done])));
  }, [tasks]);

  if (tasks.length === 0) return <p className="text-sm text-graphite-400">Aucune tâche.</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id}>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-graphite-50 px-3.5 py-2.5 transition hover:border-pool-100 hover:bg-pool-50/60">
            <input
              type="checkbox"
              checked={doneById[t.id] ?? t.done}
              disabled={!editable || pendingId === t.id}
              onChange={async (e) => {
                const nextDone = e.currentTarget.checked;
                const previousDone = doneById[t.id] ?? t.done;
                setDoneById((current) => ({ ...current, [t.id]: nextDone }));
                setPendingId(t.id);
                try {
                  const result = await toggleServiceTask(t.id, serviceId, nextDone);
                  if (!result.ok) {
                    setDoneById((current) => ({ ...current, [t.id]: previousDone }));
                    window.alert(result.message ?? "Action impossible.");
                  }
                } catch {
                  setDoneById((current) => ({ ...current, [t.id]: previousDone }));
                  window.alert("Action impossible. Vérifiez votre connexion puis réessayez.");
                } finally {
                  setPendingId(null);
                }
              }}
              className="h-5 w-5 rounded border-graphite-300 text-pool-600"
            />
            <span className={(doneById[t.id] ?? t.done) ? "text-graphite-400 line-through" : "text-graphite-800"}>{t.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function ReportForm({ occurrence, report, notes }: { occurrence: OccurrenceActionRef; report: string | null; notes?: string | null }) {
  return (
    <ActionForm action={saveServiceReport} successMessage="Compte-rendu enregistré.">
      {occurrence.serviceId && <input type="hidden" name="id" value={occurrence.serviceId} />}
      {occurrence.seriesId && <input type="hidden" name="series_id" value={occurrence.seriesId} />}
      {occurrence.occurrenceDate && <input type="hidden" name="occurrence_date" value={occurrence.occurrenceDate} />}
      <div>
        <label className="label" htmlFor="occurrence-notes">Note propre à ce passage</label>
        <textarea id="occurrence-notes" name="notes" rows={3} className="input resize-y bg-graphite-50/35" defaultValue={notes ?? ""} placeholder="Particularité ou information liée à cette date…" />
        <p className="mt-1.5 text-xs leading-5 text-graphite-400">Cette note reste attachée à ce passage uniquement.</p>
      </div>
      <div className="mt-5">
        <label className="label" htmlFor="occurrence-report">Compte rendu de l’intervention</label>
        <textarea id="occurrence-report" name="report" rows={5} className="input resize-y bg-graphite-50/35" defaultValue={report ?? ""} placeholder="Observations, produits utilisés et actions réalisées…" />
      </div>
      <div className="mt-4 flex justify-end">
        <SubmitButton className="border-coral-200 bg-coral-50 text-graphite-800 hover:border-coral-300 hover:bg-coral-100">Enregistrer le compte rendu</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ExceptionForm({ occurrence, scheduledDate }: { occurrence: OccurrenceActionRef; scheduledDate: string }) {
  return (
    <ActionForm action={updateOccurrenceException} successMessage="Passage mis à jour.">
      {occurrence.serviceId && <input type="hidden" name="id" value={occurrence.serviceId} />}
      {occurrence.seriesId && <input type="hidden" name="series_id" value={occurrence.seriesId} />}
      {occurrence.occurrenceDate && <input type="hidden" name="occurrence_date" value={occurrence.occurrenceDate} />}
      <label className="label" htmlFor="exception-date">Date exceptionnelle</label>
      <input id="exception-date" name="scheduled_date" type="date" required className="input bg-graphite-50/35" defaultValue={scheduledDate} />
      <p className="mt-1 text-xs text-graphite-400">Ce déplacement ne modifie pas le jour hebdomadaire du contrat.</p>
      <div className="mt-4 flex justify-end"><SubmitButton className="border-coral-200 bg-coral-50 text-graphite-800 hover:border-coral-300 hover:bg-coral-100">Enregistrer l'exception</SubmitButton></div>
    </ActionForm>
  );
}

export function GoThereButton({
  address,
  lat,
  lng,
}: {
  address: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const hasCoords = lat != null && lng != null;
  if (!hasCoords && !address) return null;

  // Les coordonnées GPS (renseignées via l'autocomplétion d'adresse) sont plus fiables
  // qu'une recherche textuelle : on les privilégie pour Waze et Google Maps.
  const wazeHref = hasCoords
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  const mapsHref = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <a href={wazeHref} target="_blank" rel="noopener noreferrer" className="btn-secondary min-w-0 border-pool-200 px-3 text-pool-800" aria-label="Ouvrir l'itinéraire dans Waze">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 15.2V11a7 7 0 0 1 14 0v4.1a2.9 2.9 0 0 1-2.9 2.9H9.2L5 20v-4.8Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 11.5h.01M15 11.5h.01M9.5 15c1.4.9 3.6.9 5 0" strokeLinecap="round" />
        </svg>
        Waze
      </a>
      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="btn-secondary min-w-0 px-3" aria-label="Ouvrir l'itinéraire dans Google Maps">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-coral-600" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
        Maps
      </a>
    </div>
  );
}
