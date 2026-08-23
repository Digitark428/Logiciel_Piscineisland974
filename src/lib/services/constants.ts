import type { ServiceStatus } from "@/lib/db/types";

export const MAINTENANCE_TYPES = [
  { key: "pool_maintenance", label: "Entretien piscine" },
] as const;

export const WEEKDAYS = [
  { value: 1, label: "Lundi", short: "Lun." },
  { value: 2, label: "Mardi", short: "Mar." },
  { value: 3, label: "Mercredi", short: "Mer." },
  { value: 4, label: "Jeudi", short: "Jeu." },
  { value: 5, label: "Vendredi", short: "Ven." },
  { value: 6, label: "Samedi", short: "Sam." },
  { value: 7, label: "Dimanche", short: "Dim." },
] as const;

export const SERVICE_STATUSES: ReadonlyArray<{ value: ServiceStatus; label: string }> = [
  { value: "planned", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminé" },
  { value: "postponed", label: "Reporté" },
  { value: "cancelled", label: "Annulé" },
];

export function weekdayLabel(value: number | null | undefined, short = false): string {
  const weekday = WEEKDAYS.find((item) => item.value === value);
  return weekday ? (short ? weekday.short : weekday.label) : "—";
}

export function serviceTypeLabel(value: string | null | undefined): string {
  if (!value) return MAINTENANCE_TYPES[0].label;
  return MAINTENANCE_TYPES.find((item) => item.key === value)?.label ?? value;
}
