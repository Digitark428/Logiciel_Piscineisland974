"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { formatDateTime } from "@/lib/utils/format";

interface N {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type: string;
}

export function MarkAllButton({ hasUnread }: { hasUnread: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!hasUnread) return null;
  return (
    <button className="btn-secondary" disabled={pending} onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}>
      {pending ? "…" : "Tout marquer comme lu"}
    </button>
  );
}

export function NotificationItem({ n }: { n: N }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const markRead = () => {
    if (!n.is_read) start(async () => { await markNotificationRead(n.id); router.refresh(); });
  };

  const content = (
    <div className={`flex items-start gap-3 px-4 py-3.5 sm:px-6 ${n.is_read ? "" : "bg-pool-50/40"}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-pool-500"}`} />
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${n.is_read ? "text-graphite-700" : "text-graphite-900"}`}>{n.title}</div>
        {n.body && <div className="text-sm text-graphite-500">{n.body}</div>}
        <div className="mt-0.5 text-xs text-graphite-400">{formatDateTime(n.created_at)}</div>
      </div>
      {!n.is_read && (
        <button onClick={(e) => { e.preventDefault(); markRead(); }} disabled={pending} className="text-xs text-pool-600 hover:text-pool-700">
          Marquer lu
        </button>
      )}
    </div>
  );

  return n.link ? (
    <Link href={n.link} onClick={markRead} className="block transition hover:bg-graphite-50">{content}</Link>
  ) : (
    <div>{content}</div>
  );
}
