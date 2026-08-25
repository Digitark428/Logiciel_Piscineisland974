import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { can, requirePermission } from "@/lib/auth/context";
import { getMemberOptions } from "@/lib/db/queries";
import { WEEKDAYS } from "@/lib/services/constants";
import { getMaintenanceOccurrences, occurrenceAssigneeName, occurrenceHref, type MaintenanceOccurrence } from "@/lib/services/queries";
import { createClient } from "@/lib/supabase/server";
import { todayInReunion } from "@/lib/utils/date";
import { clientName, formatDate, formatTime, operationalClientName, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { addDays, parseAnchor, periodLabel, startOfWeek, toISO } from "@/app/app/planning/planning-utils";
import { ServicesFilterPanel } from "./ServicesFilterPanel";

interface SearchParams {
  date?: string;
  day?: string;
  q?: string;
  assignee?: string;
  status?: string;
}

function queryHref(values: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return `/app/services?${params.toString()}`;
}

function OccurrenceCard({ occurrence }: { occurrence: MaintenanceOccurrence }) {
  return (
    <Link href={occurrenceHref(occurrence)} className="block rounded-xl border border-graphite-100 bg-white px-3 py-2.5 transition hover:border-pool-200 hover:shadow-sm">
      <div className="truncate text-base font-bold leading-tight text-graphite-900">{operationalClientName(occurrence.client)}</div>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-graphite-500">
        <span className="truncate">{occurrence.serviceType}</span>
        {occurrence.scheduledTime && <span className="shrink-0 font-medium">· {formatTime(occurrence.scheduledTime)}</span>}
      </div>
      <div className="mt-2">
        <Badge tone={occurrence.status} className="px-2.5 py-0.5 text-xs font-semibold">{SERVICE_STATUS_LABELS[occurrence.status]}</Badge>
      </div>
    </Link>
  );
}

export default async function ServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePermission("services.view");
  const supabase = createClient();
  const anchor = parseAnchor(searchParams.date);
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const start = toISO(weekStart);
  const end = toISO(weekEnd);
  const seesAll = ctx.isAdmin || can(ctx, "services.edit");
  const [unfiltered, members] = await Promise.all([
    getMaintenanceOccurrences(supabase, {
      workspaceId: ctx.workspace.id,
      start,
      end,
      assignedMembershipId: seesAll ? undefined : ctx.membership.id,
    }),
    seesAll ? getMemberOptions(supabase, ctx.workspace.id) : Promise.resolve([]),
  ]);

  const normalizedQuery = searchParams.q?.trim().toLocaleLowerCase("fr") ?? "";
  const occurrences = unfiltered.filter((occurrence) => {
    if (searchParams.assignee && occurrence.assignedMembershipId !== searchParams.assignee) return false;
    if (searchParams.status && occurrence.status !== searchParams.status) return false;
    if (!normalizedQuery) return true;
    return [clientName(occurrence.client), occurrence.serviceType, occurrenceAssigneeName(occurrence), occurrence.code]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("fr").includes(normalizedQuery));
  });

  const days = WEEKDAYS.map((weekday, index) => {
    const date = toISO(addDays(weekStart, index));
    return { ...weekday, date, occurrences: occurrences.filter((occurrence) => occurrence.scheduledDate === date) };
  });
  const today = todayInReunion();
  const selectedDate = days.some((day) => day.date === searchParams.day)
    ? searchParams.day!
    : days.some((day) => day.date === today) ? today : start;
  const selectedDay = days.find((day) => day.date === selectedDate)!;
  const preserved = { q: searchParams.q, assignee: searchParams.assignee, status: searchParams.status };
  const canCreate = can(ctx, "services.create");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.025em] text-graphite-900 sm:text-[1.75rem]">Mes entretiens</h1>
        {canCreate && (
          <div className="flex shrink-0 gap-1.5 sm:gap-2">
            <Link href="/app/services/new?kind=contract" className="btn-primary px-2.5 text-[13px] sm:px-3" title="Nouveau contrat">+ Contrat</Link>
            <Link href="/app/services/new?kind=one_off" className="btn-secondary px-2.5 text-[13px] sm:px-3" title="Nouvel entretien ponctuel">+ Ponctuel</Link>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-graphite-200 bg-white/80 p-2 shadow-card">
        <div className="flex items-center gap-2">
          <Link href={queryHref({ ...preserved, date: toISO(addDays(weekStart, -7)) })} className="btn-secondary px-3" aria-label="Semaine précédente">←</Link>
          <Link href={queryHref({ ...preserved, date: today })} className="btn-secondary px-3">Cette semaine</Link>
          <Link href={queryHref({ ...preserved, date: toISO(addDays(weekStart, 7)) })} className="btn-secondary px-3" aria-label="Semaine suivante">→</Link>
        </div>
        <ServicesFilterPanel
          date={start}
          query={searchParams.q ?? ""}
          assignee={searchParams.assignee ?? ""}
          status={searchParams.status ?? ""}
          members={members}
          showAssignee={seesAll}
        />
        <h2 className="min-w-0 flex-1 basis-full px-1 text-sm font-semibold text-graphite-800 sm:basis-auto sm:text-right">
          Semaine du {periodLabel("week", weekStart)}
        </h2>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {days.map((day) => (
          <Link
            key={day.date}
            href={queryHref({ ...preserved, date: start, day: day.date })}
            className={`min-w-[4.6rem] rounded-xl px-3 py-2 text-center ring-1 ${day.date === selectedDate ? "bg-pool-100 text-pool-800 ring-pool-300" : "bg-white text-graphite-600 ring-graphite-200"}`}
          >
            <span className="block text-xs font-semibold uppercase">{day.short}</span>
            <span className="mt-0.5 block text-lg font-bold">{Number(day.date.slice(-2))}</span>
            <span className="block text-[0.7rem]">{day.occurrences.length} entretien{day.occurrences.length > 1 ? "s" : ""}</span>
          </Link>
        ))}
      </div>

      <div className="md:hidden">
        <h3 className="mb-3 font-semibold text-graphite-800">{formatDate(selectedDay.date)}</h3>
        {selectedDay.occurrences.length === 0 ? (
          <EmptyState title="Aucun entretien" description="Aucun passage prévu ce jour." />
        ) : (
          <div className="space-y-2">
            {selectedDay.occurrences.map((occurrence) => <OccurrenceCard key={occurrence.key} occurrence={occurrence} />)}
          </div>
        )}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-4 min-[1380px]:grid-cols-7">
        {days.map((day) => (
          <section key={day.date} className="min-w-0">
            <div className={`mb-2 rounded-xl px-2 py-2 text-center ${day.date === today ? "bg-pool-100 text-pool-800" : "bg-graphite-50 text-graphite-600"}`}>
              <div className="text-xs font-semibold uppercase">{day.short}</div>
              <div className="text-lg font-bold">{Number(day.date.slice(-2))}</div>
            </div>
            <div className="space-y-2">
              {day.occurrences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-graphite-200 px-2 py-6 text-center text-xs text-graphite-400">Aucun</div>
              ) : day.occurrences.map((occurrence) => (
                <OccurrenceCard key={occurrence.key} occurrence={occurrence} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
