import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { clientName, formatDate, SERVICE_STATUS_LABELS } from "@/lib/utils/format";

export default async function PoolDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requirePermission("pools.view");
  const supabase = createClient();
  const { data: pool } = await supabase
    .from("pools")
    .select("*, client:clients(id,first_name,last_name,company_name)")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!pool) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, scheduled_date, status, service_type")
    .eq("pool_id", pool.id)
    .eq("workspace_id", ctx.workspace.id)
    .order("scheduled_date", { ascending: false })
    .limit(10);

  const client = (pool as any).client;

  return (
    <div>
      <Link href="/app/pools" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Piscines</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-graphite-900">{pool.name}</h1>
          {client && (
            <Link href={`/app/clients/${client.id}`} className="mt-1 inline-block text-sm text-pool-600 hover:text-pool-700">
              {clientName(client)}
            </Link>
          )}
        </div>
        {can(ctx, "pools.edit") && (
          <Link href={`/app/pools/${pool.id}/edit`} className="btn-secondary">Modifier</Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-graphite-900">Caractéristiques</h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <Info label="Type" value={pool.pool_type} />
            <Info label="Traitement" value={pool.water_treatment} />
            <Info label="Volume" value={pool.volume_m3 ? `${pool.volume_m3} m³` : null} />
            <Info label="Dimensions" value={[pool.length_m, pool.width_m, pool.depth_m].filter(Boolean).map((x) => `${x} m`).join(" × ") || null} />
            <Info label="Adresse" value={[pool.address_line1, pool.postal_code, pool.city].filter(Boolean).join(", ")} full />
            <Info label="Notes techniques" value={pool.technical_notes} full />
          </dl>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-graphite-900">Prestations</h2>
            {can(ctx, "services.create") && client && (
              <Link href={`/app/services/new?client=${client.id}&pool=${pool.id}`} className="text-sm font-medium text-pool-600">+ Nouvelle</Link>
            )}
          </div>
          {!services || services.length === 0 ? (
            <p className="text-sm text-graphite-400">Aucune prestation.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {services.map((s) => (
                <li key={s.id}>
                  <Link href={`/app/services/${s.id}`} className="flex items-center justify-between hover:text-pool-700">
                    <span className="text-graphite-700">{formatDate(s.scheduled_date)}</span>
                    <Badge tone={s.status}>{SERVICE_STATUS_LABELS[s.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-graphite-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-graphite-800">{value || "—"}</dd>
    </div>
  );
}
