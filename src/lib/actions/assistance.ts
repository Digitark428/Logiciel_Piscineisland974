"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalSession } from "@/lib/portal";
import { clientName } from "@/lib/utils/format";
import { isSupportCategory, SUPPORT_MESSAGE_MAX } from "@/lib/assistance";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { SupportCategory } from "@/lib/db/types";

/**
 * Assistance — actions côté portail client.
 * Réutilise la session du portail existant (cookie signé). workspace_id et
 * client_id sont TOUJOURS dérivés côté serveur du token vérifié — jamais fournis
 * par le navigateur (aucune usurpation de client_id / workspace_id possible).
 */

interface PortalClient {
  id: string;
  workspace_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
}

/** Vérifie le cookie de session portail et renvoie le client, ou null. */
async function clientFromPortalSession(token: string): Promise<PortalClient | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, workspace_id, first_name, last_name, company_name, portal_enabled, status")
    .eq("portal_token", token)
    .maybeSingle();

  if (!client || !client.portal_enabled || client.status !== "active") return null;

  const cookieValue = cookies().get(portalCookieName(token))?.value;
  if (!verifyPortalSession(token, cookieValue, client.id)) return null;

  return {
    id: client.id,
    workspace_id: client.workspace_id,
    first_name: client.first_name,
    last_name: client.last_name,
    company_name: client.company_name,
  };
}

interface CreateInput {
  category: SupportCategory | string;
  content: string;
  route?: string;
  device?: string;
  serviceId?: string | null;
}

/** Crée une conversation d'assistance + son premier message (côté client portail). */
export async function createSupportConversation(token: string, input: CreateInput): Promise<ActionResult> {
  const client = await clientFromPortalSession(token);
  if (!client) return fail("Session expirée. Rechargez la page.");

  if (!isSupportCategory(input.category)) return fail("Catégorie invalide.");
  const content = (input.content ?? "").trim();
  if (!content) return fail("Votre message est vide.");
  if (content.length > SUPPORT_MESSAGE_MAX) return fail("Message trop long.");

  const admin = createAdminClient();

  // Contexte : route/appareil (affichage) + prestation vérifiée comme appartenant au client.
  const context: Record<string, unknown> = {};
  if (input.route) context.route = String(input.route).slice(0, 300);
  if (input.device) context.device = String(input.device).slice(0, 200);
  if (input.serviceId) {
    const { data: svc } = await admin
      .from("services")
      .select("id, code")
      .eq("id", input.serviceId)
      .eq("client_id", client.id)
      .eq("workspace_id", client.workspace_id)
      .maybeSingle();
    if (svc) {
      context.service_id = svc.id;
      context.service_code = svc.code;
    }
  }

  const { data: conv, error } = await admin
    .from("support_conversations")
    .insert({
      workspace_id: client.workspace_id,
      client_id: client.id,
      category: input.category,
      status: "new",
      context,
      client_last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !conv) return fail("Envoi impossible. Réessayez.");

  const label = clientName(client);
  const { error: msgError } = await admin.from("support_messages").insert({
    conversation_id: conv.id,
    workspace_id: client.workspace_id,
    author_type: "client",
    author_label: label,
    content,
  });
  if (msgError) return fail("Envoi impossible. Réessayez.");

  await logAssistance(client.workspace_id, {
    action: "support_conversation_created",
    actorLabel: label,
    entityId: conv.id,
    summary: `Assistance — nouvelle demande (${input.category}) de ${label}`,
  });

  revalidatePath(`/portal/${token}`);
  return ok("Votre demande a bien été envoyée. Nous vous répondrons directement ici.", { conversationId: conv.id });
}

/** Ajoute un message client à une conversation existante (lui appartenant). */
export async function sendSupportMessage(token: string, conversationId: string, content: string): Promise<ActionResult> {
  const client = await clientFromPortalSession(token);
  if (!client) return fail("Session expirée. Rechargez la page.");

  const text = (content ?? "").trim();
  if (!text) return fail("Votre message est vide.");
  if (text.length > SUPPORT_MESSAGE_MAX) return fail("Message trop long.");

  const admin = createAdminClient();
  const conv = await ownedConversation(admin, conversationId, client);
  if (!conv) return fail("Conversation introuvable.");

  const label = clientName(client);
  const { error } = await admin.from("support_messages").insert({
    conversation_id: conv.id,
    workspace_id: client.workspace_id,
    author_type: "client",
    author_label: label,
    content: text,
  });
  if (error) return fail("Envoi impossible. Réessayez.");

  // Une réponse du client relance la demande si elle avait été résolue/fermée.
  const nextStatus = conv.status === "resolved" || conv.status === "closed" ? "in_progress" : conv.status;
  await admin
    .from("support_conversations")
    .update({ status: nextStatus, client_last_seen_at: new Date().toISOString() })
    .eq("id", conv.id);

  await logAssistance(client.workspace_id, {
    action: "support_message_sent",
    actorLabel: label,
    entityId: conv.id,
    summary: `Assistance — message de ${label}`,
  });

  revalidatePath(`/portal/${token}`);
  return ok("Message envoyé.");
}

/** Marque les réponses comme vues par le client (remet le badge à zéro). */
export async function markConversationSeenByClient(token: string, conversationId: string): Promise<ActionResult> {
  const client = await clientFromPortalSession(token);
  if (!client) return fail("Session expirée.");
  const admin = createAdminClient();
  const conv = await ownedConversation(admin, conversationId, client);
  if (!conv) return fail("Conversation introuvable.");
  await admin
    .from("support_conversations")
    .update({ client_last_seen_at: new Date().toISOString() })
    .eq("id", conv.id);
  revalidatePath(`/portal/${token}`);
  return ok();
}

// ---- Helpers internes ----

async function ownedConversation(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  client: PortalClient,
): Promise<{ id: string; status: string } | null> {
  if (!conversationId) return null;
  const { data } = await admin
    .from("support_conversations")
    .select("id, status, client_id, workspace_id")
    .eq("id", conversationId)
    .eq("client_id", client.id)
    .eq("workspace_id", client.workspace_id)
    .maybeSingle();
  return data ? { id: data.id, status: data.status } : null;
}

interface LogInput {
  action: string;
  actorLabel: string;
  entityId: string;
  summary: string;
}

/** Journalise un événement d'assistance dans le journal d'activité du workspace. */
async function logAssistance(workspaceId: string, input: LogInput): Promise<void> {
  const admin = createAdminClient();
  await admin.from("activity_logs").insert({
    workspace_id: workspaceId,
    actor_membership_id: null,
    actor_label: input.actorLabel,
    action: input.action,
    entity_type: "support",
    entity_id: input.entityId,
    summary: input.summary,
  });
}
