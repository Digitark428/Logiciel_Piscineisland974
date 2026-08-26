import Link from "next/link";
import { requireContext, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { formatDate, formatDateWithWeekday, formatTime, operationalClientName, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { todayInReunion } from "@/lib/utils/date";
import { FinancialCarousel } from "@/components/app/FinancialCarousel";
import { getMaintenanceOccurrences, occurrenceHref, type MaintenanceOccurrence } from "@/lib/services/queries";
import { signedUrls } from "@/lib/storage";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { Icon } from "@/components/app/icons";

const KPI_TONES = {
  pool: {
    surface: "border-pool-100/80 bg-gradient-to-br from-white to-pool-50/90",
    icon: "bg-pool-100/80 text-pool-700",
  },
  coral: {
    surface: "border-coral-100/80 bg-gradient-to-br from-white to-coral-50/90",
    icon: "bg-coral-100/80 text-coral-700",
  },
  emerald: {
    surface: "border-emerald-100/80 bg-gradient-to-br from-white to-emerald-50/70",
    icon: "bg-emerald-100/70 text-emerald-700",
  },
} as const;

function DashboardKpi({
  label,
  value,
  hint,
  tone,
  icon,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  tone: keyof typeof KPI_TONES;
  icon: string;
  href?: string;
}) {
  const colors = KPI_TONES[tone];
  const content = (
    <div className={`group flex min-h-[7.5rem] items-center justify-between gap-4 rounded-[1.35rem] border px-5 py-4 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_8px_24px_rgba(24,58,89,0.025)] ${colors.surface}`}>
      <div>
        <p className="text-sm font-medium text-graphite-500">{label}</p>
        <p className="mt-1 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-graphite-900">{value}</p>
        <p className="mt-2 text-xs text-graphite-400">{hint}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}>
        <Icon name={icon} size={20} />
      </span>
    </div>
  );

  return href ? (
    <Link href={href} prefetch={false} className="rounded-[1.35rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : content;
}

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
    <div className="pb-2">
      <header className="mb-8 pt-1 sm:mb-10 sm:pt-2">
        <p className="text-sm font-medium text-graphite-500">{formatDateWithWeekday(today)} {today.slice(0, 4)}</p>
        <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.045em] text-graphite-900 sm:text-[2.6rem]">
          Bonjour {ctx.membership.first_name ?? ""} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-3 text-sm text-graphite-400">{ctx.workspace.name}</p>
      </header>

      <section aria-label="Indicateurs principaux" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <DashboardKpi label="Aujourd'hui" value={todayServices.length} hint="entretiens" tone="pool" icon="calendar" href="/app/planning" />
        <DashboardKpi label="En cours" value={inProgress.length} hint="en intervention" tone="coral" icon="activity" />
        <DashboardKpi label="Terminées" value={doneCountRes.count ?? 0} hint="au total" tone="emerald" icon="check" />
      </section>

      {ctx.isAdmin && (
        <div className="mt-5 sm:mt-6">
          <FinancialCarousel
            recurringCents={Number(financialMetrics?.recurring_cents ?? 0)}
            oneOffCents={Number(financialMetrics?.one_off_cents ?? 0)}
          />
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:mt-6 lg:grid-cols-3 lg:items-start">
        <section className="rounded-[1.5rem] border border-pool-100/80 bg-gradient-to-br from-pool-50/80 via-white to-coral-50/35 p-5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_10px_30px_rgba(24,58,89,0.025)] sm:p-7 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-graphite-900">Aujourd'hui</h2>
              <p className="mt-1 text-sm text-graphite-500">Entretiens du jour · {formatDateWithWeekday(today)}</p>
            </div>
            <Link prefetch={false} href="/app/planning" className="shrink-0 rounded-lg px-1 py-1 text-sm font-medium text-pool-700 transition hover:text-pool-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2">
              Planning →
            </Link>
          </div>

          {todayServices.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-pool-700 shadow-[0_1px_2px_rgba(24,58,89,0.04)]">
                <Icon name="calendar" size={22} />
              </span>
              <p className="mt-5 text-base font-semibold text-graphite-800">Votre journée est libre.</p>
              <p className="mt-1 text-sm text-graphite-500">Aucun entretien prévu aujourd'hui.</p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {todayServices.map((service) => (
                <li key={service.key}>
                  <Link
                    prefetch={false}
                    href={occurrenceHref(service)}
                    className="block h-full rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_1px_2px_rgba(24,58,89,0.025)] transition hover:border-pool-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base font-semibold leading-snug tracking-[-0.015em] text-graphite-900">{displayClient(service)}</p>
                      <Badge tone={service.status} className="shrink-0">{SERVICE_STATUS_LABELS[service.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-graphite-500">
                      {service.serviceType}
                      {service.scheduledTime && <span className="font-medium text-graphite-600"> · {formatTime(service.scheduledTime)}</span>}
                    </p>
                    <MemberIdentity
                      member={service.assignee ?? { first_name: null, last_name: null, email: "Non assigné" }}
                      avatarUrl={service.assignee?.photo_path ? avatarByPath.get(service.assignee.photo_path) ?? null : null}
                      avatarSize={30}
                      className="mt-4 border-t border-graphite-100/80 pt-3"
                      nameClassName="text-sm"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          {can(ctx, "tasks.view") && (
            <section className="rounded-[1.5rem] border border-coral-100/70 bg-gradient-to-br from-white to-coral-50/75 p-5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_8px_24px_rgba(24,58,89,0.025)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-graphite-900">Tâches</h2>
                <Link prefetch={false} href="/app/tasks/personal" className="rounded-lg px-1 py-1 text-sm font-medium text-coral-700 transition hover:text-graphite-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2">
                  Voir →
                </Link>
              </div>
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-graphite-400">Aucune tâche en attente.</p>
              ) : (
                <ul className="mt-4 divide-y divide-coral-100/70">
                  {tasks.map((task: any) => (
                    <li key={task.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-coral-400" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-graphite-800">{task.title}</span>
                      {task.due_date && <span className="shrink-0 text-xs text-graphite-400">{formatDate(task.due_date)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {ctx.isAdmin && (
            <section className="rounded-[1.5rem] border border-pool-100/70 bg-gradient-to-br from-white to-pool-50/55 p-5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_8px_24px_rgba(24,58,89,0.02)] sm:p-6">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-graphite-900">Activité récente</h2>
              {activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-graphite-400">Rien pour le moment.</p>
              ) : (
                <ul className="mt-4 divide-y divide-pool-100/70">
                  {activity.map((item: any) => (
                    <li key={item.id} className="flex gap-3 py-3 first:pt-1 last:pb-0">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pool-400" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm leading-5 text-graphite-700">{item.summary ?? item.action}</p>
                        <p className="mt-0.5 text-xs text-graphite-400">{item.actor_label ?? "—"} · {formatDate(item.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
