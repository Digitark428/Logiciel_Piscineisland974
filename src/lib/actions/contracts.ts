"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

export async function createContract(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const client_id = String(formData.get("client_id") ?? "");
  const title = str(formData.get("title"));
  if (!client_id) return fail("Client requis.");
  if (!title) return fail("Titre requis.");

  const amountRaw = str(formData.get("amount"));
  const supabase = createClient();
  const { error } = await supabase.from("contracts").insert({
    workspace_id: ctx.workspace.id,
    client_id,
    title,
    reference: str(formData.get("reference")),
    start_date: str(formData.get("start_date")),
    end_date: str(formData.get("end_date")),
    amount: amountRaw ? Number(amountRaw.replace(",", ".")) : null,
    notes: str(formData.get("notes")),
    status: "active",
  });
  if (error) return fail("Création impossible.");
  await logActivity(ctx, { action: "create", entity_type: "contract", summary: `Contrat : ${title}` });
  revalidatePath("/app/contracts");
  redirect("/app/contracts");
}

export async function setContractStatus(id: string, status: "draft" | "active" | "archived"): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("contracts").update({ status }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  revalidatePath("/app/contracts");
  return ok("Contrat mis à jour.");
}
