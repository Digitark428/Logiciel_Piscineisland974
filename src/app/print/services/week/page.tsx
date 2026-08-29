import Image from "next/image";
import { can, requirePermission } from "@/lib/auth/context";
import { getMaintenanceOccurrences, occurrenceAssigneeName, type MaintenanceOccurrence } from "@/lib/services/queries";
import { WEEKDAYS } from "@/lib/services/constants";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { operationalClientName } from "@/lib/utils/format";
import { workspaceLogoPath } from "@/lib/workspace-logo";
import { addDays, parseAnchor, periodLabel, startOfWeek, toISO } from "@/app/app/planning/planning-utils";
import { PrintControls } from "./PrintControls";

interface SearchParams {
  date?: string;
  q?: string;
  assignee?: string;
  status?: string;
}

const ITEMS_PER_DAY_PER_PAGE = 6;

function clientAddress(occurrence: MaintenanceOccurrence): string {
  const place = occurrence.pool?.address_line1 ? occurrence.pool : occurrence.client;
  return [place.address_line1, [place.postal_code, place.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ") || "Adresse non renseignée";
}

function matchesFilters(occurrence: MaintenanceOccurrence, filters: SearchParams): boolean {
  if (filters.assignee && occurrence.assignedMembershipId !== filters.assignee) return false;
  if (filters.status && occurrence.status !== filters.status) return false;
  const query = filters.q?.trim().toLocaleLowerCase("fr");
  if (!query) return true;
  return [operationalClientName(occurrence.client), occurrence.serviceType, occurrenceAssigneeName(occurrence), occurrence.code]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase("fr").includes(query));
}

export default async function WeeklyServicesPrintPage({ searchParams: searchParamsPromise }: { searchParams: Promise<SearchParams> }) {
  const searchParams = await searchParamsPromise;
  const ctx = await requirePermission("services.view");
  const supabase = await createClient();
  const weekStart = startOfWeek(parseAnchor(searchParams.date));
  const start = toISO(weekStart);
  const end = toISO(addDays(weekStart, 6));
  const seesAll = ctx.isAdmin || can(ctx, "services.edit");
  const [rawOccurrences, logoUrl] = await Promise.all([
    getMaintenanceOccurrences(supabase, {
      workspaceId: ctx.workspace.id,
      start,
      end,
      assignedMembershipId: seesAll ? undefined : ctx.membership.id,
    }),
    signedUrl("workspace-assets", workspaceLogoPath(ctx.workspace.settings)),
  ]);
  const occurrences = rawOccurrences.filter((occurrence) => matchesFilters(occurrence, searchParams));
  const days = WEEKDAYS.map((weekday, index) => {
    const date = toISO(addDays(weekStart, index));
    return { ...weekday, date, occurrences: occurrences.filter((occurrence) => occurrence.scheduledDate === date) };
  });
  const pageCount = Math.max(1, ...days.map((day) => Math.ceil(day.occurrences.length / ITEMS_PER_DAY_PER_PAGE)));
  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: ctx.workspace.timezone ?? "Indian/Reunion",
  }).format(new Date());

  return (
    <main className="leti-week-print">
      <style>{"@page { size: A4 landscape; margin: 0; }"}</style>
      <PrintControls />
      {Array.from({ length: pageCount }, (_, pageIndex) => (
        <section className="leti-week-print-page" key={pageIndex}>
          <header className="leti-week-print-header">
            <div className="leti-week-print-company">
              {logoUrl ? <Image src={logoUrl} alt="" width={240} height={80} priority={pageIndex === 0} /> : null}
              <div>
                <p className="leti-week-print-company-name">{ctx.workspace.name}</p>
                <p>Planning hebdomadaire des entretiens</p>
              </div>
            </div>
            <div className="leti-week-print-meta">
              <p className="leti-week-print-wordmark">LETI</p>
              <p>Semaine du {periodLabel("week", weekStart)}</p>
              <p>Généré le {generatedAt}</p>
            </div>
          </header>

          <div className="leti-week-print-grid">
            {days.map((day) => {
              const items = day.occurrences.slice(pageIndex * ITEMS_PER_DAY_PER_PAGE, (pageIndex + 1) * ITEMS_PER_DAY_PER_PAGE);
              return (
                <section className="leti-week-print-day" key={day.date}>
                  <header>
                    <span>{day.label}</span>
                    <strong>{Number(day.date.slice(-2))}</strong>
                  </header>
                  <div className="leti-week-print-day-content">
                    {items.map((occurrence) => (
                      <article key={occurrence.key}>
                        <strong>{operationalClientName(occurrence.client)}</strong>
                        <span>{clientAddress(occurrence)}</span>
                      </article>
                    ))}
                    {items.length === 0 && pageIndex === 0 ? <p>Aucun entretien</p> : null}
                  </div>
                </section>
              );
            })}
          </div>

          <footer>
            <span>{ctx.workspace.name} · Document de travail</span>
            <span>Page {pageIndex + 1} / {pageCount}</span>
          </footer>
        </section>
      ))}
    </main>
  );
}
