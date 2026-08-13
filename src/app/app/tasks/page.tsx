import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getMemberOptions } from "@/lib/db/queries";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { createTask } from "@/lib/actions/tasks";
import { memberName } from "@/lib/utils/format";
import { TaskRow } from "./TasksClient";

export default async function TasksPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = createClient();
  const canManage = can(ctx, "tasks.manage");

  let query = supabase
    .from("tasks")
    .select("id, title, description, category, status, due_date, assignee:memberships!tasks_assigned_membership_id_fkey(first_name,last_name,email)")
    .eq("workspace_id", ctx.workspace.id)
    .order("status")
    .order("due_date", { nullsFirst: false });
  if (!ctx.isAdmin) query = query.or(`assigned_membership_id.eq.${ctx.membership.id},created_by.eq.${ctx.membership.id}`);
  const { data: tasks } = await query;

  const members = ctx.isAdmin ? await getMemberOptions(supabase, ctx.workspace.id) : [];
  const rows = (tasks ?? []).map((t: any) => ({
    ...t,
    assignee: t.assignee ? memberName(t.assignee) : null,
  }));
  const open = rows.filter((t) => t.status !== "done");
  const done = rows.filter((t) => t.status === "done");

  return (
    <div>
      <PageHeader title="Tâches" subtitle={`${open.length} en cours`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">À faire</h2>
            {open.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">Aucune tâche en cours.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {open.map((t) => <TaskRow key={t.id} task={t} canManage={canManage} />)}
              </ul>
            )}
          </Card>

          {done.length > 0 && (
            <Card>
              <h2 className="mb-4 text-base font-semibold text-graphite-500">Terminées</h2>
              <ul className="divide-y divide-graphite-100">
                {done.map((t) => <TaskRow key={t.id} task={t} canManage={canManage} />)}
              </ul>
            </Card>
          )}
        </div>

        {canManage && (
          <div>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-graphite-900">Nouvelle tâche</h2>
              <ActionForm action={createTask} resetOnSuccess successMessage="Tâche ajoutée.">
                <div className="space-y-3">
                  <input name="title" required placeholder="Titre de la tâche" className="input" />
                  <textarea name="description" rows={2} placeholder="Description (optionnel)" className="input" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="due_date">Échéance</label>
                      <input id="due_date" name="due_date" type="date" className="input" />
                    </div>
                    <div>
                      <label className="label" htmlFor="category">Type</label>
                      <select id="category" name="category" className="input">
                        <option value="professional">Professionnelle</option>
                        <option value="personal">Personnelle</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="assigned_membership_id">Attribuer à</label>
                    <select id="assigned_membership_id" name="assigned_membership_id" className="input">
                      <option value="">—</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                  <SubmitButton className="w-full">Ajouter</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
