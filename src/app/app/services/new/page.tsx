import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClientOptions, getPoolOptions, getMemberOptions, getClientDocumentOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { ServiceForm } from "../ServiceForm";

export default async function NewServicePage({ searchParams }: { searchParams: { client?: string; pool?: string; kind?: string } }) {
  const ctx = await requirePermission("services.create");
  const kind = searchParams.kind === "one_off" ? "one_off" : "contract";
  const supabase = createClient();
  const [clients, pools, members, documents] = await Promise.all([
    getClientOptions(supabase, ctx.workspace.id),
    getPoolOptions(supabase, ctx.workspace.id),
    getMemberOptions(supabase, ctx.workspace.id),
    getClientDocumentOptions(supabase, ctx.workspace.id),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/services" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes entretiens</Link>
      <PageHeader
        title={kind === "contract" ? "Nouveau contrat" : "Entretien ponctuel"}
        subtitle={kind === "contract" ? "Planifiez un passage récurrent chaque semaine." : "Planifiez une intervention à une date précise."}
      />
      <ServiceForm kind={kind} clients={clients} pools={pools} members={members} documents={documents} defaultClientId={searchParams.client} defaultPoolId={searchParams.pool} isAdmin={ctx.isAdmin} />
    </div>
  );
}
