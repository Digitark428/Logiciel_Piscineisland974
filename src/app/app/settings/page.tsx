import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { updateWorkspace } from "@/lib/actions/workspace";

export default async function SettingsPage() {
  const ctx = await requirePermission("settings.manage");
  const w = ctx.workspace;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Paramètres" subtitle="Informations de votre entreprise." />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-graphite-500">Code entreprise</div>
            <div className="font-mono text-2xl font-bold tracking-widest text-graphite-900">{w.company_code}</div>
          </div>
          <div className="text-sm text-graphite-400">Communiquez ce code à vos employés pour se connecter.</div>
        </div>
      </Card>

      <ActionForm action={updateWorkspace} successMessage="Paramètres enregistrés.">
        <div className="card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Nom de l'entreprise *</label>
              <input id="name" name="name" required className="input" defaultValue={w.name} />
            </div>
            <div>
              <label className="label" htmlFor="phone">Téléphone</label>
              <input id="phone" name="phone" className="input" defaultValue={w.phone ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" className="input" defaultValue={w.email ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address_line1">Adresse</label>
              <input id="address_line1" name="address_line1" className="input" defaultValue={w.address_line1 ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="postal_code">Code postal</label>
              <input id="postal_code" name="postal_code" className="input" defaultValue={w.postal_code ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="city">Ville</label>
              <input id="city" name="city" className="input" defaultValue={w.city ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="siret">SIRET</label>
              <input id="siret" name="siret" className="input" defaultValue={w.siret ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="vat_number">N° TVA</label>
              <input id="vat_number" name="vat_number" className="input" defaultValue={w.vat_number ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="legal_form">Forme juridique</label>
              <input id="legal_form" name="legal_form" className="input" defaultValue={w.legal_form ?? ""} />
            </div>
          </div>
        </div>

        <div className="card mt-6 p-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-graphite-400">Portail client</h3>
          <p className="mb-4 text-xs text-graphite-400">Choisissez les informations rendues visibles à vos clients.</p>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="portal_share_assignee_phone"
              defaultChecked={Boolean((w.settings as Record<string, unknown>)?.portal_share_assignee_phone)}
              className="mt-0.5 h-5 w-5 rounded border-graphite-300 text-pool-600"
            />
            <span className="text-sm text-graphite-700">
              Afficher le téléphone de l'intervenant sur la fiche d'intervention du client.
              <span className="block text-xs text-graphite-400">Sinon, seul le contact du gérant est proposé au client.</span>
            </span>
          </label>
        </div>

        <div className="mt-4 flex justify-end"><SubmitButton>Enregistrer</SubmitButton></div>
      </ActionForm>

      <div className="mt-6 text-center text-sm text-graphite-400">
        <Link href="/legal/confidentialite" className="hover:text-graphite-600">Politique de confidentialité & RGPD</Link>
      </div>
    </div>
  );
}
