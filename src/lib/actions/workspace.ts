"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { normalizeWorkspaceLogo, workspaceLogoPath } from "@/lib/workspace-logo";

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

export async function updateWorkspaceLogo(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé au gérant de l’entreprise.");

  const file = formData.get("company_logo");
  if (!(file instanceof File) || file.size === 0) return fail("Sélectionnez un logo à importer.");

  let normalized: Awaited<ReturnType<typeof normalizeWorkspaceLogo>>;
  try {
    normalized = await normalizeWorkspaceLogo(Buffer.from(await file.arrayBuffer()));
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Logo incorrect.");
  }

  const supabase = createClient();
  const previousPath = workspaceLogoPath(ctx.workspace.settings);
  const nextPath = `${ctx.workspace.id}/branding/company-logo-${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("workspace-assets")
    .upload(nextPath, normalized.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) return fail("Import du logo impossible. Réessayez dans un instant.");

  const nextSettings = { ...(ctx.workspace.settings ?? {}), company_logo_path: nextPath };
  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ settings: nextSettings })
    .eq("id", ctx.workspace.id);

  if (updateError) {
    await supabase.storage.from("workspace-assets").remove([nextPath]);
    return fail("Le logo n’a pas pu être associé à l’entreprise.");
  }

  if (previousPath && previousPath !== nextPath) {
    await supabase.storage.from("workspace-assets").remove([previousPath]);
  }

  await logActivity(ctx, {
    action: "update",
    entity_type: "workspace",
    entity_id: ctx.workspace.id,
    summary: "Logo de l’entreprise mis à jour",
    metadata: { width: normalized.width, height: normalized.height, source_format: normalized.sourceFormat },
  });
  revalidatePath("/app", "layout");
  revalidatePath("/app/settings");
  return ok("Logo de l’entreprise mis à jour.");
}

export async function deleteWorkspaceLogo(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé au gérant de l’entreprise.");

  const currentPath = workspaceLogoPath(ctx.workspace.settings);
  if (!currentPath) return ok("Aucun logo n’était enregistré.");

  const supabase = createClient();
  const nextSettings = { ...(ctx.workspace.settings ?? {}) };
  delete nextSettings.company_logo_path;
  const { error } = await supabase
    .from("workspaces")
    .update({ settings: nextSettings })
    .eq("id", ctx.workspace.id);
  if (error) return fail("Suppression du logo impossible.");

  await supabase.storage.from("workspace-assets").remove([currentPath]);
  await logActivity(ctx, {
    action: "update",
    entity_type: "workspace",
    entity_id: ctx.workspace.id,
    summary: "Logo de l’entreprise supprimé",
  });
  revalidatePath("/app", "layout");
  revalidatePath("/app/settings");
  return ok("Logo de l’entreprise supprimé.");
}
