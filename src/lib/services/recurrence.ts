import { dateOnlyToUtcDate, utcDateToDateOnly } from "@/lib/utils/date";

export interface WeeklyRule {
  starts_on: string;
  ends_on: string | null;
  recurrence_weekday: number;
}

export function isoWeekday(date: Date): number {
  return date.getUTCDay() === 0 ? 7 : date.getUTCDay();
}

export function addCalendarDays(date: string, amount: number): string | null {
  const parsed = dateOnlyToUtcDate(date);
  if (!parsed) return null;
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return utcDateToDateOnly(parsed);
}

export function weeklyDatesInRange(rule: WeeklyRule, rangeStart: string, rangeEnd: string): string[] {
  const start = dateOnlyToUtcDate(rangeStart);
  const end = dateOnlyToUtcDate(rangeEnd);
  const contractStart = dateOnlyToUtcDate(rule.starts_on);
  const contractEnd = rule.ends_on ? dateOnlyToUtcDate(rule.ends_on) : null;
  if (!start || !end || !contractStart || rangeStart > rangeEnd) return [];
  if (rule.recurrence_weekday < 1 || rule.recurrence_weekday > 7) return [];

  const first = new Date(Math.max(start.getTime(), contractStart.getTime()));
  const offset = (rule.recurrence_weekday - isoWeekday(first) + 7) % 7;
  first.setUTCDate(first.getUTCDate() + offset);

  const lastTime = Math.min(end.getTime(), contractEnd?.getTime() ?? end.getTime());
  const dates: string[] = [];
  for (const cursor = first; cursor.getTime() <= lastTime; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    dates.push(utcDateToDateOnly(cursor));
  }
  return dates;
}

export function weeklyOccurrenceKey(seriesId: string, occurrenceDate: string): string {
  return `${seriesId}:${occurrenceDate}`;
}
