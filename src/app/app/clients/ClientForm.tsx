"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import { upsertClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/db/types";

export function ClientForm({ client }: { client?: Client }) {
  return (
    <ActionForm action={upsertClient} className="space-y-5">
      {client && <input type="hidden" name="id" value={client.id} />}

      <div className="card overflow-hidden">
        <FormSection title="Identité" description="Les informations principales pour reconnaître et contacter ce client.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" id="first_name">
              <input id="first_name" name="first_name" className="input bg-graphite-50/45" autoComplete="given-name" defaultValue={client?.first_name ?? ""} />
            </Field>
            <Field label="Nom" id="last_name">
              <input id="last_name" name="last_name" className="input bg-graphite-50/45" autoComplete="family-name" defaultValue={client?.last_name ?? ""} />
            </Field>
            <Field label="Entreprise (optionnel)" id="company_name" full>
              <input id="company_name" name="company_name" className="input bg-graphite-50/45" autoComplete="organization" defaultValue={client?.company_name ?? ""} />
            </Field>
            <Field label="Téléphone" id="phone">
              <input id="phone" name="phone" type="tel" className="input bg-graphite-50/45" autoComplete="tel" defaultValue={client?.phone ?? ""} />
            </Field>
            <Field label="E-mail" id="email">
              <input id="email" name="email" type="email" className="input bg-graphite-50/45" autoComplete="email" defaultValue={client?.email ?? ""} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Adresse" description="L’adresse sera également utilisée pour les déplacements et la carte.">
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
        </FormSection>

        <FormSection
          title="Informations d’accès"
          description="Informations sensibles, visibles uniquement selon les permissions de l’équipe."
          tone="glacier"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code portail" id="access_portal_code">
              <input id="access_portal_code" name="access_portal_code" className="input bg-white/85" defaultValue={client?.access_portal_code ?? ""} placeholder="Ex : 1234A" />
            </Field>
            <Field label="Code d’accès" id="access_code">
              <input id="access_code" name="access_code" className="input bg-white/85" defaultValue={client?.access_code ?? ""} placeholder="Ex : B27" />
            </Field>
            <Field label="Autres informations" id="access_details" full>
              <textarea id="access_details" name="access_details" rows={3} className="input bg-white/85" defaultValue={client?.access_details ?? ""} placeholder="Chien, emplacement du local technique, particularités d’accès…" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Note importante" description="Une information à garder immédiatement visible dans le dossier client." tone="coral">
          <label className="sr-only" htmlFor="notes">Note importante</label>
          <textarea id="notes" name="notes" rows={3} className="input border-coral-100 bg-white/85 focus:border-coral-200 focus:ring-coral-100" defaultValue={client?.notes ?? ""} placeholder="Information importante à retenir sur ce client…" />
        </FormSection>
      </div>

      <div className="flex justify-end pt-1">
        <SubmitButton>{client ? "Enregistrer" : "Créer le client"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function FormSection({
  title,
  description,
  tone = "plain",
  children,
}: {
  title: string;
  description: string;
  tone?: "plain" | "glacier" | "coral";
  children: React.ReactNode;
}) {
  const surface = tone === "glacier" ? "bg-pool-50/30" : tone === "coral" ? "bg-coral-50/25" : "bg-white";
  return (
    <section className={`border-b border-graphite-100 px-5 py-6 last:border-b-0 sm:px-7 sm:py-7 ${surface}`}>
      <div className="mb-5 max-w-2xl">
        <h2 className="text-sm font-semibold tracking-[0.04em] text-graphite-800">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-graphite-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, id, full, children }: { label: string; id: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
