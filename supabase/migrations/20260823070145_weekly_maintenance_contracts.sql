-- Contrats d'entretien hebdomadaires, occurrences paresseuses et exceptions.
--
-- Migration strictement additive : les séries et prestations historiques
-- restent intactes. Les anciennes séries gardent recurrence_kind = 'legacy'.

alter table public.service_series
  add column recurrence_kind text not null default 'legacy',
  add column recurrence_weekday smallint,
  add column starts_on date,
  add column ends_on date,
  add column status text not null default 'active';

alter table public.service_series
  add constraint service_series_recurrence_kind_check
    check (recurrence_kind in ('legacy', 'weekly_contract')),
  add constraint service_series_recurrence_weekday_check
    check (recurrence_weekday is null or recurrence_weekday between 1 and 7),
  add constraint service_series_dates_check
    check (ends_on is null or starts_on is null or ends_on >= starts_on),
  add constraint service_series_status_check
    check (status in ('active', 'paused', 'ended')),
  add constraint service_series_weekly_contract_check
    check (
      recurrence_kind <> 'weekly_contract'
      or (
        mode = 'frequency'
        and frequency = 'weekly'
        and recurrence_weekday is not null
        and starts_on is not null
      )
    );

comment on column public.service_series.recurrence_kind is
  'legacy pour les anciennes séries matérialisées, weekly_contract pour les contrats hebdomadaires calculés à la demande';
comment on column public.service_series.recurrence_weekday is
  'Jour ISO : 1=lundi, 7=dimanche';
comment on column public.service_series.notes is
  'Commentaire général durable du contrat';

alter table public.services
  add column occurrence_date date;

-- La date nominale est distincte de scheduled_date : cette dernière peut être
-- déplacée exceptionnellement sans modifier la règle du contrat.
update public.services
set occurrence_date = scheduled_date
where kind = 'recurring'
  and occurrence_date is null;

alter table public.services
  drop constraint services_status_check,
  add constraint services_status_check
    check (status in ('planned', 'in_progress', 'completed', 'postponed', 'cancelled')),
  add constraint services_recurring_occurrence_check
    check (
      kind <> 'recurring'
      or (series_id is not null and occurrence_date is not null)
    );

comment on column public.services.occurrence_date is
  'Date nominale immuable de l occurrence dans la règle ; scheduled_date porte le jour réel après exception';
comment on column public.services.notes is
  'Commentaire propre à cette occurrence ou à cet entretien ponctuel';

create unique index services_series_occurrence_unique_idx
  on public.services(series_id, occurrence_date)
  where series_id is not null and occurrence_date is not null;

create index services_occurrence_date_idx
  on public.services(workspace_id, occurrence_date)
  where occurrence_date is not null;

create index service_series_weekly_lookup_idx
  on public.service_series(workspace_id, recurrence_kind, status, starts_on);

create index service_series_assigned_membership_idx
  on public.service_series(assigned_membership_id);

create index services_series_idx
  on public.services(series_id);

-- Complète le garde-fou tenant des séries avec leurs documents liés. Les
-- autres branches sont conservées à l'identique.
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
    if new.contract_document_id is not null then select workspace_id into ref_workspace from public.documents where id = new.contract_document_id; if ref_workspace is distinct from new.workspace_id then raise exception 'contract_document_id must belong to the service series workspace'; end if; end if;
    if new.invoice_document_id is not null then select workspace_id into ref_workspace from public.documents where id = new.invoice_document_id; if ref_workspace is distinct from new.workspace_id then raise exception 'invoice_document_id must belong to the service series workspace'; end if; end if;
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

-- Les contrats hebdomadaires actifs portent un revenu mensuel unique même si
-- aucune occurrence future n'a encore été matérialisée.
create or replace function public.financial_dashboard_metrics(
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
      join public.service_series series on series.id = financial.service_series_id
      cross join month_bounds
      where financial.workspace_id = p_workspace_id
        and financial.financial_kind = 'monthly_contract'
        and series.workspace_id = financial.workspace_id
        and (
          (
            series.recurrence_kind = 'weekly_contract'
            and series.status = 'active'
            and series.starts_on < month_bounds.ends_before
            and (series.ends_on is null or series.ends_on >= month_bounds.starts_on)
          )
          or (
            series.recurrence_kind = 'legacy'
            and exists (
              select 1
              from public.services occurrence
              where occurrence.workspace_id = financial.workspace_id
                and occurrence.series_id = financial.service_series_id
                and occurrence.status <> 'cancelled'
                and occurrence.scheduled_date >= month_bounds.starts_on
                and occurrence.scheduled_date < month_bounds.ends_before
            )
          )
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
