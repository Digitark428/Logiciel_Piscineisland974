import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedDownloadUrl } from "@/lib/storage";
import { Card, Badge, Avatar } from "@/components/ui";
import { ClientPortalCard } from "./ClientPortalCard";
import { ArchiveButton, DeleteClientButton } from "./ClientActions";
import { ClientFiles, type FileEntry } from "./ClientFiles";
import {
  clientName,
  formatDate,
  SERVICE_STATUS_LABELS,
} from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";

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

  const canViewDocs = can(ctx, "documents.view");
  const [poolsRes, servicesRes, docsRes, financialsRes] = await Promise.all([
    supabase.from("pools").select("id, name, pool_type, city, water_treatment").eq("client_id", client.id).eq("workspace_id", ctx.workspace.id),
    supabase.from("services").select("id, code, scheduled_date, status, service_type").eq("client_id", client.id).eq("workspace_id", ctx.workspace.id).order("scheduled_date", { ascending: false }).limit(10),
    canViewDocs
      ? supabase.from("documents").select("id, name, size_bytes, created_at, storage_path, category").eq("workspace_id", ctx.workspace.id).eq("entity_type", "client").eq("entity_id", client.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    ctx.isAdmin
      ? supabase.from("service_financials").select("id, financial_kind, amount_cents, service:services(status)").eq("workspace_id", ctx.workspace.id).eq("client_id", client.id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const pools = poolsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const financials = (financialsRes.data ?? []) as any[];
  const contracts = financials.filter((financial) => financial.financial_kind === "monthly_contract");
  const oneOffCents = financials
    .filter((financial) => financial.financial_kind === "one_off" && financial.service?.status !== "cancelled")
    .reduce((total, financial) => total + Number(financial.amount_cents ?? 0), 0);
  const name = clientName(client);
  const canSensitive = can(ctx, "sensitive.view");
  const canManageDocs = can(ctx, "documents.manage");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const portalUrl = client.portal_token ? `${appUrl}/portal/${client.portal_token}` : null;

  // Documents du client (factures / contrats / autres), avec URLs signées consultation + téléchargement.
  const docRows = (docsRes.data ?? []) as any[];
  const signedDocs: (FileEntry & { category: string })[] = await Promise.all(
    docRows.map(async (d) => ({
      id: d.id,
      name: d.name,
      size_bytes: d.size_bytes,
      created_at: d.created_at,
      category: d.category ?? "other",
      viewUrl: await signedUrl("documents", d.storage_path),
      downloadUrl: await signedDownloadUrl("documents", d.storage_path, d.name),
    })),
  );
  const invoiceDocs = signedDocs.filter((d) => d.category === "invoice");
  const contractDocs = signedDocs.filter((d) => d.category === "contract");
  const otherDocs = signedDocs.filter((d) => d.category !== "invoice" && d.category !== "contract");

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
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/clients/${client.id}/edit`} className="btn-secondary">Modifier</Link>
            {can(ctx, "clients.delete") && <ArchiveButton clientId={client.id} archived={client.status === "archived"} />}
            {can(ctx, "clients.delete") && <DeleteClientButton clientId={client.id} />}
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
              {canSensitive && <Info label="Code portail" value={client.access_portal_code} />}
              {canSensitive && <Info label="Code d'accès" value={client.access_code} />}
              {canSensitive && <Info label="Autres informations d'accès" value={client.access_details} full />}
              <Info label="Note importante" value={client.notes} full />
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

          {canViewDocs && (
            <div className="grid gap-6 sm:grid-cols-2">
              <ClientFiles
                title="Contrats"
                category="contract"
                clientId={client.id}
                entries={contractDocs}
                canManage={canManageDocs}
                nameLabel="Nom du contrat"
                namePlaceholder="Ex : Contrat entretien annuel 2026"
                emptyLabel="Aucun contrat. Importez un document existant."
              />
              <ClientFiles
                title="Factures"
                category="invoice"
                clientId={client.id}
                entries={invoiceDocs}
                canManage={canManageDocs}
                nameLabel="Nom de la facture"
                namePlaceholder="Ex : Facture août 2026"
                emptyLabel="Aucune facture. Importez un document existant."
              />
              {(otherDocs.length > 0 || canManageDocs) && (
                <div className="sm:col-span-2">
                  <ClientFiles
                    title="Autres documents"
                    category="other"
                    clientId={client.id}
                    entries={otherDocs}
                    canManage={canManageDocs}
                    emptyLabel="Aucun autre document."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {ctx.isAdmin && financials.length > 0 && (
            <Card>
              <h2 className="mb-3 text-base font-semibold text-graphite-900">Synthèse financière</h2>
              <dl className="space-y-3 text-sm">
                {contracts.map((contract) => (
                  <div key={contract.id}>
                    <dt className="text-xs uppercase tracking-wide text-graphite-400">Contrat entretien</dt>
                    <dd className="mt-0.5 font-semibold text-graphite-900">{formatMoneyCents(Number(contract.amount_cents))} / mois</dd>
                  </div>
                ))}
                {oneOffCents > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-graphite-400">Prestations ponctuelles</dt>
                    <dd className="mt-0.5 font-semibold text-graphite-900">{formatMoneyCents(oneOffCents)}</dd>
                  </div>
                )}
              </dl>
            </Card>
          )}
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
