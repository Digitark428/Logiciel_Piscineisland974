import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClientOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { createContract } from "@/lib/actions/contracts";

export default async function NewContractPage({ searchParams }: { searchParams: { client?: string } }) {
  const ctx = await requirePermission("contracts.manage");
  const supabase = createClient();
  const clients = await getClientOptions(supabase, ctx.workspace.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/contracts" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Contrats</Link>
      <PageHeader title="Nouveau contrat" />
      <ActionForm action={createContract}>
        <div className="card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="client_id">Client *</label>
              <select id="client_id" name="client_id" required className="input" defaultValue={searchParams.client ?? ""}>
                <option value="">Sélectionner…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">Intitulé *</label>
              <input id="title" name="title" required className="input" placeholder="Contrat entretien annuel" />
            </div>
            <div>
              <label className="label" htmlFor="reference">Référence</label>
              <input id="reference" name="reference" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="amount">Montant (€)</label>
              <input id="amount" name="amount" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="start_date">Début</label>
              <input id="start_date" name="start_date" type="date" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="end_date">Fin</label>
              <input id="end_date" name="end_date" type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows={3} className="input" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end"><SubmitButton>Créer le contrat</SubmitButton></div>
      </ActionForm>
    </div>
  );
}
