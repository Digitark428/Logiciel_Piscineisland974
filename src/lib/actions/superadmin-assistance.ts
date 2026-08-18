"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdmin } from "@/lib/auth/superadmin";
import { isSupportStatus, STATUS_BY_KEY, SUPPORT_MESSAGE_MAX } from "@/lib/assistance";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { SupportStatus } from "@/lib/db/types";

/**
 * Assistance — actions côté Super Admin (plateforme).
 * Accès réservé aux administrateurs plateforme (table platform_admins).
 * Les écritures passent par service_role ; l'autorisation est vérifiée ici.
 */

const ADMIN_LABEL = "Assistance Piscine Island";

async function fetchConversation(conversationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("support_conversations")
    .select("id, workspace_id, status")
    .eq("id", conversationId)
    .maybeSingle();
  return data;
}

/** Le Super Admin répond au demandeur (client portail ou utilisateur de l'application). */
export async function replySupportConversation(conversationId: string, content: string): Promise<ActionResult> {
  if (!(await getSuperAdmin())) return fail("Non autorisé.");
  const text = (content ?? "").trim();
  if (!text) return fail("Votre réponse est vide.");
  if (text.length > SUPPORT_MESSAGE_MAX) return fail("Réponse trop longue.");

  const conv = await fetchConversation(conversationId);
  if (!conv) return fail("Conversation introuvable.");

  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").insert({
    conversation_id: conv.id,
    workspace_id: conv.workspace_id,
    author_type: "admin",
    author_label: ADMIN_LABEL,
    content: text,
  });
  if (error) return fail("Envoi impossible.");

  // Répondre à une demande « nouvelle » la passe automatiquement « en cours ».
  const nextStatus: SupportStatus = conv.status === "new" ? "in_progress" : (conv.status as SupportStatus);
  await admin
    .from("support_conversations")
    .update({ status: nextStatus, admin_last_seen_at: new Date().toISOString() })
    .eq("id", conv.id);

  await admin.from("activity_logs").insert({
    workspace_id: conv.workspace_id,
    actor_membership_id: null,
    actor_label: ADMIN_LABEL,
    action: "support_reply_sent",
    entity_type: "support",
    entity_id: conv.id,
    summary: "Assistance — réponse envoyée au demandeur",
  });

  revalidatePath("/super-admin/assistance");
  revalidatePath(`/super-admin/assistance/${conv.id}`);
  return ok("Réponse envoyée.");
}

/** Change le statut d'une conversation (Nouveau / En cours / Résolu / Fermé). */
export async function setSupportStatus(conversationId: string, status: string): Promise<ActionResult> {
  if (!(await getSuperAdmin())) return fail("Non autorisé.");
  if (!isSupportStatus(status)) return fail("Statut invalide.");

  const conv = await fetchConversation(conversationId);
  if (!conv) return fail("Conversation introuvable.");

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status,
    admin_last_seen_at: new Date().toISOString(),
    resolved_at: status === "resolved" ? new Date().toISOString() : null,
  };
  const { error } = await admin.from("support_conversations").update(patch).eq("id", conv.id);
  if (error) return fail("Action impossible.");

  await admin.from("activity_logs").insert({
    workspace_id: conv.workspace_id,
    actor_membership_id: null,
    actor_label: ADMIN_LABEL,
    action: "support_status_changed",
    entity_type: "support",
    entity_id: conv.id,
    summary: `Assistance — statut : ${STATUS_BY_KEY[status].label}`,
  });

  revalidatePath("/super-admin/assistance");
  revalidatePath(`/super-admin/assistance/${conv.id}`);
  return ok(`Statut : ${STATUS_BY_KEY[status].label}.`);
}

/** Marque les messages du demandeur comme vus par le Super Admin (badge d'attention). */
export async function markConversationSeenByAdmin(conversationId: string): Promise<ActionResult> {
  if (!(await getSuperAdmin())) return fail("Non autorisé.");
  const conv = await fetchConversation(conversationId);
  if (!conv) return fail("Conversation introuvable.");
  const admin = createAdminClient();
  await admin
    .from("support_conversations")
    .update({ admin_last_seen_at: new Date().toISOString() })
    .eq("id", conv.id);
  revalidatePath("/super-admin/assistance");
  return ok();
}
