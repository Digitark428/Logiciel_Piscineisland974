import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClientOptions, getPoolOptions, getMemberOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { ServiceForm } from "../ServiceForm";

export default async function NewServicePage({ searchParams }: { searchParams: { client?: string; pool?: string } }) {
  const ctx = await requirePermission("services.create");
  const supabase = createClient();
  const [clients, pools, members] = await Promise.all([
    getClientOptions(supabase, ctx.workspace.id),
    getPoolOptions(supabase, ctx.workspace.id),
    getMemberOptions(supabase, ctx.workspace.id),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/services" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Prestations</Link>
      <PageHeader title="Nouvelle prestation" subtitle="Ponctuelle, récurrente ou avec dates saisies manuellement." />
      <ServiceForm clients={clients} pools={pools} members={members} defaultClientId={searchParams.client} defaultPoolId={searchParams.pool} />
    </div>
  );
}
