-- Une occurrence récurrente matérialisée garde définitivement son identité
-- nominale. Une exception ne modifie que scheduled_date et le statut.

create or replace function public.guard_recurring_occurrence_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.kind = 'recurring'
     and (
       new.workspace_id is distinct from old.workspace_id
       or new.client_id is distinct from old.client_id
       or new.series_id is distinct from old.series_id
       or new.kind is distinct from old.kind
       or new.occurrence_date is distinct from old.occurrence_date
     ) then
    raise exception 'a recurring occurrence identity is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_recurring_occurrence_identity() from public, anon, authenticated;

drop trigger if exists services_recurring_occurrence_identity_guard on public.services;
create trigger services_recurring_occurrence_identity_guard
  before update on public.services
  for each row execute function public.guard_recurring_occurrence_identity();
