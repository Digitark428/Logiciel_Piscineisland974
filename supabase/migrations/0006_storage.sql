-- 0006 — Buckets Storage privés + policies (isolation par workspace).
-- Convention de chemin : "<workspace_id>/<...>" — le 1er dossier = workspace.

insert into storage.buckets (id, name, public)
values
  ('avatars',   'avatars',   false),
  ('documents', 'documents', false),
  ('backups',   'backups',   false)
on conflict (id) do nothing;

-- Helper : extrait le workspace_id du chemin d'un objet
create or replace function public.storage_workspace_id(p_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  first_folder text;
begin
  first_folder := (storage.foldername(p_name))[1];
  if first_folder is null then
    return null;
  end if;
  return first_folder::uuid;
exception when others then
  return null;
end;
$$;

-- AVATARS : lisible par les membres du workspace ; écriture par ceux qui gèrent l'équipe / leur profil.
create policy "avatars_select" on storage.objects
  for select using (
    bucket_id = 'avatars'
    and public.auth_is_member(public.storage_workspace_id(name))
  );
create policy "avatars_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and public.auth_is_member(public.storage_workspace_id(name))
  );
create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and public.auth_is_member(public.storage_workspace_id(name))
  );
create policy "avatars_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and public.auth_is_member(public.storage_workspace_id(name))
  );

-- DOCUMENTS : lecture membres ; écriture/suppression selon permission documents.manage
create policy "documents_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and public.auth_is_member(public.storage_workspace_id(name))
  );
create policy "documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and public.auth_has_permission(public.storage_workspace_id(name), 'documents.manage')
  );
create policy "documents_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and public.auth_has_permission(public.storage_workspace_id(name), 'documents.manage')
  );

-- BACKUPS : réservé à ceux qui gèrent les sauvegardes.
create policy "backups_select" on storage.objects
  for select using (
    bucket_id = 'backups'
    and public.auth_has_permission(public.storage_workspace_id(name), 'backups.manage')
  );
-- Écriture des sauvegardes : service_role (cron) uniquement — pas de policy insert publique.
