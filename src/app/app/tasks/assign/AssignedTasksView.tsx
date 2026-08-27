"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { MemberIdentity, type MemberIdentityData } from "@/components/members/MemberIdentity";
import { Checkbox } from "@/components/ui/Checkbox";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { createTask, deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import { idle } from "@/lib/actions/result";
import { compareTasks, isTaskOverdue } from "@/lib/tasks";
import { formatDate } from "@/lib/utils/format";

export interface AssignedTaskItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  created_at: string;
  created_by: string;
  assigned_membership_id: string | null;
  canToggle: boolean;
  canDelete: boolean;
  assignee: (MemberIdentityData & { photo_path?: string | null }) | null;
  assigneeAvatarUrl: string | null;
}

interface MemberOption {
  id: string;
  label: string;
}

type TaskFilter = "all" | "active" | "done" | "overdue";

const FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "active", label: "En cours" },
  { value: "done", label: "Terminées" },
  { value: "overdue", label: "En retard" },
];

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.6]">
      <path d="M4 6h12M8 3.5h4M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M5.5 3.5v3M14.5 3.5v3M3.5 8h13M4 5h12a1 1 0 0 1 1 1v10H3V6a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AssignedTaskRow({
  task,
  today,
  busy,
  onToggle,
  onDelete,
}: {
  task: AssignedTaskItem;
  today: string;
  busy: boolean;
  onToggle: (task: AssignedTaskItem, done: boolean) => void;
  onDelete: (task: AssignedTaskItem) => void;
}) {
  const done = task.status === "done";
  const overdue = isTaskOverdue(task, today);
  const surface = done
    ? "border-emerald-100/90 bg-emerald-50/45"
    : overdue
      ? "border-coral-100 bg-coral-50/25"
      : "border-pool-100/80 bg-white";
  const statusStyle = done
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : overdue
      ? "border-coral-100 bg-coral-50 text-coral-700"
      : "border-pool-100 bg-pool-50 text-pool-700";

  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 rounded-[18px] border px-3 py-3 shadow-[0_6px_20px_rgba(24,58,89,0.035)] transition sm:gap-x-3 sm:px-4 ${surface} ${busy ? "opacity-60" : "hover:border-pool-200 hover:shadow-[0_8px_24px_rgba(24,58,89,0.055)]"}`}>
      <Checkbox
        checked={done}
        disabled={!task.canToggle || busy}
        onChange={(event) => onToggle(task, event.currentTarget.checked)}
        aria-label={`${done ? "Rouvrir" : "Terminer"} la tâche « ${task.title} »`}
        className="-my-2 -ml-2"
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={`min-w-0 break-words text-[15px] font-semibold leading-5 ${done ? "text-graphite-500 line-through" : "text-graphite-900"}`}>{task.title}</h2>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle}`}>
            {done ? "Terminée" : overdue ? "En retard" : "En cours"}
          </span>
        </div>
        {task.description && (
          <p className={`mt-1 line-clamp-2 break-words text-sm leading-5 ${done ? "text-graphite-400" : "text-graphite-500"}`}>{task.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-graphite-100/80 pt-3">
          {task.assignee ? (
            <MemberIdentity
              member={task.assignee}
              avatarUrl={task.assigneeAvatarUrl}
              avatarSize={32}
              nameClassName="text-xs"
            />
          ) : (
            <span className="text-xs text-graphite-400">Personne non renseignée</span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${done ? "text-emerald-700" : overdue ? "text-coral-700" : "text-graphite-500"}`}>
            <CalendarIcon />
            {task.due_date ? formatDate(task.due_date) : "Sans échéance"}
          </span>
        </div>
      </div>

      {task.canDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(task)}
          className="-mr-1 -mt-1 rounded-xl p-2.5 text-graphite-300 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          aria-label={`Supprimer la tâche « ${task.title} »`}
        >
          <TrashIcon />
        </button>
      ) : <span />}
    </li>
  );
}

function AssignedTaskDrawer({
  members,
  onClosed,
}: {
  members: MemberOption[];
  onClosed: () => void;
}) {
  const [state, formAction] = useFormState(createTask, idle);
  const [entered, setEntered] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const closingRef = useRef(false);
  const router = useRouter();

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setEntered(false);
    window.setTimeout(onClosed, 200);
  }, [onClosed]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    router.refresh();
    close();
  }, [state, router, close]);

  return (
    <OverlayPortal>
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[var(--leti-layer-drawer)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assigned-task-drawer-title"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer le formulaire"
        onClick={close}
        className={`absolute inset-0 bg-graphite-950/25 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <aside data-leti-overlay="drawer" data-leti-overlay-side="right" className={`absolute inset-y-0 right-0 flex w-[var(--leti-drawer-width)] flex-col bg-white shadow-[-24px_0_70px_rgba(32,45,52,0.16)] transition-transform duration-200 ease-out motion-reduce:transition-none ${entered ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-graphite-100 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pool-600">Nouvelle mission</p>
            <h2 id="assigned-task-drawer-title" className="mt-1 text-xl font-semibold text-graphite-950">Attribuer une tâche</h2>
            <p className="mt-1 text-sm text-graphite-500">Confiez une mission claire à un membre de l’équipe.</p>
          </div>
          <button type="button" onClick={close} className="rounded-xl p-2.5 text-graphite-500 hover:bg-graphite-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-400" aria-label="Fermer">
            <CloseIcon />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            {state.message && !state.ok ? (
              <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.message}</p>
            ) : null}
            <input type="hidden" name="category" value="professional" />
            <div>
              <label htmlFor="assigned-title" className="label">Titre</label>
              <input ref={titleRef} id="assigned-title" name="title" required maxLength={240} className="input" placeholder="Ex : Commander la nouvelle pompe" />
            </div>
            <div>
              <label htmlFor="assigned-description" className="label">Description <span className="font-normal text-graphite-400">(facultative)</span></label>
              <textarea id="assigned-description" name="description" rows={4} className="input resize-none" placeholder="Précisez la mission, les consignes, les détails…" />
            </div>
            <div>
              <label className="label" htmlFor="assigned-membership">Personne</label>
              <select id="assigned-membership" name="assigned_membership_id" required className="input" defaultValue="">
                <option value="" disabled>Sélectionner un membre…</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="assigned-date">Échéance <span className="font-normal text-graphite-400">(facultative)</span></label>
              <input id="assigned-date" name="due_date" type="date" className="input" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-graphite-100 bg-white px-5 py-4 sm:px-7">
            <button type="button" onClick={close} className="btn-secondary">Annuler</button>
            <SubmitButton variant="secondary" pendingLabel="Attribution…" className="border-pool-200 bg-pool-50 text-graphite-800 hover:border-pool-300 hover:bg-pool-100">Attribuer</SubmitButton>
          </div>
        </form>
      </aside>
    </div>
    </OverlayPortal>
  );
}

export function AssignedTasksView({
  initialTasks,
  members,
  canManage,
  today,
}: {
  initialTasks: AssignedTaskItem[];
  members: MemberOption[];
  canManage: boolean;
  today: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const counts = tasks.reduce(
    (result, task) => {
      result.all += 1;
      if (task.status === "done") result.done += 1;
      else result.active += 1;
      if (isTaskOverdue(task, today)) result.overdue += 1;
      return result;
    },
    { all: 0, active: 0, done: 0, overdue: 0 },
  );

  const visibleTasks = tasks.filter((task) => {
    if (filter === "active") return task.status !== "done";
    if (filter === "done") return task.status === "done";
    if (filter === "overdue") return isTaskOverdue(task, today);
    return true;
  }).sort(compareTasks);

  const toggleTask = async (task: AssignedTaskItem, done: boolean) => {
    if (busyRef.current || !task.canToggle) return;
    const previousStatus = task.status;
    busyRef.current = task.id;
    setBusyTaskId(task.id);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: done ? "done" : "todo" } : item));

    try {
      const result = await setTaskStatus(task.id, done ? "done" : "todo");
      if (!result.ok) {
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item));
        window.alert(result.message ?? "Action impossible.");
        return;
      }
      router.refresh();
    } catch {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item));
      window.alert("Action impossible. Vérifiez votre connexion puis réessayez.");
    } finally {
      busyRef.current = null;
      setBusyTaskId(null);
    }
  };

  const removeTask = async (task: AssignedTaskItem) => {
    if (busyRef.current || !task.canDelete || !window.confirm("Supprimer cette tâche ?")) return;
    busyRef.current = task.id;
    setBusyTaskId(task.id);
    setTasks((current) => current.filter((item) => item.id !== task.id));

    try {
      const result = await deleteTask(task.id);
      if (!result.ok) {
        setTasks((current) => [...current, task].sort(compareTasks));
        window.alert(result.message ?? "Suppression impossible.");
        return;
      }
      router.refresh();
    } catch {
      setTasks((current) => [...current, task].sort(compareTasks));
      window.alert("Suppression impossible. Vérifiez votre connexion puis réessayez.");
    } finally {
      busyRef.current = null;
      setBusyTaskId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pool-600">Organisation d’équipe</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-950 sm:text-[32px]">Tâches attribuées</h1>
          <p className="mt-2 text-sm text-graphite-500 sm:text-base">Les missions confiées à votre équipe.</p>
        </div>
        {canManage ? (
          <button
            ref={createButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex min-h-11 items-center justify-center self-start rounded-xl border border-pool-200 bg-pool-50/70 px-4 text-sm font-semibold text-graphite-800 shadow-[0_2px_8px_rgba(24,58,89,0.03)] transition hover:border-pool-300 hover:bg-pool-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300 sm:self-auto"
          >
            <span aria-hidden="true" className="mr-1 text-lg leading-none text-pool-700">+</span> Attribuer une tâche
          </button>
        ) : null}
      </header>

      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-graphite-100 bg-white p-1.5 shadow-[0_4px_18px_rgba(24,58,89,0.025)]" aria-label="Filtrer les tâches">
        {FILTERS.map((item) => {
          const selected = filter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(item.value)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300 ${selected ? "bg-pool-50 text-graphite-900 shadow-[0_1px_4px_rgba(24,58,89,0.04)]" : "text-graphite-500 hover:bg-graphite-50 hover:text-graphite-800"}`}
            >
              {item.label}
              <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${selected ? "bg-white text-pool-700" : "bg-graphite-100 text-graphite-500"}`}>{counts[item.value]}</span>
            </button>
          );
        })}
      </div>

      {visibleTasks.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-[22px] border border-dashed border-graphite-200 bg-white/65 px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-graphite-700">{tasks.length === 0 ? "Aucune tâche attribuée." : "Aucune tâche dans ce filtre."}</p>
            <p className="mt-1 text-xs text-graphite-400">{tasks.length === 0 ? "Les prochaines missions apparaîtront ici." : "Choisissez un autre état pour poursuivre."}</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visibleTasks.map((task) => (
            <AssignedTaskRow
              key={task.id}
              task={task}
              today={today}
              busy={busyTaskId === task.id}
              onToggle={(item, done) => void toggleTask(item, done)}
              onDelete={(item) => void removeTask(item)}
            />
          ))}
        </ul>
      )}

      {drawerOpen ? (
        <AssignedTaskDrawer
          members={members}
          onClosed={() => {
            setDrawerOpen(false);
            createButtonRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
