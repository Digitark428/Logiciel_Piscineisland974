"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const num = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  client_id: z.string().uuid("Client requis."),
  name: z.string().min(1, "Nom requis."),
});

export async function upsertPool(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    client_id: formData.get("client_id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  const { id, client_id, name } = parsed.data;

  const payload = {
    client_id,
    name,
    pool_type: str(formData.get("pool_type")),
    volume_m3: num(formData.get("volume_m3")),
    length_m: num(formData.get("length_m")),
    width_m: num(formData.get("width_m")),
    depth_m: num(formData.get("depth_m")),
    water_treatment: str(formData.get("water_treatment")),
    technical_notes: str(formData.get("technical_notes")),
    address_line1: str(formData.get("address_line1")),
    postal_code: str(formData.get("postal_code")),
    city: str(formData.get("city")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    geo_label: str(formData.get("geo_label")),
    geo_precision: str(formData.get("geo_precision")),
  };

  const supabase = createClient();
  if (id) {
    const { error } = await supabase.from("pools").update(payload).eq("id", id).eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Enregistrement impossible.");
    await logActivity(ctx, { action: "update", entity_type: "pool", entity_id: id, summary: `Piscine modifiée: ${name}` });
    revalidatePath(`/app/pools/${id}`);
    return ok("Piscine enregistrée.");
  }
  const { data, error } = await supabase
    .from("pools")
    .insert({ ...payload, workspace_id: ctx.workspace.id })
    .select("id")
    .single();
  if (error || !data) return fail("Création impossible.");
  await logActivity(ctx, { action: "create", entity_type: "pool", entity_id: data.id, summary: `Nouvelle piscine: ${name}` });
  revalidatePath(`/app/clients/${client_id}`);
  redirect(`/app/pools/${data.id}`);
}

export async function deletePool(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("pools").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "pool", entity_id: id, summary: "Piscine supprimée" });
  revalidatePath("/app/pools");
  return ok("Piscine supprimée.");
}
