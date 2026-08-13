export type PlanningView = "day" | "week" | "month" | "year";

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseAnchor(raw?: string): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + "T00:00:00");
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(d.getMonth() + n);
  return r;
}

/** Lundi de la semaine. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  r.setDate(d.getDate() - day);
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function rangeFor(view: PlanningView, anchor: Date): { start: Date; end: Date } {
  if (view === "day") return { start: anchor, end: anchor };
  if (view === "week") {
    const s = startOfWeek(anchor);
    return { start: s, end: addDays(s, 6) };
  }
  if (view === "month") {
    const s = startOfMonth(anchor);
    return { start: s, end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) };
  }
  // year
  return { start: new Date(anchor.getFullYear(), 0, 1), end: new Date(anchor.getFullYear(), 11, 31) };
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
  return WD[(d.getDay() + 6) % 7];
}
export function monthName(i: number): string {
  return MONTHS_FULL[i];
}

export function periodLabel(view: PlanningView, anchor: Date): string {
  if (view === "day") return anchor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "week") {
    const s = startOfWeek(anchor);
    const e = addDays(s, 6);
    return `${s.getDate()} ${monthName(s.getMonth()).toLowerCase()} – ${e.getDate()} ${monthName(e.getMonth()).toLowerCase()} ${e.getFullYear()}`;
  }
  if (view === "month") return `${monthName(anchor.getMonth())} ${anchor.getFullYear()}`;
  return String(anchor.getFullYear());
}
