import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card } from "@/components/ui";
import { createTask } from "@/lib/actions/tasks";
import { requirePermission } from "@/lib/auth/context";
import type { TaskPriority } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { compareTasks, TASK_PRIORITIES } from "@/lib/tasks";
import { TaskRow } from "../TasksClient";

export const dynamic = "force-dynamic";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  very_urgent: "border-red-200 bg-red-50/70 text-red-800",
  urgent: "border-coral-200 bg-coral-50/70 text-graphite-900",
  not_urgent: "border-pool-200 bg-pool-50/70 text-pool-900",
};

export default async function PersonalTasksPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id,title,description,category,status,priority,due_date,due_time,created_at,created_by,assigned_membership_id")
    .eq("workspace_id", ctx.workspace.id)
    .eq("category", "personal")
    .eq("created_by", ctx.membership.id)
    .order("created_at", { ascending: false });

  const tasks = (data ?? []).sort(compareTasks);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-graphite-900">Créer une to-do</h2>
        <p className="mt-1 text-sm text-graphite-500">Cette liste est strictement personnelle et privée.</p>
        <ActionForm action={createTask} resetOnSuccess successMessage="Tâche ajoutée." className="mt-5 space-y-4">
          <input type="hidden" name="category" value="personal" />
          <div>
            <label htmlFor="personal-title" className="label">Titre</label>
            <input id="personal-title" name="title" required maxLength={240} className="input" placeholder="Ex : Appeler le fournisseur" />
          </div>
          <div>
            <label htmlFor="personal-description" className="label">Description <span className="font-normal text-graphite-400">(facultative)</span></label>
            <textarea id="personal-description" name="description" rows={3} className="input" placeholder="Ajoutez un détail utile…" />
          </div>
          <fieldset>
            <legend className="label">Niveau d'importance</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[...TASK_PRIORITIES].reverse().map((priority) => (
                <label key={priority.value} className={`flex min-h-16 cursor-pointer items-start gap-2 rounded-xl border p-3 ${PRIORITY_STYLES[priority.value]}`}>
                  <input type="radio" name="priority" value={priority.value} required defaultChecked={priority.value === "not_urgent"} className="mt-1" />
                  <span>
                    <span className="block text-sm font-semibold">{priority.label}</span>
                    <span className="mt-0.5 block text-xs opacity-70">{priority.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="personal-date" className="label">Date <span className="font-normal text-graphite-400">(facultative)</span></label>
              <input id="personal-date" name="due_date" type="date" className="input" />
            </div>
            <div>
              <label htmlFor="personal-time" className="label">Heure <span className="font-normal text-graphite-400">(facultative)</span></label>
              <input id="personal-time" name="due_time" type="time" className="input" />
            </div>
          </div>
          <div className="flex justify-end"><SubmitButton>Ajouter à ma liste</SubmitButton></div>
        </ActionForm>
      </Card>

      <div className="space-y-3">
        {TASK_PRIORITIES.map((priority) => {
          const group = tasks.filter((task: any) => task.priority === priority.value);
          return (
            <details key={priority.value} open className="card group overflow-hidden">
              <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${PRIORITY_STYLES[priority.value]}`}>
                <span className="font-semibold">{priority.label} — {group.length}</span>
                <span aria-hidden className="text-lg transition group-open:rotate-180">⌄</span>
              </summary>
              {group.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-graphite-400">Aucune tâche dans cette catégorie.</p>
              ) : (
                <ul className="divide-y divide-graphite-100 px-4 sm:px-5">
                  {group.map((task: any) => <TaskRow key={task.id} task={task} canToggle canDelete />)}
                </ul>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}
