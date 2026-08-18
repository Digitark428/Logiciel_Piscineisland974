"use server";

import { revalidatePath } from "next/cache";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isSupportCategory, SUPPORT_MESSAGE_MAX } from "@/lib/assistance";
import type { SupportCategory } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberName } from "@/lib/utils/format";

interface CreateAppSupportInput {
  category: SupportCategory | string;
  content: string;
  /** Indication d'affichage seulement, jamais utilisée pour l'autorisation. */
  route?: string;
}

/**
 * Crée une demande d'assistance depuis l'application.
 * L'espace et le membre sont exclusivement dérivés de la session serveur.
 */
export async function createAppSupportConversation(input: CreateAppSupportInput): Promise<ActionResult> {
  const session = await actionContext();
  if ("error" in session) return session.error;
  const { ctx } = session;

  if (!isSupportCategory(input.category)) return fail("Catégorie invalide.");
  const content = (input.content ?? "").trim();
  if (!content) return fail("Votre message est vide.");
  if (content.length > SUPPORT_MESSAGE_MAX) return fail("Message trop long.");

  const context: Record<string, unknown> = {};
  if (input.route) context.route = String(input.route).slice(0, 300);

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: conversation, error: conversationError } = await admin
    .from("support_conversations")
    .insert({
      workspace_id: ctx.workspace.id,
      membership_id: ctx.membership.id,
      client_id: null,
      category: input.category,
      status: "new",
      context,
      client_last_seen_at: now,
    })
    .select("id")
    .single();
  if (conversationError || !conversation) return fail("Envoi impossible. Réessayez.");

  const label = memberName(ctx.membership);
  const { error: messageError } = await admin.from("support_messages").insert({
    conversation_id: conversation.id,
    workspace_id: ctx.workspace.id,
    author_type: "user",
    author_label: label,
    content,
  });
  if (messageError) {
    // Ne pas laisser de conversation vide si le second insert échoue.
    await admin.from("support_conversations").delete().eq("id", conversation.id);
    return fail("Envoi impossible. Réessayez.");
  }

  await logActivity(ctx, {
    action: "support_conversation_created",
    entity_type: "support",
    entity_id: conversation.id,
    summary: `Assistance — nouvelle demande utilisateur (${input.category})`,
  });

  revalidatePath("/app");
  return ok("Votre demande a bien été envoyée. Nous vous répondrons ici.", { conversationId: conversation.id });
}

/** Ajoute un message à la seule conversation d'assistance du membre connecté. */
export async function sendAppSupportMessage(conversationId: string, content: string): Promise<ActionResult> {
  const session = await actionContext();
  if ("error" in session) return session.error;
  const { ctx } = session;

  const text = (content ?? "").trim();
  if (!text) return fail("Votre message est vide.");
  if (text.length > SUPPORT_MESSAGE_MAX) return fail("Message trop long.");

  const admin = createAdminClient();
  const conversation = await ownedAppConversation(admin, conversationId, ctx.workspace.id, ctx.membership.id);
  if (!conversation) return fail("Conversation introuvable.");

  const { error } = await admin.from("support_messages").insert({
    conversation_id: conversation.id,
    workspace_id: ctx.workspace.id,
    author_type: "user",
    author_label: memberName(ctx.membership),
    content: text,
  });
  if (error) return fail("Envoi impossible. Réessayez.");

  const nextStatus = conversation.status === "resolved" || conversation.status === "closed"
    ? "in_progress"
    : conversation.status;
  await admin
    .from("support_conversations")
    .update({ status: nextStatus, client_last_seen_at: new Date().toISOString() })
    .eq("id", conversation.id);

  await logActivity(ctx, {
    action: "support_message_sent",
    entity_type: "support",
    entity_id: conversation.id,
    summary: "Assistance — message utilisateur envoyé",
  });

  revalidatePath("/app");
  return ok("Message envoyé.");
}

/** Enregistre la consultation des réponses d'assistance par leur destinataire. */
export async function markAppConversationSeen(conversationId: string): Promise<ActionResult> {
  const session = await actionContext();
  if ("error" in session) return session.error;
  const { ctx } = session;

  const admin = createAdminClient();
  const conversation = await ownedAppConversation(admin, conversationId, ctx.workspace.id, ctx.membership.id);
  if (!conversation) return fail("Conversation introuvable.");

  await admin
    .from("support_conversations")
    .update({ client_last_seen_at: new Date().toISOString() })
    .eq("id", conversation.id);
  revalidatePath("/app");
  return ok();
}

async function ownedAppConversation(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  workspaceId: string,
  membershipId: string,
): Promise<{ id: string; status: string } | null> {
  if (!conversationId) return null;
  const { data } = await admin
    .from("support_conversations")
    .select("id, status")
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId)
    .eq("membership_id", membershipId)
    .is("client_id", null)
    .maybeSingle();
  return data;
}
