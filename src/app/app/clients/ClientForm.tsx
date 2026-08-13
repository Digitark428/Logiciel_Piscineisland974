"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { upsertClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/db/types";

export function ClientForm({ client }: { client?: Client }) {
  return (
    <ActionForm action={upsertClient} className="space-y-6">
      {client && <input type="hidden" name="id" value={client.id} />}

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Identité</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="first_name">Prénom</label>
            <input id="first_name" name="first_name" className="input" defaultValue={client?.first_name ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="last_name">Nom</label>
            <input id="last_name" name="last_name" className="input" defaultValue={client?.last_name ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="company_name">Entreprise (optionnel)</label>
            <input id="company_name" name="company_name" className="input" defaultValue={client?.company_name ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" className="input" defaultValue={client?.phone ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" className="input" defaultValue={client?.email ?? ""} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Adresse</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address_line1">Adresse</label>
            <input id="address_line1" name="address_line1" className="input" defaultValue={client?.address_line1 ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address_line2">Complément</label>
            <input id="address_line2" name="address_line2" className="input" defaultValue={client?.address_line2 ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="postal_code">Code postal</label>
            <input id="postal_code" name="postal_code" className="input" defaultValue={client?.postal_code ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="city">Ville</label>
            <input id="city" name="city" className="input" defaultValue={client?.city ?? ""} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Informations complémentaires</h3>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="access_info">Informations d'accès (portail, code, chien…)</label>
            <textarea id="access_info" name="access_info" rows={2} className="input" defaultValue={client?.access_info ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={3} className="input" defaultValue={client?.notes ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton>{client ? "Enregistrer" : "Créer le client"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
