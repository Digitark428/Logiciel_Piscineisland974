"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { generatePortalToken, hashPrivateCode } from "@/lib/utils/codes";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide.").optional().or(z.literal("")),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  access_info: z.string().optional(),
  notes: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geo_label: z.string().optional(),
  geo_precision: z.string().optional(),
});

function s(v: FormDataEntryValue | null): string | undefined {
  const t = (v as string | null)?.trim();
  return t ? t : undefined;
}

function coord(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function upsertClient(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    first_name: s(formData.get("first_name")),
    last_name: s(formData.get("last_name")),
    company_name: s(formData.get("company_name")),
    phone: s(formData.get("phone")),
    email: formData.get("email") ?? "",
    address_line1: s(formData.get("address_line1")),
    address_line2: s(formData.get("address_line2")),
    postal_code: s(formData.get("postal_code")),
    city: s(formData.get("city")),
    access_info: s(formData.get("access_info")),
    notes: s(formData.get("notes")),
    latitude: s(formData.get("latitude")),
    longitude: s(formData.get("longitude")),
    geo_label: s(formData.get("geo_label")),
    geo_precision: s(formData.get("geo_precision")),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  const v = parsed.data;

  if (!v.first_name && !v.last_name && !v.company_name) {
    return fail("Renseignez au moins un nom (personne ou entreprise).");
  }

  const supabase = createClient();
  const payload = {
    first_name: v.first_name ?? null,
    last_name: v.last_name ?? null,
    company_name: v.company_name ?? null,
    phone: v.phone ?? null,
    email: v.email || null,
    address_line1: v.address_line1 ?? null,
    address_line2: v.address_line2 ?? null,
    postal_code: v.postal_code ?? null,
    city: v.city ?? null,
    access_info: v.access_info ?? null,
    notes: v.notes ?? null,
    latitude: coord(v.latitude),
    longitude: coord(v.longitude),
    geo_label: v.geo_label ?? null,
    geo_precision: v.geo_precision ?? null,
  };

  if (v.id) {
    const { error } = await supabase.from("clients").update(payload).eq("id", v.id).eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Enregistrement impossible (droits insuffisants ?).");
    await logActivity(ctx, { action: "update", entity_type: "client", entity_id: v.id, summary: `Client modifié` });
    revalidatePath(`/app/clients/${v.id}`);
    return ok("Client enregistré.");
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...payload, workspace_id: ctx.workspace.id })
    .select("id")
    .single();
  if (error || !data) return fail("Création impossible (droits insuffisants ?).");
  await logActivity(ctx, { action: "create", entity_type: "client", entity_id: data.id, summary: "Nouveau client" });
  revalidatePath("/app/clients");
  redirect(`/app/clients/${data.id}`);
}

export async function archiveClient(id: string, archived: boolean): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ status: archived ? "archived" : "active" })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  await logActivity(ctx, { action: "update", entity_type: "client", entity_id: id, summary: archived ? "Client archivé" : "Client réactivé" });
  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${id}`);
  return ok(archived ? "Client archivé." : "Client réactivé.");
}

/** Définit / réinitialise le code privé et le lien portail du client. */
export async function setClientPortal(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const clientId = String(formData.get("clientId") ?? "");
  const enabled = formData.get("enabled") === "on";
  const code = String(formData.get("private_code") ?? "").trim();
  if (!clientId) return fail("Client introuvable.");

  const supabase = createClient();
  const update: Record<string, unknown> = { portal_enabled: enabled };

  if (enabled) {
    // Génère un token si absent.
    const { data: existing } = await supabase
      .from("clients")
      .select("portal_token")
      .eq("id", clientId)
      .eq("workspace_id", ctx.workspace.id)
      .single();
    if (!existing?.portal_token) update.portal_token = generatePortalToken();
    if (code) {
      if (code.length < 4) return fail("Le code privé doit contenir au moins 4 caractères.");
      update.private_code_hash = hashPrivateCode(code);
      update.private_code_set_at = new Date().toISOString();
    }
  }

  const { error } = await supabase.from("clients").update(update).eq("id", clientId).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "update", entity_type: "client", entity_id: clientId, summary: "Accès portail client mis à jour" });
  revalidatePath(`/app/clients/${clientId}`);
  return ok(enabled ? "Accès client activé." : "Accès client désactivé.");
}

/** Régénère le token du lien privé (révocation de l'ancien lien). */
export async function regeneratePortalToken(clientId: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ portal_token: generatePortalToken() })
    .eq("id", clientId)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  await logActivity(ctx, { action: "update", entity_type: "client", entity_id: clientId, summary: "Lien portail régénéré" });
  revalidatePath(`/app/clients/${clientId}`);
  return ok("Nouveau lien généré. L'ancien lien ne fonctionne plus.");
}
