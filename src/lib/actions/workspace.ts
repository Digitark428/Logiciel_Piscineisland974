"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

export async function updateWorkspace(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");

  const name = z.string().min(2, "Nom requis.").safeParse(formData.get("name"));
  if (!name.success) return fail(name.error.issues[0].message);

  const supabase = createClient();
  const settings = {
    ...(ctx.workspace.settings ?? {}),
    portal_share_assignee_phone: formData.get("portal_share_assignee_phone") === "on",
  };
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: name.data,
      address_line1: str(formData.get("address_line1")),
      postal_code: str(formData.get("postal_code")),
      city: str(formData.get("city")),
      phone: str(formData.get("phone")),
      email: str(formData.get("email")),
      siret: str(formData.get("siret")),
      vat_number: str(formData.get("vat_number")),
      legal_form: str(formData.get("legal_form")),
      settings,
    })
    .eq("id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "update", entity_type: "workspace", entity_id: ctx.workspace.id, summary: "Paramètres de l'entreprise modifiés" });
  revalidatePath("/app/settings");
  return ok("Paramètres enregistrés.");
}
