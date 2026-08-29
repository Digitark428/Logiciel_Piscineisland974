-- 0027 - Sauvegardes professionnelles ZIP, planification locale et originaux galerie.

-- Chaque entreprise choisit son fuseau IANA. La valeur par défaut conserve le
-- comportement historique de LETI pour La Réunion.
alter table public.workspaces
  add column if not exists timezone text not null default 'Indian/Reunion';

alter table public.workspaces
  add constraint workspaces_timezone_not_blank
  check (char_length(trim(timezone)) between 1 and 100);

-- Les sauvegardes deviennent des tâches asynchrones traçables. Les anciennes
-- sauvegardes JSON restent téléchargeables, mais toutes les nouvelles sorties
-- utilisent le format ZIP professionnel.
alter table public.backups drop constraint if exists backups_status_check;
alter table public.backups
  add constraint backups_status_check
  check (status in ('queued', 'running', 'completed', 'failed'));

alter table public.backups
  alter column status set default 'queued',
  add column if not exists file_name text,
  add column if not exists mime_type text not null default 'application/zip',
  add column if not exists progress_stage text not null default 'queued',
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists scheduled_local_date date,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists failure_message text,
  add column if not exists workflow_run_id text,
  add column if not exists requested_by uuid references public.memberships(id) on delete set null;

alter table public.backups
  add constraint backups_attempt_count_nonnegative check (attempt_count >= 0);

update public.backups
set
  status = 'failed',
  failure_message = coalesce(failure_message, 'Archive historique indisponible')
where status = 'completed'
  and (storage_path is null or size_bytes is null or size_bytes <= 0);

update public.backups
set
  file_name = coalesce(file_name, regexp_replace(storage_path, '^.*/', '')),
  mime_type = case when storage_path like '%.json' then 'application/json' else mime_type end,
  progress_stage = case when status = 'completed' then 'completed' when status = 'failed' then 'failed' else 'running' end,
  started_at = coalesce(started_at, created_at),
  completed_at = case when status in ('completed', 'failed') then coalesce(completed_at, created_at) else completed_at end;

alter table public.backups
  add constraint backups_completed_file_check check (
    status <> 'completed'
    or (storage_path is not null and size_bytes is not null and size_bytes > 0)
  );

create index if not exists backups_workspace_status_created_idx
  on public.backups (workspace_id, status, created_at desc);

create unique index if not exists backups_workspace_auto_local_date_key
  on public.backups (workspace_id, scheduled_local_date)
  where kind = 'auto' and scheduled_local_date is not null;

revoke insert, update, delete on table public.backups from anon, authenticated;
grant select on table public.backups to authenticated;
grant all on table public.backups to service_role;

create or replace function public.backups_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.requested_by is not null and not exists (
    select 1
    from public.memberships
    where id = new.requested_by
      and workspace_id = new.workspace_id
  ) then
    raise exception 'backup requester must belong to the backup workspace';
  end if;
  return new;
end;
$$;

revoke all on function public.backups_tenant_guard() from public, anon, authenticated;

create trigger backups_tenant_guard
  before insert or update on public.backups
  for each row execute function public.backups_tenant_guard();

-- Les exports contiennent notamment les données financières : leur historique
-- et les fichiers associés sont donc strictement réservés aux administrateurs.
drop policy if exists backups_select on public.backups;
create policy backups_select on public.backups
  for select to authenticated
  using ((select public.auth_is_admin(workspace_id)));

drop policy if exists "backups_select" on storage.objects;
create policy "backups_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'backups'
    and (select public.auth_is_admin(public.storage_workspace_id(name)))
  );

-- Les futurs médias conservent l'original importé en plus de la version WebP
-- optimisée pour l'interface. Les lignes historiques restent valides : leur
-- meilleur original disponible est la version WebP déjà stockée.
alter table public.community_post_media
  add column if not exists original_storage_path text,
  add column if not exists original_name text,
  add column if not exists original_mime_type text,
  add column if not exists original_size_bytes bigint;

alter table public.community_post_media
  add constraint community_post_media_original_size_nonnegative
  check (original_size_bytes is null or original_size_bytes >= 0);

create unique index if not exists community_post_media_original_path_key
  on public.community_post_media (original_storage_path)
  where original_storage_path is not null;
