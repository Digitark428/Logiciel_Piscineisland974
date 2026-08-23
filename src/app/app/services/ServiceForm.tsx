"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { createMaintenanceContract, createOneOffService } from "@/lib/actions/services";
import { idle } from "@/lib/actions/result";
import { MAINTENANCE_TYPES, WEEKDAYS } from "@/lib/services/constants";
import { todayInReunion } from "@/lib/utils/date";

interface Option { id: string; label: string }
interface PoolOption { id: string; label: string; client_id: string }
interface DocumentOption { id: string; label: string; client_id: string; category: "contract" | "invoice" }

export function ServiceForm({
  kind,
  clients,
  pools,
  members,
  documents = [],
  defaultClientId,
  defaultPoolId,
  isAdmin,
}: {
  kind: "contract" | "one_off";
  clients: Option[];
  pools: PoolOption[];
  members: Option[];
  documents?: DocumentOption[];
  defaultClientId?: string;
  defaultPoolId?: string;
  isAdmin: boolean;
}) {
  const action = kind === "contract" ? createMaintenanceContract : createOneOffService;
  const [state, formAction] = useFormState(action, idle);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const clientPools = useMemo(() => pools.filter((pool) => pool.client_id === clientId), [pools, clientId]);
  const clientContracts = useMemo(() => documents.filter((document) => document.client_id === clientId && document.category === "contract"), [documents, clientId]);
  const clientInvoices = useMemo(() => documents.filter((document) => document.client_id === clientId && document.category === "invoice"), [documents, clientId]);
  const today = todayInReunion();

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200" role="alert">{state.message}</div>
      )}

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="client_id">Client *</label>
            <select id="client_id" name="client_id" required className="input" value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Sélectionner…</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
            </select>
          </div>
          {kind === "one_off" && (
            <div>
              <label className="label" htmlFor="pool_id">Piscine</label>
              <select id="pool_id" name="pool_id" className="input" defaultValue={defaultPoolId ?? ""}>
                <option value="">—</option>
                {clientPools.map((pool) => <option key={pool.id} value={pool.id}>{pool.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="service_type">Type d'entretien *</label>
            <select id="service_type" name="service_type" required className="input" defaultValue={MAINTENANCE_TYPES[0].key}>
              {MAINTENANCE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="assigned_membership_id">Technicien assigné</label>
            <select id="assigned_membership_id" name="assigned_membership_id" className="input">
              <option value="">Non assigné</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="contract_document_id">Contrat lié</label>
            <select id="contract_document_id" name="contract_document_id" className="input" disabled={!clientId}>
              <option value="">Aucun contrat associé</option>
              {clientContracts.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="invoice_document_id">Facture liée</label>
            <select id="invoice_document_id" name="invoice_document_id" className="input" disabled={!clientId}>
              <option value="">Aucune facture associée</option>
              {clientInvoices.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
            </select>
          </div>
        </div>
        {clientId && clientContracts.length === 0 && clientInvoices.length === 0 && (
          <p className="mt-3 text-xs text-graphite-400">Importez d'abord le contrat ou la facture dans la fiche client pour pouvoir le lier ici.</p>
        )}
      </div>

      {isAdmin && (
        <div className="card p-6">
          <div className="max-w-sm">
            <label className="label" htmlFor="amount">{kind === "contract" ? "Montant mensuel du contrat" : "Montant facturé"} *</label>
            <div className="relative">
              <input id="amount" name="amount" required inputMode="decimal" className="input pr-20" placeholder={kind === "contract" ? "200,00" : "850,00"} />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-graphite-500">€{kind === "contract" ? " / mois" : ""}</span>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        {kind === "contract" ? (
          <div>
            <h2 className="mb-4 text-base font-semibold text-graphite-900">Passage hebdomadaire</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="recurrence_weekday">Jour de passage *</label>
                <select id="recurrence_weekday" name="recurrence_weekday" required className="input" defaultValue="1">
                  {WEEKDAYS.map((weekday) => <option key={weekday.value} value={weekday.value}>{weekday.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="starts_on">Début du contrat *</label>
                <input id="starts_on" name="starts_on" type="date" required defaultValue={today} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="ends_on">Fin du contrat</label>
                <input id="ends_on" name="ends_on" type="date" className="input" />
                <p className="mt-1 text-xs text-graphite-400">Laissez vide si le contrat n'a pas de date de fin.</p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-pool-50 px-3 py-2 text-sm text-pool-800">Les passages apparaissent automatiquement chaque semaine. Une trace est créée uniquement lorsqu'un statut, un commentaire ou une exception est enregistré.</p>
          </div>
        ) : (
          <div>
            <h2 className="mb-4 text-base font-semibold text-graphite-900">Planification ponctuelle</h2>
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
                <input id="duration_min" name="duration_min" type="number" min={1} max={1440} inputMode="numeric" className="input" placeholder="90" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <label className="label" htmlFor="notes">{kind === "contract" ? "Commentaire général du contrat" : "Commentaire de l'entretien"}</label>
        <textarea id="notes" name="notes" rows={4} className="input" placeholder={kind === "contract" ? "Consignes permanentes, particularités du contrat…" : "Informations utiles pour cette intervention…"} />
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Création…">{kind === "contract" ? "Créer le contrat" : "Créer l'entretien ponctuel"}</SubmitButton>
      </div>
    </form>
  );
}
