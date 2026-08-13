import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClientOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { PoolForm } from "../PoolForm";

export default async function NewPoolPage({ searchParams }: { searchParams: { client?: string } }) {
  const ctx = await requirePermission("pools.edit");
  const supabase = createClient();
  const clients = await getClientOptions(supabase, ctx.workspace.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/pools" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Piscines</Link>
      <PageHeader title="Nouvelle piscine" />
      <PoolForm clients={clients} defaultClientId={searchParams.client} />
    </div>
  );
}
