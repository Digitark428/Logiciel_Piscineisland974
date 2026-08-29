import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { ServiceDetailItem, ServiceDetailSection, ServiceDetailView } from "@/components/services/ServiceDetailView";
import { can, requirePermission } from "@/lib/auth/context";
import { serviceDetailEditAction } from "@/lib/services/detail";
import { getWeeklyOccurrenceDetail } from "@/lib/services/queries";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { clientName, formatDate, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";
import { ExceptionForm, GoThereButton, ReportForm, StatusActions } from "../../../[id]/ServiceControls";

export default async function WeeklyOccurrencePage({ params: paramsPromise }: { params: Promise<{ seriesId: string; date: string }> }) {
  const params = await paramsPromise;
  const ctx = await requirePermission("services.view");
  const supabase = await createClient();
  const occurrence = await getWeeklyOccurrenceDetail(supabase, {
    workspaceId: ctx.workspace.id,
    seriesId: params.seriesId,
    occurrenceDate: params.date,
  });
  if (!occurrence) notFound();
  if (occurrence.id) redirect(`/app/services/${occurrence.id}`);
  if (!ctx.isAdmin && !can(ctx, "services.edit") && occurrence.assignedMembershipId !== ctx.membership.id) notFound();

  const canEdit = can(ctx, "services.edit");
  const canComplete = canEdit || can(ctx, "services.complete");
  const canSensitive = can(ctx, "sensitive.view");
  const actionRef = { seriesId: params.seriesId, occurrenceDate: params.date };
  const address = [occurrence.client.address_line1, occurrence.client.postal_code, occurrence.client.city].filter(Boolean).join(", ");
  const linkedIds = [occurrence.contractDocumentId, occurrence.invoiceDocumentId].filter(Boolean) as string[];

  const [financialResult, linkedDocumentsResult] = await Promise.all([
    ctx.isAdmin
      ? supabase.from("service_financials").select("amount_cents").eq("workspace_id", ctx.workspace.id).eq("service_series_id", params.seriesId).maybeSingle()
      : Promise.resolve({ data: null }),
    linkedIds.length > 0
      ? supabase.from("documents").select("id,name,storage_path").eq("workspace_id", ctx.workspace.id).in("id", linkedIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; storage_path: string }> }),
  ]);

  const linkedDocuments = linkedDocumentsResult.data ?? [];
  const linkedUrls = await signedUrls("documents", linkedDocuments.map((document) => document.storage_path));
  const documentsById = new Map(linkedDocuments.map((document) => [document.id, document]));
  const contractDocument = occurrence.contractDocumentId ? documentsById.get(occurrence.contractDocumentId) : null;
  const invoiceDocument = occurrence.invoiceDocumentId ? documentsById.get(occurrence.invoiceDocumentId) : null;

  return (
    <ServiceDetailView
      backHref={`/app/services?date=${params.date}`}
      status={occurrence.status}
      statusLabel={SERVICE_STATUS_LABELS[occurrence.status]}
      meta={<>Passage du {formatDate(occurrence.scheduledDate)} · {occurrence.code ?? "prévu par le contrat"}</>}
      editAction={serviceDetailEditAction({ canEdit, seriesId: params.seriesId, weeklyContract: true })}
      client={{ id: occurrence.client.id, name: clientName(occurrence.client), phone: occurrence.client.phone, context: address }}
      navigation={<GoThereButton address={address} lat={occurrence.client.latitude} lng={occurrence.client.longitude} />}
      statusActions={<StatusActions occurrence={actionRef} status={occurrence.status} canComplete={canComplete} canEdit={canEdit} />}
      accessInfo={canSensitive ? occurrence.client.access_info : null}
      intervention={(
        <ServiceDetailSection
          title="Compte rendu du passage"
          description="La note décrit cette occurrence ; le compte rendu consigne le travail réalisé."
        >
          {canComplete ? (
            <ReportForm occurrence={actionRef} report={null} notes={null} />
          ) : (
            <p className="text-sm text-graphite-400">Aucun compte rendu enregistré.</p>
          )}
        </ServiceDetailSection>
      )}
      tracking={(
        <div className="divide-y divide-graphite-100">
          {canEdit && (
            <ServiceDetailSection title="Exception de cette semaine" description="Déplacez uniquement ce passage sans modifier le rythme du contrat.">
              <div className="max-w-md"><ExceptionForm occurrence={actionRef} scheduledDate={occurrence.scheduledDate} /></div>
            </ServiceDetailSection>
          )}
          <ServiceDetailSection title="Contrat et documents">
            <dl className="grid gap-6 sm:grid-cols-2">
              {ctx.isAdmin && financialResult.data?.amount_cents != null && (
                <ServiceDetailItem label="Montant mensuel">
                  <span className="font-semibold text-graphite-900">{formatMoneyCents(financialResult.data.amount_cents)} / mois</span>
                </ServiceDetailItem>
              )}
              <ServiceDetailItem label="Contrat d'entretien">
                <Link href={`/app/services/contracts/${params.seriesId}`} className="font-medium text-pool-700 hover:underline">Voir le contrat</Link>
              </ServiceDetailItem>
              <ServiceDetailItem label="Contrat lié">
                {contractDocument ? (
                  linkedUrls.get(contractDocument.storage_path) ? (
                    <a href={linkedUrls.get(contractDocument.storage_path)!} target="_blank" rel="noopener noreferrer" className="font-medium text-pool-700 hover:underline">{contractDocument.name}</a>
                  ) : contractDocument.name
                ) : <span className="text-graphite-400">Aucun contrat associé</span>}
              </ServiceDetailItem>
              <ServiceDetailItem label="Facture liée">
                {invoiceDocument ? (
                  linkedUrls.get(invoiceDocument.storage_path) ? (
                    <a href={linkedUrls.get(invoiceDocument.storage_path)!} target="_blank" rel="noopener noreferrer" className="font-medium text-pool-700 hover:underline">{invoiceDocument.name}</a>
                  ) : invoiceDocument.name
                ) : <span className="text-graphite-400">Aucune facture associée</span>}
              </ServiceDetailItem>
            </dl>
          </ServiceDetailSection>
        </div>
      )}
      details={(
        <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <ServiceDetailItem label="Assigné à">
            {occurrence.assignee ? <MemberIdentity member={occurrence.assignee} avatarSize={30} nameClassName="text-sm" /> : "Non assigné"}
          </ServiceDetailItem>
          <ServiceDetailItem label="Prestation">{occurrence.serviceType}</ServiceDetailItem>
          <ServiceDetailItem label="Type">Passage récurrent</ServiceDetailItem>
          {occurrence.contractNotes && (
            <ServiceDetailItem label="Commentaire général du contrat" className="sm:col-span-2">
              <span className="whitespace-pre-wrap">{occurrence.contractNotes}</span>
            </ServiceDetailItem>
          )}
        </dl>
      )}
    />
  );
}
