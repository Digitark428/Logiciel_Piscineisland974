"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { setTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { createTeamNote, deleteTeamNote } from "@/lib/actions/teamNotes";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { idle } from "@/lib/actions/result";
import { formatDate, formatRelative } from "@/lib/utils/format";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  due_date: string | null;
  assignee?: string | null;
}

export function TaskRow({ task, canToggle, canDelete }: { task: TaskItem; canToggle: boolean; canDelete: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const done = task.status === "done";

  return (
    <li className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={done}
        disabled={!canToggle || pending}
        onChange={() => start(async () => { await setTaskStatus(task.id, done ? "todo" : "done"); router.refresh(); })}
        className="mt-0.5 h-5 w-5 rounded border-graphite-300 text-pool-600"
      />
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${done ? "text-graphite-400 line-through" : "text-graphite-900"}`}>{task.title}</div>
        {task.description && <div className="text-sm text-graphite-500">{task.description}</div>}
        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-graphite-400">
          {task.due_date && <span>Échéance : {formatDate(task.due_date)}</span>}
          {task.assignee && <span>· {task.assignee}</span>}
        </div>
      </div>
      {canDelete && (
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

interface NoteItem {
  id: string;
  author: string;
  content: string;
  created_at: string;
  canDelete: boolean;
}

export function TeamNoteForm() {
  const [state, formAction] = useFormState(createTeamNote, idle);
  return (
    <form action={formAction} className="space-y-2">
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
      )}
      <textarea
        name="content"
        rows={2}
        required
        className="input"
        placeholder="Ex : Le client Martin préfère que nous passions avant 10h."
      />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Envoi…">Publier la note</SubmitButton>
      </div>
    </form>
  );
}

export function TeamNoteItem({ note }: { note: NoteItem }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-graphite-500">
            {note.author} — {formatRelative(note.created_at)}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-graphite-800">{note.content}</p>
        </div>
        {note.canDelete && (
          <button
            type="button"
            disabled={pending}
            className="btn-ghost p-1 text-graphite-300 hover:text-red-500"
            aria-label="Supprimer la note"
            onClick={() => start(async () => { if (confirm("Supprimer cette note ?")) { await deleteTeamNote(note.id); router.refresh(); } })}
          >
            ✕
          </button>
        )}
      </div>
    </li>
  );
}
