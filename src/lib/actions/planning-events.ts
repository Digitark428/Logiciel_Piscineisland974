"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { can, type SessionContext } from "@/lib/auth/context";
import { isValidPlanningDate, isValidPlanningTime } from "@/lib/planning-events";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: FormDataEntryValue | null): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function eventInput(formData: FormData):
  | { ok: true; value: { title: string; event_date: string; start_time: string | null; end_time: string | null; all_day: boolean; description: string | null } }
  | { ok: false; result: ActionResult } {
  const title = text(formData.get("title"));
  const eventDate = text(formData.get("event_date"));
  const allDay = formData.get("all_day") === "on";
  const startTime = allDay ? null : text(formData.get("start_time"));
  const endTime = allDay ? null : text(formData.get("end_time"));
  const description = text(formData.get("description"));

  if (!title) return { ok: false, result: fail("Le titre est requis.", { title: "Indiquez un titre." }) };
  if (title.length > 240) return { ok: false, result: fail("Le titre est trop long.", { title: "240 caractères maximum." }) };
  if (!eventDate || !isValidPlanningDate(eventDate)) return { ok: false, result: fail("La date est invalide.", { event_date: "Choisissez une date valide." }) };
  if (description && description.length > 4000) return { ok: false, result: fail("La note est trop longue.", { description: "4 000 caractères maximum." }) };
  if (!allDay) {
    if (!startTime || !isValidPlanningTime(startTime)) return { ok: false, result: fail("L'heure de début est invalide.", { start_time: "Choisissez une heure." }) };
    if (!endTime || !isValidPlanningTime(endTime)) return { ok: false, result: fail("L'heure de fin est invalide.", { end_time: "Choisissez une heure." }) };
    if (endTime <= startTime) return { ok: false, result: fail("L'heure de fin doit suivre l'heure de début.", { end_time: "Choisissez une heure plus tardive." }) };
  }

  return {
    ok: true,
    value: {
      title,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay,
      description,
    },
  };
}

async function planningContext() {
  const result = await actionContext();
  if ("error" in result) return result;
  if (!can(result.ctx, "planning.view")) return { error: fail("Vous n'êtes pas autorisé à utiliser le planning.") };
  return result;
}

async function planningAssignee(
  ctx: SessionContext,
  formData: FormData,
): Promise<{ ok: true; membershipId: string | null } | { ok: false; result: ActionResult }> {
  const membershipId = text(formData.get("assigned_membership_id"));
  if (!membershipId) return { ok: true, membershipId: null };
  if (!UUID.test(membershipId)) return { ok: false, result: fail("La personne concernée est invalide.") };
  if (!ctx.isAdmin) return { ok: false, result: fail("Seul le gérant peut affecter un événement à un membre.") };

  const supabase = createClient();
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("id", membershipId)
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return { ok: false, result: fail("Cette personne n’appartient pas à votre entreprise.") };
  return { ok: true, membershipId: data.id };
}

export async function createPlanningEvent(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await planningContext();
  if ("error" in result) return result.error;
  const parsed = eventInput(formData);
  if (!parsed.ok) return parsed.result;

  const { ctx } = result;
  const assignee = await planningAssignee(ctx, formData);
  if (!assignee.ok) return assignee.result;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("planning_events")
    .insert({
      workspace_id: ctx.workspace.id,
      owner_membership_id: ctx.membership.id,
      assigned_membership_id: assignee.membershipId,
      ...parsed.value,
    })
    .select("id")
    .single();

  if (error || !data) return fail("Création impossible. Vérifiez les informations puis réessayez.");
  revalidatePath("/app/planning");
  return ok("Événement ajouté.", { eventId: data.id });
}

export async function updatePlanningEvent(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await planningContext();
  if ("error" in result) return result.error;
  const id = text(formData.get("id"));
  if (!id || !UUID.test(id)) return fail("Événement invalide.");
  const parsed = eventInput(formData);
  if (!parsed.ok) return parsed.result;

  const { ctx } = result;
  const assignee = await planningAssignee(ctx, formData);
  if (!assignee.ok) return assignee.result;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("planning_events")
    .update({ ...parsed.value, assigned_membership_id: assignee.membershipId })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .eq("owner_membership_id", ctx.membership.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return fail("Modification impossible ou événement inaccessible.");
  revalidatePath("/app/planning");
  return ok("Événement modifié.");
}

export async function deletePlanningEvent(id: string): Promise<ActionResult> {
  const result = await planningContext();
  if ("error" in result) return result.error;
  if (!UUID.test(id)) return fail("Événement invalide.");

  const { ctx } = result;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("planning_events")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .eq("owner_membership_id", ctx.membership.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return fail("Suppression impossible ou événement inaccessible.");
  revalidatePath("/app/planning");
  return ok("Événement supprimé.");
}
