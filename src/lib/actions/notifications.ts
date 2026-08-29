"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext } from "@/lib/actions/helpers";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  revalidatePath("/app/notifications");
  revalidatePath("/app");
  return ok();
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ is_read: true }).eq("workspace_id", ctx.workspace.id).eq("is_read", false);
  q = ctx.isAdmin
    ? q.or(`recipient_membership_id.is.null,recipient_membership_id.eq.${ctx.membership.id}`)
    : q.eq("recipient_membership_id", ctx.membership.id);
  const { error } = await q;
  if (error) return fail("Action impossible.");
  revalidatePath("/app/notifications");
  revalidatePath("/app");
  return ok("Toutes les notifications sont lues.");
}
