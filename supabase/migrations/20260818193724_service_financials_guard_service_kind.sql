-- Empêche un montant ponctuel d'être rattaché à une occurrence récurrente.
-- Cette contrainte complète le garde-fou multi-tenant sans modifier la
-- migration déjà appliquée.
create or replace function public.service_financials_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  parent_workspace_id uuid;
  parent_client_id uuid;
  parent_service_kind text;
begin
  if new.service_id is not null then
    select workspace_id, client_id, kind
      into parent_workspace_id, parent_client_id, parent_service_kind
      from public.services
      where id = new.service_id;

    if new.financial_kind <> 'one_off' or parent_service_kind <> 'unique' then
      raise exception 'A one-off financial value must reference a unique service';
    end if;
  else
    select workspace_id, client_id
      into parent_workspace_id, parent_client_id
      from public.service_series
      where id = new.service_series_id;

    if new.financial_kind <> 'monthly_contract' then
      raise exception 'A service series financial value must use kind monthly_contract';
    end if;
  end if;

  if parent_workspace_id is null
    or parent_workspace_id is distinct from new.workspace_id
    or parent_client_id is distinct from new.client_id then
    raise exception 'Financial value must reference a service in the same workspace and client';
  end if;

  return new;
end;
$$;

revoke all on function public.service_financials_guard() from public, anon, authenticated;
