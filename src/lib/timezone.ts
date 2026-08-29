export const LETI_TIMEZONE_OPTIONS = [
  { value: "Indian/Reunion", label: "La Réunion (UTC+4)" },
  { value: "Indian/Mayotte", label: "Mayotte (UTC+3)" },
  { value: "Europe/Paris", label: "France métropolitaine" },
  { value: "America/Guadeloupe", label: "Guadeloupe" },
  { value: "America/Martinique", label: "Martinique" },
  { value: "America/Cayenne", label: "Guyane" },
  { value: "Pacific/Tahiti", label: "Polynésie française" },
  { value: "Pacific/Noumea", label: "Nouvelle-Calédonie" },
] as const;

export function isValidIanaTimezone(value: string): boolean {
  if (!value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export interface ZonedClock {
  date: string;
  hour: number;
  minute: number;
}

function addCivilDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function localDateTimeAsUtc(date: string, hour: number, minute = 0): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

/** Retourne une date/heure civile stable sans dépendre du fuseau du serveur. */
export function zonedClock(at: Date, timeZone: string): ZonedClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function isDailyBackupDue(at: Date, timeZone: string, hour = 21): { due: boolean; localDate: string } {
  const clock = zonedClock(at, timeZone);
  return { due: clock.hour >= hour, localDate: clock.date };
}

/**
 * Calcule le prochain horaire civil sans supposer un décalage UTC fixe.
 * L'ajustement itératif reste correct lors des changements d'heure IANA.
 */
export function nextDailyRun(at: Date, timeZone: string, hour = 21): { at: Date; localDate: string } {
  const clock = zonedClock(at, timeZone);
  const localDate = clock.hour < hour ? clock.date : addCivilDays(clock.date, 1);
  const desired = localDateTimeAsUtc(localDate, hour);
  let candidate = desired;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const rendered = zonedClock(new Date(candidate), timeZone);
    const renderedAsUtc = localDateTimeAsUtc(rendered.date, rendered.hour, rendered.minute);
    const correction = desired - renderedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return { at: new Date(candidate), localDate };
}
