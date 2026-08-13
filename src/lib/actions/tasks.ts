"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

export async function createTask(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const title = str(formData.get("title"));
  if (!title) return fail("Le titre est requis.");

  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    workspace_id: ctx.workspace.id,
    title,
    description: str(formData.get("description")),
    category: formData.get("category") === "personal" ? "personal" : "professional",
    due_date: str(formData.get("due_date")),
    assigned_membership_id: str(formData.get("assigned_membership_id")),
    created_by: ctx.membership.id,
  });
  if (error) return fail("Création impossible (droits insuffisants ?).");
  await logActivity(ctx, { action: "create", entity_type: "task", summary: `Tâche créée : ${title}` });
  revalidatePath("/app/tasks");
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
  revalidatePath("/app/tasks");
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
  revalidatePath("/app/tasks");
  return ok("Tâche supprimée.");
}
