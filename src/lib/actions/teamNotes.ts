"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { can, type SessionContext } from "@/lib/auth/context";

function canUseTeamNotes(ctx: SessionContext) {
  return can(ctx, "tasks.view");
}

function revalidateTeamNotes() {
  revalidatePath("/app/tasks");
  revalidatePath("/app/tasks/notes");
}

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

  const supabase = await createClient();
  const { error } = await supabase.from("team_notes").insert({
    workspace_id: ctx.workspace.id,
    author_membership_id: ctx.membership.id,
    content,
  });
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "create", entity_type: "team_note", summary: "Note d'équipe ajoutée" });
  revalidateTeamNotes();
  return ok("Note ajoutée.");
}

export async function deleteTeamNote(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = await createClient();
  // La RLS autorise la suppression uniquement à l'auteur ou au gérant.
  const { error } = await supabase.from("team_notes").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  revalidateTeamNotes();
  return ok("Note supprimée.");
}

/** Enregistre la lecture une seule fois pour le membre connecté. */
export async function markTeamNoteRead(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!canUseTeamNotes(ctx)) return fail("Accès aux notes d'équipe refusé.");

  const supabase = await createClient();
  const { error } = await supabase.from("team_note_reads").upsert(
    {
      workspace_id: ctx.workspace.id,
      team_note_id: id,
      membership_id: ctx.membership.id,
    },
    { onConflict: "team_note_id,membership_id", ignoreDuplicates: true },
  );
  if (error) return fail("Impossible d'enregistrer la lecture.");
  revalidateTeamNotes();
  return ok();
}

/** Enregistre une exécution une seule fois pour le membre connecté. */
export async function markTeamNoteExecuted(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!canUseTeamNotes(ctx)) return fail("Accès aux notes d'équipe refusé.");

  const supabase = await createClient();
  const { error } = await supabase.from("team_note_executions").upsert(
    {
      workspace_id: ctx.workspace.id,
      team_note_id: id,
      membership_id: ctx.membership.id,
    },
    { onConflict: "team_note_id,membership_id", ignoreDuplicates: true },
  );
  if (error) return fail("Impossible d'enregistrer l'exécution.");
  revalidateTeamNotes();
  return ok();
}

/** Ajoute un commentaire à une note d'équipe depuis la vue détaillée. */
export async function createTeamNoteComment(id: string, rawContent: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!canUseTeamNotes(ctx)) return fail("Accès aux notes d'équipe refusé.");
  const content = rawContent.trim();
  if (!content) return fail("Le commentaire est vide.");
  if (content.length > 4000) return fail("Commentaire trop long.");

  const supabase = await createClient();
  const { error } = await supabase.from("team_note_comments").insert({
    workspace_id: ctx.workspace.id,
    team_note_id: id,
    author_membership_id: ctx.membership.id,
    content,
  });
  if (error) return fail("Impossible de publier le commentaire.");
  revalidateTeamNotes();
  return ok();
}
