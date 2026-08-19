import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { memberName } from "@/lib/utils/format";
import type { SupportCategory, SupportStatus } from "@/lib/db/types";

/**
 * Lecture globale des conversations d'assistance pour le Super Admin.
 * Accès plateforme uniquement — à n'appeler qu'après requireSuperAdmin().
 */

export interface AdminMessage {
  id: string;
  author_type: "user" | "admin";
  author_label: string | null;
  content: string;
  created_at: string;
}

export interface AdminConversation {
  id: string;
  workspace_id: string;
  membership_id: string | null;
  category: SupportCategory;
  status: SupportStatus;
  context: Record<string, unknown>;
  created_at: string;
  last_message_at: string;
  resolved_at: string | null;
  admin_last_seen_at: string | null;
  company: string;
  /** L'utilisateur de l'app (gérant ou membre) qui a ouvert la demande. */
  requester: string;
  preview: string;
  lastMessage: string;
  lastAuthor: "user" | "admin";
  adminUnread: number;
  messages: AdminMessage[];
}

export interface SupportStats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  closed: number;
  bug: number;
  help: number;
  suggestion: number;
  attention: number;
}

interface Overview {
  conversations: AdminConversation[];
  stats: SupportStats;
}

const MAX = 500;

/** Récupère toutes les conversations (bornées) enrichies + statistiques globales. */
export async function getSupportOverview(): Promise<Overview> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("support_conversations")
    .select("id, workspace_id, membership_id, category, status, context, created_at, last_message_at, resolved_at, admin_last_seen_at, memberships(first_name,last_name,email), workspaces(name)")
    .order("last_message_at", { ascending: false })
    .limit(MAX);

  const list = rows ?? [];
  const ids = list.map((c) => c.id);

  const { data: msgs } = ids.length
    ? await admin
        .from("support_messages")
        .select("id, conversation_id, author_type, author_label, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as Array<{ id: string; conversation_id: string; author_type: string; author_label: string | null; content: string; created_at: string }> };

  const stats: SupportStats = { total: 0, new: 0, in_progress: 0, resolved: 0, closed: 0, bug: 0, help: 0, suggestion: 0, attention: 0 };

  const conversations: AdminConversation[] = list.map((c) => {
    const messages: AdminMessage[] = (msgs ?? [])
      .filter((m) => m.conversation_id === c.id)
      .map((m) => ({
        id: m.id,
        author_type: m.author_type as "user" | "admin",
        author_label: m.author_label,
        content: m.content,
        created_at: m.created_at,
      }));

    const first = messages.find((m) => m.author_type === "user") ?? messages[0];
    const last = messages[messages.length - 1];
    const seen = c.admin_last_seen_at ? new Date(c.admin_last_seen_at).getTime() : 0;
    const adminUnread = messages.filter((m) => m.author_type === "user" && new Date(m.created_at).getTime() > seen).length;

    const memberRel = c.memberships as unknown as { first_name: string | null; last_name: string | null; email: string | null } | null;
    const wsRel = c.workspaces as unknown as { name: string | null } | null;

    const status = c.status as SupportStatus;
    const category = c.category as SupportCategory;
    const attention = status !== "closed" && status !== "resolved" && (status === "new" || adminUnread > 0);

    stats.total++;
    stats[status]++;
    stats[category]++;
    if (attention) stats.attention++;

    return {
      id: c.id,
      workspace_id: c.workspace_id,
      membership_id: c.membership_id,
      category,
      status,
      context: (c.context ?? {}) as Record<string, unknown>,
      created_at: c.created_at,
      last_message_at: c.last_message_at,
      resolved_at: c.resolved_at,
      admin_last_seen_at: c.admin_last_seen_at,
      company: wsRel?.name ?? "—",
      requester: memberRel ? memberName(memberRel) : "—",
      preview: first?.content ?? "",
      lastMessage: last?.content ?? "",
      lastAuthor: last?.author_type ?? "user",
      adminUnread,
      messages,
    };
  });

  return { conversations, stats };
}

/** Nombre de conversations nécessitant l'attention du Super Admin (badge menu). */
export async function getSupportAttentionCount(): Promise<number> {
  const { stats } = await getSupportOverview();
  return stats.attention;
}
