/**
 * Les dates de prestation sont stockées sans heure (`YYYY-MM-DD`).
 * La V1 étant réservée à La Réunion, on convertit les instants courants dans
 * ce fuseau avant toute comparaison avec ces colonnes.
 */
export const REUNION_TIME_ZONE = "Indian/Reunion";

const reunionDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REUNION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Renvoie la date civile réunionnaise correspondant à un instant. */
export function reunionDateString(date: Date = new Date()): string {
  const parts = reunionDateFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type === "year" || part.type === "month" || part.type === "day")
      .map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day", string>;
  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Transforme une date civile en Date UTC interne, sans lui attribuer une heure
 * métier. Les opérations calendrier utilisent ensuite les accesseurs UTC.
 */
export function dateOnlyToUtcDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return date;
}

/** Formate une Date UTC utilisée comme valeur calendrier interne. */
export function utcDateToDateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function todayInReunion(): string {
  return reunionDateString();
}
