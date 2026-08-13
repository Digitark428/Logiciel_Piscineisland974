-- 0008 — Garde-fous anti-élévation de privilèges.
-- La RLS ne peut pas restreindre les colonnes modifiables : la policy self-update des
-- memberships autoriserait sinon un membre à changer son propre `role`/`status`.
-- Ces triggers bloquent la modification des champs privilégiés hors service_role
-- (les opérations admin passent par le serveur avec la clé service_role, rôle 'service_role').

-- ---- MEMBERSHIPS ----
create or replace function public.memberships_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'service_role' then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.workspace_id is distinct from old.workspace_id
       or new.user_id is distinct from old.user_id then
      raise exception 'Modification non autorisée des champs privilégiés (role/status/workspace).';
    end if;
  end if;
  return new;
end;
$$;

create trigger memberships_guard_trg
  before update on public.memberships
  for each row execute function public.memberships_guard();

-- ---- WORKSPACES ----
-- Un admin peut modifier les infos de son entreprise, mais pas les champs sensibles
-- (statut, code entreprise, indicateur démo, forfait) — réservés au serveur / Super Admin.
create or replace function public.workspaces_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'service_role' then
    if new.status is distinct from old.status
       or new.company_code is distinct from old.company_code
       or new.is_demo is distinct from old.is_demo
       or new.plan is distinct from old.plan
       or new.trial_ends_at is distinct from old.trial_ends_at then
      raise exception 'Modification non autorisée des champs privilégiés du workspace.';
    end if;
  end if;
  return new;
end;
$$;

create trigger workspaces_guard_trg
  before update on public.workspaces
  for each row execute function public.workspaces_guard();
