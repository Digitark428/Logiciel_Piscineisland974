-- Événements manuels personnels du planning.
--
-- Une ligne appartient simultanément à un espace et au membership qui l'a
-- créée. La RLS reste volontairement stricte, y compris pour les gérants :
-- un événement personnel n'est jamais visible par un autre membre.

create table public.planning_events (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  owner_membership_id   uuid not null references public.memberships(id) on delete cascade,
  title                 text not null,
  event_date            date not null,
  start_time            time,
  end_time              time,
  all_day               boolean not null default false,
  description           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint planning_events_title_check
    check (char_length(trim(title)) between 1 and 240),
  constraint planning_events_description_check
    check (description is null or char_length(description) <= 4000),
  constraint planning_events_time_check
    check (
      (all_day and start_time is null and end_time is null)
      or
      (not all_day and start_time is not null and end_time is not null and end_time > start_time)
    )
);

create index planning_events_owner_date_idx
  on public.planning_events (owner_membership_id, event_date, id);
create index planning_events_workspace_idx
  on public.planning_events (workspace_id);

create trigger planning_events_set_updated_at
  before update on public.planning_events
  for each row execute function public.set_updated_at();

-- Empêche toute relation membership/espace incohérente, y compris lors d'une
-- écriture privilégiée. La fonction est exclusivement appelée par le trigger.
create or replace function public.planning_events_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_workspace uuid;
begin
  select workspace_id into owner_workspace
  from public.memberships
  where id = new.owner_membership_id;

  if owner_workspace is distinct from new.workspace_id then
    raise exception 'planning event owner must belong to the event workspace';
  end if;

  return new;
end;
$$;

revoke all on function public.planning_events_tenant_guard() from public, anon, authenticated;

create trigger planning_events_tenant_guard
  before insert or update on public.planning_events
  for each row execute function public.planning_events_tenant_guard();

alter table public.planning_events enable row level security;

-- Les privilèges Data API sont explicites : les nouvelles tables ne sont plus
-- systématiquement exposées par défaut sur les projets Supabase récents.
revoke all on table public.planning_events from anon;
grant select, insert, update, delete on table public.planning_events to authenticated;
grant all on table public.planning_events to service_role;

create policy planning_events_select on public.planning_events
  for select to authenticated
  using (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id
      from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  );

create policy planning_events_insert on public.planning_events
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id
      from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  );

create policy planning_events_update on public.planning_events
  for update to authenticated
  using (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id
      from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  )
  with check (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id
      from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  );

create policy planning_events_delete on public.planning_events
  for delete to authenticated
  using (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id
      from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  );
