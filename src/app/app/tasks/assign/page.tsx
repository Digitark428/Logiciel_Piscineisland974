import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card } from "@/components/ui";
import { createTask } from "@/lib/actions/tasks";
import { can, requirePermission } from "@/lib/auth/context";
import { getMemberOptions } from "@/lib/db/queries";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { compareTasks } from "@/lib/tasks";
import { TaskRow } from "../TasksClient";

export const dynamic = "force-dynamic";

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function AssignedTasksPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = createClient();
  const canManage = can(ctx, "tasks.manage");
  const myId = ctx.membership.id;
  const [tasksRes, members] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,description,category,status,priority,due_date,due_time,created_at,created_by,assigned_membership_id,assignee:memberships!tasks_assigned_membership_id_fkey(id,first_name,last_name,email,role,job_title,photo_path)")
      .eq("workspace_id", ctx.workspace.id)
      .eq("category", "professional")
      .order("created_at", { ascending: false }),
    canManage ? getMemberOptions(supabase, ctx.workspace.id) : Promise.resolve([]),
  ]);

  const rows = (tasksRes.data ?? []).map((task: any) => ({
    ...task,
    assignee: relationOne(task.assignee),
    canToggle: task.created_by === myId || task.assigned_membership_id === myId || ctx.isAdmin,
    canDelete: task.created_by === myId || ctx.isAdmin,
  })).sort(compareTasks);
  const avatarByPath = await signedUrls("avatars", rows.map((task: any) => task.assignee?.photo_path));

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <h2 className="text-lg font-semibold text-graphite-900">Attribuer une tâche</h2>
          <p className="mt-1 text-sm text-graphite-500">Confiez une mission professionnelle à un membre de l'équipe.</p>
          <ActionForm action={createTask} resetOnSuccess successMessage="Tâche attribuée." className="mt-5 space-y-4">
            <input type="hidden" name="category" value="professional" />
            <div>
              <label htmlFor="assigned-title" className="label">Titre</label>
              <input id="assigned-title" name="title" required maxLength={240} className="input" placeholder="Ex : Commander la nouvelle pompe" />
            </div>
            <div>
              <label htmlFor="assigned-description" className="label">Description <span className="font-normal text-graphite-400">(facultative)</span></label>
              <textarea id="assigned-description" name="description" rows={3} className="input" placeholder="Précisez la mission…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="assigned-membership">Personne</label>
                <select id="assigned-membership" name="assigned_membership_id" required className="input">
                  <option value="">Sélectionner…</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="assigned-date">Échéance <span className="font-normal text-graphite-400">(facultative)</span></label>
                <input id="assigned-date" name="due_date" type="date" className="input" />
              </div>
            </div>
            <div className="flex justify-end"><SubmitButton>Attribuer</SubmitButton></div>
          </ActionForm>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-graphite-900">Tâches attribuées</h2>
        <p className="mt-1 text-sm text-graphite-500">
          {canManage ? "Résumé des missions professionnelles de l'équipe." : "Missions professionnelles qui vous sont attribuées."}
        </p>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-graphite-400">Aucune tâche attribuée.</p>
        ) : (
          <ul className="mt-4 divide-y divide-graphite-100 border-t border-graphite-100">
            {rows.map((task: any) => (
              <TaskRow
                key={task.id}
                task={task}
                canToggle={task.canToggle}
                canDelete={task.canDelete}
                assignee={task.assignee}
                assigneeAvatarUrl={task.assignee?.photo_path ? avatarByPath.get(task.assignee.photo_path) ?? null : null}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
