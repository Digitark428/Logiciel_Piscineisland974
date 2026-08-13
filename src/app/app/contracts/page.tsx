import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { clientName, formatDate, formatMoney } from "@/lib/utils/format";

export default async function ContractsPage() {
  const ctx = await requirePermission("contracts.manage");
  const supabase = createClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, reference, status, amount, start_date, end_date, client:clients(first_name,last_name,company_name)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Contrats" action={<Link href="/app/contracts/new" className="btn-primary">+ Nouveau contrat</Link>} />
      {!contracts || contracts.length === 0 ? (
        <EmptyState title="Aucun contrat" action={<Link href="/app/contracts/new" className="btn-primary">+ Nouveau contrat</Link>} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-graphite-100">
            {contracts.map((c: any) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-graphite-900">{c.title}</div>
                  <div className="truncate text-sm text-graphite-500">{clientName(c.client ?? {})} {c.reference ? `· ${c.reference}` : ""}</div>
                </div>
                <div className="hidden text-sm text-graphite-400 sm:block">{c.end_date ? `→ ${formatDate(c.end_date)}` : ""}</div>
                {c.amount != null && <div className="w-24 text-right font-semibold text-graphite-900">{formatMoney(c.amount)}</div>}
                <Badge tone={c.status}>{c.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
