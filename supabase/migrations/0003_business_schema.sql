-- 0003 — Schéma métier : clients, piscines, prestations, tâches, documents, contrats,
--        factures, notifications, journal, sauvegardes.
-- Toute table métier porte workspace_id (NOT NULL) pour l'isolation multi-tenant.

-- =========================================================================
-- CLIENTS
-- =========================================================================
create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  first_name        text,
  last_name         text,
  company_name      text,
  phone             text,
  email             citext,
  address_line1     text,
  address_line2     text,
  postal_code       text,
  city              text,
  country           text default 'France',
  access_info       text,                 -- informations d'accès (sensible)
  notes             text,
  extra             jsonb not null default '{}'::jsonb,
  -- Espace client : code privé (haché) + token de lien privé révocable
  private_code_hash text,
  private_code_set_at timestamptz,
  portal_token      text unique,
  portal_enabled    boolean not null default false,
  status            text not null default 'active' check (status in ('active','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index clients_workspace_idx on public.clients(workspace_id);
create index clients_status_idx on public.clients(workspace_id, status);
create index clients_portal_token_idx on public.clients(portal_token);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- =========================================================================
-- POOLS (piscines)
-- =========================================================================
create table public.pools (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  name              text not null default 'Piscine',
  address_line1     text,
  address_line2     text,
  postal_code       text,
  city              text,
  -- Caractéristiques techniques
  pool_type         text,                 -- enterrée, hors-sol, coque...
  volume_m3         numeric,
  length_m          numeric,
  width_m           numeric,
  depth_m           numeric,
  water_treatment   text,                 -- chlore, sel, brome...
  equipment         jsonb not null default '{}'::jsonb,
  technical_notes   text,
  status            text not null default 'active' check (status in ('active','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index pools_workspace_idx on public.pools(workspace_id);
create index pools_client_idx on public.pools(client_id);

create trigger pools_set_updated_at
  before update on public.pools
  for each row execute function public.set_updated_at();

-- =========================================================================
-- SERVICE SERIES (définition d'une récurrence)
-- =========================================================================
create table public.service_series (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  pool_id           uuid references public.pools(id) on delete set null,
  service_type      text,
  -- 'frequency' = récurrence régulière ; 'manual' = liste de dates saisies
  mode              text not null default 'manual' check (mode in ('frequency','manual')),
  frequency         text check (frequency in ('weekly','biweekly','monthly','custom')),
  day_of_month      int,                  -- pour mensuel (ex : 5, 15)
  interval_count    int default 1,
  default_time      time,
  default_duration_min int,
  assigned_membership_id uuid references public.memberships(id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index service_series_workspace_idx on public.service_series(workspace_id);
create index service_series_client_idx on public.service_series(client_id);

create trigger service_series_set_updated_at
  before update on public.service_series
  for each row execute function public.set_updated_at();

-- =========================================================================
-- SERVICES (prestations / entretiens) — unique OU occurrence de série
-- =========================================================================
create sequence if not exists public.service_code_seq;

create table public.services (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  code              text not null,        -- identifiant lisible, unique par workspace
  client_id         uuid not null references public.clients(id) on delete cascade,
  pool_id           uuid references public.pools(id) on delete set null,
  series_id         uuid references public.service_series(id) on delete set null,
  service_type      text,
  kind              text not null default 'unique' check (kind in ('unique','recurring')),
  scheduled_date    date not null,
  scheduled_time    time,
  duration_min      int,
  assigned_membership_id uuid references public.memberships(id) on delete set null,
  status            text not null default 'planned'
                      check (status in ('planned','in_progress','completed','cancelled')),
  notes             text,
  report            text,                 -- compte-rendu employé
  started_at        timestamptz,
  completed_at      timestamptz,
  completed_by      uuid references public.memberships(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (workspace_id, code)
);

create index services_workspace_idx on public.services(workspace_id);
create index services_client_idx on public.services(client_id);
create index services_date_idx on public.services(workspace_id, scheduled_date);
create index services_assigned_idx on public.services(assigned_membership_id);
create index services_status_idx on public.services(workspace_id, status);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- =========================================================================
-- SERVICE TASKS (tâches d'entretien d'une prestation)
-- =========================================================================
create table public.service_tasks (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  service_id        uuid not null references public.services(id) on delete cascade,
  label             text not null,
  done              boolean not null default false,
  position          int not null default 0,
  created_at        timestamptz not null default now()
);

create index service_tasks_service_idx on public.service_tasks(service_id);

-- =========================================================================
-- TASKS (tâches pro/perso — admin & membres)
-- =========================================================================
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  title             text not null,
  description       text,
  category          text not null default 'professional' check (category in ('professional','personal')),
  status            text not null default 'todo' check (status in ('todo','in_progress','done')),
  due_date          date,
  assigned_membership_id uuid references public.memberships(id) on delete set null,
  created_by        uuid references public.memberships(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index tasks_workspace_idx on public.tasks(workspace_id);
create index tasks_assigned_idx on public.tasks(assigned_membership_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- =========================================================================
-- CONTRACTS
-- =========================================================================
create table public.contracts (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  title             text not null,
  reference         text,
  start_date        date,
  end_date          date,
  amount            numeric,
  status            text not null default 'active' check (status in ('draft','active','archived')),
  notes             text,
  document_path     text,                 -- fichier dans bucket 'documents'
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index contracts_workspace_idx on public.contracts(workspace_id);
create index contracts_client_idx on public.contracts(client_id);

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- INVOICES + LINES
-- =========================================================================
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  service_id        uuid references public.services(id) on delete set null,
  number            text not null,
  issue_date        date not null default current_date,
  due_date          date,
  status            text not null default 'draft' check (status in ('draft','sent','paid','cancelled')),
  currency          text not null default 'EUR',
  subtotal          numeric not null default 0,
  tax_rate          numeric not null default 20,
  tax_amount        numeric not null default 0,
  total             numeric not null default 0,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (workspace_id, number)
);

create index invoices_workspace_idx on public.invoices(workspace_id);
create index invoices_client_idx on public.invoices(client_id);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_lines (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  invoice_id        uuid not null references public.invoices(id) on delete cascade,
  label             text not null,
  quantity          numeric not null default 1,
  unit_price        numeric not null default 0,
  position          int not null default 0
);

create index invoice_lines_invoice_idx on public.invoice_lines(invoice_id);

-- =========================================================================
-- DOCUMENTS (fichiers liés à toute entité)
-- =========================================================================
create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  name              text not null,
  storage_path      text not null,        -- chemin dans bucket 'documents'
  mime_type         text,
  size_bytes        bigint,
  -- Rattachement polymorphe simple
  entity_type       text not null check (entity_type in ('client','pool','service','contract','invoice','member','workspace')),
  entity_id         uuid,
  uploaded_by       uuid references public.memberships(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index documents_workspace_idx on public.documents(workspace_id);
create index documents_entity_idx on public.documents(entity_type, entity_id);

-- =========================================================================
-- NOTIFICATIONS (in-app uniquement — pas d'e-mail en V1)
-- =========================================================================
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  -- destinataire : membership (null = tous les admins du workspace)
  recipient_membership_id uuid references public.memberships(id) on delete cascade,
  type              text not null,        -- service_completed, service_created, member_added...
  title             text not null,
  body              text,
  link              text,
  entity_type       text,
  entity_id         uuid,
  is_read           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index notifications_workspace_idx on public.notifications(workspace_id);
create index notifications_recipient_idx on public.notifications(recipient_membership_id, is_read);

-- =========================================================================
-- ACTIVITY LOGS (journal d'activité)
-- =========================================================================
create table public.activity_logs (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  actor_membership_id uuid references public.memberships(id) on delete set null,
  actor_label       text,                 -- libellé conservé même si membre supprimé
  action            text not null,        -- login, create, update, delete, permissions_change...
  entity_type       text,
  entity_id         uuid,
  summary           text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index activity_logs_workspace_idx on public.activity_logs(workspace_id, created_at desc);

-- =========================================================================
-- BACKUPS (sauvegardes / exports)
-- =========================================================================
create table public.backups (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  storage_path      text,                 -- chemin dans bucket 'backups'
  kind              text not null default 'auto' check (kind in ('auto','manual')),
  size_bytes        bigint,
  status            text not null default 'completed' check (status in ('running','completed','failed')),
  created_at        timestamptz not null default now()
);

create index backups_workspace_idx on public.backups(workspace_id, created_at desc);
