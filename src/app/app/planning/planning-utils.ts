import { dateOnlyToUtcDate, reunionDateString } from "@/lib/utils/date";

export type PlanningView = "day" | "week" | "month" | "year";

export function toISO(d: Date): string {
  return reunionDateString(d);
}

export function parseAnchor(raw?: string): Date {
  if (raw) {
    const parsed = dateOnlyToUtcDate(raw);
    if (parsed) return parsed;
  }
  return calendarDate(new Date());
}

/** Normalise un instant en date civile réunionnaise pour les calculs calendrier. */
function calendarDate(d: Date): Date {
  return dateOnlyToUtcDate(reunionDateString(d))!;
}

export function addDays(d: Date, n: number): Date {
  const r = calendarDate(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = calendarDate(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

/** Lundi de la semaine. */
export function startOfWeek(d: Date): Date {
  const r = calendarDate(d);
  const day = (r.getUTCDay() + 6) % 7; // 0 = lundi
  r.setUTCDate(r.getUTCDate() - day);
  return r;
}

export function startOfMonth(d: Date): Date {
  const r = calendarDate(d);
  return new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), 1));
}

export function rangeFor(view: PlanningView, anchor: Date): { start: Date; end: Date } {
  if (view === "day") {
    const day = calendarDate(anchor);
    return { start: day, end: day };
  }
  if (view === "week") {
    const s = startOfWeek(anchor);
    return { start: s, end: addDays(s, 6) };
  }
  if (view === "month") {
    const s = startOfMonth(anchor);
    return { start: s, end: new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0)) };
  }
  // year
  const year = calendarDate(anchor).getUTCFullYear();
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) };
}

export function navFor(view: PlanningView, anchor: Date, dir: number): Date {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, dir * 7);
  if (view === "month") return addMonths(anchor, dir);
  return addMonths(anchor, dir * 12);
}

const WD = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const MONTHS_FULL = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export function weekdayShort(d: Date): string {
  return WD[(calendarDate(d).getUTCDay() + 6) % 7];
}
export function monthName(i: number): string {
  return MONTHS_FULL[i];
}

export function periodLabel(view: PlanningView, anchor: Date): string {
  const date = calendarDate(anchor);
  if (view === "day") return date.toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "week") {
    const s = startOfWeek(date);
    const e = addDays(s, 6);
    return `${s.getUTCDate()} ${monthName(s.getUTCMonth()).toLowerCase()} – ${e.getUTCDate()} ${monthName(e.getUTCMonth()).toLowerCase()} ${e.getUTCFullYear()}`;
  }
  if (view === "month") return `${monthName(date.getUTCMonth())} ${date.getUTCFullYear()}`;
  return String(date.getUTCFullYear());
}
