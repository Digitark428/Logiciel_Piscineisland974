import Link from "next/link";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { clientName, formatTime } from "@/lib/utils/format";
import { dateOnlyToUtcDate, todayInReunion } from "@/lib/utils/date";
import type { PlanningEvent, Task } from "@/lib/db/types";
import { getMaintenanceOccurrences, occurrenceHref, type MaintenanceOccurrence } from "@/lib/services/queries";
import {
  PLANNING_TYPE_LABELS,
  parsePlanningTypes,
  planningTypesParam,
  type PlanningType,
} from "@/lib/planning-events";
import {
  AddPlanningEventButton,
  PlanningEventButton,
  PlanningEventProvider,
} from "./PlanningEventDialog";
import {
  type PlanningView, parseAnchor, rangeFor, navFor, toISO,
  addDays, startOfWeek, startOfMonth, weekdayShort, monthName, periodLabel,
} from "./planning-utils";

const STATUS_DOT: Record<string, string> = {
  planned: "bg-pool-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-400",
  postponed: "bg-coral-400",
  cancelled: "bg-graphite-300",
  todo: "bg-graphite-300",
  done: "bg-emerald-400",
};

const FILTER_TONES: Record<PlanningType, { active: string; dot: string }> = {
  maintenance: {
    active: "border-pool-200 bg-pool-50/90 text-pool-900 shadow-[0_1px_2px_rgba(24,58,89,0.025)]",
    dot: "bg-pool-400",
  },
  task: {
    active: "border-amber-200 bg-amber-50/80 text-amber-900 shadow-[0_1px_2px_rgba(24,58,89,0.025)]",
    dot: "bg-amber-400",
  },
  event: {
    active: "border-coral-200 bg-coral-50/90 text-graphite-900 shadow-[0_1px_2px_rgba(24,58,89,0.025)]",
    dot: "bg-coral-500",
  },
};

type PlanningTask = Pick<Task, "id" | "title" | "category" | "status" | "due_date" | "due_time">;
type CalendarItem =
  | { kind: "maintenance"; service: MaintenanceOccurrence }
  | { kind: "task"; task: PlanningTask }
  | { kind: "event"; event: PlanningEvent };

interface SearchParams {
  view?: string;
  date?: string;
  types?: string;
}

function planningHref(view: PlanningView, date: Date | string, types: PlanningType[]): string {
  const params = new URLSearchParams({ view, date: typeof date === "string" ? date : toISO(date) });
  const typeParam = planningTypesParam(types);
  if (typeParam !== undefined) params.set("types", typeParam);
  return `/app/planning?${params.toString()}`;
}

function itemSortValue(item: CalendarItem): string {
  if (item.kind === "maintenance") return item.service.scheduledTime ?? "00:00";
  if (item.kind === "task") return item.task.due_time ?? "00:00";
  return item.event.all_day ? "00:00" : item.event.start_time ?? "00:00";
}

export default async function PlanningPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePermission("planning.view");
  const supabase = createClient();
  const view = (["day", "week", "month", "year"].includes(searchParams.view ?? "") ? searchParams.view : "week") as PlanningView;
  const anchor = parseAnchor(searchParams.date);
  const { start, end } = rangeFor(view, anchor);
  const canSeeTasks = can(ctx, "tasks.view");
  const selectedTypes = parsePlanningTypes(searchParams.types).filter((type) => type !== "task" || canSeeTasks);
  const selected = new Set(selectedTypes);
  const seesAllServices = ctx.isAdmin || can(ctx, "services.edit");
  const startIso = toISO(start);
  const endIso = toISO(end);

  const loadEvents = async (): Promise<PlanningEvent[]> => {
    if (!selected.has("event")) return [];
    const { data } = await supabase
      .from("planning_events")
      .select("id,workspace_id,owner_membership_id,title,event_date,start_time,end_time,all_day,description,created_at,updated_at")
      .eq("workspace_id", ctx.workspace.id)
      .eq("owner_membership_id", ctx.membership.id)
      .gte("event_date", startIso)
      .lte("event_date", endIso)
      .order("event_date")
      .order("start_time");
    return (data ?? []) as PlanningEvent[];
  };

  const loadTasks = async (): Promise<PlanningTask[]> => {
    if (!selected.has("task") || !canSeeTasks) return [];
    const { data } = await supabase
      .from("tasks")
      .select("id,title,category,status,due_date,due_time")
      .eq("workspace_id", ctx.workspace.id)
      .gte("due_date", startIso)
      .lte("due_date", endIso)
      .order("due_date")
      .order("due_time");
    return (data ?? []) as PlanningTask[];
  };

  const [services, events, tasks] = await Promise.all([
    selected.has("maintenance")
      ? getMaintenanceOccurrences(supabase, {
          workspaceId: ctx.workspace.id,
          start: startIso,
          end: endIso,
          assignedMembershipId: seesAllServices ? undefined : ctx.membership.id,
        })
      : Promise.resolve([]),
    loadEvents(),
    loadTasks(),
  ]);

  const byDate = new Map<string, CalendarItem[]>();
  const addItem = (date: string, item: CalendarItem) => {
    const list = byDate.get(date) ?? [];
    list.push(item);
    byDate.set(date, list);
  };
  for (const service of services) addItem(service.scheduledDate, { kind: "maintenance", service });
  for (const event of events) addItem(event.event_date, { kind: "event", event });
  for (const task of tasks) if (task.due_date) addItem(task.due_date, { kind: "task", task });
  for (const list of byDate.values()) list.sort((a, b) => itemSortValue(a).localeCompare(itemSortValue(b), "fr"));

  const availableTypes: PlanningType[] = canSeeTasks ? ["maintenance", "task", "event"] : ["maintenance", "event"];
  const link = (nextView: PlanningView, date: Date | string) => planningHref(nextView, date, selectedTypes);
  const prev = navFor(view, anchor, -1);
  const next = navFor(view, anchor, 1);

  return (
    <PlanningEventProvider defaultDate={toISO(anchor)}>
      <div>
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-graphite-900 sm:text-[1.85rem]">Planning</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite-500">Entretiens, tâches datées et événements personnels réunis dans une même vue.</p>
          </div>
          <AddPlanningEventButton date={toISO(anchor)} />
        </header>

        <fieldset className="mb-5 rounded-[1.3rem] border border-graphite-100/80 bg-white/90 p-2.5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_7px_22px_rgba(24,58,89,0.025)] sm:mb-6 sm:p-3">
          <legend className="sr-only">Types d'éléments du planning</legend>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type) => {
              const active = selected.has(type);
              const tone = FILTER_TONES[type];
              const nextTypes = active
                ? selectedTypes.length > 1 ? selectedTypes.filter((item) => item !== type) : selectedTypes
                : [...selectedTypes, type];
              return (
                <Link
                  key={type}
                  prefetch={false}
                  href={planningHref(view, anchor, nextTypes)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 ${active ? tone.active : "border-transparent bg-graphite-50/70 text-graphite-500 hover:border-graphite-100 hover:bg-white"}`}
                >
                  <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
                  {PLANNING_TYPE_LABELS[type]}
                </Link>
              );
            })}
            {(["Chantier", "Dépannage"] as const).map((label) => (
              <button key={label} type="button" disabled className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-transparent bg-graphite-50/60 px-3.5 py-2 text-[13px] text-graphite-400 opacity-70">
                {label} <span className="rounded-md bg-graphite-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]">Bientôt</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-graphite-100/80 bg-white/90 p-2.5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_8px_24px_rgba(24,58,89,0.025)] sm:mb-6 sm:p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link prefetch={false} href={link(view, prev)} className="btn-secondary h-11 w-11 rounded-xl p-0 shadow-none" aria-label="Période précédente">‹</Link>
            <Link prefetch={false} href={link(view, todayInReunion())} className="btn-secondary rounded-xl px-3.5 text-[13px] shadow-none">Aujourd'hui</Link>
            <Link prefetch={false} href={link(view, next)} className="btn-secondary h-11 w-11 rounded-xl p-0 shadow-none" aria-label="Période suivante">›</Link>
            <h2 className="min-w-0 basis-full px-1 pt-1 text-base font-semibold capitalize tracking-[-0.015em] text-graphite-800 sm:ml-2 sm:basis-auto sm:px-0 sm:pt-0 sm:text-lg">{periodLabel(view, anchor)}</h2>
          </div>
          <div className="flex gap-0.5 rounded-xl bg-graphite-50 p-1 ring-1 ring-inset ring-graphite-100" role="navigation" aria-label="Vue du planning">
            {(["day", "week", "month", "year"] as PlanningView[]).map((nextView) => (
              <Link key={nextView} prefetch={false} href={link(nextView, anchor)}
                aria-current={view === nextView ? "page" : undefined}
                className={`rounded-lg px-2.5 py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 sm:px-3.5 sm:text-sm ${view === nextView ? "bg-white text-graphite-900 shadow-[0_1px_3px_rgba(24,58,89,0.08)] ring-1 ring-inset ring-graphite-100" : "text-graphite-500 hover:bg-white/70 hover:text-graphite-800"}`}>
                {nextView === "day" ? "Jour" : nextView === "week" ? "Semaine" : nextView === "month" ? "Mois" : "Année"}
              </Link>
            ))}
          </div>
        </div>

        {view === "day" && <DayView items={byDate.get(toISO(anchor)) ?? []} />}
        {view === "week" && <WeekView start={startOfWeek(anchor)} byDate={byDate} />}
        {view === "month" && <MonthView anchor={anchor} byDate={byDate} dayHref={(iso) => link("day", iso)} />}
        {view === "year" && <YearView year={anchor.getUTCFullYear()} byDate={byDate} monthHref={(iso) => link("month", iso)} />}
      </div>
    </PlanningEventProvider>
  );
}

function ServiceRow({ service }: { service: MaintenanceOccurrence }) {
  return (
    <Link prefetch={false} href={occurrenceHref(service)} className="relative block overflow-hidden rounded-[0.9rem] border border-pool-100/90 bg-gradient-to-br from-white to-pool-50/70 px-2.5 py-2.5 shadow-[0_1px_2px_rgba(24,58,89,0.02)] transition hover:border-pool-200 hover:bg-pool-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2">
      <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-full bg-pool-400" aria-hidden />
      <span className="block truncate text-[13px] font-semibold leading-4 text-graphite-800">{clientName(service.client ?? {})}</span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[service.status]}`} aria-hidden />
        {service.scheduledTime && <span className="shrink-0 text-[10px] font-medium text-graphite-400">{formatTime(service.scheduledTime)}</span>}
      </span>
    </Link>
  );
}

function TaskRow({ task }: { task: PlanningTask }) {
  const href = task.category === "personal" ? "/app/tasks/personal" : "/app/tasks/assign";
  return (
    <Link prefetch={false} href={href} className="relative block overflow-hidden rounded-[0.9rem] border border-amber-100/90 bg-gradient-to-br from-white to-amber-50/70 px-2.5 py-2.5 shadow-[0_1px_2px_rgba(24,58,89,0.02)] transition hover:border-amber-200 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
      <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-full bg-amber-400" aria-hidden />
      <span className="block truncate text-[13px] font-semibold leading-4 text-graphite-800">{task.title}</span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} aria-hidden />
        {task.due_time && <span className="shrink-0 text-[10px] font-medium text-graphite-400">{formatTime(task.due_time)}</span>}
      </span>
    </Link>
  );
}

function CalendarRow({ item }: { item: CalendarItem }) {
  if (item.kind === "maintenance") return <ServiceRow service={item.service} />;
  if (item.kind === "task") return <TaskRow task={item.task} />;
  return <PlanningEventButton event={item.event} />;
}

function DayView({ items }: { items: CalendarItem[] }) {
  return (
    <Card className="min-h-[28rem] rounded-[1.5rem] border-graphite-100/90 bg-white p-4 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_10px_30px_rgba(24,58,89,0.03)] sm:p-5">
      {items.length === 0 ? (
        <p className="flex min-h-[22rem] items-center justify-center text-center text-sm text-graphite-400">Aucun élément ce jour.</p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <CalendarRow key={calendarItemKey(item)} item={item} />)}</div>
      )}
    </Card>
  );
}

function WeekView({ start, byDate }: { start: Date; byDate: Map<string, CalendarItem[]> }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const today = todayInReunion();
  return (
    <section className="overflow-hidden rounded-[1.55rem] border border-graphite-100/90 bg-graphite-100/60 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_10px_30px_rgba(24,58,89,0.035)]" aria-label="Planning de la semaine">
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map((day) => {
        const iso = toISO(day);
        const list = byDate.get(iso) ?? [];
        return (
          <section key={iso} className={`min-w-0 px-3 py-4 sm:min-h-[20rem] xl:min-h-[38rem] ${iso === today ? "bg-pool-50/55" : "bg-white"}`}>
            <header className={`mb-3 border-b pb-3 text-center ${iso === today ? "border-pool-100" : "border-graphite-100/80"}`}>
              <h3 className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${iso === today ? "text-pool-700" : "text-graphite-400"}`}>{weekdayShort(day)}</h3>
              <p className={`mt-1 text-2xl font-semibold leading-none tracking-[-0.04em] ${iso === today ? "text-pool-800" : "text-graphite-900"}`}>{day.getUTCDate()}</p>
              {iso === today && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-pool-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-pool-500" aria-hidden />
                  Aujourd'hui
                </p>
              )}
            </header>
            <div className="space-y-2.5">
              {list.length === 0 ? <span className="flex min-h-24 items-center justify-center text-xs text-graphite-300">—</span> : list.map((item) => <CalendarRow key={calendarItemKey(item)} item={item} />)}
            </div>
          </section>
        );
      })}
      </div>
    </section>
  );
}

function MonthView({ anchor, byDate, dayHref }: { anchor: Date; byDate: Map<string, CalendarItem[]>; dayHref: (iso: string) => string }) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const today = todayInReunion();
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-graphite-100/90 bg-white p-2 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_10px_30px_rgba(24,58,89,0.03)] sm:p-3">
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-graphite-400 sm:text-xs">
        {(["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const).map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-graphite-100/70 ring-1 ring-graphite-100/70">
        {cells.map((day) => {
          const iso = toISO(day);
          const list = byDate.get(iso) ?? [];
          const inMonth = day.getUTCMonth() === anchor.getUTCMonth();
          return (
            <div key={iso} className={`min-h-[80px] min-w-0 p-1 text-left sm:min-h-[88px] sm:p-1.5 ${inMonth ? "bg-white" : "bg-graphite-50/70"} ${iso === today ? "bg-pool-50/70" : ""}`}>
              <Link prefetch={false} href={dayHref(iso)} className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md text-xs font-semibold transition hover:bg-pool-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 ${iso === today ? "bg-pool-100 text-pool-800" : inMonth ? "text-graphite-700" : "text-graphite-300"}`}>
                {day.getUTCDate()}
              </Link>
              <div className="mt-0.5 space-y-0.5">
                {list.slice(0, 3).map((item) => <CalendarCompact key={calendarItemKey(item)} item={item} />)}
                {list.length > 3 && <Link prefetch={false} href={dayHref(iso)} className="block text-[10px] text-graphite-400 hover:text-pool-700">+{list.length - 3}</Link>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CalendarCompact({ item }: { item: CalendarItem }) {
  if (item.kind === "event") return <PlanningEventButton event={item.event} compact />;
  if (item.kind === "task") {
    const href = item.task.category === "personal" ? "/app/tasks/personal" : "/app/tasks/assign";
    return (
      <Link prefetch={false} href={href} className="flex min-w-0 items-center gap-1 rounded px-0.5 py-0.5 hover:bg-amber-50">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
        <span className="truncate text-[11px] text-graphite-600">{item.task.title}</span>
      </Link>
    );
  }
  return (
    <Link prefetch={false} href={occurrenceHref(item.service)} className="flex min-w-0 items-center gap-1 rounded px-0.5 py-0.5 hover:bg-pool-50">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[item.service.status]}`} />
      <span className="truncate text-[11px] text-graphite-600">{clientName(item.service.client ?? {})}</span>
    </Link>
  );
}

function YearView({ year, byDate, monthHref }: { year: number; byDate: Map<string, CalendarItem[]>; monthHref: (iso: string) => string }) {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const [iso, list] of byDate) {
    const month = dateOnlyToUtcDate(iso)?.getUTCMonth();
    if (month !== undefined) counts[month] += list.length;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {counts.map((count, index) => (
        <Link key={monthName(index)} prefetch={false} href={monthHref(`${year}-${String(index + 1).padStart(2, "0")}-01`)} className="rounded-[1.2rem] border border-graphite-100/90 bg-gradient-to-br from-white to-pool-50/45 p-5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_7px_22px_rgba(24,58,89,0.025)] transition hover:border-pool-200 hover:bg-pool-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2">
          <div className="text-sm font-medium capitalize text-graphite-500">{monthName(index)}</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-pool-700">{count}</div>
          <div className="mt-1 text-xs text-graphite-400">élément{count > 1 ? "s" : ""}</div>
        </Link>
      ))}
    </div>
  );
}

function calendarItemKey(item: CalendarItem): string {
  if (item.kind === "maintenance") return `maintenance-${item.service.key}`;
  if (item.kind === "task") return `task-${item.task.id}`;
  return `event-${item.event.id}`;
}
