import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { can, requirePermission } from "@/lib/auth/context";
import { getClientDocumentOptions, getMemberOptions } from "@/lib/db/queries";
import { serviceTypeLabel, weekdayLabel } from "@/lib/services/constants";
import { createClient } from "@/lib/supabase/server";
import { clientName, formatDate, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { formatMoneyCents } from "@/lib/utils/money";
import { ContractEditForm } from "./ContractEditForm";
import { signedUrls } from "@/lib/storage";

const CONTRACT_STATUS_LABELS: Record<string, string> = { active: "Actif", paused: "Suspendu", ended: "Terminé" };

export default async function MaintenanceContractPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await requirePermission("services.view");
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("service_series")
    .select("id,client_id,service_type,assigned_membership_id,contract_document_id,invoice_document_id,recurrence_kind,recurrence_weekday,starts_on,ends_on,status,notes,client:clients(id,first_name,last_name,company_name,phone,address_line1,postal_code,city),assignee:memberships!service_series_assigned_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!contract || contract.recurrence_kind !== "weekly_contract") notFound();
  if (!ctx.isAdmin && !can(ctx, "services.edit") && contract.assigned_membership_id !== ctx.membership.id) notFound();

  const canEdit = can(ctx, "services.edit");
  const linkedDocumentIds = [contract.contract_document_id, contract.invoice_document_id].filter((id): id is string => Boolean(id));
  const [historyResult, financialResult, members, documents, linkedDocumentsResult] = await Promise.all([
    supabase
      .from("services")
      .select("id,occurrence_date,scheduled_date,status,notes,report,completed_at")
      .eq("workspace_id", ctx.workspace.id)
      .eq("series_id", contract.id)
      .order("occurrence_date", { ascending: false })
      .limit(100),
    ctx.isAdmin
      ? supabase.from("service_financials").select("amount_cents").eq("workspace_id", ctx.workspace.id).eq("service_series_id", contract.id).maybeSingle()
      : Promise.resolve({ data: null }),
    canEdit ? getMemberOptions(supabase, ctx.workspace.id) : Promise.resolve([]),
    canEdit ? getClientDocumentOptions(supabase, ctx.workspace.id) : Promise.resolve([]),
    can(ctx, "documents.view") && linkedDocumentIds.length > 0
      ? supabase.from("documents").select("id,name,storage_path,category").eq("workspace_id", ctx.workspace.id).in("id", linkedDocumentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; storage_path: string; category: string }> }),
  ]);
  const client = Array.isArray((contract as any).client) ? (contract as any).client[0] : (contract as any).client;
  const assignee = Array.isArray((contract as any).assignee) ? (contract as any).assignee[0] : (contract as any).assignee;
  const amountCents = financialResult.data?.amount_cents ?? null;
  const history = historyResult.data ?? [];
  const linkedDocuments = linkedDocumentsResult.data ?? [];
  const linkedUrls = await signedUrls("documents", linkedDocuments.map((document) => document.storage_path));

  return (
    <div>
      <Link href="/app/services" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes entretiens</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-graphite-900">Contrat d'entretien</h1>
            <Badge tone={contract.status}>{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-graphite-500">{serviceTypeLabel(contract.service_type)} · chaque {weekdayLabel(contract.recurrence_weekday).toLocaleLowerCase("fr")}</p>
        </div>
        <Link href={`/app/clients/${client?.id}`} className="btn-secondary">Voir la fiche client</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Contrat</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-graphite-400">Client</dt><dd className="mt-1 font-semibold text-graphite-900">{clientName(client ?? {})}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-graphite-400">Technicien</dt><dd className="mt-1 text-graphite-800">{assignee ? <MemberIdentity member={assignee} avatarSize={24} /> : "Non assigné"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-graphite-400">Jour hebdomadaire</dt><dd className="mt-1 text-graphite-800">{weekdayLabel(contract.recurrence_weekday)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-graphite-400">Période</dt><dd className="mt-1 text-graphite-800">Du {formatDate(contract.starts_on)}{contract.ends_on ? ` au ${formatDate(contract.ends_on)}` : " · sans date de fin"}</dd></div>
              {ctx.isAdmin && amountCents !== null && <div><dt className="text-xs uppercase tracking-wide text-graphite-400">Montant mensuel</dt><dd className="mt-1 font-semibold text-graphite-900">{formatMoneyCents(amountCents)} / mois</dd></div>}
              {linkedDocuments.map((document) => {
                const url = linkedUrls.get(document.storage_path);
                return <div key={document.id}><dt className="text-xs uppercase tracking-wide text-graphite-400">{document.category === "invoice" ? "Facture liée" : "Contrat lié"}</dt><dd className="mt-1 text-graphite-800">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-pool-700 hover:underline">{document.name}</a> : document.name}</dd></div>;
              })}
              {contract.notes && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-graphite-400">Commentaire général</dt><dd className="mt-1 whitespace-pre-wrap text-graphite-800">{contract.notes}</dd></div>}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Historique des passages enregistrés</h2>
            {history.length === 0 ? (
              <p className="text-sm text-graphite-400">Aucun passage n'a encore été modifié ou réalisé. Les passages futurs restent calculés automatiquement.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {history.map((item) => (
                  <li key={item.id}>
                    <Link href={`/app/services/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-pool-700">
                      <div>
                        <div className="font-medium text-graphite-900">{formatDate(item.scheduled_date)}</div>
                        {item.occurrence_date && item.occurrence_date !== item.scheduled_date && <div className="text-xs text-graphite-400">Initialement prévu le {formatDate(item.occurrence_date)}</div>}
                        {(item.notes || item.report) && <div className="mt-1 line-clamp-1 text-xs text-graphite-500">{item.notes || item.report}</div>}
                      </div>
                      <Badge tone={item.status}>{SERVICE_STATUS_LABELS[item.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-base font-semibold text-graphite-900">Prochaines semaines</h2>
            <Link href="/app/services" className="btn-primary w-full justify-center">Voir le planning hebdomadaire</Link>
          </Card>
          {canEdit && (
            <Card>
              <h2 className="mb-4 text-base font-semibold text-graphite-900">Modifier le contrat</h2>
              <ContractEditForm
                contract={{ ...contract, recurrence_weekday: contract.recurrence_weekday! }}
                members={members}
                documents={documents}
                amount={amountCents === null ? "" : (amountCents / 100).toFixed(2).replace(".", ",")}
                isAdmin={ctx.isAdmin}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
