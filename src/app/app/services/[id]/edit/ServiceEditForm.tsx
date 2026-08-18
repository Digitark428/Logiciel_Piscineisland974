"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { updateService, deleteService } from "@/lib/actions/services";
import type { Service } from "@/lib/db/types";
import { moneyCentsInputValue } from "@/lib/utils/money";

interface Opt { id: string; label: string }
interface PoolOpt { id: string; label: string; client_id: string }
interface DocOpt { id: string; label: string; client_id: string; category: "contract" | "invoice" }

export function ServiceEditForm({
  service,
  members,
  pools,
  documents = [],
  isAdmin,
  financialAmountCents,
}: {
  service: Service;
  members: Opt[];
  pools: PoolOpt[];
  documents?: DocOpt[];
  isAdmin: boolean;
  financialAmountCents?: number | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const clientPools = pools.filter((p) => p.client_id === service.client_id);
  const clientContracts = documents.filter((d) => d.category === "contract");
  const clientInvoices = documents.filter((d) => d.category === "invoice");

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
              <label className="label" htmlFor="duration_min">Durée estimée (min)</label>
              <input id="duration_min" name="duration_min" inputMode="numeric" className="input" defaultValue={service.duration_min ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="assigned_membership_id">Membre assigné</label>
              <select id="assigned_membership_id" name="assigned_membership_id" className="input" defaultValue={service.assigned_membership_id ?? ""}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="contract_document_id">Contrat lié</label>
              <select id="contract_document_id" name="contract_document_id" className="input" defaultValue={service.contract_document_id ?? ""}>
                <option value="">Aucun contrat associé</option>
                {clientContracts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="invoice_document_id">Facture liée</label>
              <select id="invoice_document_id" name="invoice_document_id" className="input" defaultValue={service.invoice_document_id ?? ""}>
                <option value="">Aucune facture associée</option>
                {clientInvoices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Commentaires</label>
              <textarea id="notes" name="notes" rows={3} className="input" defaultValue={service.notes ?? ""} />
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="card p-6">
            <div className="max-w-sm">
              <label className="label" htmlFor="amount">{service.kind === "recurring" ? "Montant mensuel du contrat" : "Montant facturé"}</label>
              <div className="relative">
                <input id="amount" name="amount" inputMode="decimal" className="input pr-10" defaultValue={moneyCentsInputValue(financialAmountCents)} placeholder={service.kind === "recurring" ? "200,00" : "850,00"} />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-graphite-500">€{service.kind === "recurring" ? " / mois" : ""}</span>
              </div>
              <p className="mt-2 text-xs text-graphite-400">
                {service.kind === "recurring" ? "Cette valeur est portée par le contrat, et non par chaque passage." : "Laissez vide pour ne pas modifier le montant existant."}
              </p>
            </div>
          </div>
        )}
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
