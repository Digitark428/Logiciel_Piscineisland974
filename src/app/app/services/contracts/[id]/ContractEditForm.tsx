"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { updateMaintenanceContract } from "@/lib/actions/services";
import { MAINTENANCE_TYPES, WEEKDAYS } from "@/lib/services/constants";

interface Option { id: string; label: string }
interface DocumentOption { id: string; label: string; client_id: string; category: "contract" | "invoice" }

export function ContractEditForm({
  contract,
  members,
  documents,
  amount,
  isAdmin,
}: {
  contract: {
    id: string;
    client_id: string;
    service_type: string | null;
    assigned_membership_id: string | null;
    contract_document_id: string | null;
    invoice_document_id: string | null;
    recurrence_weekday: number;
    starts_on: string;
    ends_on: string | null;
    status: string;
    notes: string | null;
  };
  members: Option[];
  documents: DocumentOption[];
  amount: string;
  isAdmin: boolean;
}) {
  const [status, setStatus] = useState(contract.status);
  const clientDocuments = useMemo(() => documents.filter((document) => document.client_id === contract.client_id), [documents, contract.client_id]);
  const contracts = clientDocuments.filter((document) => document.category === "contract");
  const invoices = clientDocuments.filter((document) => document.category === "invoice");

  return (
    <ActionForm action={updateMaintenanceContract} successMessage="Contrat enregistré." className="space-y-5">
      <input type="hidden" name="id" value={contract.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="service_type">Type d'entretien</label>
          <select id="service_type" name="service_type" className="input" defaultValue={contract.service_type ?? MAINTENANCE_TYPES[0].key}>
            {MAINTENANCE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="assigned_membership_id">Technicien assigné</label>
          <select id="assigned_membership_id" name="assigned_membership_id" className="input" defaultValue={contract.assigned_membership_id ?? ""}>
            <option value="">Non assigné</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="recurrence_weekday">Jour de passage</label>
          <select id="recurrence_weekday" name="recurrence_weekday" className="input" defaultValue={contract.recurrence_weekday}>
            {WEEKDAYS.map((weekday) => <option key={weekday.value} value={weekday.value}>{weekday.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Statut du contrat</label>
          <select id="status" name="status" className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">Actif</option>
            <option value="paused">Suspendu</option>
            <option value="ended">Terminé</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="starts_on">Début du contrat</label>
          <input id="starts_on" name="starts_on" type="date" required className="input" defaultValue={contract.starts_on} />
        </div>
        <div>
          <label className="label" htmlFor="ends_on">Fin du contrat</label>
          <input id="ends_on" name="ends_on" type="date" className="input" defaultValue={contract.ends_on ?? ""} />
          {status === "ended" && <p className="mt-1 text-xs text-graphite-400">Si elle reste vide, la date du jour sera utilisée.</p>}
        </div>
        <div>
          <label className="label" htmlFor="contract_document_id">Contrat lié</label>
          <select id="contract_document_id" name="contract_document_id" className="input" defaultValue={contract.contract_document_id ?? ""}>
            <option value="">Aucun contrat associé</option>
            {contracts.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="invoice_document_id">Facture liée</label>
          <select id="invoice_document_id" name="invoice_document_id" className="input" defaultValue={contract.invoice_document_id ?? ""}>
            <option value="">Aucune facture associée</option>
            {invoices.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="label" htmlFor="amount">Montant mensuel *</label>
            <input id="amount" name="amount" inputMode="decimal" required className="input" defaultValue={amount} />
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="notes">Commentaire général du contrat</label>
        <textarea id="notes" name="notes" rows={4} className="input" defaultValue={contract.notes ?? ""} />
      </div>
      <div className="flex justify-end"><SubmitButton>Enregistrer le contrat</SubmitButton></div>
    </ActionForm>
  );
}
