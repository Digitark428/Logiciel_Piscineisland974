-- Personal presentation preferences are independent of workspace data.
create table public.user_appearance_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint appearance_preferences_object check (jsonb_typeof(preferences) = 'object'),
  constraint appearance_preferences_size check (octet_length(preferences::text) <= 16384)
);
alter table public.user_appearance_preferences enable row level security;
revoke all on public.user_appearance_preferences from public, anon, authenticated;
grant select, insert, update on public.user_appearance_preferences to authenticated;
create policy appearance_select_own on public.user_appearance_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy appearance_insert_own on public.user_appearance_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy appearance_update_own on public.user_appearance_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Rollback: drop table public.user_appearance_preferences; (removes only these preferences).
