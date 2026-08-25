import Link from "next/link";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
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
        <PageHeader
          title="Planning"
          description="Entretiens, tâches datées et événements personnels réunis dans une même vue."
          action={<AddPlanningEventButton date={toISO(anchor)} />}
        />

        <fieldset className="mb-4">
          <legend className="sr-only">Types d'éléments du planning</legend>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type) => {
              const active = selected.has(type);
              const nextTypes = active
                ? selectedTypes.length > 1 ? selectedTypes.filter((item) => item !== type) : selectedTypes
                : [...selectedTypes, type];
              return (
                <Link
                  key={type}
                  href={planningHref(view, anchor, nextTypes)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? "border-pool-300 bg-pool-50 text-graphite-900" : "border-graphite-200 bg-white text-graphite-500 hover:bg-graphite-50"}`}
                >
                  <span className={`h-2 w-2 rounded-full ${type === "event" ? "bg-coral-500" : type === "task" ? "bg-amber-400" : "bg-pool-400"}`} />
                  {PLANNING_TYPE_LABELS[type]}
                </Link>
              );
            })}
            {(["Chantier", "Dépannage"] as const).map((label) => (
              <button key={label} type="button" disabled className="min-h-11 cursor-not-allowed rounded-xl border border-graphite-100 bg-white px-3 py-2 text-sm text-graphite-400 opacity-75">
                {label} <span className="ml-1 text-[10px] uppercase">Bientôt</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href={link(view, prev)} className="btn-secondary px-3" aria-label="Période précédente">‹</Link>
            <Link href={link(view, todayInReunion())} className="btn-secondary px-3">Aujourd'hui</Link>
            <Link href={link(view, next)} className="btn-secondary px-3" aria-label="Période suivante">›</Link>
            <h2 className="min-w-0 basis-full text-base font-semibold capitalize text-graphite-900 sm:ml-2 sm:basis-auto sm:text-lg">{periodLabel(view, anchor)}</h2>
          </div>
          <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-graphite-200">
            {(["day", "week", "month", "year"] as PlanningView[]).map((nextView) => (
              <Link key={nextView} href={link(nextView, anchor)}
                className={`rounded-lg px-2.5 py-2 text-xs font-medium sm:px-3 sm:text-sm ${view === nextView ? "bg-pool-100 text-graphite-900" : "text-graphite-600 hover:bg-graphite-100"}`}>
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
    <Link href={occurrenceHref(service)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-graphite-50">
      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[service.status]}`} />
      {service.scheduledTime && <span className="w-12 shrink-0 text-xs text-graphite-400">{formatTime(service.scheduledTime)}</span>}
      <span className="truncate text-graphite-800">{clientName(service.client ?? {})}</span>
    </Link>
  );
}

function TaskRow({ task }: { task: PlanningTask }) {
  const href = task.category === "personal" ? "/app/tasks/personal" : "/app/tasks/assign";
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/35 px-2 py-1.5 text-sm hover:bg-amber-50">
      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} />
      {task.due_time && <span className="w-12 shrink-0 text-xs text-graphite-400">{formatTime(task.due_time)}</span>}
      <span className="truncate text-graphite-800">{task.title}</span>
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
    <Card>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-graphite-400">Aucun élément ce jour.</p>
      ) : (
        <div className="space-y-1.5">{items.map((item) => <CalendarRow key={calendarItemKey(item)} item={item} />)}</div>
      )}
    </Card>
  );
}

function WeekView({ start, byDate }: { start: Date; byDate: Map<string, CalendarItem[]> }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const today = todayInReunion();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const iso = toISO(day);
        const list = byDate.get(iso) ?? [];
        return (
          <div key={iso} className={`card p-3 ${iso === today ? "ring-2 ring-pool-300" : ""}`}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase text-graphite-400">{weekdayShort(day)}</span>
              <span className="text-lg font-bold text-graphite-800">{day.getUTCDate()}</span>
            </div>
            <div className="space-y-1">
              {list.length === 0 ? <span className="text-xs text-graphite-300">—</span> : list.map((item) => <CalendarRow key={calendarItemKey(item)} item={item} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, byDate, dayHref }: { anchor: Date; byDate: Map<string, CalendarItem[]>; dayHref: (iso: string) => string }) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const today = todayInReunion();
  return (
    <Card className="p-2 sm:p-3">
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-graphite-400 sm:text-xs">
        {(["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const).map((day) => <div key={day} className="py-1">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const iso = toISO(day);
          const list = byDate.get(iso) ?? [];
          const inMonth = day.getUTCMonth() === anchor.getUTCMonth();
          return (
            <div key={iso} className={`min-h-[76px] min-w-0 rounded-lg border p-1 text-left sm:p-1.5 ${inMonth ? "border-graphite-100 bg-white" : "border-transparent bg-graphite-50/50"} ${iso === today ? "ring-2 ring-pool-300" : ""}`}>
              <Link href={dayHref(iso)} className={`inline-flex h-6 min-w-6 items-center justify-center rounded text-xs font-semibold hover:bg-pool-50 ${inMonth ? "text-graphite-700" : "text-graphite-300"}`}>
                {day.getUTCDate()}
              </Link>
              <div className="mt-0.5 space-y-0.5">
                {list.slice(0, 3).map((item) => <CalendarCompact key={calendarItemKey(item)} item={item} />)}
                {list.length > 3 && <Link href={dayHref(iso)} className="block text-[10px] text-graphite-400 hover:text-pool-700">+{list.length - 3}</Link>}
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
      <Link href={href} className="flex min-w-0 items-center gap-1 rounded px-0.5 py-0.5 hover:bg-amber-50">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
        <span className="truncate text-[11px] text-graphite-600">{item.task.title}</span>
      </Link>
    );
  }
  return (
    <Link href={occurrenceHref(item.service)} className="flex min-w-0 items-center gap-1 rounded px-0.5 py-0.5 hover:bg-pool-50">
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {counts.map((count, index) => (
        <Link key={monthName(index)} href={monthHref(`${year}-${String(index + 1).padStart(2, "0")}-01`)} className="card p-5 transition hover:shadow-float">
          <div className="text-sm font-medium text-graphite-500">{monthName(index)}</div>
          <div className="mt-1 text-3xl font-bold text-pool-600">{count}</div>
          <div className="text-xs text-graphite-400">élément{count > 1 ? "s" : ""}</div>
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
