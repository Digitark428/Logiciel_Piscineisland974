"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { can } from "@/lib/auth/context";
import { dateOnlyToUtcDate } from "@/lib/utils/date";
import { isTaskPriority } from "@/lib/tasks";

const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

function revalidateTaskViews() {
  revalidatePath("/app/tasks");
  revalidatePath("/app/tasks/personal");
  revalidatePath("/app/tasks/assign");
  revalidatePath("/app/tasks/notes");
}

export async function createTask(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const title = str(formData.get("title"));
  if (!title) return fail("Le titre est requis.");
  if (title.length > 240) return fail("Le titre est trop long.");

  const category = formData.get("category") === "personal" ? "personal" : "professional";
  if (category === "professional" && !can(ctx, "tasks.manage")) {
    return fail("Vous n'êtes pas autorisé à attribuer une tâche.");
  }

  const priorityValue = String(formData.get("priority") ?? "");
  const priority = category === "personal" && isTaskPriority(priorityValue) ? priorityValue : "not_urgent";
  if (category === "personal" && !isTaskPriority(priorityValue)) return fail("Choisissez un niveau d'importance.");

  const dueDate = str(formData.get("due_date"));
  if (dueDate && !dateOnlyToUtcDate(dueDate)) return fail("La date d'échéance est invalide.");
  const dueTime = category === "personal" ? str(formData.get("due_time")) : null;
  if (dueTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) return fail("L'heure est invalide.");

  const assignedMembershipId = category === "professional" ? str(formData.get("assigned_membership_id")) : null;
  if (category === "professional" && !assignedMembershipId) return fail("Choisissez une personne.");

  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    workspace_id: ctx.workspace.id,
    title,
    description: str(formData.get("description")),
    category,
    priority,
    due_date: dueDate,
    due_time: dueTime,
    assigned_membership_id: assignedMembershipId,
    created_by: ctx.membership.id,
  });
  if (error) return fail("Création impossible (droits insuffisants ?).");
  await logActivity(ctx, { action: "create", entity_type: "task", summary: `Tâche créée : ${title}` });
  revalidateTaskViews();
  revalidatePath("/app");
  return ok("Tâche ajoutée.");
}

export async function setTaskStatus(id: string, status: "todo" | "in_progress" | "done"): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  revalidateTaskViews();
  revalidatePath("/app");
  return ok();
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  revalidateTaskViews();
  return ok("Tâche supprimée.");
}
