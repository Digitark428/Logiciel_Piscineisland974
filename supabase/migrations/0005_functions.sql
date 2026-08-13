-- 0005 — Fonctions serveur : provisioning d'espace, permissions, codes de prestation.
-- Ces fonctions sont appelées côté serveur (service_role) après création du user Auth.

-- Liste canonique des clés de permission (source de vérité côté base)
create or replace function public.permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'clients.view','clients.edit','clients.delete',
    'pools.view','pools.edit',
    'services.view','services.create','services.edit','services.complete',
    'planning.view',
    'tasks.view','tasks.manage',
    'documents.view','documents.manage',
    'contracts.manage',
    'invoices.manage',
    'team.manage',
    'settings.manage',
    'backups.manage',
    'sensitive.view'
  ]::text[];
$$;

-- Attribue toutes les permissions à un membership (admin par défaut)
create or replace function public.assign_all_permissions(p_membership_id uuid, p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
begin
  foreach k in array public.permission_keys() loop
    insert into public.permissions (membership_id, workspace_id, key, granted)
    values (p_membership_id, p_workspace_id, k, true)
    on conflict (membership_id, key) do update set granted = true;
  end loop;
end;
$$;

-- Attribue un ensemble de permissions donné (remplace l'existant)
create or replace function public.set_member_permissions(p_membership_id uuid, p_workspace_id uuid, p_keys text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  valid_keys text[] := public.permission_keys();
begin
  -- Nettoie toutes les permissions existantes
  delete from public.permissions where membership_id = p_membership_id;
  -- Réinsère celles demandées (uniquement les clés valides)
  foreach k in array coalesce(p_keys, '{}'::text[]) loop
    if k = any(valid_keys) then
      insert into public.permissions (membership_id, workspace_id, key, granted)
      values (p_membership_id, p_workspace_id, k, true)
      on conflict (membership_id, key) do update set granted = true;
    end if;
  end loop;
end;
$$;

-- Code de prestation lisible et unique
create or replace function public.next_service_code()
returns text
language sql
volatile
as $$
  select 'PR-' || to_char(nextval('public.service_code_seq'), 'FM000000');
$$;

-- Trigger : génère un code de prestation si absent
create or replace function public.services_set_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.next_service_code();
  end if;
  return new;
end;
$$;

create trigger services_set_code_trg
  before insert on public.services
  for each row execute function public.services_set_code();

-- =========================================================================
-- Provisioning d'un workspace complet (transactionnel)
-- Retourne l'id du workspace + le membership admin + le code entreprise.
-- Appelée par le serveur après création du user Auth.
-- =========================================================================
create or replace function public.provision_workspace(
  p_user_id       uuid,
  p_company_name  text,
  p_admin_first   text,
  p_admin_last    text,
  p_admin_email   text,
  p_company       jsonb default '{}'::jsonb,
  p_is_demo       boolean default false,
  p_code_prefix   text default 'PI'
)
returns table (workspace_id uuid, membership_id uuid, company_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_membership_id uuid;
  v_code text;
begin
  v_code := public.generate_company_code(p_code_prefix);

  insert into public.workspaces (
    company_code, name, address_line1, address_line2, postal_code, city, country,
    phone, email, siret, vat_number, legal_form, legal_info, is_demo
  ) values (
    v_code,
    p_company_name,
    p_company->>'address_line1',
    p_company->>'address_line2',
    p_company->>'postal_code',
    p_company->>'city',
    coalesce(p_company->>'country', 'France'),
    p_company->>'phone',
    (p_company->>'email')::citext,
    p_company->>'siret',
    p_company->>'vat_number',
    p_company->>'legal_form',
    coalesce(p_company->'legal_info', '{}'::jsonb),
    p_is_demo
  )
  returning id into v_workspace_id;

  insert into public.memberships (
    workspace_id, user_id, role, member_type, status, first_name, last_name, email
  ) values (
    v_workspace_id, p_user_id, 'admin', 'employe', 'active',
    p_admin_first, p_admin_last, p_admin_email::citext
  )
  returning id into v_membership_id;

  perform public.assign_all_permissions(v_membership_id, v_workspace_id);

  insert into public.activity_logs (workspace_id, actor_membership_id, actor_label, action, entity_type, entity_id, summary)
  values (v_workspace_id, v_membership_id, coalesce(p_admin_first || ' ' || p_admin_last, p_admin_email),
          'create', 'workspace', v_workspace_id, 'Création de l''espace ' || p_company_name);

  return query select v_workspace_id, v_membership_id, v_code;
end;
$$;

-- =========================================================================
-- Ajout d'un membre à un workspace (après création du user Auth côté serveur)
-- =========================================================================
create or replace function public.provision_member(
  p_workspace_id  uuid,
  p_user_id       uuid,
  p_first         text,
  p_last          text,
  p_email         text,
  p_member_type   text default 'employe',
  p_role          text default 'member',
  p_permission_keys text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership_id uuid;
begin
  insert into public.memberships (workspace_id, user_id, role, member_type, status, first_name, last_name, email)
  values (p_workspace_id, p_user_id, p_role, p_member_type, 'active', p_first, p_last, p_email::citext)
  returning id into v_membership_id;

  if p_role = 'admin' then
    perform public.assign_all_permissions(v_membership_id, p_workspace_id);
  else
    perform public.set_member_permissions(v_membership_id, p_workspace_id, coalesce(p_permission_keys, '{}'::text[]));
  end if;

  return v_membership_id;
end;
$$;
