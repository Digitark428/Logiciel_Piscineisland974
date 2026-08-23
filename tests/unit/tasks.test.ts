import { describe, expect, it } from "vitest";
import { compareTasks, isTaskPriority, TASK_PRIORITIES } from "@/lib/tasks";

describe("To-do personnelle", () => {
  it("expose les priorités dans l'ordre métier exact", () => {
    expect(TASK_PRIORITIES.map((item) => item.value)).toEqual(["very_urgent", "urgent", "not_urgent"]);
    expect(isTaskPriority("very_urgent")).toBe(true);
    expect(isTaskPriority("later")).toBe(false);
  });

  it("trie les tâches ouvertes avant les terminées puis par échéance", () => {
    const tasks = [
      { id: "done", status: "done", due_date: "2026-08-20", due_time: "08:00", created_at: "2026-08-01" },
      { id: "undated", status: "todo", due_date: null, due_time: null, created_at: "2026-08-01" },
      { id: "late", status: "todo", due_date: "2026-08-25", due_time: "09:00", created_at: "2026-08-01" },
      { id: "early", status: "todo", due_date: "2026-08-25", due_time: "07:30", created_at: "2026-08-01" },
    ];
    expect(tasks.sort(compareTasks).map((task) => task.id)).toEqual(["early", "late", "undated", "done"]);
  });
});
