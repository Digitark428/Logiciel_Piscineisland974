-- Priorités et heure facultative pour la to-do personnelle.
--
-- La valeur par défaut conserve toutes les tâches existantes sans perte de
-- données. Les policies RLS existantes restent inchangées.

alter table public.tasks
  add column priority text not null default 'not_urgent',
  add column due_time time;

alter table public.tasks
  add constraint tasks_priority_check
  check (priority in ('not_urgent', 'urgent', 'very_urgent'));

-- Les vues personnelles filtrent toujours par entreprise, catégorie et
-- créateur. Cet index couvre ce chemin sans remplacer les index existants.
create index tasks_workspace_category_created_idx
  on public.tasks (workspace_id, category, created_by);

-- Empêche un identifiant de membre fourni au formulaire de relier une tâche à
-- un autre workspace, y compris lors d'un appel direct à la Data API.
create or replace function public.tasks_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  member_workspace uuid;
begin
  if new.created_by is not null then
    select workspace_id into member_workspace
    from public.memberships
    where id = new.created_by;

    if member_workspace is distinct from new.workspace_id then
      raise exception 'created_by must belong to the task workspace';
    end if;
  end if;

  if new.assigned_membership_id is not null then
    select workspace_id into member_workspace
    from public.memberships
    where id = new.assigned_membership_id;

    if member_workspace is distinct from new.workspace_id then
      raise exception 'assigned_membership_id must belong to the task workspace';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.tasks_tenant_guard() from public, anon, authenticated;

create trigger tasks_tenant_guard
  before insert or update on public.tasks
  for each row execute function public.tasks_tenant_guard();
