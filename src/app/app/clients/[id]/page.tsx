import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedDownloadUrl, signedUrls } from "@/lib/storage";
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
import { serviceTypeLabel, weekdayLabel } from "@/lib/services/constants";

export default async function ClientDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await requirePermission("clients.view");
  const supabase = await createClient();

  const canViewDocs = can(ctx, "documents.view");
  const [clientRes, poolsRes, contractsRes, servicesRes, docsRes, financialsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, phone, email, address_line1, address_line2, postal_code, city, status, access_portal_code, access_code, access_details, notes, portal_token, portal_enabled, private_code_hash")
      .eq("id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle(),
    supabase.from("pools").select("id, name, pool_type, city, water_treatment").eq("client_id", params.id).eq("workspace_id", ctx.workspace.id),
    supabase.from("service_series").select("id,service_type,recurrence_weekday,starts_on,ends_on,status,assigned_membership_id,assignee:memberships!service_series_assigned_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)").eq("client_id", params.id).eq("workspace_id", ctx.workspace.id).eq("recurrence_kind", "weekly_contract").order("created_at", { ascending: false }),
    supabase.from("services").select("id,code,kind,occurrence_date,scheduled_date,status,service_type,notes,report").eq("client_id", params.id).eq("workspace_id", ctx.workspace.id).order("scheduled_date", { ascending: false }).limit(30),
    canViewDocs
      ? supabase.from("documents").select("id, name, size_bytes, created_at, storage_path, category").eq("workspace_id", ctx.workspace.id).eq("entity_type", "client").eq("entity_id", params.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    ctx.isAdmin
      ? supabase.from("service_financials").select("id,financial_kind,amount_cents,service_series_id,service:services(status)").eq("workspace_id", ctx.workspace.id).eq("client_id", params.id)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const client = clientRes.data;
  if (!client) notFound();

  const pools = poolsRes.data ?? [];
  const maintenanceContracts = contractsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const financials = (financialsRes.data ?? []) as any[];
  const contractFinancials = financials.filter((financial) => financial.financial_kind === "monthly_contract");
  const amountByContract = new Map(contractFinancials.map((financial) => [financial.service_series_id, Number(financial.amount_cents)]));
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
  const [viewUrls, downloadUrls] = await Promise.all([
    signedUrls("documents", docRows.map((document) => document.storage_path)),
    Promise.all(docRows.map((document) => signedDownloadUrl("documents", document.storage_path, document.name))),
  ]);
  const signedDocs: (FileEntry & { category: string })[] = docRows.map(
    (d, index) => ({
      id: d.id,
      name: d.name,
      size_bytes: d.size_bytes,
      created_at: d.created_at,
      category: d.category ?? "other",
      viewUrl: viewUrls.get(d.storage_path) ?? null,
      downloadUrl: downloadUrls[index],
    }),
  );
  const invoiceDocs = signedDocs.filter((d) => d.category === "invoice");
  const contractDocs = signedDocs.filter((d) => d.category === "contract");
  const otherDocs = signedDocs.filter((d) => d.category !== "invoice" && d.category !== "contract");

  return (
    <div>
      <Link href="/app/clients" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes clients</Link>

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

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-graphite-900">Contrats d'entretien</h2>
              {can(ctx, "services.create") && <Link href={`/app/services/new?kind=contract&client=${client.id}`} prefetch={false} className="text-sm font-medium text-pool-600 hover:text-pool-700">+ Nouveau contrat</Link>}
            </div>
            {maintenanceContracts.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">Aucun contrat d'entretien hebdomadaire.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {maintenanceContracts.map((contract) => {
                  const assignee = Array.isArray((contract as any).assignee) ? (contract as any).assignee[0] : (contract as any).assignee;
                  const amount = amountByContract.get(contract.id);
                  return (
                    <li key={contract.id}>
                      <Link href={`/app/services/contracts/${contract.id}`} prefetch={false} className="flex flex-wrap items-center justify-between gap-3 -mx-2 rounded-lg px-2 py-3 hover:bg-graphite-50">
                        <div>
                          <div className="font-medium text-graphite-900">{serviceTypeLabel(contract.service_type)} · chaque {weekdayLabel(contract.recurrence_weekday).toLocaleLowerCase("fr")}</div>
                          <div className="mt-0.5 text-sm text-graphite-500">Depuis le {formatDate(contract.starts_on)}{contract.ends_on ? ` · jusqu'au ${formatDate(contract.ends_on)}` : ""}{assignee ? ` · ${[assignee.first_name, assignee.last_name].filter(Boolean).join(" ") || assignee.email}` : ""}</div>
                          {ctx.isAdmin && amount !== undefined && <div className="mt-1 text-xs font-semibold text-graphite-700">{formatMoneyCents(amount)} / mois</div>}
                        </div>
                        <Badge tone={contract.status}>{contract.status === "active" ? "Actif" : contract.status === "paused" ? "Suspendu" : "Terminé"}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Historique des entretiens réellement enregistrés */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-graphite-900">Historique des entretiens</h2>
              {can(ctx, "services.create") && (
                <Link href={`/app/services/new?kind=one_off&client=${client.id}`} prefetch={false} className="text-sm font-medium text-pool-600 hover:text-pool-700">+ Entretien ponctuel</Link>
              )}
            </div>
            {services.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">Aucun passage réalisé, commenté ou modifié.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link href={`/app/services/${s.id}`} prefetch={false} className="flex items-center gap-3 py-3 hover:bg-graphite-50 -mx-2 px-2 rounded-lg">
                      <div className="w-28 text-sm text-graphite-500">{formatDate(s.scheduled_date)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-graphite-900">{serviceTypeLabel(s.service_type)}</div>
                        {(s.notes || s.report) && <div className="truncate text-xs text-graphite-400">{s.notes || s.report}</div>}
                      </div>
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
                {contractFinancials.map((contract) => (
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
