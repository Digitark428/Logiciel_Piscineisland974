import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedDownloadUrl, signedUrls } from "@/lib/storage";
import { Card, Badge, Avatar } from "@/components/ui";
import { ClientPortalCard } from "./ClientPortalCard";
import { ArchiveButton, DeleteClientButton } from "./ClientActions";
import { ClientFiles, type FileEntry } from "./ClientFiles";
import { clientName, formatDate, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";
import { serviceTypeLabel, weekdayLabel } from "@/lib/services/constants";
import { addCalendarDays, weeklyDatesInRange } from "@/lib/services/recurrence";
import { todayInReunion } from "@/lib/utils/date";

const HISTORY_PAGE_SIZE = 30;

function positivePage(raw: string | undefined): number {
  const page = Number(raw ?? "1");
  return Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

export default async function ClientDetailPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ history?: string }>;
}) {
  const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);
  const ctx = await requirePermission("clients.view");
  const supabase = await createClient();
  const canViewDocs = can(ctx, "documents.view");
  const historyPage = positivePage(searchParams.history);
  const historyFrom = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const today = todayInReunion();

  const [clientRes, contractsRes, servicesRes, lastServiceRes, nextServiceRes, docsRes, financialsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, phone, email, address_line1, address_line2, postal_code, city, status, access_portal_code, access_code, access_details, notes, portal_token, portal_enabled, private_code_hash")
      .eq("id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle(),
    supabase
      .from("service_series")
      .select("id,service_type,recurrence_weekday,starts_on,ends_on,status,assigned_membership_id,assignee:memberships!service_series_assigned_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)")
      .eq("client_id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .eq("recurrence_kind", "weekly_contract")
      .order("created_at", { ascending: false }),
    supabase
      .from("services")
      .select("id,code,kind,occurrence_date,scheduled_date,status,service_type,notes,report", { count: "exact" })
      .eq("client_id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .order("scheduled_date", { ascending: false })
      .range(historyFrom, historyFrom + HISTORY_PAGE_SIZE - 1),
    supabase
      .from("services")
      .select("scheduled_date")
      .eq("client_id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("services")
      .select("scheduled_date")
      .eq("client_id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .gte("scheduled_date", today)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    canViewDocs
      ? supabase.from("documents").select("id, name, size_bytes, created_at, storage_path, category").eq("workspace_id", ctx.workspace.id).eq("entity_type", "client").eq("entity_id", params.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    ctx.isAdmin
      ? supabase.from("service_financials").select("id,financial_kind,amount_cents,service_series_id,service:services(status)").eq("workspace_id", ctx.workspace.id).eq("client_id", params.id)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const client = clientRes.data;
  if (!client) notFound();

  const maintenanceContracts = contractsRes.data ?? [];
  const services = servicesRes.data ?? [];
  const financials = (financialsRes.data ?? []) as Array<Record<string, any>>;
  const contractFinancials = financials.filter((financial) => financial.financial_kind === "monthly_contract");
  const amountByContract = new Map(contractFinancials.map((financial) => [String(financial.service_series_id), Number(financial.amount_cents)]));
  const activeContracts = maintenanceContracts.filter((contract) => contract.status === "active");
  const monthlyCents = activeContracts.reduce((total, contract) => total + (amountByContract.get(contract.id) ?? 0), 0);
  const rangeEnd = addCalendarDays(today, 56) ?? today;
  const recurringDates = activeContracts
    .flatMap((contract) => weeklyDatesInRange({
      starts_on: contract.starts_on,
      ends_on: contract.ends_on,
      recurrence_weekday: contract.recurrence_weekday,
    }, today, rangeEnd))
    .sort();
  const nextRecorded = nextServiceRes.data?.scheduled_date ?? null;
  const nextRecurring = recurringDates[0] ?? null;
  const nextServiceDate = [nextRecorded, nextRecurring].filter((date): date is string => Boolean(date)).sort()[0] ?? null;
  const totalHistoryPages = Math.max(1, Math.ceil((servicesRes.count ?? 0) / HISTORY_PAGE_SIZE));
  const oneOffCents = financials
    .filter((financial) => financial.financial_kind === "one_off" && financial.service?.status !== "cancelled")
    .reduce((total, financial) => total + Number(financial.amount_cents ?? 0), 0);
  const name = clientName(client);
  const canSensitive = can(ctx, "sensitive.view");
  const canManageDocs = can(ctx, "documents.manage");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const portalUrl = client.portal_token ? `${appUrl}/portal/${client.portal_token}` : null;

  const docRows = (docsRes.data ?? []) as Array<Record<string, any>>;
  const [viewUrls, downloadUrls] = await Promise.all([
    signedUrls("documents", docRows.map((document) => document.storage_path)),
    Promise.all(docRows.map((document) => signedDownloadUrl("documents", document.storage_path, document.name))),
  ]);
  const signedDocs: Array<FileEntry & { category: string }> = docRows.map((document, index) => ({
    id: document.id,
    name: document.name,
    size_bytes: document.size_bytes,
    created_at: document.created_at,
    category: document.category ?? "other",
    viewUrl: viewUrls.get(document.storage_path) ?? null,
    downloadUrl: downloadUrls[index],
  }));
  const invoiceDocs = signedDocs.filter((document) => document.category === "invoice");
  const contractDocs = signedDocs.filter((document) => document.category === "contract");
  const otherDocs = signedDocs.filter((document) => document.category !== "invoice" && document.category !== "contract");
  const fullAddress = [client.address_line1, client.address_line2, [client.postal_code, client.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/app/clients" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes clients</Link>

      <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name} size={58} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.025em] text-graphite-900 sm:text-[1.75rem]">{name}</h1>
              {client.status === "archived" ? <Badge tone="archived">Archivé</Badge> : null}
            </div>
            <p className="mt-1 truncate text-sm text-graphite-500">{[client.city, client.phone].filter(Boolean).join(" · ") || "Coordonnées à compléter"}</p>
          </div>
        </div>
        {can(ctx, "clients.edit") ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link href={`/app/clients/${client.id}/edit`} className="btn-secondary shadow-none">Modifier</Link>
            {can(ctx, "clients.delete") ? <ArchiveButton clientId={client.id} archived={client.status === "archived"} /> : null}
            {can(ctx, "clients.delete") ? <DeleteClientButton clientId={client.id} /> : null}
          </div>
        ) : null}
      </header>

      <div className="space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
            <section className="p-5 sm:p-7">
              <SectionHeading title="Coordonnées" description="Les informations essentielles du dossier client." />
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Info label="Téléphone" value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
                <Info label="E-mail" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
                <Info label="Adresse" value={fullAddress} full />
                {canSensitive ? <Info label="Code portail" value={client.access_portal_code} /> : null}
                {canSensitive ? <Info label="Code d’accès" value={client.access_code} /> : null}
                {canSensitive ? <Info label="Autres informations d’accès" value={client.access_details} full /> : null}
              </dl>
              {client.notes ? (
                <div className="mt-6 rounded-2xl border border-coral-100 bg-coral-50/30 p-4">
                  <p className="text-xs font-semibold tracking-[0.04em] text-coral-700">Note importante</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-graphite-700">{client.notes}</p>
                </div>
              ) : null}
            </section>

            <aside className="border-t border-graphite-100 bg-graphite-50/45 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <SectionHeading title="Synthèse" description="Contrats et activité en un coup d’œil." />
              <dl className="space-y-5">
                <SummaryItem label="Contrats d’entretien" value={activeContracts.length > 0 ? `${activeContracts.length} actif${activeContracts.length > 1 ? "s" : ""}` : maintenanceContracts.length > 0 ? "Aucun contrat actif" : "Aucun contrat"} />
                {ctx.isAdmin ? <SummaryItem label="Montant mensuel" value={monthlyCents > 0 ? `${formatMoneyCents(monthlyCents)} / mois` : "—"} emphasized /> : null}
                <SummaryItem label="Dernier entretien" value={lastServiceRes.data?.scheduled_date ? formatDate(lastServiceRes.data.scheduled_date) : "Aucun entretien terminé"} />
                <SummaryItem label="Prochain entretien" value={nextServiceDate ? formatDate(nextServiceDate) : "Non planifié"} />
                {ctx.isAdmin && oneOffCents > 0 ? <SummaryItem label="Entretiens ponctuels" value={formatMoneyCents(oneOffCents)} /> : null}
              </dl>
            </aside>
          </div>
          {can(ctx, "clients.edit") ? (
            <div className="border-t border-graphite-100 p-4 sm:p-6">
              <ClientPortalCard clientId={client.id} enabled={client.portal_enabled} hasCode={Boolean(client.private_code_hash)} portalUrl={portalUrl} />
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionHeading title="Contrats d’entretien" description="Les passages récurrents associés à ce client." compact />
            {can(ctx, "services.create") ? <Link href={`/app/services/new?kind=contract&client=${client.id}`} prefetch={false} className="btn-coral-soft min-h-11 px-3 py-2 text-xs">+ Nouveau contrat</Link> : null}
          </div>
          {maintenanceContracts.length === 0 ? (
            <EmptyLine>Aucun contrat d’entretien hebdomadaire.</EmptyLine>
          ) : (
            <ul className="divide-y divide-graphite-100">
              {maintenanceContracts.map((contract) => {
                const assignee = Array.isArray((contract as any).assignee) ? (contract as any).assignee[0] : (contract as any).assignee;
                const amount = amountByContract.get(contract.id);
                return (
                  <li key={contract.id}>
                    <Link href={`/app/services/contracts/${contract.id}`} prefetch={false} className="-mx-2 flex flex-col gap-3 rounded-xl px-2 py-4 transition hover:bg-graphite-50 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-graphite-900">{serviceTypeLabel(contract.service_type)} · chaque {weekdayLabel(contract.recurrence_weekday).toLocaleLowerCase("fr")}</p>
                        <p className="mt-1 text-sm text-graphite-500">{formatDate(contract.starts_on)}{contract.ends_on ? ` → ${formatDate(contract.ends_on)}` : " · sans date de fin"}</p>
                        {assignee ? <p className="mt-1 text-xs text-graphite-400">{[assignee.first_name, assignee.last_name].filter(Boolean).join(" ") || assignee.email}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                        {ctx.isAdmin && amount !== undefined ? <p className="text-sm font-semibold text-graphite-900">{formatMoneyCents(amount)} / mois</p> : null}
                        <Badge tone={contract.status}>{contract.status === "active" ? "Actif" : contract.status === "paused" ? "Suspendu" : "Terminé"}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionHeading title="Historique des entretiens" description={`${servicesRes.count ?? 0} entretien${(servicesRes.count ?? 0) > 1 ? "s" : ""} enregistré${(servicesRes.count ?? 0) > 1 ? "s" : ""}.`} compact />
            {can(ctx, "services.create") ? <Link href={`/app/services/new?kind=one_off&client=${client.id}`} prefetch={false} className="btn-secondary min-h-11 px-3 py-2 text-xs shadow-none">+ Entretien ponctuel</Link> : null}
          </div>
          {services.length === 0 ? (
            <EmptyLine>Aucun passage réalisé, commenté ou modifié.</EmptyLine>
          ) : (
            <ul className="divide-y divide-graphite-100 [content-visibility:auto]">
              {services.map((service) => (
                <li key={service.id}>
                  <Link href={`/app/services/${service.id}`} prefetch={false} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-graphite-50">
                    <time className="w-24 shrink-0 text-xs font-medium text-graphite-500 sm:w-32 sm:text-sm">{formatDate(service.scheduled_date)}</time>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-graphite-900">{serviceTypeLabel(service.service_type)}</p>
                      {(service.notes || service.report) ? <p className="mt-0.5 truncate text-xs text-graphite-400">{service.notes || service.report}</p> : null}
                    </div>
                    <Badge tone={service.status}>{SERVICE_STATUS_LABELS[service.status] ?? service.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {totalHistoryPages > 1 ? (
            <nav className="mt-5 flex items-center justify-between border-t border-graphite-100 pt-4" aria-label="Pagination de l’historique">
              {historyPage > 1 ? <Link href={`/app/clients/${client.id}?history=${historyPage - 1}`} className="btn-secondary min-h-11 px-3 py-2 text-xs shadow-none">← Plus récents</Link> : <span />}
              <span className="text-xs text-graphite-400">Page {historyPage} sur {totalHistoryPages}</span>
              {historyPage < totalHistoryPages ? <Link href={`/app/clients/${client.id}?history=${historyPage + 1}`} className="btn-secondary min-h-11 px-3 py-2 text-xs shadow-none">Plus anciens →</Link> : <span />}
            </nav>
          ) : null}
        </Card>

        {canViewDocs ? (
          <Card>
            <SectionHeading title="Documents" description="Contrats, factures et autres fichiers associés au client." />
            <div className="divide-y divide-graphite-100">
              <ClientFiles title="Contrats" category="contract" clientId={client.id} entries={contractDocs} canManage={canManageDocs} nameLabel="Nom du contrat" namePlaceholder="Ex : Contrat entretien annuel 2026" emptyLabel="Aucun contrat. Importez un document existant." />
              <ClientFiles title="Factures" category="invoice" clientId={client.id} entries={invoiceDocs} canManage={canManageDocs} nameLabel="Nom de la facture" namePlaceholder="Ex : Facture août 2026" emptyLabel="Aucune facture. Importez un document existant." />
              <ClientFiles title="Autres documents" category="other" clientId={client.id} entries={otherDocs} canManage={canManageDocs} emptyLabel="Aucun autre document." />
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mb-5"}>
      <h2 className="text-base font-semibold text-graphite-900">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-graphite-400">{description}</p>
    </div>
  );
}

function Info({ label, value, full, href }: { label: string; value?: string | null; full?: boolean; href?: string }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-graphite-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-graphite-800">
        {value ? (href ? <a href={href} className="font-medium text-graphite-900 hover:text-pool-700">{value}</a> : value) : "—"}
      </dd>
    </div>
  );
}

function SummaryItem({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-graphite-400">{label}</dt>
      <dd className={`mt-1 ${emphasized ? "text-lg font-semibold tracking-[-0.015em] text-graphite-900" : "text-sm font-semibold text-graphite-800"}`}>{value}</dd>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-graphite-100 bg-graphite-50/45 px-5 py-7 text-center text-sm text-graphite-400">{children}</p>;
}
