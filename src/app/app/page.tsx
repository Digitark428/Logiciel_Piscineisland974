import Link from "next/link";
import { requireContext, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, Badge, EmptyState, PageHeader } from "@/components/ui";
import { clientName, formatDate, formatTime, SERVICE_STATUS_LABELS } from "@/lib/utils/format";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const baseSel =
    "id, code, scheduled_date, scheduled_time, status, service_type, client:clients(first_name,last_name,company_name)";

  // Si membre non-admin : ne montrer que ses prestations.
  const scopeMine = !ctx.isAdmin;
  const applyScope = (q: any): any =>
    scopeMine ? q.eq("assigned_membership_id", ctx.membership.id) : q;

  const [todayRes, upcomingRes, doneCountRes, inProgressRes, tasksRes, activityRes] = await Promise.all([
    applyScope(
      supabase.from("services").select(baseSel).eq("workspace_id", ctx.workspace.id).eq("scheduled_date", today).order("scheduled_time"),
    ) as Promise<{ data: any[] | null }>,
    applyScope(
      supabase.from("services").select(baseSel).eq("workspace_id", ctx.workspace.id).gt("scheduled_date", today).neq("status", "cancelled").order("scheduled_date").limit(6),
    ) as Promise<{ data: any[] | null }>,
    applyScope(
      supabase.from("services").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspace.id).eq("status", "completed"),
    ) as Promise<{ count: number | null }>,
    applyScope(
      supabase.from("services").select(baseSel).eq("workspace_id", ctx.workspace.id).eq("status", "in_progress").order("scheduled_date").limit(5),
    ) as Promise<{ data: any[] | null }>,
    supabase.from("tasks").select("id, title, due_date, status, category").eq("workspace_id", ctx.workspace.id).neq("status", "done").order("due_date", { nullsFirst: false }).limit(5),
    ctx.isAdmin
      ? supabase.from("activity_logs").select("id, action, summary, created_at, actor_label").eq("workspace_id", ctx.workspace.id).order("created_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const todayServices = todayRes.data ?? [];
  const upcoming = upcomingRes.data ?? [];
  const inProgress = inProgressRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const activity = activityRes.data ?? [];

  const cn2 = (s: any) => clientName(s.client ?? {});

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Retrouvez en un coup d'œil l'activité, les interventions et les priorités de votre équipe."
        subtitle={`Bonjour ${ctx.membership.first_name ?? ""} 👋 · ${ctx.workspace.name}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Aujourd'hui" value={todayServices.length} hint="prestations" href="/app/planning" />
        <StatCard label="À venir" value={upcoming.length} hint="prochaines" tone="graphite" href="/app/services" />
        <StatCard label="En cours" value={inProgress.length} hint="en intervention" tone="amber" />
        <StatCard label="Terminées" value={doneCountRes.count ?? 0} hint="au total" tone="emerald" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-graphite-900">Prestations du jour</h2>
              <Link href="/app/planning" className="text-sm font-medium text-pool-600 hover:text-pool-700">Planning →</Link>
            </div>
            {todayServices.length === 0 ? (
              <p className="py-6 text-center text-sm text-graphite-400">Aucune prestation prévue aujourd'hui.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {todayServices.map((s: any) => (
                  <li key={s.id}>
                    <Link href={`/app/services/${s.id}`} className="flex items-center gap-3 py-3 transition hover:bg-graphite-50 -mx-2 px-2 rounded-lg">
                      <div className="w-14 text-sm font-semibold text-graphite-700">{formatTime(s.scheduled_time) || "—"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-graphite-900">{cn2(s)}</div>
                        <div className="truncate text-sm text-graphite-500">{s.service_type ?? "Prestation"}</div>
                      </div>
                      <Badge tone={s.status}>{SERVICE_STATUS_LABELS[s.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {upcoming.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-graphite-900">Prochaines prestations</h2>
              <ul className="divide-y divide-graphite-100">
                {upcoming.map((s: any) => (
                  <li key={s.id}>
                    <Link href={`/app/services/${s.id}`} className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-graphite-50">
                      <div className="w-28 text-sm text-graphite-500">{formatDate(s.scheduled_date)}</div>
                      <div className="flex-1 min-w-0 truncate font-medium text-graphite-900">{cn2(s)}</div>
                      <div className="hidden truncate text-sm text-graphite-400 sm:block">{s.service_type}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {can(ctx, "tasks.view") && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-graphite-900">Tâches</h2>
                <Link href="/app/tasks" className="text-sm font-medium text-pool-600 hover:text-pool-700">Voir →</Link>
              </div>
              {tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-graphite-400">Aucune tâche en attente.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((t: any) => (
                    <li key={t.id} className="flex items-center gap-2 rounded-lg bg-graphite-50 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-pool-400" />
                      <span className="flex-1 truncate text-sm text-graphite-800">{t.title}</span>
                      {t.due_date && <span className="text-xs text-graphite-400">{formatDate(t.due_date)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {ctx.isAdmin && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-graphite-900">Activité récente</h2>
              {activity.length === 0 ? (
                <p className="py-4 text-center text-sm text-graphite-400">Rien pour le moment.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((a: any) => (
                    <li key={a.id} className="text-sm">
                      <div className="text-graphite-800">{a.summary ?? a.action}</div>
                      <div className="text-xs text-graphite-400">{a.actor_label ?? "—"} · {formatDate(a.created_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
