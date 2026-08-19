"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionContext } from "@/lib/actions/helpers";
import { memberName } from "@/lib/utils/format";
import { isSupportCategory, SUPPORT_MESSAGE_MAX } from "@/lib/assistance";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { SessionContext } from "@/lib/auth/context";
import type { SupportCategory } from "@/lib/db/types";

/**
 * Assistance — actions côté application (utilisateurs : gérant + membres d'équipe).
 * Réutilise la session authentifiée existante (requireContext) : aucun second
 * système d'auth. workspace_id et membership sont TOUJOURS dérivés du contexte
 * serveur — jamais fournis par le navigateur (aucune usurpation possible).
 * Écritures via service_role (comme activity_logs/notifications).
 */

interface CreateInput {
  category: SupportCategory | string;
  content: string;
  route?: string;
  device?: string;
  serviceId?: string | null;
}

/** Crée une conversation d'assistance + son premier message. */
export async function createSupportConversation(input: CreateInput): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  if (!isSupportCategory(input.category)) return fail("Catégorie invalide.");
  const content = (input.content ?? "").trim();
  if (!content) return fail("Votre message est vide.");
  if (content.length > SUPPORT_MESSAGE_MAX) return fail("Message trop long.");

  const admin = createAdminClient();

  const context: Record<string, unknown> = {};
  if (input.route) context.route = String(input.route).slice(0, 300);
  if (input.device) context.device = String(input.device).slice(0, 200);
  if (input.serviceId) {
    // Prestation concernée : vérifiée comme appartenant au workspace de l'utilisateur.
    const { data: svc } = await admin
      .from("services")
      .select("id, code, client_id")
      .eq("id", input.serviceId)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    if (svc) {
      context.service_id = svc.id;
      context.service_code = svc.code;
      if (svc.client_id) context.client_id = svc.client_id;
    }
  }

  const label = memberName(ctx.membership);
  const { data: conv, error } = await admin
    .from("support_conversations")
    .insert({
      workspace_id: ctx.workspace.id,
      membership_id: ctx.membership.id,
      category: input.category,
      status: "new",
      context,
      client_last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !conv) return fail("Envoi impossible. Réessayez.");

  const { error: msgError } = await admin.from("support_messages").insert({
    conversation_id: conv.id,
    workspace_id: ctx.workspace.id,
    author_type: "user",
    author_label: label,
    content,
  });
  if (msgError) return fail("Envoi impossible. Réessayez.");

  await logAssistance(ctx, {
    action: "support_conversation_created",
    entityId: conv.id,
    summary: `Assistance — nouvelle demande (${input.category})`,
  });

  revalidatePath("/app");
  return ok("Votre demande a bien été envoyée. Nous vous répondrons directement ici.", { conversationId: conv.id });
}

/** Ajoute un message utilisateur à une de SES conversations. */
export async function sendSupportMessage(conversationId: string, content: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  const text = (content ?? "").trim();
  if (!text) return fail("Votre message est vide.");
  if (text.length > SUPPORT_MESSAGE_MAX) return fail("Message trop long.");

  const admin = createAdminClient();
  const conv = await ownedConversation(admin, conversationId, ctx);
  if (!conv) return fail("Conversation introuvable.");

  const { error } = await admin.from("support_messages").insert({
    conversation_id: conv.id,
    workspace_id: ctx.workspace.id,
    author_type: "user",
    author_label: memberName(ctx.membership),
    content: text,
  });
  if (error) return fail("Envoi impossible. Réessayez.");

  const nextStatus = conv.status === "resolved" || conv.status === "closed" ? "in_progress" : conv.status;
  await admin
    .from("support_conversations")
    .update({ status: nextStatus, client_last_seen_at: new Date().toISOString() })
    .eq("id", conv.id);

  await logAssistance(ctx, {
    action: "support_message_sent",
    entityId: conv.id,
    summary: "Assistance — message envoyé",
  });

  revalidatePath("/app");
  return ok("Message envoyé.");
}

/** Marque les réponses comme vues par l'utilisateur (remet le badge à zéro). */
export async function markConversationSeenByUser(conversationId: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const admin = createAdminClient();
  const conv = await ownedConversation(admin, conversationId, ctx);
  if (!conv) return fail("Conversation introuvable.");
  await admin
    .from("support_conversations")
    .update({ client_last_seen_at: new Date().toISOString() })
    .eq("id", conv.id);
  revalidatePath("/app");
  return ok();
}

// ---- Helpers internes ----

/** Vérifie que la conversation appartient bien au membre courant (anti-usurpation). */
async function ownedConversation(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  ctx: SessionContext,
): Promise<{ id: string; status: string } | null> {
  if (!conversationId) return null;
  const { data } = await admin
    .from("support_conversations")
    .select("id, status, membership_id, workspace_id")
    .eq("id", conversationId)
    .eq("membership_id", ctx.membership.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  return data ? { id: data.id, status: data.status } : null;
}

interface LogInput {
  action: string;
  entityId: string;
  summary: string;
}

async function logAssistance(ctx: SessionContext, input: LogInput): Promise<void> {
  const admin = createAdminClient();
  await admin.from("activity_logs").insert({
    workspace_id: ctx.workspace.id,
    actor_membership_id: ctx.membership.id,
    actor_label: memberName(ctx.membership),
    action: input.action,
    entity_type: "support",
    entity_id: input.entityId,
    summary: input.summary,
  });
}
