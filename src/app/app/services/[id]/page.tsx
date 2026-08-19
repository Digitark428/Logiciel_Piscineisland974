import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { Card, Badge, Avatar } from "@/components/ui";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { StatusActions, TasksChecklist, ReportForm, GoThereButton } from "./ServiceControls";
import { clientName, formatDate, formatTime, formatDuration, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";
import type { ServiceTask } from "@/lib/db/types";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requirePermission("services.view");
  const supabase = createClient();

  const { data: service } = await supabase
    .from("services")
    .select("*, client:clients(*), pool:pools(*), assignee:memberships!services_assigned_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!service) notFound();

  // Un membre ne voit que ses prestations assignées.
  if (!ctx.isAdmin && service.assigned_membership_id !== ctx.membership.id && !can(ctx, "services.edit")) {
    notFound();
  }

  const [tasksRes, clientNotesRes, financialRes] = await Promise.all([
    supabase
      .from("service_tasks")
      .select("*")
      .eq("service_id", service.id)
      .eq("workspace_id", ctx.workspace.id)
      .order("position"),
    supabase
      .from("service_client_notes")
      .select("id, content, is_important, created_at")
      .eq("service_id", service.id)
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false }),
    ctx.isAdmin
      ? supabase
        .from("service_financials")
        .select("amount_cents")
        .eq("workspace_id", ctx.workspace.id)
        .eq(service.kind === "recurring" ? "service_series_id" : "service_id", service.kind === "recurring" ? service.series_id ?? "" : service.id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const tasks = tasksRes.data;
  const clientNotes = clientNotesRes.data;
  const financialAmountCents = financialRes.data?.amount_cents ?? null;

  const client = (service as any).client;
  const pool = (service as any).pool;
  const assignee = (service as any).assignee;

  // Documents liés (contrat / facture) — noms + URL signée de consultation.
  const linkedIds = [service.contract_document_id, service.invoice_document_id].filter(Boolean) as string[];
  let contractDoc: { name: string; url: string | null } | null = null;
  let invoiceDoc: { name: string; url: string | null } | null = null;
  if (linkedIds.length > 0) {
    const { data: linkedDocs } = await supabase
      .from("documents")
      .select("id, name, storage_path")
      .in("id", linkedIds)
      .eq("workspace_id", ctx.workspace.id);
    const byId = new Map((linkedDocs ?? []).map((d: any) => [d.id, d]));
    const cd = service.contract_document_id ? byId.get(service.contract_document_id) : null;
    const idoc = service.invoice_document_id ? byId.get(service.invoice_document_id) : null;
    if (cd) contractDoc = { name: cd.name, url: await signedUrl("documents", cd.storage_path) };
    if (idoc) invoiceDoc = { name: idoc.name, url: await signedUrl("documents", idoc.storage_path) };
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
            <h1 className="text-2xl font-bold tracking-tight text-graphite-900">{service.service_type ?? "Prestation"}</h1>
            <Badge tone={service.status}>{SERVICE_STATUS_LABELS[service.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-graphite-500">
            {formatDate(service.scheduled_date)}{service.scheduled_time ? ` à ${formatTime(service.scheduled_time)}` : ""} · {service.code}
          </p>
        </div>
        {canEdit && (
          <Link href={`/app/services/${service.id}/edit`} className="btn-secondary">Modifier</Link>
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
              <ReportForm serviceId={service.id} report={service.report} />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-graphite-700">{service.report || "—"}</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-graphite-900">Statut</h2>
            <StatusActions serviceId={service.id} status={service.status} canComplete={canComplete} />
            {service.completed_at && (
              <p className="mt-3 text-xs text-graphite-400">Terminée le {formatDate(service.completed_at)}</p>
            )}
          </Card>

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
                <dd className="mt-0.5 text-graphite-800">{service.kind === "recurring" ? "Récurrente" : "Unique"}</dd>
              </div>
              {service.duration_min && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Durée estimée</dt>
                  <dd className="mt-0.5 text-graphite-800">{formatDuration(service.duration_min)}</dd>
                </div>
              )}
              {service.notes && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-graphite-400">Commentaires</dt>
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
