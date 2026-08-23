-- Le garde-fou est SECURITY DEFINER : current_user désigne donc son
-- propriétaire SQL, pas l'appelant. Utiliser le rôle JWT évite de court-
-- circuiter les restrictions des techniciens authentifiés.

create or replace function public.guard_service_completion_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  current_membership uuid;
  caller_role text := auth.role();
begin
  if caller_role = 'service_role'
     or (caller_role is null and session_user in ('postgres', 'supabase_admin'))
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
