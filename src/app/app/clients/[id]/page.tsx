import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ui";
import { ClientPortalCard } from "./ClientPortalCard";
import { ArchiveButton } from "./ClientActions";
import {
  clientName,
  formatDate,
  formatMoney,
  SERVICE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
} from "@/lib/utils/format";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requirePermission("clients.view");
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!client) notFound();

  const [poolsRes, servicesRes, contractsRes, invoicesRes] = await Promise.all([
    supabase.from("pools").select("id, name, pool_type, city, water_treatment").eq("client_id", client.id).eq("workspace_id", ctx.workspace.id),
    supabase.from("services").select("id, code, scheduled_date, status, service_type").eq("client_id", client.id).eq("workspace_id", ctx.workspace.id).order("scheduled_date", { ascending: false }).limit(10),
    can(ctx, "contracts.manage")
      ? supabase.from("contracts").select("id, title, status, amount, end_date").eq("client_id", client.id).eq("workspace_id", ctx.workspace.id)
      : Promise.resolve({ data: [] as any[] }),
    can(ctx, "invoices.manage")
      ? supabase.from("invoices").select("id, number, status, total, issue_date").eq("client_id", client.id).eq("workspace_id", ctx.workspace.id).order("issue_date", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const pools = poolsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const contracts = contractsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const name = clientName(client);
  const canSensitive = can(ctx, "sensitive.view");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const portalUrl = client.portal_token ? `${appUrl}/portal/${client.portal_token}` : null;

  return (
    <div>
      <Link href="/app/clients" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Clients</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={56} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-graphite-900">{name}</h1>
            <p className="mt-0.5 text-sm text-graphite-500">
              {[client.city, client.phone].filter(Boolean).join(" · ") || "—"}
              {client.status === "archived" && <Badge tone="archived" className="ml-2">Archivé</Badge>}
            </p>
          </div>
        </div>
        {can(ctx, "clients.edit") && (
          <div className="flex gap-2">
            <Link href={`/app/clients/${client.id}/edit`} className="btn-secondary">Modifier</Link>
            {can(ctx, "clients.delete") && <ArchiveButton clientId={client.id} archived={client.status === "archived"} />}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Coordonnées */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Coordonnées</h2>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <Info label="Téléphone" value={client.phone} />
              <Info label="E-mail" value={client.email} />
              <Info label="Adresse" value={[client.address_line1, client.address_line2].filter(Boolean).join(", ")} />
              <Info label="Ville" value={[client.postal_code, client.city].filter(Boolean).join(" ")} />
              {canSensitive && <Info label="Informations d'accès" value={client.access_info} full />}
              <Info label="Notes" value={client.notes} full />
            </dl>
          </Card>

          {/* Piscines */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-graphite-900">Piscines ({pools.length})</h2>
              {can(ctx, "pools.edit") && (
                <Link href={`/app/pools/new?client=${client.id}`} className="text-sm font-medium text-pool-600 hover:text-pool-700">+ Ajouter</Link>
              )}
            </div>
            {pools.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">Aucune piscine.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {pools.map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/pools/${p.id}`} className="flex items-center justify-between py-3 hover:bg-graphite-50 -mx-2 px-2 rounded-lg">
                      <div>
                        <div className="font-medium text-graphite-900">{p.name}</div>
                        <div className="text-sm text-graphite-500">{[p.pool_type, p.water_treatment].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-graphite-300"><path d="m9 18 6-6-6-6" /></svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Prestations */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-graphite-900">Prestations</h2>
              {can(ctx, "services.create") && (
                <Link href={`/app/services/new?client=${client.id}`} className="text-sm font-medium text-pool-600 hover:text-pool-700">+ Nouvelle</Link>
              )}
            </div>
            {services.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">Aucune prestation.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link href={`/app/services/${s.id}`} className="flex items-center gap-3 py-3 hover:bg-graphite-50 -mx-2 px-2 rounded-lg">
                      <div className="w-28 text-sm text-graphite-500">{formatDate(s.scheduled_date)}</div>
                      <div className="flex-1 truncate font-medium text-graphite-900">{s.service_type ?? "Prestation"}</div>
                      <Badge tone={s.status}>{SERVICE_STATUS_LABELS[s.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(can(ctx, "invoices.manage") || can(ctx, "contracts.manage")) && (
            <div className="grid gap-6 sm:grid-cols-2">
              {can(ctx, "contracts.manage") && (
                <Card>
                  <h2 className="mb-3 text-base font-semibold text-graphite-900">Contrats</h2>
                  {contracts.length === 0 ? <p className="text-sm text-graphite-400">Aucun.</p> : (
                    <ul className="space-y-2 text-sm">
                      {contracts.map((c) => (
                        <li key={c.id} className="flex items-center justify-between">
                          <span className="truncate text-graphite-800">{c.title}</span>
                          <Badge tone={c.status}>{c.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
              {can(ctx, "invoices.manage") && (
                <Card>
                  <h2 className="mb-3 text-base font-semibold text-graphite-900">Factures</h2>
                  {invoices.length === 0 ? <p className="text-sm text-graphite-400">Aucune.</p> : (
                    <ul className="space-y-2 text-sm">
                      {invoices.map((i) => (
                        <li key={i.id}>
                          <Link href={`/app/invoices/${i.id}`} className="flex items-center justify-between hover:text-pool-700">
                            <span className="text-graphite-800">{i.number} · {formatMoney(i.total)}</span>
                            <Badge tone={i.status}>{INVOICE_STATUS_LABELS[i.status]}</Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {can(ctx, "clients.edit") && (
            <ClientPortalCard
              clientId={client.id}
              enabled={client.portal_enabled}
              hasCode={!!client.private_code_hash}
              portalUrl={portalUrl}
            />
          )}
        </div>
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
