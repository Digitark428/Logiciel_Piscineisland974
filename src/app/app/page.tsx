import Link from "next/link";
import { requireContext, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, Badge, PageHeader } from "@/components/ui";
import { formatDate, formatDateWithWeekday, formatTime, operationalClientName, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { todayInReunion } from "@/lib/utils/date";
import { FinancialCarousel } from "@/components/app/FinancialCarousel";
import { getMaintenanceOccurrences, occurrenceHref, type MaintenanceOccurrence } from "@/lib/services/queries";
import { signedUrls } from "@/lib/storage";
import { MemberIdentity } from "@/components/members/MemberIdentity";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const supabase = createClient();
  const today = todayInReunion();

  const baseSel =
    "id, code, scheduled_date, scheduled_time, status, service_type, client:clients(first_name,last_name,company_name)";

  const scopeMine = !(ctx.isAdmin || can(ctx, "services.edit"));
  const applyScope = (q: any): any =>
    scopeMine ? q.eq("assigned_membership_id", ctx.membership.id) : q;

  const occurrenceScope = scopeMine ? ctx.membership.id : undefined;
  const [todayServices, doneCountRes, inProgressRes, tasksRes, activityRes, financialRes] = await Promise.all([
    getMaintenanceOccurrences(supabase, { workspaceId: ctx.workspace.id, start: today, end: today, assignedMembershipId: occurrenceScope }),
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
    ctx.isAdmin
      ? supabase.rpc("financial_dashboard_metrics", { p_workspace_id: ctx.workspace.id, p_month: today }).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const inProgress = inProgressRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const activity = activityRes.data ?? [];
  const financialMetrics = financialRes.data as { recurring_cents: number; one_off_cents: number } | null;
  const avatarByPath = await signedUrls("avatars", todayServices.map((service) => service.assignee?.photo_path));

  const displayClient = (service: MaintenanceOccurrence) => operationalClientName(service.client);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Retrouvez en un coup d'œil l'activité, les interventions et les priorités de votre équipe."
        subtitle={`Bonjour ${ctx.membership.first_name ?? ""} 👋 · ${ctx.workspace.name}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Aujourd'hui" value={todayServices.length} hint="entretiens" href="/app/planning" />
        <StatCard label="En cours" value={inProgress.length} hint="en intervention" tone="amber" />
        <div className="col-span-2 lg:col-span-1">
          <StatCard label="Terminées" value={doneCountRes.count ?? 0} hint="au total" tone="emerald" />
        </div>
      </div>

      {ctx.isAdmin && (
        <div className="mt-6">
          <FinancialCarousel
            recurringCents={Number(financialMetrics?.recurring_cents ?? 0)}
            oneOffCents={Number(financialMetrics?.one_off_cents ?? 0)}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-graphite-900">Entretiens du jour</h2>
                <p className="mt-0.5 text-sm font-medium text-pool-700">{formatDateWithWeekday(today)}</p>
              </div>
              <Link href="/app/planning" className="text-sm font-medium text-pool-600 hover:text-pool-700">Planning →</Link>
            </div>
            {todayServices.length === 0 ? (
              <p className="py-6 text-center text-sm text-graphite-400">Aucun entretien prévu aujourd'hui.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {todayServices.map((s) => (
                  <li key={s.key}>
                    <Link href={occurrenceHref(s)} className="block rounded-xl border border-graphite-100 bg-graphite-50/60 px-4 py-3.5 transition hover:border-pool-200 hover:bg-white">
                      <div className="text-lg font-bold leading-tight text-graphite-900 sm:text-xl">{displayClient(s)}</div>
                      <div className="mt-2 min-w-0 text-sm text-graphite-500">
                        <span className="truncate">{s.serviceType}</span>
                        {s.scheduledTime && <span className="ml-2 font-medium text-graphite-600">· {formatTime(s.scheduledTime)}</span>}
                      </div>
                      <MemberIdentity
                        member={s.assignee ?? { first_name: null, last_name: null, email: "Non assigné" }}
                        avatarUrl={s.assignee?.photo_path ? avatarByPath.get(s.assignee.photo_path) ?? null : null}
                        avatarSize={32}
                        className="mt-4"
                        nameClassName="text-sm"
                      />
                      <div className="mt-4 border-t border-graphite-100 pt-3">
                        <Badge tone={s.status} className="px-3 py-1 text-sm font-semibold">{SERVICE_STATUS_LABELS[s.status]}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

        </div>

        <div className="space-y-6">
          {can(ctx, "tasks.view") && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-graphite-900">Tâches</h2>
                <Link href="/app/tasks/personal" className="text-sm font-medium text-pool-600 hover:text-pool-700">Voir →</Link>
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
