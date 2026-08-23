"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { setServiceStatus, toggleServiceTask, saveServiceReport } from "@/lib/actions/services";
import type { ServiceTask } from "@/lib/db/types";

export function StatusActions({
  serviceId,
  status,
  canComplete,
}: {
  serviceId: string;
  status: string;
  canComplete: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!canComplete) return null;

  const run = (s: "completed" | "planned") =>
    start(async () => {
      await setServiceStatus(serviceId, s);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "planned" || status === "in_progress") && (
        <button disabled={pending} onClick={() => run("completed")} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
          ✓ Terminer la prestation
        </button>
      )}
      {status === "completed" && (
        <button disabled={pending} onClick={() => run("planned")} className="btn-secondary">Rouvrir la prestation</button>
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
          <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-graphite-50 px-3 py-2.5">
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

export function ReportForm({ serviceId, report }: { serviceId: string; report: string | null }) {
  return (
    <ActionForm action={saveServiceReport} successMessage="Compte-rendu enregistré.">
      <input type="hidden" name="id" value={serviceId} />
      <textarea name="report" rows={4} className="input" defaultValue={report ?? ""} placeholder="Observations, produits utilisés, remarques…" />
      <div className="mt-3 flex justify-end">
        <SubmitButton>Enregistrer le compte-rendu</SubmitButton>
      </div>
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
    <div className="flex gap-2">
      <a href={wazeHref} target="_blank" rel="noopener noreferrer" className="btn-primary">
        🚗 Y aller (Waze)
      </a>
      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="btn-secondary">
        Maps
      </a>
    </div>
  );
}
