"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
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
        <AddressAutocomplete
          defaults={{
            address_line1: client?.address_line1,
            address_line2: client?.address_line2,
            postal_code: client?.postal_code,
            city: client?.city,
            latitude: client?.latitude,
            longitude: client?.longitude,
            geo_label: client?.geo_label,
            geo_precision: client?.geo_precision,
          }}
        />
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-graphite-400">Informations d'accès</h3>
        <p className="mb-4 text-xs text-graphite-400">Informations sensibles — visibles selon les permissions de l'équipe.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="access_portal_code">Code portail</label>
            <input id="access_portal_code" name="access_portal_code" className="input" defaultValue={client?.access_portal_code ?? ""} placeholder="Ex : 1234A" />
          </div>
          <div>
            <label className="label" htmlFor="access_code">Code d'accès</label>
            <input id="access_code" name="access_code" className="input" defaultValue={client?.access_code ?? ""} placeholder="Ex : B27" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="access_details">Autres informations</label>
            <textarea id="access_details" name="access_details" rows={3} className="input" defaultValue={client?.access_details ?? ""} placeholder="Chien, emplacement du local technique, particularités d'accès…" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Note importante</h3>
        <textarea id="notes" name="notes" rows={3} className="input" defaultValue={client?.notes ?? ""} placeholder="Information importante à retenir sur ce client…" />
      </div>

      <div className="flex justify-end">
        <SubmitButton>{client ? "Enregistrer" : "Créer le client"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
