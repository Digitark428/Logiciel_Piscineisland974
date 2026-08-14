import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getMemberOptions } from "@/lib/db/queries";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { createTask } from "@/lib/actions/tasks";
import { memberName } from "@/lib/utils/format";
import { TaskRow, TeamNoteForm, TeamNoteItem } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = createClient();
  const canManage = can(ctx, "tasks.manage");
  const myId = ctx.membership.id;

  // La RLS (0017) filtre déjà la visibilité : on récupère les tâches visibles par l'utilisateur.
  const [{ data: tasks }, { data: notes }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, category, status, due_date, assigned_membership_id, created_by, assignee:memberships!tasks_assigned_membership_id_fkey(first_name,last_name,email)")
      .eq("workspace_id", ctx.workspace.id)
      .order("due_date", { nullsFirst: false }),
    supabase
      .from("team_notes")
      .select("id, content, created_at, author_membership_id, author:memberships!team_notes_author_membership_id_fkey(first_name,last_name,email)")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false }),
  ]);

  const members = canManage ? await getMemberOptions(supabase, ctx.workspace.id) : [];

  const rows = (tasks ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    status: t.status,
    due_date: t.due_date,
    created_by: t.created_by,
    assigned_membership_id: t.assigned_membership_id,
    assignee: t.assignee ? memberName(t.assignee) : null,
    canToggle: t.created_by === myId || t.assigned_membership_id === myId || (ctx.isAdmin && t.category === "professional"),
    canDelete: t.created_by === myId || (ctx.isAdmin && t.category === "professional"),
  }));

  const sortOpenFirst = (list: typeof rows) =>
    [...list].sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0));

  const myPersonal = sortOpenFirst(rows.filter((t) => t.category === "personal" && t.created_by === myId));
  const assigned = sortOpenFirst(rows.filter((t) => t.category === "professional"));

  const noteItems = (notes ?? []).map((n: any) => ({
    id: n.id,
    author: n.author ? memberName(n.author) : "Membre",
    content: n.content,
    created_at: n.created_at,
    canDelete: ctx.isAdmin || n.author_membership_id === myId,
  }));

  const openCount = myPersonal.filter((t) => t.status !== "done").length + assigned.filter((t) => t.status !== "done").length;

  return (
    <div>
      <PageHeader title="Tâches & notes" subtitle={`${openCount} tâche(s) en cours`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Mes tâches — to-do personnelle privée */}
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-graphite-900">Mes tâches</h2>
            <p className="mb-3 text-xs text-graphite-400">Votre to-do personnelle — visible de vous seul.</p>
            {myPersonal.length === 0 ? (
              <p className="py-3 text-center text-sm text-graphite-400">Aucune tâche personnelle.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {myPersonal.map((t) => <TaskRow key={t.id} task={t} canToggle={t.canToggle} canDelete={t.canDelete} />)}
              </ul>
            )}
            <div className="mt-4 border-t border-graphite-100 pt-4">
              <ActionForm action={createTask} resetOnSuccess successMessage="Tâche ajoutée.">
                <input type="hidden" name="category" value="personal" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input name="title" required placeholder="Nouvelle tâche personnelle (ex : Appeler fournisseur)" className="input flex-1" />
                  <input name="due_date" type="date" className="input sm:w-44" aria-label="Échéance" />
                  <SubmitButton>Ajouter</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>

          {/* Tâches attribuées */}
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-graphite-900">Tâches attribuées</h2>
            <p className="mb-3 text-xs text-graphite-400">
              {ctx.isAdmin ? "Tâches professionnelles attribuées à l'équipe." : "Tâches que le gérant vous a attribuées."}
            </p>
            {assigned.length === 0 ? (
              <p className="py-3 text-center text-sm text-graphite-400">Aucune tâche attribuée.</p>
            ) : (
              <ul className="divide-y divide-graphite-100">
                {assigned.map((t) => <TaskRow key={t.id} task={t} canToggle={t.canToggle} canDelete={t.canDelete} />)}
              </ul>
            )}
          </Card>

          {/* Notes d'équipe */}
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-graphite-900">Notes d'équipe</h2>
            <p className="mb-3 text-xs text-graphite-400">Communication interne — visible par toute l'équipe.</p>
            <TeamNoteForm />
            {noteItems.length > 0 && (
              <ul className="mt-4 divide-y divide-graphite-100 border-t border-graphite-100">
                {noteItems.map((n) => <TeamNoteItem key={n.id} note={n} />)}
              </ul>
            )}
          </Card>
        </div>

        {/* Attribution d'une tâche (gérant) */}
        {canManage && (
          <div>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-graphite-900">Attribuer une tâche</h2>
              <ActionForm action={createTask} resetOnSuccess successMessage="Tâche attribuée.">
                <input type="hidden" name="category" value="professional" />
                <div className="space-y-3">
                  <input name="title" required placeholder="Titre de la tâche (ex : Commander pompe)" className="input" />
                  <textarea name="description" rows={2} placeholder="Description (optionnel)" className="input" />
                  <div>
                    <label className="label" htmlFor="assigned_membership_id">Attribuer à</label>
                    <select id="assigned_membership_id" name="assigned_membership_id" required className="input">
                      <option value="">Sélectionner…</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="due_date">Échéance</label>
                    <input id="due_date" name="due_date" type="date" className="input" />
                  </div>
                  <SubmitButton className="w-full">Attribuer</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
