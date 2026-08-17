-- 0022 — Durcissement tenant, permissions métier, portail et intégrité des relations.
-- Migration additive : elle bloque les nouveaux liens incohérents sans modifier les données existantes.

create or replace function public.assert_tenant_references()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref_workspace uuid;
begin
  if tg_table_name = 'pools' then
    select workspace_id into ref_workspace from public.clients where id = new.client_id;
    if ref_workspace is distinct from new.workspace_id then raise exception 'client_id must belong to the pool workspace'; end if;
  elsif tg_table_name = 'service_series' then
    select workspace_id into ref_workspace from public.clients where id = new.client_id;
    if ref_workspace is distinct from new.workspace_id then raise exception 'client_id must belong to the service series workspace'; end if;
    if new.pool_id is not null then select workspace_id into ref_workspace from public.pools where id = new.pool_id; if ref_workspace is distinct from new.workspace_id then raise exception 'pool_id must belong to the service series workspace'; end if; end if;
    if new.assigned_membership_id is not null then select workspace_id into ref_workspace from public.memberships where id = new.assigned_membership_id; if ref_workspace is distinct from new.workspace_id then raise exception 'assigned_membership_id must belong to the service series workspace'; end if; end if;
  elsif tg_table_name = 'services' then
    select workspace_id into ref_workspace from public.clients where id = new.client_id;
    if ref_workspace is distinct from new.workspace_id then raise exception 'client_id must belong to the service workspace'; end if;
    if new.pool_id is not null then select workspace_id into ref_workspace from public.pools where id = new.pool_id; if ref_workspace is distinct from new.workspace_id then raise exception 'pool_id must belong to the service workspace'; end if; end if;
    if new.series_id is not null then select workspace_id into ref_workspace from public.service_series where id = new.series_id; if ref_workspace is distinct from new.workspace_id then raise exception 'series_id must belong to the service workspace'; end if; end if;
    if new.assigned_membership_id is not null then select workspace_id into ref_workspace from public.memberships where id = new.assigned_membership_id; if ref_workspace is distinct from new.workspace_id then raise exception 'assigned_membership_id must belong to the service workspace'; end if; end if;
    if new.completed_by is not null then select workspace_id into ref_workspace from public.memberships where id = new.completed_by; if ref_workspace is distinct from new.workspace_id then raise exception 'completed_by must belong to the service workspace'; end if; end if;
    if new.contract_document_id is not null then select workspace_id into ref_workspace from public.documents where id = new.contract_document_id; if ref_workspace is distinct from new.workspace_id then raise exception 'contract_document_id must belong to the service workspace'; end if; end if;
    if new.invoice_document_id is not null then select workspace_id into ref_workspace from public.documents where id = new.invoice_document_id; if ref_workspace is distinct from new.workspace_id then raise exception 'invoice_document_id must belong to the service workspace'; end if; end if;
  elsif tg_table_name = 'service_tasks' then
    select workspace_id into ref_workspace from public.services where id = new.service_id;
    if ref_workspace is distinct from new.workspace_id then raise exception 'service_id must belong to the service task workspace'; end if;
  elsif tg_table_name = 'invoice_lines' then
    select workspace_id into ref_workspace from public.invoices where id = new.invoice_id;
    if ref_workspace is distinct from new.workspace_id then raise exception 'invoice_id must belong to the invoice line workspace'; end if;
  elsif tg_table_name = 'documents' then
    if new.entity_id is null then raise exception 'documents must have a known entity_id'; end if;
    case new.entity_type
      when 'client' then select workspace_id into ref_workspace from public.clients where id = new.entity_id;
      when 'pool' then select workspace_id into ref_workspace from public.pools where id = new.entity_id;
      when 'service' then select workspace_id into ref_workspace from public.services where id = new.entity_id;
      when 'contract' then select workspace_id into ref_workspace from public.contracts where id = new.entity_id;
      when 'invoice' then select workspace_id into ref_workspace from public.invoices where id = new.entity_id;
      when 'member' then select workspace_id into ref_workspace from public.memberships where id = new.entity_id;
      when 'workspace' then ref_workspace := new.entity_id;
      else raise exception 'unsupported document entity type';
    end case;
    if ref_workspace is distinct from new.workspace_id then raise exception 'document entity must belong to the document workspace'; end if;
    if new.uploaded_by is not null then select workspace_id into ref_workspace from public.memberships where id = new.uploaded_by; if ref_workspace is distinct from new.workspace_id then raise exception 'uploaded_by must belong to the document workspace'; end if; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.assert_tenant_references() from public, anon, authenticated;

drop trigger if exists pools_tenant_references on public.pools;
create trigger pools_tenant_references before insert or update on public.pools for each row execute function public.assert_tenant_references();
drop trigger if exists service_series_tenant_references on public.service_series;
create trigger service_series_tenant_references before insert or update on public.service_series for each row execute function public.assert_tenant_references();
drop trigger if exists services_tenant_references on public.services;
create trigger services_tenant_references before insert or update on public.services for each row execute function public.assert_tenant_references();
drop trigger if exists service_tasks_tenant_references on public.service_tasks;
create trigger service_tasks_tenant_references before insert or update on public.service_tasks for each row execute function public.assert_tenant_references();
drop trigger if exists invoice_lines_tenant_references on public.invoice_lines;
create trigger invoice_lines_tenant_references before insert or update on public.invoice_lines for each row execute function public.assert_tenant_references();
drop trigger if exists documents_tenant_references on public.documents;
create trigger documents_tenant_references before insert or update on public.documents for each row execute function public.assert_tenant_references();

create or replace function public.guard_service_completion_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare current_membership uuid;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.auth_has_permission(new.workspace_id, 'services.edit') then return new; end if;
  select id into current_membership from public.memberships where user_id = auth.uid() and workspace_id = old.workspace_id and status = 'active';
  if current_membership is null or old.assigned_membership_id is distinct from current_membership or not public.auth_has_permission(old.workspace_id, 'services.complete') then raise exception 'only the assigned member may complete this service'; end if;
  if (to_jsonb(new) - array['status','report','started_at','completed_at','completed_by','updated_at']) is distinct from (to_jsonb(old) - array['status','report','started_at','completed_at','completed_by','updated_at']) then raise exception 'services.complete cannot modify service planning or relations'; end if;
  if new.status not in ('planned', 'in_progress', 'completed') then raise exception 'services.complete cannot cancel a service'; end if;
  if new.completed_by is distinct from old.completed_by and new.completed_by is distinct from current_membership then raise exception 'completed_by must be the assigned member'; end if;
  return new;
end;
$$;
revoke all on function public.guard_service_completion_update() from public, anon, authenticated;
drop trigger if exists services_completion_guard on public.services;
create trigger services_completion_guard before update on public.services for each row execute function public.guard_service_completion_update();

-- Permissions métier dans les policies RLS (contrôle côté base, y compris API directe).
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated using ((select public.auth_has_permission(workspace_id, 'clients.view')));
drop policy if exists pools_select on public.pools;
create policy pools_select on public.pools for select to authenticated using ((select public.auth_has_permission(workspace_id, 'pools.view')));
drop policy if exists service_series_select on public.service_series;
create policy service_series_select on public.service_series for select to authenticated using ((select public.auth_has_permission(workspace_id, 'services.view')));
drop policy if exists services_select on public.services;
create policy services_select on public.services for select to authenticated using ((select public.auth_has_permission(workspace_id, 'services.view')));
drop policy if exists service_tasks_select on public.service_tasks;
create policy service_tasks_select on public.service_tasks for select to authenticated using ((select public.auth_has_permission(workspace_id, 'services.view')));
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select to authenticated using ((select public.auth_has_permission(workspace_id, 'documents.view')));
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using ((select public.auth_has_permission(workspace_id, 'documents.view')));
drop policy if exists invoice_lines_select on public.invoice_lines;
create policy invoice_lines_select on public.invoice_lines for select to authenticated using ((select public.auth_has_permission(workspace_id, 'documents.view')));
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated using ((select public.auth_has_permission(workspace_id, 'documents.view')));
drop policy if exists backups_select on public.backups;
create policy backups_select on public.backups for select to authenticated using ((select public.auth_has_permission(workspace_id, 'backups.manage')) and (select public.auth_has_permission(workspace_id, 'sensitive.view')));

drop policy if exists "documents_select" on storage.objects;
create policy "documents_select" on storage.objects for select to authenticated using (bucket_id = 'documents' and (select public.auth_has_permission(public.storage_workspace_id(name), 'documents.view')));
drop policy if exists "backups_select" on storage.objects;
create policy "backups_select" on storage.objects for select to authenticated using (bucket_id = 'backups' and (select public.auth_has_permission(public.storage_workspace_id(name), 'backups.manage')) and (select public.auth_has_permission(public.storage_workspace_id(name), 'sensitive.view')));

drop policy if exists service_tasks_update on public.service_tasks;
create policy service_tasks_update on public.service_tasks for update to authenticated using (
  (select public.auth_has_permission(workspace_id, 'services.edit')) or exists (
    select 1 from public.services s join public.memberships m on m.id = s.assigned_membership_id
    where s.id = service_tasks.service_id and s.workspace_id = service_tasks.workspace_id and m.user_id = auth.uid() and m.status = 'active' and (select public.auth_has_permission(service_tasks.workspace_id, 'services.complete'))
  )
) with check (
  (select public.auth_has_permission(workspace_id, 'services.edit')) or exists (
    select 1 from public.services s join public.memberships m on m.id = s.assigned_membership_id
    where s.id = service_tasks.service_id and s.workspace_id = service_tasks.workspace_id and m.user_id = auth.uid() and m.status = 'active' and (select public.auth_has_permission(service_tasks.workspace_id, 'services.complete'))
  )
);

-- Anti-bruteforce portail : identifiants techniques hachés, verrouillage après cinq échecs.
create table if not exists public.portal_auth_attempts (
  token_hash text not null, ip_hash text not null, user_agent_hash text not null,
  failed_count integer not null default 0 check (failed_count >= 0), window_started_at timestamptz not null default now(), locked_until timestamptz, updated_at timestamptz not null default now(),
  primary key (token_hash, ip_hash, user_agent_hash)
);
alter table public.portal_auth_attempts enable row level security;
create or replace function public.portal_auth_is_locked(p_token_hash text, p_ip_hash text, p_user_agent_hash text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select locked_until > now() from public.portal_auth_attempts where token_hash = p_token_hash and ip_hash = p_ip_hash and user_agent_hash = p_user_agent_hash), false);
$$;
create or replace function public.record_portal_auth_attempt(p_token_hash text, p_ip_hash text, p_user_agent_hash text, p_success boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_success then delete from public.portal_auth_attempts where token_hash = p_token_hash and ip_hash = p_ip_hash and user_agent_hash = p_user_agent_hash; return; end if;
  insert into public.portal_auth_attempts (token_hash, ip_hash, user_agent_hash, failed_count, window_started_at, locked_until)
  values (p_token_hash, p_ip_hash, p_user_agent_hash, 1, now(), null)
  on conflict (token_hash, ip_hash, user_agent_hash) do update set
    failed_count = case when portal_auth_attempts.window_started_at < now() - interval '15 minutes' then 1 else portal_auth_attempts.failed_count + 1 end,
    window_started_at = case when portal_auth_attempts.window_started_at < now() - interval '15 minutes' then now() else portal_auth_attempts.window_started_at end,
    locked_until = case when (case when portal_auth_attempts.window_started_at < now() - interval '15 minutes' then 1 else portal_auth_attempts.failed_count + 1 end) >= 5 then now() + interval '15 minutes' else null end,
    updated_at = now();
end;
$$;
revoke all on function public.portal_auth_is_locked(text, text, text) from public, anon, authenticated;
revoke all on function public.record_portal_auth_attempt(text, text, text, boolean) from public, anon, authenticated;
