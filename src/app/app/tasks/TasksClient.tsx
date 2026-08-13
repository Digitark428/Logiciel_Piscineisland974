"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/utils/format";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  due_date: string | null;
  assignee?: string | null;
}

export function TaskRow({ task, canManage }: { task: TaskItem; canManage: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const done = task.status === "done";

  return (
    <li className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={done}
        disabled={!canManage || pending}
        onChange={() => start(async () => { await setTaskStatus(task.id, done ? "todo" : "done"); router.refresh(); })}
        className="mt-0.5 h-5 w-5 rounded border-graphite-300 text-pool-600"
      />
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${done ? "text-graphite-400 line-through" : "text-graphite-900"}`}>{task.title}</div>
        {task.description && <div className="text-sm text-graphite-500">{task.description}</div>}
        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-graphite-400">
          {task.due_date && <span>Échéance : {formatDate(task.due_date)}</span>}
          {task.assignee && <span>· {task.assignee}</span>}
          {task.category === "personal" && <span>· Personnelle</span>}
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          disabled={pending}
          className="btn-ghost p-1 text-graphite-300 hover:text-red-500"
          aria-label="Supprimer"
          onClick={() => start(async () => { if (confirm("Supprimer cette tâche ?")) { await deleteTask(task.id); router.refresh(); } })}
        >
          ✕
        </button>
      )}
    </li>
  );
}
