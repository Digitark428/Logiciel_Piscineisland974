import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { InvoiceControls } from "./InvoiceControls";
import { clientName, formatDate, formatMoney, INVOICE_STATUS_LABELS } from "@/lib/utils/format";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requirePermission("invoices.manage");
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, client:clients(*)")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: lines } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoice.id)
    .eq("workspace_id", ctx.workspace.id)
    .order("position");

  const client = (invoice as any).client;
  const w = ctx.workspace;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/app/invoices" className="text-sm text-graphite-500 hover:text-graphite-700">← Factures</Link>
        <Badge tone={invoice.status}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
      </div>
      <div className="mb-4"><InvoiceControls id={invoice.id} status={invoice.status} /></div>

      <Card className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-graphite-900">{w.name}</div>
            <div className="mt-1 text-sm text-graphite-500">
              {[w.address_line1, [w.postal_code, w.city].filter(Boolean).join(" ")].filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
              {w.siret && <div>SIRET : {w.siret}</div>}
              {w.vat_number && <div>TVA : {w.vat_number}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight text-graphite-900">FACTURE</div>
            <div className="font-mono text-sm text-graphite-600">{invoice.number}</div>
            <div className="mt-1 text-sm text-graphite-500">Émise le {formatDate(invoice.issue_date)}</div>
            {invoice.due_date && <div className="text-sm text-graphite-500">Échéance : {formatDate(invoice.due_date)}</div>}
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-graphite-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-graphite-400">Facturé à</div>
          <div className="mt-1 font-medium text-graphite-900">{clientName(client ?? {})}</div>
          <div className="text-sm text-graphite-500">
            {[client?.address_line1, [client?.postal_code, client?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-graphite-200 text-left text-graphite-400">
              <th className="pb-2 font-medium">Désignation</th>
              <th className="pb-2 text-right font-medium">Qté</th>
              <th className="pb-2 text-right font-medium">P.U.</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {(lines ?? []).map((l) => (
              <tr key={l.id} className="border-b border-graphite-100">
                <td className="py-2.5 text-graphite-800">{l.label}</td>
                <td className="py-2.5 text-right text-graphite-600">{l.quantity}</td>
                <td className="py-2.5 text-right text-graphite-600">{formatMoney(l.unit_price)}</td>
                <td className="py-2.5 text-right font-medium text-graphite-900">{formatMoney(l.quantity * l.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-graphite-500">Sous-total</span><span>{formatMoney(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-graphite-500">TVA ({invoice.tax_rate}%)</span><span>{formatMoney(invoice.tax_amount)}</span></div>
            <div className="flex justify-between border-t border-graphite-200 pt-2 text-base font-bold text-graphite-900"><span>Total TTC</span><span>{formatMoney(invoice.total)}</span></div>
          </div>
        </div>

        {invoice.notes && <div className="mt-8 text-sm text-graphite-500"><span className="font-medium text-graphite-700">Notes :</span> {invoice.notes}</div>}
      </Card>
    </div>
  );
}
