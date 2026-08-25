-- Supabase projects may carry default table privileges for the authenticated
-- role. Keep planning events deliberately scoped to owner CRUD through RLS.
revoke all on table public.planning_events from authenticated;
grant select, insert, update, delete on table public.planning_events to authenticated;
