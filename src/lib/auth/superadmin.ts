import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SuperAdminContext {
  userId: string;
  email: string | null;
}

export const getSuperAdmin = cache(async (): Promise<SuperAdminContext | null> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Vérifie l'appartenance à platform_admins (table séparée, non modifiable par un admin d'espace).
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_admins")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;

  return { userId: user.id, email: user.email ?? null };
});

export async function requireSuperAdmin(): Promise<SuperAdminContext> {
  const ctx = await getSuperAdmin();
  if (!ctx) redirect("/super-admin/login");
  return ctx;
}
