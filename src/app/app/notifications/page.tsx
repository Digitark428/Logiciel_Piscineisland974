import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { MarkAllButton, NotificationItem } from "./NotificationsClient";

export default async function NotificationsPage() {
  const ctx = await requireContext();
  const supabase = createClient();

  let query = supabase
    .from("notifications")
    .select("id, title, body, link, is_read, created_at, type")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(100);
  query = ctx.isAdmin
    ? query.or(`recipient_membership_id.is.null,recipient_membership_id.eq.${ctx.membership.id}`)
    : query.eq("recipient_membership_id", ctx.membership.id);

  const { data: notifications } = await query;
  const list = notifications ?? [];
  const hasUnread = list.some((n) => !n.is_read);

  return (
    <div>
      <PageHeader title="Notifications" action={<MarkAllButton hasUnread={hasUnread} />} />
      {list.length === 0 ? (
        <EmptyState title="Aucune notification" description="Les événements importants apparaîtront ici." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-graphite-100">
            {list.map((n) => <NotificationItem key={n.id} n={n} />)}
          </div>
        </Card>
      )}
    </div>
  );
}
