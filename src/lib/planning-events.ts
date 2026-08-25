import { dateOnlyToUtcDate } from "@/lib/utils/date";

export const PLANNING_TYPES = ["maintenance", "task", "event"] as const;
export type PlanningType = (typeof PLANNING_TYPES)[number];

export const PLANNING_TYPE_LABELS: Record<PlanningType, string> = {
  maintenance: "Entretien",
  task: "Tâche",
  event: "Événement",
};

export function parsePlanningTypes(raw?: string): PlanningType[] {
  if (!raw) return [...PLANNING_TYPES];
  const requested = new Set(raw.split(","));
  return PLANNING_TYPES.filter((type) => requested.has(type));
}

export function planningTypesParam(types: Iterable<PlanningType>): string | undefined {
  const requested = new Set(types);
  const selected = PLANNING_TYPES.filter((type) => requested.has(type));
  return selected.length === PLANNING_TYPES.length ? undefined : selected.join(",");
}

export function isValidPlanningDate(value: string): boolean {
  return Boolean(dateOnlyToUtcDate(value));
}

export function isValidPlanningTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function planningTimeLabel(start: string | null, end: string | null, allDay: boolean): string {
  if (allDay) return "Toute la journée";
  if (!start || !end) return "";
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}
