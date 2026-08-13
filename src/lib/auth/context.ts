import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Workspace } from "@/lib/db/types";
import type { PermissionKey } from "@/lib/permissions";

export interface SessionContext {
  userId: string;
  email: string | null;
  membership: Membership;
  workspace: Workspace;
  permissions: Set<string>;
  isAdmin: boolean;
}

/**
 * Résout le contexte de session : utilisateur, membership actif, workspace, permissions.
 * En V1 un utilisateur appartient à un seul workspace (email global unique).
 * Mémoïsé par requête via React cache().
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: membership } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspace_id)
      .maybeSingle();

    if (!workspace || workspace.status !== "active") return null;

    const { data: perms } = await supabase
      .from("permissions")
      .select("key, granted")
      .eq("membership_id", membership.id);

    const isAdmin = membership.role === "admin";
    const permissions = new Set<string>(
      (perms ?? []).filter((p) => p.granted).map((p) => p.key as string),
    );

    return {
      userId: user.id,
      email: user.email ?? null,
      membership: membership as Membership,
      workspace: workspace as Workspace,
      permissions,
      isAdmin,
    };
  },
);

/** Contexte requis : redirige vers /login si absent. */
export async function requireContext(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** L'admin possède toutes les permissions. */
export function can(ctx: SessionContext, key: PermissionKey): boolean {
  return ctx.isAdmin || ctx.permissions.has(key);
}

/** Exige une permission : redirige vers le dashboard si absente. */
export async function requirePermission(
  key: PermissionKey,
): Promise<SessionContext> {
  const ctx = await requireContext();
  if (!can(ctx, key)) redirect("/app");
  return ctx;
}
