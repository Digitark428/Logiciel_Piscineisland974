import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClientOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { PoolForm } from "../../PoolForm";
import type { Pool } from "@/lib/db/types";

export default async function EditPoolPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await requirePermission("pools.edit");
  const supabase = await createClient();
  const { data: pool } = await supabase.from("pools").select("*").eq("id", params.id).eq("workspace_id", ctx.workspace.id).maybeSingle();
  if (!pool) notFound();
  const clients = await getClientOptions(supabase, ctx.workspace.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/pools/${params.id}`} className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← {pool.name}</Link>
      <PageHeader title="Modifier la piscine" />
      <PoolForm pool={pool as Pool} clients={clients} />
    </div>
  );
}
