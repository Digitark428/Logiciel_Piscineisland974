import { getSessionContext } from "@/lib/auth/context";
import type { SupportAuthorType, SupportCategory, SupportStatus } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Charge les seules conversations du membre connecté à l'ouverture du volet.
 * Cette route ne lance aucune lecture au montage du layout : la navigation reste
 * indépendante de l'assistance. La RLS reste appliquée par le client Supabase.
 */
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return Response.json({ error: "Session expirée." }, { status: 401 });

  const supabase = createClient();
  const { data: conversationRows, error: conversationError } = await supabase
    .from("support_conversations")
    .select("id, category, status, context, created_at, last_message_at, client_last_seen_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("membership_id", ctx.membership.id)
    .is("client_id", null)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (conversationError) return Response.json({ error: "Lecture impossible." }, { status: 500 });
  const conversations = conversationRows ?? [];
  const ids = conversations.map((conversation) => conversation.id);
  const { data: messageRows, error: messageError } = ids.length
    ? await supabase
        .from("support_messages")
        .select("id, conversation_id, author_type, author_label, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (messageError) return Response.json({ error: "Lecture impossible." }, { status: 500 });

  const messages = messageRows ?? [];
  const payload = conversations.map((conversation) => {
    const thread = messages
      .filter((message) => message.conversation_id === conversation.id)
      .map((message) => ({
        id: message.id,
        author_type: message.author_type as SupportAuthorType,
        author_label: message.author_label,
        content: message.content,
        created_at: message.created_at,
      }));
    const seenAt = conversation.client_last_seen_at ? new Date(conversation.client_last_seen_at).getTime() : 0;
    const unread = thread.filter(
      (message) => message.author_type === "admin" && new Date(message.created_at).getTime() > seenAt,
    ).length;

    return {
      id: conversation.id,
      category: conversation.category as SupportCategory,
      status: conversation.status as SupportStatus,
      context: (conversation.context ?? {}) as Record<string, unknown>,
      created_at: conversation.created_at,
      last_message_at: conversation.last_message_at,
      messages: thread,
      unread,
    };
  });

  return Response.json(
    { conversations: payload, unreadTotal: payload.reduce((sum, conversation) => sum + conversation.unread, 0) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
