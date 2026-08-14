-- 0017 — Confidentialité des tâches + notes d'équipe.
--
-- Tâches : une tâche personnelle ne doit être visible que de son créateur ; une tâche
-- attribuée est visible du destinataire ET du gérant. Le gérant ne voit PAS les tâches
-- personnelles des membres. Les membres peuvent créer leurs propres tâches personnelles.
--
-- Notes d'équipe : espace de communication interne, visible de toute l'équipe. Chacun peut
-- créer une note ; suppression par l'auteur OU le gérant (modération complète du gérant).

-- =========================================================================
-- TASKS — nouvelles policies (remplacent celles de 0004)
-- =========================================================================
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

-- SELECT : créateur, destinataire, OU (gérant ET tâche professionnelle).
--   → tâche perso du gérant : gérant seul (créateur).
--   → tâche perso d'un membre : ce membre seul (créateur) — invisible au gérant.
--   → tâche attribuée (professionnelle) : destinataire + gérant.
create policy tasks_select on public.tasks
  for select using (
    auth_is_member(workspace_id)
    and (
      created_by in (
        select id from public.memberships
        where user_id = auth.uid() and workspace_id = tasks.workspace_id
      )
      or assigned_membership_id in (
        select id from public.memberships
        where user_id = auth.uid() and workspace_id = tasks.workspace_id
      )
      or (category = 'professional' and auth_is_admin(workspace_id))
    )
  );

-- INSERT : on doit se déclarer créateur. Un gérant (tasks.manage) peut tout créer/attribuer ;
-- un membre ne peut créer qu'une tâche PERSONNELLE pour lui-même (non attribuée à autrui).
create policy tasks_insert on public.tasks
  for insert with check (
    auth_is_member(workspace_id)
    and created_by in (
      select id from public.memberships
      where user_id = auth.uid() and workspace_id = tasks.workspace_id
    )
    and (
      auth_has_permission(workspace_id, 'tasks.manage')
      or (
        category = 'personal'
        and (
          assigned_membership_id is null
          or assigned_membership_id in (
            select id from public.memberships
            where user_id = auth.uid() and workspace_id = tasks.workspace_id
          )
        )
      )
    )
  );

-- UPDATE : créateur, destinataire (mise à jour du statut), ou gérant (tâches professionnelles).
create policy tasks_update on public.tasks
  for update using (
    auth_is_member(workspace_id)
    and (
      created_by in (
        select id from public.memberships
        where user_id = auth.uid() and workspace_id = tasks.workspace_id
      )
      or assigned_membership_id in (
        select id from public.memberships
        where user_id = auth.uid() and workspace_id = tasks.workspace_id
      )
      or (category = 'professional' and auth_is_admin(workspace_id))
    )
  )
  with check ( auth_is_member(workspace_id) );

-- DELETE : créateur, ou gérant sur les tâches professionnelles (pas sur les persos des membres).
create policy tasks_delete on public.tasks
  for delete using (
    created_by in (
      select id from public.memberships
      where user_id = auth.uid() and workspace_id = tasks.workspace_id
    )
    or (category = 'professional' and auth_is_admin(workspace_id))
  );

-- =========================================================================
-- TEAM NOTES — communication interne d'équipe
-- =========================================================================
create table if not exists public.team_notes (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  author_membership_id  uuid references public.memberships(id) on delete set null,
  content               text not null,
  created_at            timestamptz not null default now()
);

create index if not exists team_notes_workspace_idx on public.team_notes(workspace_id, created_at desc);

alter table public.team_notes enable row level security;

-- Lecture : tous les membres du workspace.
create policy team_notes_select on public.team_notes
  for select using ( auth_is_member(workspace_id) );

-- Création : membre du workspace, en se déclarant auteur.
create policy team_notes_insert on public.team_notes
  for insert with check (
    auth_is_member(workspace_id)
    and author_membership_id in (
      select id from public.memberships
      where user_id = auth.uid() and workspace_id = team_notes.workspace_id
    )
  );

-- Suppression : l'auteur OU le gérant (modération complète).
create policy team_notes_delete on public.team_notes
  for delete using (
    auth_is_admin(workspace_id)
    or author_membership_id in (
      select id from public.memberships
      where user_id = auth.uid() and workspace_id = team_notes.workspace_id
    )
  );
