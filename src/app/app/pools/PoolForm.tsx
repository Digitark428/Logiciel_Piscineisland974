"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { upsertPool } from "@/lib/actions/pools";
import type { Pool } from "@/lib/db/types";

interface ClientOption {
  id: string;
  label: string;
}

export function PoolForm({
  pool,
  clients,
  defaultClientId,
}: {
  pool?: Pool;
  clients: ClientOption[];
  defaultClientId?: string;
}) {
  const lockClient = !!pool || !!defaultClientId;
  const clientId = pool?.client_id ?? defaultClientId ?? "";

  return (
    <ActionForm action={upsertPool} className="space-y-6">
      {pool && <input type="hidden" name="id" value={pool.id} />}
      {lockClient && <input type="hidden" name="client_id" value={clientId} />}

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {!lockClient && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="client_id">Client *</label>
              <select id="client_id" name="client_id" required className="input" defaultValue={clientId}>
                <option value="">Sélectionner…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="name">Nom *</label>
            <input id="name" name="name" required className="input" defaultValue={pool?.name ?? "Piscine"} />
          </div>
          <div>
            <label className="label" htmlFor="pool_type">Type</label>
            <input id="pool_type" name="pool_type" className="input" placeholder="Enterrée, coque, hors-sol…" defaultValue={pool?.pool_type ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="water_treatment">Traitement de l'eau</label>
            <input id="water_treatment" name="water_treatment" className="input" placeholder="Chlore, sel, brome…" defaultValue={pool?.water_treatment ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="volume_m3">Volume (m³)</label>
            <input id="volume_m3" name="volume_m3" inputMode="decimal" className="input" defaultValue={pool?.volume_m3 ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="length_m">Longueur (m)</label>
            <input id="length_m" name="length_m" inputMode="decimal" className="input" defaultValue={pool?.length_m ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="width_m">Largeur (m)</label>
            <input id="width_m" name="width_m" inputMode="decimal" className="input" defaultValue={pool?.width_m ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="depth_m">Profondeur (m)</label>
            <input id="depth_m" name="depth_m" inputMode="decimal" className="input" defaultValue={pool?.depth_m ?? ""} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Localisation & notes</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address_line1">Adresse (si différente du client)</label>
            <input id="address_line1" name="address_line1" className="input" defaultValue={pool?.address_line1 ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="postal_code">Code postal</label>
            <input id="postal_code" name="postal_code" className="input" defaultValue={pool?.postal_code ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="city">Ville</label>
            <input id="city" name="city" className="input" defaultValue={pool?.city ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="technical_notes">Notes techniques</label>
            <textarea id="technical_notes" name="technical_notes" rows={3} className="input" defaultValue={pool?.technical_notes ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton>{pool ? "Enregistrer" : "Créer la piscine"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
