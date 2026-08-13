import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { clientName, formatDate, formatMoney, INVOICE_STATUS_LABELS } from "@/lib/utils/format";

export default async function InvoicesPage() {
  const ctx = await requirePermission("invoices.manage");
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, status, total, issue_date, client:clients(first_name,last_name,company_name)")
    .eq("workspace_id", ctx.workspace.id)
    .order("issue_date", { ascending: false });

  return (
    <div>
      <PageHeader title="Factures" action={<Link href="/app/invoices/new" className="btn-primary">+ Nouvelle facture</Link>} />
      {!invoices || invoices.length === 0 ? (
        <EmptyState title="Aucune facture" description="Créez votre première facture." action={<Link href="/app/invoices/new" className="btn-primary">+ Nouvelle facture</Link>} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-graphite-100">
            {invoices.map((i: any) => (
              <li key={i.id}>
                <Link href={`/app/invoices/${i.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-graphite-50 sm:px-6">
                  <div className="w-32 font-mono text-sm font-semibold text-graphite-800">{i.number}</div>
                  <div className="min-w-0 flex-1 truncate text-graphite-700">{clientName(i.client ?? {})}</div>
                  <div className="hidden text-sm text-graphite-400 sm:block">{formatDate(i.issue_date)}</div>
                  <div className="w-24 text-right font-semibold text-graphite-900">{formatMoney(i.total)}</div>
                  <Badge tone={i.status}>{INVOICE_STATUS_LABELS[i.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
