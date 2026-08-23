import type { TaskPriority } from "@/lib/db/types";

export const TASK_PRIORITIES: Array<{
  value: TaskPriority;
  label: string;
  description: string;
  tone: "red" | "coral" | "pool";
}> = [
  { value: "very_urgent", label: "Très urgent", description: "À traiter en priorité", tone: "red" },
  { value: "urgent", label: "Urgent", description: "À traiter rapidement", tone: "coral" },
  { value: "not_urgent", label: "Pas urgent", description: "Peut attendre", tone: "pool" },
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  very_urgent: "Très urgent",
  urgent: "Urgent",
  not_urgent: "Pas urgent",
};

export function isTaskPriority(value: unknown): value is TaskPriority {
  return value === "not_urgent" || value === "urgent" || value === "very_urgent";
}

export interface SortableTask {
  status: string;
  due_date: string | null;
  due_time: string | null;
  created_at?: string | null;
}

/** Tâches ouvertes, puis échéance complète, puis date de création. */
export function compareTasks(left: SortableTask, right: SortableTask): number {
  const statusOrder = Number(left.status === "done") - Number(right.status === "done");
  if (statusOrder !== 0) return statusOrder;

  const leftHasDate = Boolean(left.due_date);
  const rightHasDate = Boolean(right.due_date);
  if (leftHasDate !== rightHasDate) return leftHasDate ? -1 : 1;

  if (left.due_date && right.due_date) {
    const dateOrder = left.due_date.localeCompare(right.due_date);
    if (dateOrder !== 0) return dateOrder;
  }

  const leftHasTime = Boolean(left.due_time);
  const rightHasTime = Boolean(right.due_time);
  if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;
  const timeOrder = (left.due_time ?? "").localeCompare(right.due_time ?? "");
  if (timeOrder !== 0) return timeOrder;

  return (left.created_at ?? "").localeCompare(right.created_at ?? "");
}
