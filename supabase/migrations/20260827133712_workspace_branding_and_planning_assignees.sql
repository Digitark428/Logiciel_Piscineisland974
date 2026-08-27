-- Personnalisation visuelle des workspaces et affectation optionnelle des
-- événements du planning. Les événements historiques restent non affectés.

-- -------------------------------------------------------------------------
-- LOGOS D'ENTREPRISE
-- -------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-assets',
  'workspace-assets',
  false,
  5242880,
  array['image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy workspace_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'workspace-assets'
    and (select public.auth_is_member(public.storage_workspace_id(name)))
  );

create policy workspace_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'workspace-assets'
    and (select public.auth_is_admin(public.storage_workspace_id(name)))
  );

create policy workspace_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'workspace-assets'
    and (select public.auth_is_admin(public.storage_workspace_id(name)))
  )
  with check (
    bucket_id = 'workspace-assets'
    and (select public.auth_is_admin(public.storage_workspace_id(name)))
  );

create policy workspace_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'workspace-assets'
    and (select public.auth_is_admin(public.storage_workspace_id(name)))
  );

-- -------------------------------------------------------------------------
-- PERSONNE CONCERNÉE PAR UN ÉVÉNEMENT
-- -------------------------------------------------------------------------

alter table public.planning_events
  add column assigned_membership_id uuid
  references public.memberships(id) on delete set null;

create index planning_events_assignee_date_idx
  on public.planning_events (assigned_membership_id, event_date, id)
  where assigned_membership_id is not null;

create or replace function public.planning_events_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_workspace uuid;
  assignee_workspace uuid;
begin
  select workspace_id into owner_workspace
  from public.memberships
  where id = new.owner_membership_id;

  if owner_workspace is distinct from new.workspace_id then
    raise exception 'planning event owner must belong to the event workspace';
  end if;

  if new.assigned_membership_id is not null then
    select workspace_id into assignee_workspace
    from public.memberships
    where id = new.assigned_membership_id;

    if assignee_workspace is distinct from new.workspace_id then
      raise exception 'planning event assignee must belong to the event workspace';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.planning_events_tenant_guard() from public, anon, authenticated;

drop policy planning_events_select on public.planning_events;
drop policy planning_events_insert on public.planning_events;
drop policy planning_events_update on public.planning_events;
drop policy planning_events_delete on public.planning_events;

create policy planning_events_select on public.planning_events
  for select to authenticated
  using (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and (
      owner_membership_id in (
        select id from public.memberships
        where user_id = (select auth.uid())
          and workspace_id = planning_events.workspace_id
          and status = 'active'
      )
      or assigned_membership_id in (
        select id from public.memberships
        where user_id = (select auth.uid())
          and workspace_id = planning_events.workspace_id
          and status = 'active'
      )
    )
  );

create policy planning_events_insert on public.planning_events
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
    and (
      assigned_membership_id is null
      or (select public.auth_is_admin(workspace_id))
    )
  );

create policy planning_events_update on public.planning_events
  for update to authenticated
  using (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  )
  with check (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
    and (
      assigned_membership_id is null
      or (select public.auth_is_admin(workspace_id))
    )
  );

create policy planning_events_delete on public.planning_events
  for delete to authenticated
  using (
    (select public.auth_has_permission(workspace_id, 'planning.view'))
    and owner_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = planning_events.workspace_id
        and status = 'active'
    )
  );
