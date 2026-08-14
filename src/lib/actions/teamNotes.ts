"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

/**
 * Notes d'équipe — communication interne. Tout membre peut créer une note ;
 * la suppression est réservée à l'auteur ou au gérant (RLS 0017). workspace_id et
 * author_membership_id sont dérivés côté serveur de la session.
 */
export async function createTeamNote(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return fail("La note est vide.");
  if (content.length > 4000) return fail("Note trop longue.");

  const supabase = createClient();
  const { error } = await supabase.from("team_notes").insert({
    workspace_id: ctx.workspace.id,
    author_membership_id: ctx.membership.id,
    content,
  });
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "create", entity_type: "team_note", summary: "Note d'équipe ajoutée" });
  revalidatePath("/app/tasks");
  return ok("Note ajoutée.");
}

export async function deleteTeamNote(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  // La RLS autorise la suppression uniquement à l'auteur ou au gérant.
  const { error } = await supabase.from("team_notes").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  revalidatePath("/app/tasks");
  return ok("Note supprimée.");
}
