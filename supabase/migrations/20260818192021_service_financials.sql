-- Données de chiffre d'affaires des prestations.
--
-- Cette table est volontairement séparée de services et service_series : ces
-- deux tables restent lisibles par certains employés, alors que les montants
-- doivent être strictement réservés au gérant du workspace.
create table public.service_financials (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  financial_kind    text not null check (financial_kind in ('one_off', 'monthly_contract')),
  service_id        uuid references public.services(id) on delete cascade,
  service_series_id uuid references public.service_series(id) on delete cascade,
  amount_cents      bigint not null check (amount_cents >= 0 and amount_cents <= 99999999999),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (num_nonnulls(service_id, service_series_id) = 1)
);

-- Une prestation unique ou une série ne peut porter qu'une seule valeur de
-- chiffre d'affaires. Une série garde donc un montant mensuel unique, quel que
-- soit le nombre d'occurrences techniques qu'elle génère.
create unique index service_financials_service_unique_idx
  on public.service_financials(service_id)
  where service_id is not null;

create unique index service_financials_series_unique_idx
  on public.service_financials(service_series_id)
  where service_series_id is not null;

create index service_financials_workspace_kind_idx
  on public.service_financials(workspace_id, financial_kind);

create index service_financials_workspace_client_idx
  on public.service_financials(workspace_id, client_id);

create trigger service_financials_set_updated_at
  before update on public.service_financials
  for each row execute function public.set_updated_at();

-- Une simple clé étrangère ne peut pas garantir que le client, le workspace et
-- la prestation liés appartiennent tous à la même entreprise. Ce garde-fou
-- protège aussi les écritures faites via le service role lors des tests.
create function public.service_financials_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  parent_workspace_id uuid;
  parent_client_id uuid;
begin
  if new.service_id is not null then
    select workspace_id, client_id
      into parent_workspace_id, parent_client_id
      from public.services
      where id = new.service_id;

    if new.financial_kind <> 'one_off' then
      raise exception 'A service financial value must use kind one_off';
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

create trigger service_financials_guard_trg
  before insert or update of workspace_id, client_id, financial_kind, service_id, service_series_id
  on public.service_financials
  for each row execute function public.service_financials_guard();

alter table public.service_financials enable row level security;

-- Les membres sans rôle admin ne peuvent ni lire, ni écrire, ni inférer une
-- donnée financière. Les droits opérationnels services.* ne s'appliquent pas.
create policy service_financials_select_admin on public.service_financials
  for select to authenticated
  using ((select public.auth_is_admin(workspace_id)));

create policy service_financials_insert_admin on public.service_financials
  for insert to authenticated
  with check ((select public.auth_is_admin(workspace_id)));

create policy service_financials_update_admin on public.service_financials
  for update to authenticated
  using ((select public.auth_is_admin(workspace_id)))
  with check ((select public.auth_is_admin(workspace_id)));

create policy service_financials_delete_admin on public.service_financials
  for delete to authenticated
  using ((select public.auth_is_admin(workspace_id)));

grant select, insert, update, delete on public.service_financials to authenticated;

-- Agrégats dashboard exécutés dans Postgres : aucune occurrence n'est renvoyée
-- au navigateur. Un contrat est compté une seule fois lorsqu'il a au moins une
-- occurrence non annulée durant le mois visé ; il n'est donc jamais multiplié
-- par sa fréquence d'entretien.
create function public.financial_dashboard_metrics(
  p_workspace_id uuid,
  p_month date default current_date
)
returns table (
  recurring_cents bigint,
  one_off_cents bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with month_bounds as (
    select
      date_trunc('month', p_month)::date as starts_on,
      (date_trunc('month', p_month) + interval '1 month')::date as ends_before
  )
  select
    coalesce((
      select sum(financial.amount_cents)::bigint
      from public.service_financials financial
      where financial.workspace_id = p_workspace_id
        and financial.financial_kind = 'monthly_contract'
        and exists (
          select 1
          from public.services occurrence
          cross join month_bounds
          where occurrence.workspace_id = financial.workspace_id
            and occurrence.series_id = financial.service_series_id
            and occurrence.status <> 'cancelled'
            and occurrence.scheduled_date >= month_bounds.starts_on
            and occurrence.scheduled_date < month_bounds.ends_before
        )
    ), 0)::bigint as recurring_cents,
    coalesce((
      select sum(financial.amount_cents)::bigint
      from public.service_financials financial
      join public.services service on service.id = financial.service_id
      cross join month_bounds
      where financial.workspace_id = p_workspace_id
        and financial.financial_kind = 'one_off'
        and service.workspace_id = financial.workspace_id
        and service.status <> 'cancelled'
        and service.scheduled_date >= month_bounds.starts_on
        and service.scheduled_date < month_bounds.ends_before
    ), 0)::bigint as one_off_cents
  where public.auth_is_admin(p_workspace_id);
$$;

revoke all on function public.financial_dashboard_metrics(uuid, date) from public, anon;
grant execute on function public.financial_dashboard_metrics(uuid, date) to authenticated;
