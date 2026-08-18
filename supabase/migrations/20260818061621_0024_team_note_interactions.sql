-- 0024 — Interactions collaboratives des notes d'équipe.
--
-- Les interactions restent volontairement attachées aux notes d'équipe : elles
-- constituent l'espace collaboratif partagé. Les tâches personnelles et attribuées
-- conservent leur confidentialité et leur fonctionnement actuels.

-- =========================================================================
-- TABLES
-- =========================================================================
create table public.team_note_reads (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  team_note_id    uuid not null references public.team_notes(id) on delete cascade,
  membership_id   uuid references public.memberships(id) on delete set null,
  reader_label    text not null default 'Membre',
  read_at         timestamptz not null default now(),
  unique (team_note_id, membership_id)
);

create table public.team_note_executions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  team_note_id    uuid not null references public.team_notes(id) on delete cascade,
  membership_id   uuid references public.memberships(id) on delete set null,
  executor_label  text not null default 'Membre',
  executed_at     timestamptz not null default now(),
  unique (team_note_id, membership_id)
);

create table public.team_note_comments (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  team_note_id          uuid not null references public.team_notes(id) on delete cascade,
  author_membership_id  uuid references public.memberships(id) on delete set null,
  author_label          text not null default 'Membre',
  content               text not null check (char_length(trim(content)) between 1 and 4000),
  created_at            timestamptz not null default now()
);

create index team_note_reads_workspace_note_idx
  on public.team_note_reads(workspace_id, team_note_id);
create index team_note_reads_membership_idx
  on public.team_note_reads(membership_id);
create index team_note_executions_workspace_note_idx
  on public.team_note_executions(workspace_id, team_note_id);
create index team_note_comments_workspace_note_created_idx
  on public.team_note_comments(workspace_id, team_note_id, created_at);

-- En fonction de la configuration Data API du projet, les nouvelles tables
-- peuvent exiger des privilèges explicites en plus de la RLS.
grant select, insert on public.team_note_reads to authenticated;
grant select, insert on public.team_note_executions to authenticated;
grant select, insert on public.team_note_comments to authenticated;

-- =========================================================================
-- INTÉGRITÉ TENANT + LIBELLÉ D'AUTEUR
-- =========================================================================
-- Le trigger empêche tout lien entre une note, un membre et un workspace
-- différents, et fige le nom affiché au moment de l'interaction.
create or replace function public.team_note_interaction_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  note_workspace uuid;
  actor_workspace uuid;
  actor_label text;
  actor_id uuid;
begin
  select workspace_id into note_workspace
  from public.team_notes
  where id = new.team_note_id;

  if note_workspace is distinct from new.workspace_id then
    raise exception 'team_note_id must belong to the interaction workspace';
  end if;

  actor_id := case
    when tg_table_name = 'team_note_comments' then new.author_membership_id
    else new.membership_id
  end;

  select
    workspace_id,
    coalesce(nullif(concat_ws(' ', first_name, last_name), ''), email, 'Membre')
  into actor_workspace, actor_label
  from public.memberships
  where id = actor_id;

  if actor_workspace is distinct from new.workspace_id then
    raise exception 'interaction member must belong to the interaction workspace';
  end if;

  if tg_table_name = 'team_note_comments' then
    new.author_label := actor_label;
  elsif tg_table_name = 'team_note_reads' then
    new.reader_label := actor_label;
  else
    new.executor_label := actor_label;
  end if;

  return new;
end;
$$;

revoke all on function public.team_note_interaction_guard() from public, anon, authenticated;

create trigger team_note_reads_guard
  before insert on public.team_note_reads
  for each row execute function public.team_note_interaction_guard();
create trigger team_note_executions_guard
  before insert on public.team_note_executions
  for each row execute function public.team_note_interaction_guard();
create trigger team_note_comments_guard
  before insert on public.team_note_comments
  for each row execute function public.team_note_interaction_guard();

-- =========================================================================
-- RLS — lecture/écriture limitée au compte connecté et à son workspace.
-- Aucune policy UPDATE/DELETE : les interactions forment l'historique.
-- =========================================================================
alter table public.team_note_reads enable row level security;
alter table public.team_note_executions enable row level security;
alter table public.team_note_comments enable row level security;

create policy team_note_reads_select on public.team_note_reads
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'tasks.view')));
create policy team_note_reads_insert on public.team_note_reads
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'tasks.view'))
    and membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = team_note_reads.workspace_id
        and status = 'active'
    )
  );

create policy team_note_executions_select on public.team_note_executions
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'tasks.view')));
create policy team_note_executions_insert on public.team_note_executions
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'tasks.view'))
    and membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = team_note_executions.workspace_id
        and status = 'active'
    )
  );

create policy team_note_comments_select on public.team_note_comments
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'tasks.view')));
create policy team_note_comments_insert on public.team_note_comments
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'tasks.view'))
    and author_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = team_note_comments.workspace_id
        and status = 'active'
    )
  );
