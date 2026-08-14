"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { createService } from "@/lib/actions/services";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { cn } from "@/lib/utils/cn";

interface Opt { id: string; label: string }
interface PoolOpt { id: string; label: string; client_id: string }
interface DocOpt { id: string; label: string; client_id: string; category: "contract" | "invoice" }

export function ServiceForm({
  clients,
  pools,
  members,
  documents = [],
  defaultClientId,
  defaultPoolId,
}: {
  clients: Opt[];
  pools: PoolOpt[];
  members: Opt[];
  documents?: DocOpt[];
  defaultClientId?: string;
  defaultPoolId?: string;
}) {
  const [state, formAction] = useFormState(createService, idle);
  const [kind, setKind] = useState<"unique" | "recurring">("unique");
  const [mode, setMode] = useState<"frequency" | "manual">("frequency");
  const [clientId, setClientId] = useState(defaultClientId ?? "");

  const clientPools = useMemo(
    () => pools.filter((p) => p.client_id === clientId),
    [pools, clientId],
  );
  const clientContracts = useMemo(
    () => documents.filter((d) => d.client_id === clientId && d.category === "contract"),
    [documents, clientId],
  );
  const clientInvoices = useMemo(
    () => documents.filter((d) => d.client_id === clientId && d.category === "invoice"),
    [documents, clientId],
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{state.message}</div>
      )}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="mode" value={mode} />

      {/* Type de prestation */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setKind("unique")}
          className={cn("rounded-xl border-2 p-4 text-left transition", kind === "unique" ? "border-pool-500 bg-pool-50" : "border-graphite-200 bg-white hover:border-graphite-300")}>
          <div className="font-semibold text-graphite-900">Prestation unique</div>
          <div className="text-sm text-graphite-500">Une intervention ponctuelle</div>
        </button>
        <button type="button" onClick={() => setKind("recurring")}
          className={cn("rounded-xl border-2 p-4 text-left transition", kind === "recurring" ? "border-pool-500 bg-pool-50" : "border-graphite-200 bg-white hover:border-graphite-300")}>
          <div className="font-semibold text-graphite-900">Prestation récurrente</div>
          <div className="text-sm text-graphite-500">Plusieurs interventions</div>
        </button>
      </div>

      {/* Client & piscine */}
      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="client_id">Client *</label>
            <select id="client_id" name="client_id" required className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pool_id">Piscine</label>
            <select id="pool_id" name="pool_id" className="input" defaultValue={defaultPoolId ?? ""}>
              <option value="">—</option>
              {clientPools.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="service_type">Type de prestation</label>
            <input id="service_type" name="service_type" list="service-types" className="input" placeholder="Entretien, dépannage…" />
            <datalist id="service-types">
              <option value="Entretien mensuel" />
              <option value="Entretien hebdomadaire" />
              <option value="Dépannage" />
              <option value="Hivernage" />
              <option value="Remise en route" />
              <option value="Analyse de l'eau" />
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="assigned_membership_id">Membre assigné</label>
            <select id="assigned_membership_id" name="assigned_membership_id" className="input">
              <option value="">—</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="contract_document_id">Contrat lié</label>
            <select id="contract_document_id" name="contract_document_id" className="input" disabled={!clientId}>
              <option value="">Aucun contrat associé</option>
              {clientContracts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="invoice_document_id">Facture liée</label>
            <select id="invoice_document_id" name="invoice_document_id" className="input" disabled={!clientId}>
              <option value="">Aucune facture associée</option>
              {clientInvoices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
        </div>
        {clientId && clientContracts.length === 0 && clientInvoices.length === 0 && (
          <p className="mt-3 text-xs text-graphite-400">
            Astuce : importez d'abord un contrat ou une facture dans la fiche du client pour pouvoir les lier ici.
          </p>
        )}
      </div>

      {/* Dates */}
      <div className="card p-6">
        {kind === "unique" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="scheduled_date">Date *</label>
              <input id="scheduled_date" name="scheduled_date" type="date" required defaultValue={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="scheduled_time">Heure</label>
              <input id="scheduled_time" name="scheduled_time" type="time" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="duration_min">Durée estimée (min)</label>
              <input id="duration_min" name="duration_min" inputMode="numeric" className="input" placeholder="90" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode("frequency")}
                className={cn("rounded-lg border px-3 py-2 text-sm font-medium", mode === "frequency" ? "border-pool-500 bg-pool-50 text-pool-700" : "border-graphite-200")}>
                Fréquence régulière
              </button>
              <button type="button" onClick={() => setMode("manual")}
                className={cn("rounded-lg border px-3 py-2 text-sm font-medium", mode === "manual" ? "border-pool-500 bg-pool-50 text-pool-700" : "border-graphite-200")}>
                Dates manuelles
              </button>
            </div>

            {mode === "frequency" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="start_date">Date de début *</label>
                  <input id="start_date" name="start_date" type="date" defaultValue={today} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="frequency">Fréquence</label>
                  <select id="frequency" name="frequency" className="input" defaultValue="monthly">
                    <option value="weekly">Toutes les semaines</option>
                    <option value="biweekly">Toutes les deux semaines</option>
                    <option value="monthly">Tous les mois</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="count">Nombre d'occurrences</label>
                  <input id="count" name="count" type="number" min={1} max={60} defaultValue={8} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="scheduled_time">Heure</label>
                  <input id="scheduled_time" name="scheduled_time" type="time" className="input" />
                </div>
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="manual_dates">Dates (une par ligne)</label>
                <textarea id="manual_dates" name="manual_dates" rows={6} className="input font-mono text-sm"
                  placeholder={"05/01/2026\n12/02/2026\n07/03/2026"} />
                <p className="mt-1 text-xs text-graphite-400">Formats acceptés : JJ/MM/AAAA ou AAAA-MM-JJ.</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="scheduled_time_m">Heure</label>
                    <input id="scheduled_time_m" name="scheduled_time" type="time" className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="duration_min_m">Durée estimée (min)</label>
                    <input id="duration_min_m" name="duration_min" inputMode="numeric" className="input" placeholder="90" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tâches & notes */}
      <div className="card p-6">
        <div className="grid gap-4">
          <div>
            <label className="label" htmlFor="tasks">Tâches d'entretien</label>
            <textarea id="tasks" name="tasks" rows={4} className="input" placeholder={"Analyse de l'eau\nNettoyage du bassin\nVérification du filtre\nContrôle du niveau d'eau"} />
            <p className="mt-1 text-[0.8rem] italic text-graphite-400">Chaque retour à la ligne crée une nouvelle tâche ☑️</p>
          </div>
          <div>
            <label className="label" htmlFor="notes">Commentaires</label>
            <textarea id="notes" name="notes" rows={2} className="input" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Création…">Créer {kind === "recurring" ? "les prestations" : "la prestation"}</SubmitButton>
      </div>
    </form>
  );
}
