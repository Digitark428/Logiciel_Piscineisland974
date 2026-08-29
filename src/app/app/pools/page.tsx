import Link from "next/link";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { clientName } from "@/lib/utils/format";

export default async function PoolsPage() {
  const ctx = await requirePermission("pools.view");
  const supabase = await createClient();
  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, pool_type, water_treatment, city, client:clients(first_name,last_name,company_name)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Piscines"
        subtitle={`${pools?.length ?? 0} piscine(s)`}
        action={can(ctx, "pools.edit") ? <Link href="/app/pools/new" className="btn-primary">+ Nouvelle piscine</Link> : undefined}
      />
      {!pools || pools.length === 0 ? (
        <EmptyState title="Aucune piscine" description="Ajoutez une piscine à un client." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((p: any) => (
            <Link key={p.id} href={`/app/pools/${p.id}`} className="card p-5 transition hover:border-pool-200">
              <div className="text-base font-semibold text-graphite-900">{p.name}</div>
              <div className="mt-1 text-sm text-graphite-500">{clientName(p.client ?? {})}</div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {p.pool_type && <span className="badge bg-graphite-100 text-graphite-600">{p.pool_type}</span>}
                {p.water_treatment && <span className="badge bg-pool-50 text-pool-700">{p.water_treatment}</span>}
                {p.city && <span className="badge bg-graphite-100 text-graphite-600">{p.city}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
