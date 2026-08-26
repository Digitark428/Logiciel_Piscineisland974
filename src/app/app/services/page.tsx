import Link from "next/link";
import { Badge } from "@/components/ui";
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

const OCCURRENCE_TONES: Record<string, { card: string; accent: string }> = {
  planned: {
    card: "border-pool-100/90 bg-gradient-to-br from-white to-pool-50/70 hover:border-pool-200",
    accent: "bg-pool-400",
  },
  in_progress: {
    card: "border-coral-100/90 bg-gradient-to-br from-white to-coral-50/75 hover:border-coral-200",
    accent: "bg-coral-400",
  },
  completed: {
    card: "border-emerald-100/90 bg-gradient-to-br from-white to-emerald-50/70 hover:border-emerald-200",
    accent: "bg-emerald-400",
  },
  postponed: {
    card: "border-coral-100/90 bg-gradient-to-br from-white to-coral-50/60 hover:border-coral-200",
    accent: "bg-coral-300",
  },
  cancelled: {
    card: "border-graphite-100 bg-gradient-to-br from-white to-graphite-50 hover:border-graphite-200",
    accent: "bg-graphite-300",
  },
};

function OccurrenceCard({ occurrence }: { occurrence: MaintenanceOccurrence }) {
  const tone = OCCURRENCE_TONES[occurrence.status] ?? OCCURRENCE_TONES.planned;

  return (
    <Link
      prefetch={false}
      href={occurrenceHref(occurrence)}
      className={`relative block overflow-hidden rounded-[0.95rem] border px-3 py-3 shadow-[0_1px_2px_rgba(24,58,89,0.025)] transition hover:-translate-y-px hover:shadow-[0_5px_16px_rgba(24,58,89,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 ${tone.card}`}
    >
      <span className={`absolute inset-y-3 left-0 w-0.5 rounded-r-full ${tone.accent}`} aria-hidden />
      <div className="line-clamp-2 text-[0.92rem] font-semibold leading-[1.15rem] tracking-[-0.012em] text-graphite-900">{operationalClientName(occurrence.client)}</div>
      <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-graphite-500">
        <span className="truncate">{occurrence.serviceType}</span>
        {occurrence.scheduledTime && <span className="shrink-0 font-medium">· {formatTime(occurrence.scheduledTime)}</span>}
      </div>
      <div className="mt-2.5">
        <Badge tone={occurrence.status} className="px-2 py-0.5 text-[10px] font-semibold">{SERVICE_STATUS_LABELS[occurrence.status]}</Badge>
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
      <div className="mb-6 flex items-center justify-between gap-4 sm:mb-7">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-graphite-900 sm:text-[1.85rem]">Mes entretiens</h1>
        {canCreate && (
          <div className="flex shrink-0 gap-2">
            <Link prefetch={false} href="/app/services/new?kind=contract" className="btn-primary rounded-xl px-3 text-[13px] shadow-[0_2px_7px_rgba(244,139,130,0.12)] sm:px-4" title="Nouveau contrat">+ Contrat</Link>
            <Link prefetch={false} href="/app/services/new?kind=one_off" className="btn-secondary rounded-xl px-3 text-[13px] shadow-none sm:px-4" title="Nouvel entretien ponctuel">+ Ponctuel</Link>
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-graphite-100/80 bg-white/90 p-2.5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_8px_24px_rgba(24,58,89,0.025)] sm:mb-6 sm:p-3">
        <div className="flex items-center gap-2">
          <Link prefetch={false} href={queryHref({ ...preserved, date: toISO(addDays(weekStart, -7)) })} className="btn-secondary h-11 w-11 rounded-xl p-0 shadow-none" aria-label="Semaine précédente">←</Link>
          <Link prefetch={false} href={queryHref({ ...preserved, date: today })} className="btn-secondary rounded-xl px-3.5 text-[13px] shadow-none">Cette semaine</Link>
          <Link prefetch={false} href={queryHref({ ...preserved, date: toISO(addDays(weekStart, 7)) })} className="btn-secondary h-11 w-11 rounded-xl p-0 shadow-none" aria-label="Semaine suivante">→</Link>
        </div>
        <ServicesFilterPanel
          date={start}
          query={searchParams.q ?? ""}
          assignee={searchParams.assignee ?? ""}
          status={searchParams.status ?? ""}
          members={members}
          showAssignee={seesAll}
        />
        <h2 className="min-w-0 flex-1 basis-full px-1 py-1 text-sm font-medium text-graphite-500 sm:basis-auto sm:py-0 sm:text-right">
          Semaine du {periodLabel("week", weekStart)}
        </h2>
      </div>

      <div className="mb-4 overflow-hidden rounded-[1.35rem] border border-graphite-100/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_7px_22px_rgba(24,58,89,0.025)] md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {days.map((day) => (
            <Link
              key={day.date}
              prefetch={false}
              href={queryHref({ ...preserved, date: start, day: day.date })}
              className={`min-w-[4.65rem] rounded-xl px-3 py-2.5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 ${day.date === selectedDate ? "bg-pool-50 text-pool-800 ring-1 ring-inset ring-pool-200" : day.date === today ? "text-pool-700 hover:bg-pool-50/60" : "text-graphite-500 hover:bg-graphite-50"}`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]">{day.short}</span>
              <span className="mt-0.5 block text-xl font-semibold tracking-[-0.03em]">{Number(day.date.slice(-2))}</span>
              <span className="mt-0.5 block text-[0.65rem] text-graphite-400">{day.occurrences.length} entretien{day.occurrences.length > 1 ? "s" : ""}</span>
            </Link>
          ))}
        </div>
      </div>

      <section className="rounded-[1.4rem] border border-graphite-100/80 bg-white p-4 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_8px_24px_rgba(24,58,89,0.025)] md:hidden">
        <h3 className="border-b border-graphite-100 pb-3 text-sm font-semibold text-graphite-800">{formatDate(selectedDay.date)}</h3>
        {selectedDay.occurrences.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-center text-sm text-graphite-400">Aucun entretien</div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {selectedDay.occurrences.map((occurrence) => <OccurrenceCard key={occurrence.key} occurrence={occurrence} />)}
          </div>
        )}
      </section>

      <section className="hidden overflow-hidden rounded-[1.55rem] border border-graphite-100/90 bg-graphite-100/60 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_10px_30px_rgba(24,58,89,0.035)] md:block" aria-label={`Entretiens — semaine du ${periodLabel("week", weekStart)}`}>
        <div className="grid gap-px md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((day) => (
            <section key={day.date} className={`min-w-0 px-3 py-4 md:min-h-[18rem] xl:min-h-[31rem] ${day.date === today ? "bg-pool-50/55" : "bg-white"}`}>
              <header className={`mb-3 border-b pb-3 text-center ${day.date === today ? "border-pool-100" : "border-graphite-100/80"}`}>
                <h3 className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${day.date === today ? "text-pool-700" : "text-graphite-400"}`}>{day.short}</h3>
                <p className={`mt-1 text-2xl font-semibold leading-none tracking-[-0.04em] ${day.date === today ? "text-pool-800" : "text-graphite-900"}`}>{Number(day.date.slice(-2))}</p>
                {day.date === today && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-pool-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-pool-500" aria-hidden />
                    Aujourd'hui
                  </p>
                )}
              </header>
              <div className="space-y-2.5">
                {day.occurrences.length === 0 ? (
                  <p className="flex min-h-24 items-center justify-center px-2 text-center text-[11px] text-graphite-300">Aucun entretien</p>
                ) : day.occurrences.map((occurrence) => (
                  <OccurrenceCard key={occurrence.key} occurrence={occurrence} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
