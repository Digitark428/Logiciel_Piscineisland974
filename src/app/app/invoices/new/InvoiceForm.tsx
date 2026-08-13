"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createInvoice } from "@/lib/actions/invoices";
import { idle } from "@/lib/actions/result";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { formatMoney } from "@/lib/utils/format";

interface Opt { id: string; label: string }
interface Line { label: string; qty: string; price: string }

export function InvoiceForm({ clients, defaultNumber }: { clients: Opt[]; defaultNumber: string }) {
  const [state, formAction] = useFormState(createInvoice, idle);
  const [lines, setLines] = useState<Line[]>([{ label: "", qty: "1", price: "0" }]);
  const [taxRate, setTaxRate] = useState("20");

  const subtotal = lines.reduce((s, l) => s + (Number(l.qty.replace(",", ".")) || 0) * (Number(l.price.replace(",", ".")) || 0), 0);
  const tax = (subtotal * (Number(taxRate.replace(",", ".")) || 0)) / 100;
  const total = subtotal + tax;

  const update = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{state.message}</div>
      )}

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="client_id">Client *</label>
            <select id="client_id" name="client_id" required className="input">
              <option value="">Sélectionner…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="number">Numéro *</label>
            <input id="number" name="number" required className="input" defaultValue={defaultNumber} />
          </div>
          <div>
            <label className="label" htmlFor="tax_rate">TVA (%)</label>
            <input id="tax_rate" name="tax_rate" inputMode="decimal" className="input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="issue_date">Date d'émission</label>
            <input id="issue_date" name="issue_date" type="date" className="input" defaultValue={today} />
          </div>
          <div>
            <label className="label" htmlFor="due_date">Échéance</label>
            <input id="due_date" name="due_date" type="date" className="input" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-graphite-400">Lignes</h3>
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input name="line_label" placeholder="Désignation" className="input flex-1" value={l.label} onChange={(e) => update(i, "label", e.target.value)} />
              <input name="line_qty" inputMode="decimal" placeholder="Qté" className="input w-20" value={l.qty} onChange={(e) => update(i, "qty", e.target.value)} />
              <input name="line_price" inputMode="decimal" placeholder="P.U. €" className="input w-28" value={l.price} onChange={(e) => update(i, "price", e.target.value)} />
              <button type="button" className="btn-ghost px-3" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary mt-3" onClick={() => setLines((ls) => [...ls, { label: "", qty: "1", price: "0" }])}>+ Ajouter une ligne</button>

        <div className="mt-5 space-y-1 border-t border-graphite-100 pt-4 text-sm">
          <div className="flex justify-between"><span className="text-graphite-500">Sous-total</span><span className="font-medium">{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-graphite-500">TVA ({taxRate}%)</span><span className="font-medium">{formatMoney(tax)}</span></div>
          <div className="flex justify-between text-base font-bold text-graphite-900"><span>Total TTC</span><span>{formatMoney(total)}</span></div>
        </div>
      </div>

      <div className="card p-6">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} className="input" />
      </div>

      <div className="flex justify-end"><SubmitButton>Créer la facture</SubmitButton></div>
    </form>
  );
}
