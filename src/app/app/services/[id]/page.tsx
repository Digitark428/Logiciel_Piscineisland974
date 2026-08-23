import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { Card, Badge, Avatar } from "@/components/ui";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { ExceptionForm, StatusActions, TasksChecklist, ReportForm, GoThereButton } from "./ServiceControls";
import { clientName, formatDate, formatTime, formatDuration, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";
import type { ServiceTask } from "@/lib/db/types";
import { serviceTypeLabel } from "@/lib/services/constants";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requirePermission("services.view");
  const supabase = createClient();

  const [serviceRes, tasksRes, clientNotesRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, code, service_type, occurrence_date, scheduled_date, scheduled_time, status, assigned_membership_id, kind, series_id, contract_document_id, invoice_document_id, report, completed_at, duration_min, notes, series:service_series(recurrence_kind,notes), client:clients(id,first_name,last_name,company_name,phone,address_line1,postal_code,city,latitude,longitude,access_info), pool:pools(name,address_line1,postal_code,city,latitude,longitude), assignee:memberships!services_assigned_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)")
      .eq("id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle(),
    supabase
      .from("service_tasks")
      .select("id, workspace_id, service_id, label, done, position, created_at")
      .eq("service_id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .order("position"),
    supabase
      .from("service_client_notes")
      .select("id, content, is_important, created_at")
      .eq("service_id", params.id)
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false }),
  ]);
  const service = serviceRes.data;
  if (!service) notFound();

  // Un membre ne voit que ses prestations assignées.
  if (!ctx.isAdmin && service.assigned_membership_id !== ctx.membership.id && !can(ctx, "services.edit")) {
    notFound();
  }

  const tasks = tasksRes.data;
  const clientNotes = clientNotesRes.data;

  const client = (service as any).client;
  const pool = (service as any).pool;
  const assignee = (service as any).assignee;
  const series = Array.isArray((service as any).series) ? (service as any).series[0] : (service as any).series;
  const occurrence = { serviceId: service.id, seriesId: service.series_id ?? undefined, occurrenceDate: service.occurrence_date ?? undefined };

  // Finance et documents ne dépendent que de la prestation principale : ils
  // partent ensemble dès qu'elle est connue, plutôt qu'en cascade.
  const linkedIds = [service.contract_document_id, service.invoice_document_id].filter(Boolean) as string[];
  const [financialRes, linkedDocsRes] = await Promise.all([
    ctx.isAdmin
      ? supabase
        .from("service_financials")
        .select("amount_cents")
        .eq("workspace_id", ctx.workspace.id)
        .eq(service.kind === "recurring" ? "service_series_id" : "service_id", service.kind === "recurring" ? service.series_id ?? "" : service.id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    linkedIds.length > 0
      ? supabase
        .from("documents")
        .select("id, name, storage_path")
        .in("id", linkedIds)
        .eq("workspace_id", ctx.workspace.id)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const financialAmountCents = financialRes.data?.amount_cents ?? null;

  // Documents liés (contrat / facture) — noms + URLs signées en un seul lot.
  let contractDoc: { name: string; url: string | null } | null = null;
  let invoiceDoc: { name: string; url: string | null } | null = null;
  if (linkedIds.length > 0) {
    const linkedDocs = linkedDocsRes.data;
    const byId = new Map((linkedDocs ?? []).map((d: any) => [d.id, d]));
    const urlByPath = await signedUrls("documents", (linkedDocs ?? []).map((document: any) => document.storage_path));
    const cd = service.contract_document_id ? byId.get(service.contract_document_id) : null;
    const idoc = service.invoice_document_id ? byId.get(service.invoice_document_id) : null;
    if (cd) contractDoc = { name: cd.name, url: urlByPath.get(cd.storage_path) ?? null };
    if (idoc) invoiceDoc = { name: idoc.name, url: urlByPath.get(idoc.storage_path) ?? null };
  }

  const address =
    [pool?.address_line1, pool?.postal_code, pool?.city].filter(Boolean).join(", ") ||
    [client?.address_line1, client?.postal_code, client?.city].filter(Boolean).join(", ");
  // Coordonnées GPS : piscine en priorité, sinon client (renseignées via l'autocomplétion).
  const geoLat = pool?.latitude ?? client?.latitude ?? null;
  const geoLng = pool?.longitude ?? client?.longitude ?? null;

  const canComplete = can(ctx, "services.complete") || can(ctx, "services.edit");
  const canEdit = can(ctx, "services.edit");
  const canSensitive = can(ctx, "sensitive.view");

  return (
    <div>
      <Link href="/app/services" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes entretiens</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-graphite-900">{serviceTypeLabel(service.service_type)}</h1>
            <Badge tone={service.status}>{SERVICE_STATUS_LABELS[service.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-graphite-500">
            {formatDate(service.scheduled_date)}{service.scheduled_time ? ` à ${formatTime(service.scheduled_time)}` : ""} · {service.code}
          </p>
        </div>
        {canEdit && (
          <Link href={series?.recurrence_kind === "weekly_contract" ? `/app/services/contracts/${service.series_id}` : `/app/services/${service.id}/edit`} className="btn-secondary">
            {series?.recurrence_kind === "weekly_contract" ? "Modifier le contrat" : "Modifier"}
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={clientName(client ?? {})} size={44} />
                <div>
                  <Link href={`/app/clients/${client?.id}`} className="font-semibold text-graphite-900 hover:text-pool-700">{clientName(client ?? {})}</Link>
                  <div className="text-sm text-graphite-500">{[client?.phone, pool?.name].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
              <GoThereButton address={address} lat={geoLat} lng={geoLng} />
            </div>
            {canSensitive && client?.access_info && (
              <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span className="font-medium">Accès :</span> {client.access_info}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Tâches d'entretien</h2>
            <TasksChecklist serviceId={service.id} tasks={(tasks ?? []) as ServiceTask[]} editable={canComplete} />
          </Card>

          {(clientNotes ?? []).length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-graphite-900">Notes du client</h2>
              <ul className="space-y-3">
                {(clientNotes ?? []).map((n: any) => (
                  <li key={n.id} className={`rounded-lg p-3 ${n.is_important ? "bg-amber-50 ring-1 ring-amber-200" : "bg-graphite-50"}`}>
                    <div className="flex items-center gap-2 text-xs text-graphite-400">
                      <span>Note du client — {formatDate(n.created_at)}</span>
                      {n.is_important && <span className="badge bg-amber-100 text-amber-800">Information importante</span>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-graphite-800">{n.content}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Compte-rendu</h2>
            {canComplete ? (
              <ReportForm occurrence={occurrence} report={service.report} notes={service.notes} />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-graphite-700">{service.report || "—"}</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-graphite-900">Statut</h2>
            <StatusActions occurrence={occurrence} status={service.status} canComplete={canComplete} canEdit={canEdit} />
            {service.completed_at && (
              <p className="mt-3 text-xs text-graphite-400">Terminée le {formatDate(service.completed_at)}</p>
            )}
          </Card>

          {canEdit && service.kind === "recurring" && service.occurrence_date && series?.recurrence_kind === "weekly_contract" && (
            <Card>
              <h2 className="mb-3 text-base font-semibold text-graphite-900">Exception de cette semaine</h2>
              <ExceptionForm occurrence={occurrence} scheduledDate={service.scheduled_date} />
            </Card>
          )}

          <Card>
            <h2 className="mb-3 text-base font-semibold text-graphite-900">Suivi</h2>
            <dl className="space-y-3 text-sm">
              {ctx.isAdmin && financialAmountCents !== null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">{service.kind === "recurring" ? "Contrat" : "Montant facturé"}</dt>
                  <dd className="mt-0.5 font-semibold text-graphite-900">{formatMoneyCents(financialAmountCents)}{service.kind === "recurring" ? " / mois" : ""}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-graphite-400">Contrat lié</dt>
                <dd className="mt-0.5 text-graphite-800">
                  {contractDoc ? (
                    contractDoc.url ? (
                      <a href={contractDoc.url} target="_blank" rel="noopener noreferrer" className="text-pool-700 hover:underline">{contractDoc.name}</a>
                    ) : contractDoc.name
                  ) : (
                    <span className="text-graphite-400">Aucun contrat associé</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-graphite-400">Facture liée</dt>
                <dd className="mt-0.5 text-graphite-800">
                  {invoiceDoc ? (
                    invoiceDoc.url ? (
                      <a href={invoiceDoc.url} target="_blank" rel="noopener noreferrer" className="text-pool-700 hover:underline">{invoiceDoc.name}</a>
                    ) : invoiceDoc.name
                  ) : (
                    <span className="text-graphite-400">Aucune facture associée</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold text-graphite-900">Détails</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-graphite-400">Assigné à</dt>
                <dd className="mt-0.5 flex items-center gap-2 text-graphite-800">
                  {assignee ? <MemberIdentity member={assignee} avatarSize={24} nameClassName="text-sm" /> : "Non assigné"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-graphite-400">Type</dt>
                <dd className="mt-0.5 text-graphite-800">{service.kind === "recurring" ? "Passage récurrent" : "Entretien ponctuel"}</dd>
              </div>
              {service.series_id && series?.recurrence_kind === "weekly_contract" && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Contrat d'entretien</dt>
                  <dd className="mt-0.5"><Link href={`/app/services/contracts/${service.series_id}`} className="text-pool-700 hover:underline">Voir le contrat</Link></dd>
                </div>
              )}
              {service.duration_min && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Durée estimée</dt>
                  <dd className="mt-0.5 text-graphite-800">{formatDuration(service.duration_min)}</dd>
                </div>
              )}
              {series?.notes && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Commentaire général du contrat</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-graphite-800">{series.notes}</dd>
                </div>
              )}
              {service.notes && !canComplete && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Commentaire de ce passage</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-graphite-800">{service.notes}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
