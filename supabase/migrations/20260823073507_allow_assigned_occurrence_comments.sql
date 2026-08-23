-- Autorise le technicien assigné à renseigner le commentaire propre à son
-- passage. Les champs de planning, les relations et les statuts responsables
-- restent protégés exactement comme auparavant.

create or replace function public.guard_service_completion_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare current_membership uuid;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin')
     or public.auth_has_permission(new.workspace_id, 'services.edit') then
    return new;
  end if;

  select id into current_membership
  from public.memberships
  where user_id = auth.uid()
    and workspace_id = old.workspace_id
    and status = 'active';

  if current_membership is null
     or old.assigned_membership_id is distinct from current_membership
     or not public.auth_has_permission(old.workspace_id, 'services.complete') then
    raise exception 'only the assigned member may complete this service';
  end if;

  if (to_jsonb(new) - array['status','notes','report','started_at','completed_at','completed_by','updated_at'])
     is distinct from
     (to_jsonb(old) - array['status','notes','report','started_at','completed_at','completed_by','updated_at']) then
    raise exception 'services.complete cannot modify service planning or relations';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('planned', 'in_progress', 'completed') then
    raise exception 'services.complete cannot cancel or postpone a service';
  end if;

  if new.completed_by is distinct from old.completed_by
     and new.completed_by is distinct from current_membership then
    raise exception 'completed_by must be the assigned member';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_service_completion_update() from public, anon, authenticated;
