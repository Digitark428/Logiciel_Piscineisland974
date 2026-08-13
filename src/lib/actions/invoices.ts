"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const num = (v: FormDataEntryValue, d = 0) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

export async function createInvoice(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  const client_id = String(formData.get("client_id") ?? "");
  const number = String(formData.get("number") ?? "").trim();
  if (!client_id) return fail("Client requis.");
  if (!number) return fail("Numéro de facture requis.");

  const labels = formData.getAll("line_label").map(String);
  const qtys = formData.getAll("line_qty");
  const prices = formData.getAll("line_price");

  const lines = labels
    .map((label, i) => ({ label: label.trim(), quantity: num(qtys[i] ?? "1", 1), unit_price: num(prices[i] ?? "0") }))
    .filter((l) => l.label);
  if (lines.length === 0) return fail("Ajoutez au moins une ligne.");

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const tax_rate = num(formData.get("tax_rate") ?? "20", 20);
  const tax_amount = Math.round(subtotal * tax_rate) / 100;
  const total = subtotal + tax_amount;

  const supabase = createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: ctx.workspace.id,
      client_id,
      number,
      issue_date: String(formData.get("issue_date") || new Date().toISOString().slice(0, 10)),
      due_date: String(formData.get("due_date") || "") || null,
      status: "draft",
      subtotal,
      tax_rate,
      tax_amount,
      total,
      notes: String(formData.get("notes") || "") || null,
    })
    .select("id")
    .single();
  if (error || !invoice) {
    return fail(error?.message.includes("duplicate") ? "Ce numéro de facture existe déjà." : "Création impossible.");
  }

  const lineRows = lines.map((l, i) => ({ ...l, workspace_id: ctx.workspace.id, invoice_id: invoice.id, position: i }));
  await supabase.from("invoice_lines").insert(lineRows);

  await logActivity(ctx, { action: "create", entity_type: "invoice", entity_id: invoice.id, summary: `Facture ${number}` });
  revalidatePath("/app/invoices");
  redirect(`/app/invoices/${invoice.id}`);
}

export async function setInvoiceStatus(id: string, status: "draft" | "sent" | "paid" | "cancelled"): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  await logActivity(ctx, { action: "update", entity_type: "invoice", entity_id: id, summary: `Facture ${status}` });
  revalidatePath(`/app/invoices/${id}`);
  revalidatePath("/app/invoices");
  return ok("Statut mis à jour.");
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  revalidatePath("/app/invoices");
  redirect("/app/invoices");
}
