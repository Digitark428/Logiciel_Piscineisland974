"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionContext } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

/** Connexion au workspace de démonstration (gérant ou membre). */
export async function enterDemo(formData: FormData): Promise<void> {
  const role = String(formData.get("role") ?? "manager");
  const email = role === "member" ? process.env.DEMO_MEMBER_EMAIL : process.env.DEMO_MANAGER_EMAIL;
  const password = role === "member" ? process.env.DEMO_MEMBER_PASSWORD : process.env.DEMO_MANAGER_PASSWORD;

  if (!email || !password) {
    redirect("/demo?error=config");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email!, password: password! });
  if (error) redirect("/demo?error=login");
  redirect("/app");
}

/** Réinitialise les données du workspace démo à leur état initial. */
export async function resetDemo(): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.workspace.is_demo) return fail("La réinitialisation n'est possible que dans l'espace de démonstration.");

  const admin = createAdminClient();
  const { error } = await admin.rpc("seed_demo_data", { p_workspace_id: ctx.workspace.id });
  if (error) return fail("Réinitialisation impossible.");
  revalidatePath("/app");
  return ok("Démo réinitialisée.");
}
