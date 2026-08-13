"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { updateService, deleteService } from "@/lib/actions/services";
import type { Service } from "@/lib/db/types";

interface Opt { id: string; label: string }
interface PoolOpt { id: string; label: string; client_id: string }

export function ServiceEditForm({
  service,
  members,
  pools,
}: {
  service: Service;
  members: Opt[];
  pools: PoolOpt[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const clientPools = pools.filter((p) => p.client_id === service.client_id);

  return (
    <>
      <ActionForm action={updateService} className="space-y-6" successMessage="Prestation enregistrée.">
        <input type="hidden" name="id" value={service.id} />
        <div className="card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="service_type">Type</label>
              <input id="service_type" name="service_type" className="input" defaultValue={service.service_type ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="pool_id">Piscine</label>
              <select id="pool_id" name="pool_id" className="input" defaultValue={service.pool_id ?? ""}>
                <option value="">—</option>
                {clientPools.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="scheduled_date">Date *</label>
              <input id="scheduled_date" name="scheduled_date" type="date" required className="input" defaultValue={service.scheduled_date} />
            </div>
            <div>
              <label className="label" htmlFor="scheduled_time">Heure</label>
              <input id="scheduled_time" name="scheduled_time" type="time" className="input" defaultValue={service.scheduled_time ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="duration_min">Durée (min)</label>
              <input id="duration_min" name="duration_min" inputMode="numeric" className="input" defaultValue={service.duration_min ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="assigned_membership_id">Membre assigné</label>
              <select id="assigned_membership_id" name="assigned_membership_id" className="input" defaultValue={service.assigned_membership_id ?? ""}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Commentaires</label>
              <textarea id="notes" name="notes" rows={3} className="input" defaultValue={service.notes ?? ""} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      </ActionForm>

      <div className="mt-8 border-t border-graphite-100 pt-6">
        <button
          type="button"
          disabled={pending}
          className="btn-danger"
          onClick={() =>
            start(async () => {
              if (confirm("Supprimer définitivement cette prestation ?")) {
                await deleteService(service.id);
                router.push("/app/services");
              }
            })
          }
        >
          Supprimer la prestation
        </button>
      </div>
    </>
  );
}
