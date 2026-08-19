import { requireContext, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { AppShell } from "@/components/app/AppShell";
import { AssistanceWidget, type WidgetConversation } from "@/components/app/AssistanceWidget";
import { NAV_ITEMS } from "@/components/app/nav";
import { memberName, formatDate } from "@/lib/utils/format";
import type { SupportCategory, SupportStatus } from "@/lib/db/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const supabase = createClient();

  // Compteur de notifications non lues visibles par l'utilisateur.
  let notifQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspace.id)
    .eq("is_read", false);
  notifQuery = ctx.isAdmin
    ? notifQuery.or(`recipient_membership_id.is.null,recipient_membership_id.eq.${ctx.membership.id}`)
    : notifQuery.eq("recipient_membership_id", ctx.membership.id);
  const { count } = await notifQuery;

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return ctx.isAdmin;
    if (!item.perm) return true;
    return can(ctx, item.perm);
  });

  const avatarUrl = await signedUrl("avatars", ctx.membership.photo_path);

  // ---- Assistance : les conversations de l'utilisateur courant (les siennes). ----
  const { data: convRows } = await supabase
    .from("support_conversations")
    .select("id, category, status, created_at, last_message_at, client_last_seen_at, context")
    .eq("membership_id", ctx.membership.id)
    .order("last_message_at", { ascending: false });

  const convIds = (convRows ?? []).map((c) => c.id);
  const { data: msgRows } = convIds.length
    ? await supabase
        .from("support_messages")
        .select("id, conversation_id, author_type, author_label, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; conversation_id: string; author_type: string; author_label: string | null; content: string; created_at: string }[] };

  let unreadTotal = 0;
  const assistanceConversations: WidgetConversation[] = (convRows ?? []).map((c) => {
    const messages = (msgRows ?? [])
      .filter((m) => m.conversation_id === c.id)
      .map((m) => ({
        id: m.id,
        author_type: m.author_type as "user" | "admin",
        author_label: m.author_label,
        content: m.content,
        created_at: m.created_at,
      }));
    const seen = c.client_last_seen_at ? new Date(c.client_last_seen_at).getTime() : 0;
    const unread = messages.filter((m) => m.author_type === "admin" && new Date(m.created_at).getTime() > seen).length;
    unreadTotal += unread;
    return {
      id: c.id,
      category: c.category as SupportCategory,
      status: c.status as SupportStatus,
      created_at: c.created_at,
      last_message_at: c.last_message_at,
      context: (c.context ?? {}) as Record<string, unknown>,
      messages,
      unread,
    };
  });

  // Prestations récentes du workspace (option « prestation concernée »).
  const { data: recentServices } = await supabase
    .from("services")
    .select("id, code, service_type, scheduled_date")
    .eq("workspace_id", ctx.workspace.id)
    .order("scheduled_date", { ascending: false })
    .limit(15);
  const assistanceServices = (recentServices ?? []).map((s) => ({
    id: s.id,
    code: s.code ?? "",
    label: `${s.code ?? ""} · ${s.service_type ?? "Intervention"} · ${formatDate(s.scheduled_date)}`.trim(),
  }));

  return (
    <AppShell
      items={items}
      workspaceName={ctx.workspace.name}
      companyCode={ctx.workspace.company_code}
      userName={memberName(ctx.membership)}
      avatarUrl={avatarUrl}
      roleLabel={ctx.isAdmin ? "Gérant" : "Membre"}
      isDemo={ctx.workspace.is_demo}
      notifCount={count ?? 0}
    >
      {children}
      <AssistanceWidget
        conversations={assistanceConversations}
        unreadTotal={unreadTotal}
        services={assistanceServices}
      />
    </AppShell>
  );
}
