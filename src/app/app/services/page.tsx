import Link from "next/link";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge, Avatar } from "@/components/ui";
import { clientName, memberName, formatDate, formatTime, SERVICE_STATUS_LABELS } from "@/lib/utils/format";

const FILTERS = [
  { key: "upcoming", label: "À venir" },
  { key: "today", label: "Aujourd'hui" },
  { key: "completed", label: "Terminées" },
  { key: "all", label: "Toutes" },
];

export default async function ServicesPage({ searchParams }: { searchParams: { f?: string } }) {
  const ctx = await requirePermission("services.view");
  const supabase = createClient();
  const filter = searchParams.f ?? "upcoming";
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("services")
    .select("id, code, scheduled_date, scheduled_time, status, service_type, client:clients(first_name,last_name,company_name), assignee:memberships!services_assigned_membership_id_fkey(first_name,last_name,email,photo_path)")
    .eq("workspace_id", ctx.workspace.id);

  if (filter === "today") query = query.eq("scheduled_date", today);
  else if (filter === "upcoming") query = query.gte("scheduled_date", today).neq("status", "cancelled");
  else if (filter === "completed") query = query.eq("status", "completed");

  query = query.order("scheduled_date", { ascending: filter !== "completed" }).order("scheduled_time").limit(200);
  if (!ctx.isAdmin) query = query.eq("assigned_membership_id", ctx.membership.id);

  const { data: services } = await query;

  return (
    <div>
      <PageHeader
        title="Prestations"
        action={can(ctx, "services.create") ? <Link href="/app/services/new" className="btn-primary">+ Nouvelle prestation</Link> : undefined}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/app/services?f=${f.key}`}
            className={`badge px-3 py-1.5 ${filter === f.key ? "bg-pool-600 text-white" : "bg-white text-graphite-600 ring-1 ring-graphite-200"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {!services || services.length === 0 ? (
        <EmptyState title="Aucune prestation" description="Aucune prestation pour ce filtre." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-graphite-100">
            {services.map((s: any) => (
              <li key={s.id}>
                <Link href={`/app/services/${s.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-graphite-50 sm:px-6">
                  <div className="w-24 shrink-0">
                    <div className="text-sm font-semibold text-graphite-800">{formatDate(s.scheduled_date)}</div>
                    <div className="text-xs text-graphite-400">{formatTime(s.scheduled_time)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-graphite-900">{clientName(s.client ?? {})}</div>
                    <div className="truncate text-sm text-graphite-500">{s.service_type ?? "Prestation"} · {s.code}</div>
                  </div>
                  {s.assignee && (
                    <div className="hidden sm:block" title={memberName(s.assignee)}>
                      <Avatar name={memberName(s.assignee)} size={30} />
                    </div>
                  )}
                  <Badge tone={s.status}>{SERVICE_STATUS_LABELS[s.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
