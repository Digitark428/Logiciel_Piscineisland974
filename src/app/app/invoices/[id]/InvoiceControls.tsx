"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setInvoiceStatus, deleteInvoice } from "@/lib/actions/invoices";

export function InvoiceControls({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button className="btn-secondary" onClick={() => window.print()}>Imprimer / PDF</button>
      {status !== "sent" && status !== "paid" && (
        <button disabled={pending} className="btn-primary" onClick={() => start(async () => { await setInvoiceStatus(id, "sent"); router.refresh(); })}>Marquer envoyée</button>
      )}
      {status !== "paid" && (
        <button disabled={pending} className="btn-primary bg-emerald-600 hover:bg-emerald-700" onClick={() => start(async () => { await setInvoiceStatus(id, "paid"); router.refresh(); })}>Marquer payée</button>
      )}
      <button disabled={pending} className="btn-ghost text-red-600" onClick={() => start(async () => { if (confirm("Supprimer cette facture ?")) { await deleteInvoice(id); router.push("/app/invoices"); } })}>Supprimer</button>
    </div>
  );
}
