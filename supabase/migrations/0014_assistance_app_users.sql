-- 0014 — Assistance : recentrer le module sur les UTILISATEURS de l'application
-- (gérant + membres d'équipe qui utilisent l'app pour leur entreprise), et NON
-- les clients finaux du portail. Le chat n'apparaît plus dans le portail client.
-- Flux : Utilisateur app (/app) → Supabase → Super Admin → réponse → Utilisateur.

-- La conversation est désormais rattachée au membre (membership) qui l'ouvre.
alter table public.support_conversations
  add column membership_id uuid references public.memberships(id) on delete set null;

-- client_id devient facultatif (conservé pour un éventuel contexte « concernant un client »).
alter table public.support_conversations
  alter column client_id drop not null;

create index support_conversations_membership_idx on public.support_conversations(membership_id);

-- author_type : 'client' (portail, obsolète) → 'user' (utilisateur de l'app).
-- On lève d'abord l'ancienne contrainte, sinon l'UPDATE vers 'user' la violerait.
alter table public.support_messages drop constraint support_messages_author_type_check;
update public.support_messages set author_type = 'user' where author_type = 'client';
alter table public.support_messages
  add constraint support_messages_author_type_check check (author_type in ('user','admin'));

-- =========================================================================
-- RLS : membre voit SES conversations ; admin (gérant) de l'entreprise voit
-- toutes celles de son entreprise ; Super Admin (plateforme) voit tout.
-- Écritures toujours via service_role uniquement.
-- =========================================================================
drop policy support_conversations_select on public.support_conversations;
create policy support_conversations_select on public.support_conversations
  for select using (
    auth_is_platform_admin()
    or auth_is_admin(workspace_id)
    or membership_id in (
      select id from public.memberships
      where user_id = auth.uid() and workspace_id = support_conversations.workspace_id
    )
  );

drop policy support_messages_select on public.support_messages;
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

-- =========================================================================
-- DÉMO — conversations d'assistance rattachées aux MEMBRES (gérant/salarié).
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
  select is_demo into v_is_demo from public.workspaces where id = p_workspace_id;
  if v_is_demo is distinct from true then
    raise exception 'seed_demo_data: workspace % is not a demo workspace', p_workspace_id;
  end if;

  select id into v_admin_id  from public.memberships where workspace_id = p_workspace_id and role = 'admin' order by created_at limit 1;
  select id into v_member_id from public.memberships where workspace_id = p_workspace_id and role = 'member' order by created_at limit 1;

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

  insert into public.clients (workspace_id, first_name, last_name, phone, email, address_line1, postal_code, city, notes, portal_enabled)
  values (p_workspace_id, 'Sophie', 'Martin', '0692 11 22 33', 'sophie.martin@example.re', '12 chemin des Filaos', '97400', 'Saint-Denis', 'Portail code C1234. Chien gentil.', true)
  returning id into v_client1;

  insert into public.clients (workspace_id, first_name, last_name, phone, email, address_line1, postal_code, city, notes)
  values (p_workspace_id, 'Jean', 'Payet', '0692 44 55 66', 'jean.payet@example.re', '5 rue des Tamarins', '97410', 'Saint-Pierre', 'Accès par le côté droit.')
  returning id into v_client2;

  insert into public.clients (workspace_id, company_name, last_name, first_name, phone, email, address_line1, postal_code, city)
  values (p_workspace_id, 'Résidence Les Lagons', 'Hoarau', 'Marie', '0262 33 44 55', 'contact@leslagons.re', '30 avenue de la Plage', '97434', 'Saint-Gilles')
  returning id into v_client3;

  insert into public.pools (workspace_id, client_id, name, pool_type, volume_m3, water_treatment, technical_notes, city, postal_code, address_line1)
  values (p_workspace_id, v_client1, 'Piscine principale', 'Enterrée', 48, 'Sel', 'Pompe à chaleur. Robot Dolphin.', 'Saint-Denis', '97400', '12 chemin des Filaos')
  returning id into v_pool1;

  insert into public.pools (workspace_id, client_id, name, pool_type, volume_m3, water_treatment, city, postal_code, address_line1)
  values (p_workspace_id, v_client2, 'Piscine', 'Coque', 32, 'Chlore', 'Saint-Pierre', '97410', '5 rue des Tamarins')
  returning id into v_pool2;

  insert into public.pools (workspace_id, client_id, name, pool_type, volume_m3, water_treatment, city, postal_code, address_line1)
  values (p_workspace_id, v_client3, 'Bassin collectif', 'Enterrée', 120, 'Chlore', 'Saint-Gilles', '97434', '30 avenue de la Plage')
  returning id into v_pool3;

  insert into public.service_series (workspace_id, client_id, pool_id, service_type, mode, frequency, day_of_month, default_time, default_duration_min, assigned_membership_id, notes)
  values (p_workspace_id, v_client1, v_pool1, 'Entretien mensuel', 'frequency', 'monthly', 5, '09:00', 60, v_member_id, 'Contrat annuel')
  returning id into v_series;

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

  insert into public.services (workspace_id, client_id, pool_id, service_type, kind, scheduled_date, scheduled_time, duration_min, assigned_membership_id, status, notes)
  values (p_workspace_id, v_client2, v_pool2, 'Dépannage pompe', 'unique', current_date, '14:00', 90, v_member_id, 'planned', 'Bruit anormal signalé.')
  returning id into v_service;
  insert into public.service_tasks (workspace_id, service_id, label, position) values
    (p_workspace_id, v_service, 'Diagnostic pompe', 0),
    (p_workspace_id, v_service, 'Remplacement si nécessaire', 1);

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

  insert into public.tasks (workspace_id, title, description, category, status, due_date, assigned_membership_id, created_by) values
    (p_workspace_id, 'Commander produits chlore', 'Réapprovisionnement stock', 'professional', 'todo', current_date + 3, v_admin_id, v_admin_id),
    (p_workspace_id, 'Rappeler client Résidence Les Lagons', 'Devis rénovation liner', 'professional', 'todo', current_date + 1, v_member_id, v_admin_id),
    (p_workspace_id, 'Révision camionnette', null, 'personal', 'todo', current_date + 10, v_admin_id, v_admin_id);

  insert into public.contracts (workspace_id, client_id, title, reference, start_date, end_date, amount, status)
  values (p_workspace_id, v_client1, 'Contrat entretien annuel', 'CTR-2026-001', date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, 1200, 'active');

  insert into public.invoices (workspace_id, client_id, number, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total)
  values (p_workspace_id, v_client1, 'FAC-2026-0001', current_date - 10, current_date + 20, 'sent', 100, 20, 20, 120)
  returning id into v_invoice;
  insert into public.invoice_lines (workspace_id, invoice_id, label, quantity, unit_price, position) values
    (p_workspace_id, v_invoice, 'Entretien mensuel piscine', 1, 100, 0);

  insert into public.notifications (workspace_id, recipient_membership_id, type, title, body, entity_type) values
    (p_workspace_id, null, 'service_completed', 'Prestation terminée', 'Une prestation d''entretien a été terminée.', 'service'),
    (p_workspace_id, null, 'member_added', 'Bienvenue', 'Votre espace de démonstration est prêt.', 'workspace'),
    (p_workspace_id, v_member_id, 'service_created', 'Nouvelle prestation', 'Une prestation vous a été attribuée aujourd''hui.', 'service');

  -- ---- ASSISTANCE (conversations de démonstration — utilisateurs de l'app) ----
  -- 1) 🐛 Bug — ouvert par un salarié, nouveau.
  insert into public.support_conversations (workspace_id, membership_id, category, status, context, last_message_at, created_at)
  values (p_workspace_id, v_member_id, 'bug', 'new',
          jsonb_build_object('route', '/app/services', 'device', 'iPhone · Safari'),
          now() - interval '2 hour', now() - interval '2 hour')
  returning id into v_conv;
  insert into public.support_messages (conversation_id, workspace_id, author_type, author_label, content, created_at)
  values (v_conv, p_workspace_id, 'user', 'Démo Salarié',
          'Quand je clique sur Terminer la prestation, rien ne se passe.', now() - interval '2 hour');

  -- 2) ❓ Aide — ouvert par le gérant, en cours, avec une réponse Super Admin.
  insert into public.support_conversations (workspace_id, membership_id, category, status, context, last_message_at, created_at, admin_last_seen_at)
  values (p_workspace_id, v_admin_id, 'help', 'in_progress',
          jsonb_build_object('route', '/app/planning', 'device', 'Ordinateur · Chrome'),
          now() - interval '20 hour', now() - interval '1 day', now() - interval '20 hour')
  returning id into v_conv;
  insert into public.support_messages (conversation_id, workspace_id, author_type, author_label, content, created_at) values
    (v_conv, p_workspace_id, 'user', 'Démo Gérant', 'Comment créer une prestation récurrente ?', now() - interval '1 day'),
    (v_conv, p_workspace_id, 'admin', 'Assistance Piscine Island', 'Bonjour, ouvrez le planning puis « Nouvelle prestation » et choisissez « Récurrente ». Je reste disponible.', now() - interval '20 hour');

  -- 3) 💡 Suggestion — ouvert par un salarié, résolue.
  insert into public.support_conversations (workspace_id, membership_id, category, status, context, last_message_at, created_at, resolved_at, admin_last_seen_at, client_last_seen_at)
  values (p_workspace_id, v_member_id, 'suggestion', 'resolved',
          jsonb_build_object('route', '/app/planning', 'device', 'iPad · Safari'),
          now() - interval '3 day', now() - interval '4 day', now() - interval '3 day', now() - interval '3 day', now() - interval '3 day')
  returning id into v_conv;
  insert into public.support_messages (conversation_id, workspace_id, author_type, author_label, content, created_at) values
    (v_conv, p_workspace_id, 'user', 'Démo Salarié', 'Ce serait pratique de pouvoir ajouter plusieurs photos directement depuis le planning.', now() - interval '4 day'),
    (v_conv, p_workspace_id, 'admin', 'Assistance Piscine Island', 'Merci pour la suggestion, c''est noté pour une prochaine version !', now() - interval '3 day');

  insert into public.backups (workspace_id, kind, status, size_bytes, created_at)
  values (p_workspace_id, 'auto', 'completed', 20480, now() - interval '1 day');

  insert into public.activity_logs (workspace_id, actor_membership_id, actor_label, action, entity_type, summary)
  values (p_workspace_id, v_admin_id, 'Démo Gérant', 'seed', 'workspace', 'Réinitialisation des données de démonstration');
end;
$$;
