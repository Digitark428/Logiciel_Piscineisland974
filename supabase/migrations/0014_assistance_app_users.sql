-- 0014 — Assistance : ouverture aux utilisateurs internes (membres) en plus des clients.
-- NOTE DE SYNCHRONISATION : cette migration a été appliquée directement à la base de
-- production (ledger Supabase) mais son fichier manquait dans le dépôt. On le restaure
-- ici pour garder repo et base synchronisés. La recréation de seed_demo_data qui figurait
-- dans la version appliquée est volontairement omise : le mode démo est supprimé en 0019.

-- Conversation rattachable à un membre (support interne) — client_id devient optionnel.
alter table public.support_conversations
  add column if not exists membership_id uuid references public.memberships(id) on delete set null;

alter table public.support_conversations
  alter column client_id drop not null;

create index if not exists support_conversations_membership_idx
  on public.support_conversations(membership_id);

-- author_type : 'client' historiquement → généralisé en 'user' (client OU membre).
alter table public.support_messages drop constraint if exists support_messages_author_type_check;
update public.support_messages set author_type = 'user' where author_type = 'client';
alter table public.support_messages
  add constraint support_messages_author_type_check check (author_type in ('user','admin'));

-- RLS élargie : lecture par admin plateforme, admin du workspace, ou membre rattaché.
drop policy if exists support_conversations_select on public.support_conversations;
create policy support_conversations_select on public.support_conversations
  for select using (
    auth_is_platform_admin()
    or auth_is_admin(workspace_id)
    or membership_id in (
      select id from public.memberships
      where user_id = auth.uid() and workspace_id = support_conversations.workspace_id
    )
  );

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select using (
    auth_is_platform_admin()
    or auth_is_admin(workspace_id)
    or conversation_id in (
      select c.id from public.support_conversations c
      where c.membership_id in (
        select m.id from public.memberships m
        where m.user_id = auth.uid() and m.workspace_id = c.workspace_id
      )
    )
  );
