import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getPoolOptions, getMemberOptions, getClientDocumentOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { ServiceEditForm } from "./ServiceEditForm";
import type { Service } from "@/lib/db/types";

export default async function EditServicePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await requirePermission("services.edit");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!service) notFound();
  if (service.series_id) {
    const { data: series } = await supabase
      .from("service_series")
      .select("recurrence_kind")
      .eq("id", service.series_id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    if (series?.recurrence_kind === "weekly_contract") redirect(`/app/services/contracts/${service.series_id}`);
  }

  const [pools, members, documents] = await Promise.all([
    getPoolOptions(supabase, ctx.workspace.id),
    getMemberOptions(supabase, ctx.workspace.id),
    getClientDocumentOptions(supabase, ctx.workspace.id),
  ]);
  const clientDocuments = documents.filter((d) => d.client_id === service.client_id);
  const financialResult = ctx.isAdmin
    ? await supabase
      .from("service_financials")
      .select("amount_cents")
      .eq("workspace_id", ctx.workspace.id)
      .eq(service.kind === "recurring" ? "service_series_id" : "service_id", service.kind === "recurring" ? service.series_id ?? "" : service.id)
      .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/services/${params.id}`} className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Entretien</Link>
      <PageHeader title="Modifier l'entretien" />
      <ServiceEditForm service={service as Service} members={members} pools={pools} documents={clientDocuments} isAdmin={ctx.isAdmin} financialAmountCents={financialResult.data?.amount_cents ?? null} />
    </div>
  );
}
