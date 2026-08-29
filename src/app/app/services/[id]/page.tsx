import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { ServiceDetailItem, ServiceDetailSection, ServiceDetailView } from "@/components/services/ServiceDetailView";
import { ExceptionForm, StatusActions, TasksChecklist, ReportForm, GoThereButton } from "./ServiceControls";
import { clientName, formatDate, formatTime, formatDuration, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";
import type { ServiceTask } from "@/lib/db/types";
import { serviceTypeLabel } from "@/lib/services/constants";
import { serviceDetailEditAction } from "@/lib/services/detail";

export default async function ServiceDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await requirePermission("services.view");
  const supabase = await createClient();

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
    <ServiceDetailView
      backHref="/app/services"
      status={service.status}
      statusLabel={SERVICE_STATUS_LABELS[service.status]}
      meta={<>{formatDate(service.scheduled_date)}{service.scheduled_time ? ` à ${formatTime(service.scheduled_time)}` : ""} · {service.code}</>}
      editAction={serviceDetailEditAction({
        canEdit,
        serviceId: service.id,
        seriesId: service.series_id,
        weeklyContract: series?.recurrence_kind === "weekly_contract",
      })}
      client={{ id: client?.id, name: clientName(client ?? {}), phone: client?.phone, context: pool?.name }}
      navigation={<GoThereButton address={address} lat={geoLat} lng={geoLng} />}
      statusActions={<StatusActions occurrence={occurrence} status={service.status} canComplete={canComplete} canEdit={canEdit} />}
      accessInfo={canSensitive ? client?.access_info : null}
      intervention={(
        <div className="divide-y divide-graphite-100">
          <ServiceDetailSection title="Tâches d'entretien" description="Cochez les opérations réalisées pendant ce passage.">
            <TasksChecklist serviceId={service.id} tasks={(tasks ?? []) as ServiceTask[]} editable={canComplete} />
          </ServiceDetailSection>

          {(clientNotes ?? []).length > 0 && (
            <ServiceDetailSection title="Notes du client">
              <ul className="space-y-3">
                {(clientNotes ?? []).map((note: any) => (
                  <li key={note.id} className={`rounded-xl border px-4 py-3 ${note.is_important ? "border-coral-200 bg-coral-50" : "border-graphite-100 bg-graphite-50/60"}`}>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-graphite-400">
                      <span>Reçue le {formatDate(note.created_at)}</span>
                      {note.is_important && <span className="badge border-coral-200 bg-coral-100 text-coral-700">Information importante</span>}
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-graphite-800">{note.content}</p>
                  </li>
                ))}
              </ul>
            </ServiceDetailSection>
          )}

          <ServiceDetailSection title="Compte rendu du passage" description="La note décrit cette occurrence ; le compte rendu consigne le travail réalisé.">
            {canComplete ? (
              <ReportForm occurrence={occurrence} report={service.report} notes={service.notes} />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6 text-graphite-700">{service.report || "Aucun compte rendu enregistré."}</p>
            )}
          </ServiceDetailSection>
        </div>
      )}
      tracking={(
        <div className="divide-y divide-graphite-100">
          {canEdit && service.kind === "recurring" && service.occurrence_date && series?.recurrence_kind === "weekly_contract" && (
            <ServiceDetailSection title="Exception de cette semaine" description="Déplacez uniquement ce passage sans modifier le rythme du contrat.">
              <div className="max-w-md"><ExceptionForm occurrence={occurrence} scheduledDate={service.scheduled_date} /></div>
            </ServiceDetailSection>
          )}

          <ServiceDetailSection title="Contrat et documents">
            <dl className="grid gap-6 sm:grid-cols-2">
              {ctx.isAdmin && financialAmountCents !== null && (
                <ServiceDetailItem label={service.kind === "recurring" ? "Montant mensuel" : "Montant facturé"}>
                  <span className="font-semibold text-graphite-900">{formatMoneyCents(financialAmountCents)}{service.kind === "recurring" ? " / mois" : ""}</span>
                </ServiceDetailItem>
              )}
              {service.series_id && series?.recurrence_kind === "weekly_contract" && (
                <ServiceDetailItem label="Contrat d'entretien">
                  <Link href={`/app/services/contracts/${service.series_id}`} className="font-medium text-pool-700 hover:underline">Voir le contrat</Link>
                </ServiceDetailItem>
              )}
              <ServiceDetailItem label="Contrat lié">
                {contractDoc ? (
                  contractDoc.url ? <a href={contractDoc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-pool-700 hover:underline">{contractDoc.name}</a> : contractDoc.name
                ) : <span className="text-graphite-400">Aucun contrat associé</span>}
              </ServiceDetailItem>
              <ServiceDetailItem label="Facture liée">
                {invoiceDoc ? (
                  invoiceDoc.url ? <a href={invoiceDoc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-pool-700 hover:underline">{invoiceDoc.name}</a> : invoiceDoc.name
                ) : <span className="text-graphite-400">Aucune facture associée</span>}
              </ServiceDetailItem>
            </dl>
          </ServiceDetailSection>
        </div>
      )}
      details={(
        <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <ServiceDetailItem label="Assigné à">
            {assignee ? <MemberIdentity member={assignee} avatarSize={30} nameClassName="text-sm" /> : "Non assigné"}
          </ServiceDetailItem>
          <ServiceDetailItem label="Prestation">{serviceTypeLabel(service.service_type)}</ServiceDetailItem>
          <ServiceDetailItem label="Type">{service.kind === "recurring" ? "Passage récurrent" : "Entretien ponctuel"}</ServiceDetailItem>
          {service.duration_min && <ServiceDetailItem label="Durée estimée">{formatDuration(service.duration_min)}</ServiceDetailItem>}
          {service.completed_at && <ServiceDetailItem label="Clôture">Terminée le {formatDate(service.completed_at)}</ServiceDetailItem>}
          {series?.notes && <ServiceDetailItem label="Commentaire général du contrat" className="sm:col-span-2"><span className="whitespace-pre-wrap">{series.notes}</span></ServiceDetailItem>}
          {service.notes && !canComplete && <ServiceDetailItem label="Note propre à ce passage" className="sm:col-span-2"><span className="whitespace-pre-wrap">{service.notes}</span></ServiceDetailItem>}
        </dl>
      )}
    />
  );
}
