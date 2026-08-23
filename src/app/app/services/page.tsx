import Link from "next/link";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { can, requirePermission } from "@/lib/auth/context";
import { getMemberOptions } from "@/lib/db/queries";
import { SERVICE_STATUSES, WEEKDAYS } from "@/lib/services/constants";
import { getMaintenanceOccurrences, occurrenceAssigneeName, occurrenceHref, type MaintenanceOccurrence } from "@/lib/services/queries";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { todayInReunion } from "@/lib/utils/date";
import { clientName, formatDate, formatTime, operationalClientName, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { addDays, parseAnchor, periodLabel, startOfWeek, toISO } from "@/app/app/planning/planning-utils";

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

function OccurrenceCard({ occurrence, avatarUrl }: { occurrence: MaintenanceOccurrence; avatarUrl?: string }) {
  return (
    <Link href={occurrenceHref(occurrence)} className="block rounded-xl border border-graphite-100 bg-white p-4 transition hover:border-pool-200 hover:shadow-sm">
      <div className="text-lg font-bold leading-tight text-graphite-900">{operationalClientName(occurrence.client)}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-graphite-700">{occurrence.serviceType}</span>
        {occurrence.scheduledTime && <span className="text-xs font-medium text-graphite-500">· {formatTime(occurrence.scheduledTime)}</span>}
      </div>
      <MemberIdentity
        member={occurrence.assignee ?? { first_name: null, last_name: null, email: "Non assigné" }}
        avatarUrl={avatarUrl}
        avatarSize={32}
        className="mt-4 min-w-0"
        nameClassName="truncate text-sm text-graphite-800"
      />
      <div className="mt-4 border-t border-graphite-100 pt-3">
        <Badge tone={occurrence.status} className="px-3 py-1 text-sm font-semibold">{SERVICE_STATUS_LABELS[occurrence.status]}</Badge>
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
  const photoPaths = Array.from(new Set(occurrences.map((occurrence) => occurrence.assignee?.photo_path).filter((path): path is string => Boolean(path))));
  const avatarByPath = await signedUrls("avatars", photoPaths);
  const preserved = { q: searchParams.q, assignee: searchParams.assignee, status: searchParams.status };

  return (
    <div>
      <PageHeader
        title="Mes entretiens"
        description="Retrouvez les passages hebdomadaires et les entretiens ponctuels, semaine après semaine."
        action={can(ctx, "services.create") ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/app/services/new?kind=contract" className="btn-primary">+ Nouveau contrat</Link>
            <Link href="/app/services/new?kind=one_off" className="btn-secondary">+ Entretien ponctuel</Link>
          </div>
        ) : undefined}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={queryHref({ ...preserved, date: toISO(addDays(weekStart, -7)) })} className="btn-secondary px-3" aria-label="Semaine précédente">←</Link>
          <Link href={queryHref({ ...preserved, date: today })} className="btn-secondary">Cette semaine</Link>
          <Link href={queryHref({ ...preserved, date: toISO(addDays(weekStart, 7)) })} className="btn-secondary px-3" aria-label="Semaine suivante">→</Link>
        </div>
        <h2 className="text-base font-semibold text-graphite-800">Semaine du {periodLabel("week", weekStart)}</h2>
      </div>

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" action="/app/services">
        <input type="hidden" name="date" value={start} />
        <div className={seesAll ? "lg:col-span-2" : "sm:col-span-2 lg:col-span-3"}>
          <label htmlFor="q" className="sr-only">Rechercher</label>
          <input id="q" name="q" className="input" defaultValue={searchParams.q ?? ""} placeholder="Rechercher un client, un entretien…" />
        </div>
        {seesAll && (
          <select name="assignee" className="input" defaultValue={searchParams.assignee ?? ""} aria-label="Technicien">
            <option value="">Tous les techniciens</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
          </select>
        )}
        <select name="status" className="input" defaultValue={searchParams.status ?? ""} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {SERVICE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <button className="btn-secondary sm:col-start-2 lg:col-start-auto">Filtrer</button>
      </form>

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
          <div className="space-y-3">
            {selectedDay.occurrences.map((occurrence) => <OccurrenceCard key={occurrence.key} occurrence={occurrence} avatarUrl={occurrence.assignee?.photo_path ? avatarByPath.get(occurrence.assignee.photo_path) : undefined} />)}
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
                <OccurrenceCard key={occurrence.key} occurrence={occurrence} avatarUrl={occurrence.assignee?.photo_path ? avatarByPath.get(occurrence.assignee.photo_path) : undefined} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
