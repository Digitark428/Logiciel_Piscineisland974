-- 0013 — Module « Assistance » : centre de support intégré.
-- Flux : Client (portail) → Supabase → Super Admin → réponse → Client.
-- Multi-tenant strict : chaque conversation porte workspace_id + client_id.
-- Écritures via service_role uniquement (portail & Super Admin), lectures RLS
-- réservées aux membres du workspace et aux administrateurs plateforme.

-- =========================================================================
-- CONVERSATIONS D'ASSISTANCE
-- =========================================================================
create table public.support_conversations (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  client_id             uuid not null references public.clients(id) on delete cascade,
  category              text not null check (category in ('bug','help','suggestion')),
  status                text not null default 'new' check (status in ('new','in_progress','resolved','closed')),
  -- Contexte automatique du signalement (route, prestation, appareil…). Extensible.
  context               jsonb not null default '{}'::jsonb,
  last_message_at       timestamptz not null default now(),
  -- Suivi « lu / non lu » de chaque partie (badges in-app, sans e-mail).
  client_last_seen_at   timestamptz,
  admin_last_seen_at    timestamptz,
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index support_conversations_workspace_idx on public.support_conversations(workspace_id);
create index support_conversations_client_idx on public.support_conversations(client_id);
create index support_conversations_status_idx on public.support_conversations(status);
create index support_conversations_category_idx on public.support_conversations(category);
create index support_conversations_last_message_idx on public.support_conversations(last_message_at desc);

create trigger support_conversations_set_updated_at
  before update on public.support_conversations
  for each row execute function public.set_updated_at();

-- =========================================================================
-- MESSAGES D'UNE CONVERSATION
-- =========================================================================
create table public.support_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.support_conversations(id) on delete cascade,
  -- workspace_id dénormalisé pour une RLS simple et des index efficaces.
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  author_type       text not null check (author_type in ('client','admin')),
  author_label      text,
  content           text not null,
  -- Réservé V2 : pièces jointes, transcription vocale, etc.
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index support_messages_conversation_idx on public.support_messages(conversation_id, created_at);
create index support_messages_workspace_idx on public.support_messages(workspace_id);

-- Met à jour last_message_at de la conversation à chaque nouveau message.
create or replace function public.support_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_conversations
     set last_message_at = new.created_at,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger support_messages_touch_conversation
  after insert on public.support_messages
  for each row execute function public.support_touch_conversation();

-- Durcissement (cf. 0009) : cette fonction n'est appelée que par le trigger
-- (inserts via service_role) — elle ne doit pas être exposée via l'API RPC.
revoke execute on function public.support_touch_conversation() from anon, authenticated, public;

-- =========================================================================
-- RLS — deny-by-default. Écritures via service_role (portail & Super Admin).
-- =========================================================================
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

-- Lecture : administrateur plateforme (accès global) ou membre du workspace
-- concerné (une entreprise ne voit jamais les conversations d'une autre).
create policy support_conversations_select on public.support_conversations
  for select using ( auth_is_platform_admin() or auth_is_member(workspace_id) );

create policy support_messages_select on public.support_messages
  for select using ( auth_is_platform_admin() or auth_is_member(workspace_id) );

-- Aucune policy insert/update/delete : refus par défaut pour anon/authenticated.
-- Le portail (client final) et le Super Admin écrivent via service_role, en
-- dérivant toujours workspace_id/client_id côté serveur (aucune usurpation possible).

-- =========================================================================
-- DÉMO — (ré)initialisation : ajoute le nettoyage + des conversations réalistes.
-- On remplace seed_demo_data en conservant tout l'existant.
-- =========================================================================
create or replace function public.seed_demo_data(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id     uuid;
  v_member_id    uuid;
  v_is_demo      boolean;
  v_client1      uuid;
  v_client2      uuid;
  v_client3      uuid;
  v_pool1        uuid;
  v_pool2        uuid;
  v_pool3        uuid;
  v_series       uuid;
  v_service      uuid;
  v_invoice      uuid;
  v_conv         uuid;
  d              date;
  i              int;
begin
  -- Sécurité : ne (ré)initialiser QUE des workspaces démo.
  select is_demo into v_is_demo from public.workspaces where id = p_workspace_id;
  if v_is_demo is distinct from true then
    raise exception 'seed_demo_data: workspace % is not a demo workspace', p_workspace_id;
  end if;

  select id into v_admin_id  from public.memberships where workspace_id = p_workspace_id and role = 'admin' order by created_at limit 1;
  select id into v_member_id from public.memberships where workspace_id = p_workspace_id and role = 'member' order by created_at limit 1;

  -- Nettoyage des données métier (l'ordre respecte les FK ; cascade gère le reste).
  delete from public.support_messages where workspace_id = p_workspace_id;
  delete from public.support_conversations where workspace_id = p_workspace_id;
  delete from public.invoice_lines where workspace_id = p_workspace_id;
  delete from public.invoices where workspace_id = p_workspace_id;
  delete from public.contracts where workspace_id = p_workspace_id;
  delete from public.documents where workspace_id = p_workspace_id;
  delete from public.service_tasks where workspace_id = p_workspace_id;
  delete from public.services where workspace_id = p_workspace_id;
  delete from public.service_series where workspace_id = p_workspace_id;
  delete from public.tasks where workspace_id = p_workspace_id;
  delete from public.pools where workspace_id = p_workspace_id;
  delete from public.clients where workspace_id = p_workspace_id;
  delete from public.notifications where workspace_id = p_workspace_id;
  delete from public.backups where workspace_id = p_workspace_id;
  delete from public.activity_logs where workspace_id = p_workspace_id;

  -- ---- CLIENTS ----
  insert into public.clients (workspace_id, first_name, last_name, phone, email, address_line1, postal_code, city, notes, portal_enabled)
  values (p_workspace_id, 'Sophie', 'Martin', '0692 11 22 33', 'sophie.martin@example.re', '12 chemin des Filaos', '97400', 'Saint-Denis', 'Portail code C1234. Chien gentil.', true)
  returning id into v_client1;

  insert into public.clients (workspace_id, first_name, last_name, phone, email, address_line1, postal_code, city, notes)
  values (p_workspace_id, 'Jean', 'Payet', '0692 44 55 66', 'jean.payet@example.re', '5 rue des Tamarins', '97410', 'Saint-Pierre', 'Accès par le côté droit.')
  returning id into v_client2;

  insert into public.clients (workspace_id, company_name, last_name, first_name, phone, email, address_line1, postal_code, city)
  values (p_workspace_id, 'Résidence Les Lagons', 'Hoarau', 'Marie', '0262 33 44 55', 'contact@leslagons.re', '30 avenue de la Plage', '97434', 'Saint-Gilles')
  returning id into v_client3;

  -- ---- POOLS ----
  insert into public.pools (workspace_id, client_id, name, pool_type, volume_m3, water_treatment, technical_notes, city, postal_code, address_line1)
  values (p_workspace_id, v_client1, 'Piscine principale', 'Enterrée', 48, 'Sel', 'Pompe à chaleur. Robot Dolphin.', 'Saint-Denis', '97400', '12 chemin des Filaos')
  returning id into v_pool1;

  insert into public.pools (workspace_id, client_id, name, pool_type, volume_m3, water_treatment, city, postal_code, address_line1)
  values (p_workspace_id, v_client2, 'Piscine', 'Coque', 32, 'Chlore', 'Saint-Pierre', '97410', '5 rue des Tamarins')
  returning id into v_pool2;

  insert into public.pools (workspace_id, client_id, name, pool_type, volume_m3, water_treatment, city, postal_code, address_line1)
  values (p_workspace_id, v_client3, 'Bassin collectif', 'Enterrée', 120, 'Chlore', 'Saint-Gilles', '97434', '30 avenue de la Plage')
  returning id into v_pool3;

  -- ---- SERIE RÉCURRENTE (mensuelle, le 5) pour le client 1 ----
  insert into public.service_series (workspace_id, client_id, pool_id, service_type, mode, frequency, day_of_month, default_time, default_duration_min, assigned_membership_id, notes)
  values (p_workspace_id, v_client1, v_pool1, 'Entretien mensuel', 'frequency', 'monthly', 5, '09:00', 60, v_member_id, 'Contrat annuel')
  returning id into v_series;

  -- Génère 4 occurrences autour d'aujourd'hui
  for i in -1..2 loop
    d := (date_trunc('month', current_date) + (i || ' month')::interval + interval '4 day')::date;
    insert into public.services (workspace_id, client_id, pool_id, series_id, service_type, kind, scheduled_date, scheduled_time, duration_min, assigned_membership_id, status)
    values (p_workspace_id, v_client1, v_pool1, v_series, 'Entretien mensuel', 'recurring', d, '09:00', 60, v_member_id,
            case when d < current_date then 'completed' else 'planned' end)
    returning id into v_service;
    insert into public.service_tasks (workspace_id, service_id, label, done, position) values
      (p_workspace_id, v_service, 'Analyse de l''eau', d < current_date, 0),
      (p_workspace_id, v_service, 'Nettoyage filtre', d < current_date, 1),
      (p_workspace_id, v_service, 'Contrôle pH / chlore', d < current_date, 2);
  end loop;

  -- ---- PRESTATION UNIQUE (aujourd'hui) client 2 ----
  insert into public.services (workspace_id, client_id, pool_id, service_type, kind, scheduled_date, scheduled_time, duration_min, assigned_membership_id, status, notes)
  values (p_workspace_id, v_client2, v_pool2, 'Dépannage pompe', 'unique', current_date, '14:00', 90, v_member_id, 'planned', 'Bruit anormal signalé.')
  returning id into v_service;
  insert into public.service_tasks (workspace_id, service_id, label, position) values
    (p_workspace_id, v_service, 'Diagnostic pompe', 0),
    (p_workspace_id, v_service, 'Remplacement si nécessaire', 1);

  -- ---- DATES MANUELLES (client 3 : 4 dates irrégulières) ----
  insert into public.service_series (workspace_id, client_id, pool_id, service_type, mode, assigned_membership_id, notes)
  values (p_workspace_id, v_client3, v_pool3, 'Entretien saisonnier', 'manual', v_admin_id, 'Dates saisies manuellement')
  returning id into v_series;

  foreach d in array array[
    current_date - 20, current_date - 5, current_date + 8, current_date + 25
  ] loop
    insert into public.services (workspace_id, client_id, pool_id, series_id, service_type, kind, scheduled_date, scheduled_time, duration_min, assigned_membership_id, status)
    values (p_workspace_id, v_client3, v_pool3, v_series, 'Entretien saisonnier', 'recurring', d, '10:30', 120, v_admin_id,
            case when d < current_date then 'completed' else 'planned' end);
  end loop;

  -- ---- TÂCHES ----
  insert into public.tasks (workspace_id, title, description, category, status, due_date, assigned_membership_id, created_by) values
    (p_workspace_id, 'Commander produits chlore', 'Réapprovisionnement stock', 'professional', 'todo', current_date + 3, v_admin_id, v_admin_id),
    (p_workspace_id, 'Rappeler client Résidence Les Lagons', 'Devis rénovation liner', 'professional', 'todo', current_date + 1, v_member_id, v_admin_id),
    (p_workspace_id, 'Révision camionnette', null, 'personal', 'todo', current_date + 10, v_admin_id, v_admin_id);

  -- ---- CONTRAT ----
  insert into public.contracts (workspace_id, client_id, title, reference, start_date, end_date, amount, status)
  values (p_workspace_id, v_client1, 'Contrat entretien annuel', 'CTR-2026-001', date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, 1200, 'active');

  -- ---- FACTURE ----
  insert into public.invoices (workspace_id, client_id, number, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total)
  values (p_workspace_id, v_client1, 'FAC-2026-0001', current_date - 10, current_date + 20, 'sent', 100, 20, 20, 120)
  returning id into v_invoice;
  insert into public.invoice_lines (workspace_id, invoice_id, label, quantity, unit_price, position) values
    (p_workspace_id, v_invoice, 'Entretien mensuel piscine', 1, 100, 0);

  -- ---- NOTIFICATIONS ----
  insert into public.notifications (workspace_id, recipient_membership_id, type, title, body, entity_type) values
    (p_workspace_id, null, 'service_completed', 'Prestation terminée', 'Une prestation d''entretien a été terminée.', 'service'),
    (p_workspace_id, null, 'member_added', 'Bienvenue', 'Votre espace de démonstration est prêt.', 'workspace'),
    (p_workspace_id, v_member_id, 'service_created', 'Nouvelle prestation', 'Une prestation vous a été attribuée aujourd''hui.', 'service');

  -- ---- ASSISTANCE (conversations de démonstration) ----
  -- 1) 🐛 Bug — nouveau, non traité.
  insert into public.support_conversations (workspace_id, client_id, category, status, context, last_message_at, created_at)
  values (p_workspace_id, v_client1, 'bug', 'new',
          jsonb_build_object('route', '/portal', 'device', 'iPhone · Safari'),
          now() - interval '2 hour', now() - interval '2 hour')
  returning id into v_conv;
  insert into public.support_messages (conversation_id, workspace_id, author_type, author_label, content, created_at)
  values (v_conv, p_workspace_id, 'client', 'Sophie Martin',
          'Quand je clique sur Terminer la prestation, rien ne se passe.', now() - interval '2 hour');

  -- 2) ❓ Aide — en cours, avec une réponse Super Admin.
  insert into public.support_conversations (workspace_id, client_id, category, status, context, last_message_at, created_at, admin_last_seen_at)
  values (p_workspace_id, v_client2, 'help', 'in_progress',
          jsonb_build_object('route', '/portal', 'device', 'iPad · Safari'),
          now() - interval '20 hour', now() - interval '1 day', now() - interval '20 hour')
  returning id into v_conv;
  insert into public.support_messages (conversation_id, workspace_id, author_type, author_label, content, created_at) values
    (v_conv, p_workspace_id, 'client', 'Jean Payet', 'Comment créer une prestation récurrente ?', now() - interval '1 day'),
    (v_conv, p_workspace_id, 'admin', 'Assistance Piscine Island', 'Bonjour, ouvrez le planning puis « Nouvelle prestation » et choisissez « Récurrente ». Je reste disponible.', now() - interval '20 hour');

  -- 3) 💡 Suggestion — résolue.
  insert into public.support_conversations (workspace_id, client_id, category, status, context, last_message_at, created_at, resolved_at, admin_last_seen_at, client_last_seen_at)
  values (p_workspace_id, v_client3, 'suggestion', 'resolved',
          jsonb_build_object('route', '/portal', 'device', 'Ordinateur · Chrome'),
          now() - interval '3 day', now() - interval '4 day', now() - interval '3 day', now() - interval '3 day', now() - interval '3 day')
  returning id into v_conv;
  insert into public.support_messages (conversation_id, workspace_id, author_type, author_label, content, created_at) values
    (v_conv, p_workspace_id, 'client', 'Résidence Les Lagons', 'Ce serait pratique de pouvoir ajouter plusieurs photos directement depuis le planning.', now() - interval '4 day'),
    (v_conv, p_workspace_id, 'admin', 'Assistance Piscine Island', 'Merci pour la suggestion, c''est noté pour une prochaine version !', now() - interval '3 day');

  -- ---- BACKUP (métadonnée) ----
  insert into public.backups (workspace_id, kind, status, size_bytes, created_at)
  values (p_workspace_id, 'auto', 'completed', 20480, now() - interval '1 day');

  -- ---- JOURNAL ----
  insert into public.activity_logs (workspace_id, actor_membership_id, actor_label, action, entity_type, summary)
  values (p_workspace_id, v_admin_id, 'Démo Gérant', 'seed', 'workspace', 'Réinitialisation des données de démonstration');
end;
$$;
