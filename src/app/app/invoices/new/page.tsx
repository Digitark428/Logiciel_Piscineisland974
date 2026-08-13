import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClientOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "./InvoiceForm";

export default async function NewInvoicePage() {
  const ctx = await requirePermission("invoices.manage");
  const supabase = createClient();
  const clients = await getClientOptions(supabase, ctx.workspace.id);

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspace.id)
    .gte("issue_date", `${year}-01-01`);
  const defaultNumber = `FAC-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/invoices" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Factures</Link>
      <PageHeader title="Nouvelle facture" />
      <InvoiceForm clients={clients} defaultNumber={defaultNumber} />
    </div>
  );
}
