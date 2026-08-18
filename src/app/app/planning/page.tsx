import Link from "next/link";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { clientName, formatTime } from "@/lib/utils/format";
import {
  type PlanningView, parseAnchor, rangeFor, navFor, toISO,
  addDays, startOfWeek, startOfMonth, weekdayShort, monthName, periodLabel,
} from "./planning-utils";

const STATUS_DOT: Record<string, string> = {
  planned: "bg-pool-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-400",
  cancelled: "bg-graphite-300",
};

export default async function PlanningPage({ searchParams }: { searchParams: { view?: string; date?: string } }) {
  const ctx = await requirePermission("planning.view");
  const supabase = createClient();

  const view = (["day", "week", "month", "year"].includes(searchParams.view ?? "") ? searchParams.view : "week") as PlanningView;
  const anchor = parseAnchor(searchParams.date);
  const { start, end } = rangeFor(view, anchor);

  let query = supabase
    .from("services")
    .select("id, scheduled_date, scheduled_time, status, service_type, client:clients(first_name,last_name,company_name)")
    .eq("workspace_id", ctx.workspace.id)
    .gte("scheduled_date", toISO(start))
    .lte("scheduled_date", toISO(end))
    .order("scheduled_time");
  if (!ctx.isAdmin) query = query.eq("assigned_membership_id", ctx.membership.id);
  const { data: services } = await query;

  // Regroupe par date
  const byDate = new Map<string, any[]>();
  for (const s of services ?? []) {
    const arr = byDate.get(s.scheduled_date) ?? [];
    arr.push(s);
    byDate.set(s.scheduled_date, arr);
  }

  const link = (v: PlanningView, d: Date) => `/app/planning?view=${v}&date=${toISO(d)}`;
  const prev = navFor(view, anchor, -1);
  const next = navFor(view, anchor, 1);

  return (
    <div>
      <PageHeader
        title="Planning"
        description="Retrouvez l'ensemble des interventions et prestations programmées de votre équipe."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={link(view, prev)} className="btn-secondary px-3">‹</Link>
          <Link href={link(view, new Date())} className="btn-secondary">Aujourd'hui</Link>
          <Link href={link(view, next)} className="btn-secondary px-3">›</Link>
          <h2 className="ml-2 text-lg font-semibold capitalize text-graphite-900">{periodLabel(view, anchor)}</h2>
        </div>
        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-graphite-200">
          {(["day", "week", "month", "year"] as PlanningView[]).map((v) => (
            <Link key={v} href={link(v, anchor)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === v ? "bg-pool-600 text-white" : "text-graphite-600 hover:bg-graphite-100"}`}>
              {v === "day" ? "Jour" : v === "week" ? "Semaine" : v === "month" ? "Mois" : "Année"}
            </Link>
          ))}
        </div>
      </div>

      {can(ctx, "services.create") && (
        <div className="mb-4">
          <Link href="/app/services/new" className="btn-primary">+ Nouvelle prestation</Link>
        </div>
      )}

      {view === "day" && <DayView services={byDate.get(toISO(anchor)) ?? []} />}
      {view === "week" && <WeekView start={startOfWeek(anchor)} byDate={byDate} />}
      {view === "month" && <MonthView anchor={anchor} byDate={byDate} />}
      {view === "year" && <YearView year={anchor.getFullYear()} byDate={byDate} />}
    </div>
  );
}

function ServiceRow({ s }: { s: any }) {
  return (
    <Link href={`/app/services/${s.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-graphite-50">
      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s.status]}`} />
      <span className="w-12 shrink-0 text-xs text-graphite-400">{formatTime(s.scheduled_time)}</span>
      <span className="truncate text-graphite-800">{clientName(s.client ?? {})}</span>
    </Link>
  );
}

function DayView({ services }: { services: any[] }) {
  return (
    <Card>
      {services.length === 0 ? (
        <p className="py-8 text-center text-sm text-graphite-400">Aucune prestation ce jour.</p>
      ) : (
        <div className="space-y-1">{services.map((s) => <ServiceRow key={s.id} s={s} />)}</div>
      )}
    </Card>
  );
}

function WeekView({ start, byDate }: { start: Date; byDate: Map<string, any[]> }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = toISO(new Date());
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => {
        const iso = toISO(d);
        const list = byDate.get(iso) ?? [];
        return (
          <div key={iso} className={`card p-3 ${iso === today ? "ring-2 ring-pool-300" : ""}`}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase text-graphite-400">{weekdayShort(d)}</span>
              <span className="text-lg font-bold text-graphite-800">{d.getDate()}</span>
            </div>
            <div className="space-y-1">
              {list.length === 0 ? <span className="text-xs text-graphite-300">—</span> : list.map((s) => <ServiceRow key={s.id} s={s} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, byDate }: { anchor: Date; byDate: Map<string, any[]> }) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = toISO(new Date());
  return (
    <Card className="p-3">
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold uppercase text-graphite-400">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const iso = toISO(d);
          const list = byDate.get(iso) ?? [];
          const inMonth = d.getMonth() === anchor.getMonth();
          return (
            <Link key={iso} href={`/app/planning?view=day&date=${iso}`}
              className={`min-h-[76px] rounded-lg border p-1.5 text-left transition hover:border-pool-300 ${inMonth ? "border-graphite-100 bg-white" : "border-transparent bg-graphite-50/50"} ${iso === today ? "ring-2 ring-pool-300" : ""}`}>
              <div className={`text-xs font-semibold ${inMonth ? "text-graphite-700" : "text-graphite-300"}`}>{d.getDate()}</div>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                    <span className="truncate text-[11px] text-graphite-600">{clientName(s.client ?? {})}</span>
                  </div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-graphite-400">+{list.length - 3}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function YearView({ year, byDate }: { year: number; byDate: Map<string, any[]> }) {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const [iso, list] of byDate) {
    const m = new Date(iso + "T00:00:00").getMonth();
    counts[m] += list.length;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {counts.map((c, i) => (
        <Link key={i} href={`/app/planning?view=month&date=${year}-${String(i + 1).padStart(2, "0")}-01`}
          className="card p-5 transition hover:shadow-float">
          <div className="text-sm font-medium text-graphite-500">{monthName(i)}</div>
          <div className="mt-1 text-3xl font-bold text-pool-600">{c}</div>
          <div className="text-xs text-graphite-400">prestation(s)</div>
        </Link>
      ))}
    </div>
  );
}
