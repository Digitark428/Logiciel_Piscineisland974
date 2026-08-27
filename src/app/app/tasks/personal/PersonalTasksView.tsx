"use client";

import {
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/SubmitButton";
import {
  createTask,
  deleteTask,
  setTaskStatus,
  updatePersonalTaskPriority,
} from "@/lib/actions/tasks";
import { idle } from "@/lib/actions/result";
import type { TaskPriority } from "@/lib/db/types";
import {
  adjacentTaskPriority,
  compareTasks,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from "@/lib/tasks";
import { formatDate, formatTime } from "@/lib/utils/format";

export interface PersonalTaskItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  created_at: string;
}

const GROUP_STYLES: Record<TaskPriority, { shell: string; dot: string; count: string }> = {
  very_urgent: {
    shell: "border-rose-100/80 bg-rose-50/35",
    dot: "bg-rose-400",
    count: "bg-rose-100/80 text-rose-700",
  },
  urgent: {
    shell: "border-orange-100/90 bg-orange-50/30",
    dot: "bg-orange-300",
    count: "bg-orange-100/80 text-orange-700",
  },
  not_urgent: {
    shell: "border-sky-100/90 bg-sky-50/30",
    dot: "bg-sky-300",
    count: "bg-sky-100/80 text-sky-700",
  },
};

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-current">
      <circle cx="7" cy="5" r="1.25" /><circle cx="13" cy="5" r="1.25" />
      <circle cx="7" cy="10" r="1.25" /><circle cx="13" cy="10" r="1.25" />
      <circle cx="7" cy="15" r="1.25" /><circle cx="13" cy="15" r="1.25" />
    </svg>
  );
}

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

function PersonalTaskRow({
  task,
  busy,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: {
  task: PersonalTaskItem;
  busy: boolean;
  onMove: (taskId: string, priority: TaskPriority) => void;
  onDelete: (taskId: string) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, task: PersonalTaskItem) => void;
  onDragEnd: () => void;
  onTouchStart: (event: PointerEvent<HTMLButtonElement>, task: PersonalTaskItem) => void;
  onTouchMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onTouchEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const [done, setDone] = useState(task.status === "done");
  const [statusPending, startStatusTransition] = useTransition();

  useEffect(() => setDone(task.status === "done"), [task.status]);

  const handleMoveKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    onMove(task.id, adjacentTaskPriority(task.priority, event.key === "ArrowUp" ? "up" : "down"));
  };

  return (
    <li className={`group flex items-start gap-3 rounded-2xl border border-white/80 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(37,48,55,0.045)] transition sm:px-4 ${busy ? "opacity-60" : "hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(37,48,55,0.075)]"}`}>
      <input
        type="checkbox"
        checked={done}
        disabled={statusPending}
        aria-label={`${done ? "Rouvrir" : "Terminer"} la tâche « ${task.title} »`}
        onChange={(event) => {
          const nextDone = event.currentTarget.checked;
          setDone(nextDone);
          startStatusTransition(async () => {
            try {
              const result = await setTaskStatus(task.id, nextDone ? "done" : "todo");
              if (!result.ok) {
                setDone(!nextDone);
                window.alert(result.message ?? "Action impossible.");
              }
            } catch {
              setDone(!nextDone);
              window.alert("Action impossible. Vérifiez votre connexion puis réessayez.");
            }
          });
        }}
        className="mt-1 h-5 w-5 shrink-0 rounded-md border-graphite-300 text-pool-600 focus:ring-pool-400"
      />

      <div className="min-w-0 flex-1">
        <p className={`break-words text-[15px] font-semibold leading-5 ${done ? "text-graphite-400 line-through" : "text-graphite-900"}`}>{task.title}</p>
        {task.description && <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-graphite-500">{task.description}</p>}
        {(task.due_date || task.due_time) && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-graphite-500">
            <span aria-hidden="true">◷</span>
            {task.due_date ? formatDate(task.due_date) : "Sans date"}
            {task.due_time && <span>· {formatTime(task.due_time)}</span>}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          draggable={!busy}
          disabled={busy}
          onDragStart={(event) => onDragStart(event, task)}
          onDragEnd={onDragEnd}
          onPointerDown={(event) => onTouchStart(event, task)}
          onPointerMove={onTouchMove}
          onPointerUp={onTouchEnd}
          onPointerCancel={onTouchEnd}
          onKeyDown={handleMoveKey}
          className="touch-none rounded-xl p-2.5 text-graphite-300 transition hover:bg-graphite-50 hover:text-graphite-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-400"
          aria-label={`Déplacer « ${task.title} ». Flèche haut : priorité supérieure. Flèche bas : priorité inférieure.`}
          title="Glissez vers une autre priorité, ou utilisez les flèches haut et bas"
        >
          <GripIcon />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(task.id)}
          className="rounded-xl p-2.5 text-graphite-300 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          aria-label={`Supprimer la tâche « ${task.title} »`}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

function PersonalTaskDrawer({ onClosed }: { onClosed: () => void }) {
  const [state, formAction] = useFormState(createTask, idle);
  const [entered, setEntered] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const closingRef = useRef(false);

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
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    <div ref={dialogRef} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="personal-task-drawer-title">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer le formulaire"
        onClick={close}
        className={`absolute inset-0 bg-graphite-950/25 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <aside className={`absolute inset-y-0 right-0 flex w-[min(100%,440px)] flex-col bg-white shadow-[-24px_0_70px_rgba(32,45,52,0.16)] transition-transform duration-200 ease-out motion-reduce:transition-none ${entered ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-graphite-100 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pool-600">Nouvelle tâche</p>
            <h2 id="personal-task-drawer-title" className="mt-1 text-xl font-semibold text-graphite-950">Créer une to-do</h2>
            <p className="mt-1 text-sm text-graphite-500">Elle restera privée et visible uniquement par vous.</p>
          </div>
          <button type="button" onClick={close} className="rounded-xl p-2.5 text-graphite-500 hover:bg-graphite-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-400" aria-label="Fermer">
            <CloseIcon />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            {state.message && !state.ok && (
              <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.message}</p>
            )}
            <input type="hidden" name="category" value="personal" />
            <div>
              <label htmlFor="personal-title" className="label">Titre</label>
              <input ref={titleRef} id="personal-title" name="title" required maxLength={240} className="input" placeholder="Ex : Appeler le fournisseur" />
            </div>
            <div>
              <label htmlFor="personal-description" className="label">Description <span className="font-normal text-graphite-400">(facultative)</span></label>
              <textarea id="personal-description" name="description" rows={4} className="input resize-none" placeholder="Ajoutez un détail utile…" />
            </div>
            <fieldset>
              <legend className="label">Niveau d'importance</legend>
              <div className="space-y-2">
                {[...TASK_PRIORITIES].reverse().map((priority) => (
                  <label key={priority.value} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-graphite-100 bg-graphite-50/50 px-4 py-3 transition hover:border-pool-200 hover:bg-pool-50/30 has-[:checked]:border-pool-300 has-[:checked]:bg-pool-50/60 has-[:checked]:ring-1 has-[:checked]:ring-pool-200">
                    <input type="radio" name="priority" value={priority.value} required defaultChecked={priority.value === "not_urgent"} className="mt-1 text-pool-600 focus:ring-pool-400" />
                    <span>
                      <span className="block text-sm font-semibold text-graphite-900">{priority.label}</span>
                      <span className="mt-0.5 block text-xs text-graphite-500">{priority.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="personal-date" className="label">Date <span className="sr-only">facultative</span></label>
                <input id="personal-date" name="due_date" type="date" className="input" />
              </div>
              <div>
                <label htmlFor="personal-time" className="label">Heure <span className="sr-only">facultative</span></label>
                <input id="personal-time" name="due_time" type="time" className="input" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-graphite-100 bg-white px-5 py-4 sm:px-7">
            <button type="button" onClick={close} className="btn-secondary">Annuler</button>
            <SubmitButton pendingLabel="Création…" className="bg-pool-600 hover:bg-pool-700">Créer la to-do</SubmitButton>
          </div>
        </form>
      </aside>
    </div>
  );
}

export function PersonalTasksView({ initialTasks }: { initialTasks: PersonalTaskItem[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<PersonalTaskItem | null>(null);
  const [activePriority, setActivePriority] = useState<TaskPriority | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const router = useRouter();
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef<string | null>(null);
  const touchRef = useRef<{ task: PersonalTaskItem; x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const moveTask = async (taskId: string, nextPriority: TaskPriority) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.priority === nextPriority || busyRef.current) return;
    const previousPriority = task.priority;
    busyRef.current = taskId;
    setBusyTaskId(taskId);
    setTasks((current) => current.map((item) => item.id === taskId ? { ...item, priority: nextPriority } : item));
    setAnnouncement(`« ${task.title} » déplacée vers ${TASK_PRIORITY_LABELS[nextPriority]}.`);

    try {
      const result = await updatePersonalTaskPriority(taskId, nextPriority);
      if (!result.ok) {
        setTasks((current) => current.map((item) => item.id === taskId ? { ...item, priority: previousPriority } : item));
        setAnnouncement(`${result.message ?? "Déplacement impossible."} La tâche a retrouvé sa priorité précédente.`);
        return;
      }
      router.refresh();
    } catch {
      setTasks((current) => current.map((item) => item.id === taskId ? { ...item, priority: previousPriority } : item));
      setAnnouncement("Déplacement impossible. Vérifiez votre connexion. La tâche a retrouvé sa priorité précédente.");
    } finally {
      busyRef.current = null;
      setBusyTaskId(null);
    }
  };

  const deletePersonalTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || busyRef.current || !window.confirm("Supprimer cette tâche ?")) return;
    busyRef.current = taskId;
    setBusyTaskId(taskId);
    setTasks((current) => current.filter((item) => item.id !== taskId));
    try {
      const result = await deleteTask(taskId);
      if (!result.ok) {
        setTasks((current) => [...current, task].sort(compareTasks));
        setAnnouncement(result.message ?? "Suppression impossible.");
        return;
      }
      setAnnouncement(`« ${task.title} » supprimée.`);
      router.refresh();
    } catch {
      setTasks((current) => [...current, task].sort(compareTasks));
      setAnnouncement("Suppression impossible. Vérifiez votre connexion.");
    } finally {
      busyRef.current = null;
      setBusyTaskId(null);
    }
  };

  const clearDrag = () => {
    setDraggedTask(null);
    setActivePriority(null);
    touchRef.current = null;
  };

  const detectPriority = (x: number, y: number): TaskPriority | null => {
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-priority-zone]");
    return (zone?.dataset.priorityZone as TaskPriority | undefined) ?? null;
  };

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <header className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pool-600">Organisation personnelle</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-950 sm:text-[32px]">Ma to-do personnelle</h1>
          <p className="mt-2 text-sm text-graphite-500 sm:text-base">Vos priorités du moment.</p>
        </div>
        <button ref={createButtonRef} type="button" onClick={() => setDrawerOpen(true)} className="btn-primary self-start px-4 sm:self-auto">
          <span aria-hidden="true" className="mr-1 text-lg leading-none">+</span> Créer une to-do
        </button>
      </header>

      <p className="mb-4 text-xs text-graphite-400">Glissez une tâche par sa poignée vers une autre priorité. Au clavier, utilisez les flèches haut et bas.</p>

      <div className="space-y-4">
        {TASK_PRIORITIES.map((priority) => {
          const group = tasks.filter((task) => task.priority === priority.value).sort(compareTasks);
          const styles = GROUP_STYLES[priority.value];
          const isActive = activePriority === priority.value;
          return (
            <section
              key={priority.value}
              data-priority-zone={priority.value}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setActivePriority(priority.value);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActivePriority(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = draggedTask?.id ?? event.dataTransfer.getData("text/plain");
                clearDrag();
                void moveTask(taskId, priority.value);
              }}
              className={`rounded-[22px] border p-3 transition sm:p-4 ${styles.shell} ${isActive ? "ring-2 ring-pool-300 ring-offset-2" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-graphite-900 sm:text-[15px]">{priority.label}</h2>
                  <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles.count}`} aria-label={`${group.length} tâche${group.length > 1 ? "s" : ""}`}>{group.length}</span>
                </div>
                {isActive && <span className="text-xs font-medium text-pool-700">Déposer ici</span>}
              </div>
              {group.length === 0 ? (
                <div className={`flex min-h-[58px] items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm ${isActive ? "border-pool-300 bg-white/80 text-pool-700" : "border-graphite-200/80 bg-white/45 text-graphite-400"}`}>
                  {isActive ? "Relâchez pour déplacer la tâche" : "Aucune tâche pour le moment."}
                </div>
              ) : (
                <ul className="space-y-2">
                  {group.map((task) => (
                    <PersonalTaskRow
                      key={task.id}
                      task={task}
                      busy={busyTaskId === task.id}
                      onMove={(taskId, nextPriority) => void moveTask(taskId, nextPriority)}
                      onDelete={(taskId) => void deletePersonalTask(taskId)}
                      onDragStart={(event, dragged) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", dragged.id);
                        setDraggedTask(dragged);
                      }}
                      onDragEnd={clearDrag}
                      onTouchStart={(event, touched) => {
                        if (event.pointerType === "mouse" || busyRef.current) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        touchRef.current = { task: touched, x: event.clientX, y: event.clientY, moved: false };
                      }}
                      onTouchMove={(event) => {
                        const touch = touchRef.current;
                        if (!touch) return;
                        const distance = Math.hypot(event.clientX - touch.x, event.clientY - touch.y);
                        if (!touch.moved && distance < 6) return;
                        touch.moved = true;
                        setDraggedTask(touch.task);
                        setActivePriority(detectPriority(event.clientX, event.clientY));
                        if (event.clientY < 80) window.scrollBy({ top: -12, behavior: "auto" });
                        if (event.clientY > window.innerHeight - 80) window.scrollBy({ top: 12, behavior: "auto" });
                      }}
                      onTouchEnd={(event) => {
                        const touch = touchRef.current;
                        if (!touch) return;
                        const target = touch.moved ? detectPriority(event.clientX, event.clientY) : null;
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                        clearDrag();
                        if (target) void moveTask(touch.task.id, target);
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">{announcement}</p>
      {draggedTask && touchRef.current?.moved && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-graphite-900 px-4 py-2 text-sm font-medium text-white shadow-xl">
          Déplacez « {draggedTask.title} » vers une priorité
        </div>
      )}
      {drawerOpen && <PersonalTaskDrawer onClosed={() => { setDrawerOpen(false); createButtonRef.current?.focus(); }} />}
    </div>
  );
}
