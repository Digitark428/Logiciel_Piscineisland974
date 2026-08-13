"use client";

import { useState, useTransition } from "react";
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

  const run = (s: "in_progress" | "completed" | "planned") =>
    start(async () => {
      await setServiceStatus(serviceId, s);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "planned" && (
        <button disabled={pending} onClick={() => run("in_progress")} className="btn-primary">Démarrer la prestation</button>
      )}
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
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (tasks.length === 0) return <p className="text-sm text-graphite-400">Aucune tâche.</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id}>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-graphite-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={t.done}
              disabled={!editable || pendingId === t.id}
              onChange={async (e) => {
                setPendingId(t.id);
                await toggleServiceTask(t.id, serviceId, e.target.checked);
                setPendingId(null);
                router.refresh();
              }}
              className="h-5 w-5 rounded border-graphite-300 text-pool-600"
            />
            <span className={t.done ? "text-graphite-400 line-through" : "text-graphite-800"}>{t.label}</span>
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

export function GoThereButton({ address }: { address: string }) {
  if (!address) return null;
  const q = encodeURIComponent(address);
  return (
    <div className="flex gap-2">
      <a href={`https://waze.com/ul?q=${q}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="btn-primary">
        🚗 Y aller (Waze)
      </a>
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
        Maps
      </a>
    </div>
  );
}
