-- 0019 — Suppression complète du mode démo (validée par le propriétaire, destructif).
-- Retire la fonction de seed démo, purge les données démo de production, supprime les
-- comptes démo, et retire la colonne is_demo. La mécanique multi-tenant reste intacte.

-- 1) Fonction de (ré)initialisation démo : supprimée.
drop function if exists public.seed_demo_data(uuid);

-- 2) provision_workspace : on conserve la signature (grants 0009 préservés) mais on
--    n'écrit plus is_demo. Le paramètre p_is_demo devient sans effet (rétrocompat d'appel).
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
    phone, email, siret, vat_number, legal_form, legal_info
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
    coalesce(p_company->'legal_info', '{}'::jsonb)
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

-- 3) Garde workspaces : retire le contrôle sur is_demo (colonne supprimée ci-dessous).
create or replace function public.workspaces_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'service_role' then
    if new.status is distinct from old.status
       or new.company_code is distinct from old.company_code
       or new.plan is distinct from old.plan
       or new.trial_ends_at is distinct from old.trial_ends_at then
      raise exception 'Modification non autorisée des champs privilégiés du workspace.';
    end if;
  end if;
  return new;
end;
$$;

-- 4) Comptes démo (auth) : supprime uniquement les utilisateurs membres d'un workspace démo
--    qui ne sont ni admins plateforme, ni membres d'un workspace non-démo.
delete from auth.users u
where u.id in (
  select m.user_id from public.memberships m
  join public.workspaces w on w.id = m.workspace_id
  where w.is_demo = true
)
and u.id not in (select user_id from public.platform_admins)
and u.id not in (
  select m2.user_id from public.memberships m2
  join public.workspaces w2 on w2.id = m2.workspace_id
  where coalesce(w2.is_demo, false) = false
);

-- 5) Workspaces démo : suppression (cascade sur toutes les données métier liées).
delete from public.workspaces where is_demo = true;

-- 6) Retrait de la colonne is_demo (index puis colonne).
drop index if exists public.workspaces_is_demo_idx;
alter table public.workspaces drop column if exists is_demo;
