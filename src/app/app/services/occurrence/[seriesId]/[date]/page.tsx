import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { can, requirePermission } from "@/lib/auth/context";
import { getWeeklyOccurrenceDetail } from "@/lib/services/queries";
import { createClient } from "@/lib/supabase/server";
import { clientName, formatDate, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { ExceptionForm, GoThereButton, ReportForm, StatusActions } from "../../../[id]/ServiceControls";

export default async function WeeklyOccurrencePage({ params }: { params: { seriesId: string; date: string } }) {
  const ctx = await requirePermission("services.view");
  const supabase = createClient();
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
  const actionRef = { seriesId: params.seriesId, occurrenceDate: params.date };
  const address = [occurrence.client.address_line1, occurrence.client.postal_code, occurrence.client.city].filter(Boolean).join(", ");

  return (
    <div>
      <Link href={`/app/services?date=${params.date}`} className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes entretiens</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-graphite-900">{occurrence.serviceType}</h1>
            <Badge tone={occurrence.status}>{SERVICE_STATUS_LABELS[occurrence.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-graphite-500">Passage du {formatDate(occurrence.scheduledDate)} · prévu par le contrat</p>
        </div>
        <Link href={`/app/services/contracts/${params.seriesId}`} className="btn-secondary">Voir le contrat</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/app/clients/${occurrence.client.id}`} className="font-semibold text-graphite-900 hover:text-pool-700">{clientName(occurrence.client)}</Link>
                <p className="mt-1 text-sm text-graphite-500">{[occurrence.client.phone, address].filter(Boolean).join(" · ")}</p>
              </div>
              <GoThereButton address={address} lat={occurrence.client.latitude} lng={occurrence.client.longitude} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Compte-rendu du passage</h2>
            {canComplete ? (
              <ReportForm occurrence={actionRef} report={null} notes={null} />
            ) : (
              <p className="text-sm text-graphite-400">Aucun compte-rendu enregistré.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-graphite-900">Statut</h2>
            <StatusActions occurrence={actionRef} status={occurrence.status} canComplete={canComplete} canEdit={canEdit} />
          </Card>
          {canEdit && (
            <Card>
              <h2 className="mb-3 text-base font-semibold text-graphite-900">Exception de cette semaine</h2>
              <ExceptionForm occurrence={actionRef} scheduledDate={occurrence.scheduledDate} />
            </Card>
          )}
          <Card>
            <h2 className="mb-3 text-base font-semibold text-graphite-900">Détails</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-graphite-400">Technicien</dt>
                <dd className="mt-1 text-graphite-800">{occurrence.assignee ? <MemberIdentity member={occurrence.assignee} avatarSize={24} /> : "Non assigné"}</dd>
              </div>
              {occurrence.contractNotes && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Commentaire général du contrat</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-graphite-800">{occurrence.contractNotes}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
