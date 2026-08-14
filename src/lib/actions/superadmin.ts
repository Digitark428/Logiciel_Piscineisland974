"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdmin } from "@/lib/auth/superadmin";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function signInSuperAdmin(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("Identifiants invalides.");

  const supabase = createClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !auth.user) return fail("Identifiants incorrects.");

  const admin = createAdminClient();
  const { data: pa } = await admin
    .from("platform_admins")
    .select("id, status")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!pa) {
    await supabase.auth.signOut();
    return fail("Accès refusé. Ce compte n'est pas Super Admin.");
  }
  redirect("/super-admin");
}

export async function signOutSuperAdmin(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/super-admin/login");
}

async function assertSuperAdmin() {
  const ctx = await getSuperAdmin();
  if (!ctx) return null;
  return ctx;
}

export async function setWorkspaceStatus(workspaceId: string, status: "active" | "disabled"): Promise<ActionResult> {
  if (!(await assertSuperAdmin())) return fail("Non autorisé.");
  const admin = createAdminClient();
  const { error } = await admin.from("workspaces").update({ status }).eq("id", workspaceId);
  if (error) return fail("Action impossible.");
  revalidatePath("/super-admin");
  return ok(status === "active" ? "Espace réactivé." : "Espace désactivé.");
}

export async function deleteWorkspace(workspaceId: string, confirmName: string): Promise<ActionResult> {
  if (!(await assertSuperAdmin())) return fail("Non autorisé.");
  const admin = createAdminClient();
  const { data: ws } = await admin.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  if (!ws) return fail("Espace introuvable.");
  if (confirmName.trim() !== ws.name) return fail("Le nom saisi ne correspond pas.");

  // Récupère les utilisateurs Auth du workspace pour les supprimer.
  const { data: members } = await admin.from("memberships").select("user_id").eq("workspace_id", workspaceId);

  // Supprime le workspace (cascade sur toutes les données métier).
  const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
  if (error) return fail("Suppression impossible.");

  // Supprime les comptes Auth associés (best-effort).
  for (const m of members ?? []) {
    await admin.auth.admin.deleteUser(m.user_id).catch(() => {});
  }

  revalidatePath("/super-admin");
  return ok("Espace supprimé définitivement.");
}
