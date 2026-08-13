-- 0007 — Données de démonstration : fonction (ré)initialisant un workspace démo réel.
-- La démo utilise la vraie architecture (RLS, permissions, tables). Cette fonction
-- efface puis recrée un jeu de données réaliste pour le workspace démo indiqué.
-- Les memberships & le workspace sont conservés (créés au bootstrap via l'API Auth).

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

  -- ---- BACKUP (métadonnée) ----
  insert into public.backups (workspace_id, kind, status, size_bytes, created_at)
  values (p_workspace_id, 'auto', 'completed', 20480, now() - interval '1 day');

  -- ---- JOURNAL ----
  insert into public.activity_logs (workspace_id, actor_membership_id, actor_label, action, entity_type, summary)
  values (p_workspace_id, v_admin_id, 'Démo Gérant', 'seed', 'workspace', 'Réinitialisation des données de démonstration');
end;
$$;
