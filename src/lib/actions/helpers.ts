import "server-only";

import { getSessionContext, type SessionContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, type ActionResult } from "@/lib/actions/result";

/** Récupère le contexte pour une action ; renvoie une erreur si non authentifié. */
export async function actionContext(): Promise<
  { ctx: SessionContext } | { error: ActionResult }
> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: fail("Session expirée. Reconnectez-vous.") };
  return { ctx };
}

interface LogInput {
  action: string;
  entity_type?: string;
  entity_id?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/** Journalise une action (via service_role : contourne la RLS d'écriture des logs). */
export async function logActivity(ctx: SessionContext, input: LogInput): Promise<void> {
  const admin = createAdminClient();
  const actorLabel =
    [ctx.membership.first_name, ctx.membership.last_name].filter(Boolean).join(" ") ||
    ctx.email ||
    "Utilisateur";
  await admin.from("activity_logs").insert({
    workspace_id: ctx.workspace.id,
    actor_membership_id: ctx.membership.id,
    actor_label: actorLabel,
    action: input.action,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    summary: input.summary ?? null,
    metadata: input.metadata ?? {},
  });
}

interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
  entity_type?: string;
  entity_id?: string | null;
  /** null = destiné aux administrateurs du workspace. */
  recipient_membership_id?: string | null;
}

/** Crée une notification interne (in-app). Aucune intégration e-mail en V1. */
export async function notify(workspaceId: string, input: NotifyInput): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    workspace_id: workspaceId,
    recipient_membership_id: input.recipient_membership_id ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
  });
}
