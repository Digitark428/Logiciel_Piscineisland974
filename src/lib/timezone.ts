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
