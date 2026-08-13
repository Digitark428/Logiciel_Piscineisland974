-- 0004 — Row Level Security : isolation stricte par workspace.
-- Principe deny-by-default : RLS activée partout, accès filtré par appartenance.

-- =========================================================================
-- Fonctions d'autorisation (SECURITY DEFINER pour éviter la récursion RLS)
-- =========================================================================

-- Workspaces actifs de l'utilisateur courant
create or replace function public.auth_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from public.memberships
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.auth_is_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and workspace_id = p_workspace_id
      and status = 'active'
  );
$$;

create or replace function public.auth_is_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and workspace_id = p_workspace_id
      and status = 'active'
      and role = 'admin'
  );
$$;

-- L'admin possède toutes les permissions ; sinon on vérifie la permission granulaire.
create or replace function public.auth_has_permission(p_workspace_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.workspace_id = p_workspace_id
      and m.status = 'active'
      and (
        m.role = 'admin'
        or exists (
          select 1 from public.permissions p
          where p.membership_id = m.id
            and p.key = p_key
            and p.granted = true
        )
      )
  );
$$;

create or replace function public.auth_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and status = 'active'
  );
$$;

-- =========================================================================
-- Activation RLS + policies
-- =========================================================================

-- ---- WORKSPACES ---------------------------------------------------------
alter table public.workspaces enable row level security;

create policy workspaces_select on public.workspaces
  for select using ( auth_is_member(id) or auth_is_platform_admin() );

-- Seul un admin du workspace peut le modifier (settings). Création/suppression via service_role.
create policy workspaces_update on public.workspaces
  for update using ( auth_is_admin(id) ) with check ( auth_is_admin(id) );

-- ---- MEMBERSHIPS --------------------------------------------------------
alter table public.memberships enable row level security;

-- Un membre voit tous les membres de ses workspaces (annuaire équipe).
create policy memberships_select on public.memberships
  for select using ( auth_is_member(workspace_id) or auth_is_platform_admin() );

-- Un membre peut mettre à jour SON propre profil (nom, photo, tél...).
-- La gestion des autres membres (rôle, statut, permissions) passe par le serveur (service_role).
create policy memberships_update_self on public.memberships
  for update using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- ---- PERMISSIONS --------------------------------------------------------
alter table public.permissions enable row level security;

create policy permissions_select on public.permissions
  for select using ( auth_is_member(workspace_id) );
-- Écriture uniquement via service_role (gestion par l'admin, côté serveur).

-- ---- PLATFORM ADMINS ----------------------------------------------------
alter table public.platform_admins enable row level security;
create policy platform_admins_select on public.platform_admins
  for select using ( user_id = auth.uid() );
-- Écriture : service_role uniquement.

-- =========================================================================
-- Tables métier : même patron.
--   SELECT   : membre du workspace
--   INSERT   : permission d'écriture correspondante
--   UPDATE   : permission d'écriture correspondante
--   DELETE   : permission de suppression / gestion
-- =========================================================================

-- CLIENTS
alter table public.clients enable row level security;
create policy clients_select on public.clients
  for select using ( auth_is_member(workspace_id) );
create policy clients_insert on public.clients
  for insert with check ( auth_has_permission(workspace_id, 'clients.edit') );
create policy clients_update on public.clients
  for update using ( auth_has_permission(workspace_id, 'clients.edit') )
  with check ( auth_has_permission(workspace_id, 'clients.edit') );
create policy clients_delete on public.clients
  for delete using ( auth_has_permission(workspace_id, 'clients.delete') );

-- POOLS
alter table public.pools enable row level security;
create policy pools_select on public.pools
  for select using ( auth_is_member(workspace_id) );
create policy pools_insert on public.pools
  for insert with check ( auth_has_permission(workspace_id, 'pools.edit') );
create policy pools_update on public.pools
  for update using ( auth_has_permission(workspace_id, 'pools.edit') )
  with check ( auth_has_permission(workspace_id, 'pools.edit') );
create policy pools_delete on public.pools
  for delete using ( auth_has_permission(workspace_id, 'pools.edit') );

-- SERVICE SERIES
alter table public.service_series enable row level security;
create policy service_series_select on public.service_series
  for select using ( auth_is_member(workspace_id) );
create policy service_series_insert on public.service_series
  for insert with check ( auth_has_permission(workspace_id, 'services.create') );
create policy service_series_update on public.service_series
  for update using ( auth_has_permission(workspace_id, 'services.edit') )
  with check ( auth_has_permission(workspace_id, 'services.edit') );
create policy service_series_delete on public.service_series
  for delete using ( auth_has_permission(workspace_id, 'services.edit') );

-- SERVICES
alter table public.services enable row level security;
create policy services_select on public.services
  for select using ( auth_is_member(workspace_id) );
create policy services_insert on public.services
  for insert with check ( auth_has_permission(workspace_id, 'services.create') );
-- UPDATE : édition OU complétion (l'employé assigné peut compléter sa prestation).
create policy services_update on public.services
  for update using (
    auth_has_permission(workspace_id, 'services.edit')
    or (
      auth_has_permission(workspace_id, 'services.complete')
      and assigned_membership_id in (
        select id from public.memberships where user_id = auth.uid() and workspace_id = services.workspace_id
      )
    )
  )
  with check (
    auth_has_permission(workspace_id, 'services.edit')
    or auth_has_permission(workspace_id, 'services.complete')
  );
create policy services_delete on public.services
  for delete using ( auth_has_permission(workspace_id, 'services.edit') );

-- SERVICE TASKS
alter table public.service_tasks enable row level security;
create policy service_tasks_select on public.service_tasks
  for select using ( auth_is_member(workspace_id) );
create policy service_tasks_insert on public.service_tasks
  for insert with check ( auth_has_permission(workspace_id, 'services.create') or auth_has_permission(workspace_id, 'services.edit') );
create policy service_tasks_update on public.service_tasks
  for update using ( auth_has_permission(workspace_id, 'services.edit') or auth_has_permission(workspace_id, 'services.complete') )
  with check ( auth_has_permission(workspace_id, 'services.edit') or auth_has_permission(workspace_id, 'services.complete') );
create policy service_tasks_delete on public.service_tasks
  for delete using ( auth_has_permission(workspace_id, 'services.edit') );

-- TASKS
alter table public.tasks enable row level security;
create policy tasks_select on public.tasks
  for select using ( auth_is_member(workspace_id) );
create policy tasks_insert on public.tasks
  for insert with check ( auth_has_permission(workspace_id, 'tasks.manage') );
create policy tasks_update on public.tasks
  for update using ( auth_has_permission(workspace_id, 'tasks.manage') )
  with check ( auth_has_permission(workspace_id, 'tasks.manage') );
create policy tasks_delete on public.tasks
  for delete using ( auth_has_permission(workspace_id, 'tasks.manage') );

-- CONTRACTS
alter table public.contracts enable row level security;
create policy contracts_select on public.contracts
  for select using ( auth_is_member(workspace_id) );
create policy contracts_insert on public.contracts
  for insert with check ( auth_has_permission(workspace_id, 'contracts.manage') );
create policy contracts_update on public.contracts
  for update using ( auth_has_permission(workspace_id, 'contracts.manage') )
  with check ( auth_has_permission(workspace_id, 'contracts.manage') );
create policy contracts_delete on public.contracts
  for delete using ( auth_has_permission(workspace_id, 'contracts.manage') );

-- INVOICES
alter table public.invoices enable row level security;
create policy invoices_select on public.invoices
  for select using ( auth_is_member(workspace_id) );
create policy invoices_insert on public.invoices
  for insert with check ( auth_has_permission(workspace_id, 'invoices.manage') );
create policy invoices_update on public.invoices
  for update using ( auth_has_permission(workspace_id, 'invoices.manage') )
  with check ( auth_has_permission(workspace_id, 'invoices.manage') );
create policy invoices_delete on public.invoices
  for delete using ( auth_has_permission(workspace_id, 'invoices.manage') );

-- INVOICE LINES
alter table public.invoice_lines enable row level security;
create policy invoice_lines_select on public.invoice_lines
  for select using ( auth_is_member(workspace_id) );
create policy invoice_lines_insert on public.invoice_lines
  for insert with check ( auth_has_permission(workspace_id, 'invoices.manage') );
create policy invoice_lines_update on public.invoice_lines
  for update using ( auth_has_permission(workspace_id, 'invoices.manage') )
  with check ( auth_has_permission(workspace_id, 'invoices.manage') );
create policy invoice_lines_delete on public.invoice_lines
  for delete using ( auth_has_permission(workspace_id, 'invoices.manage') );

-- DOCUMENTS
alter table public.documents enable row level security;
create policy documents_select on public.documents
  for select using ( auth_is_member(workspace_id) );
create policy documents_insert on public.documents
  for insert with check ( auth_has_permission(workspace_id, 'documents.manage') );
create policy documents_delete on public.documents
  for delete using ( auth_has_permission(workspace_id, 'documents.manage') );

-- NOTIFICATIONS
alter table public.notifications enable row level security;
-- Un membre voit ses notifications personnelles + les notifications workspace destinées aux admins (si admin).
create policy notifications_select on public.notifications
  for select using (
    auth_is_member(workspace_id)
    and (
      recipient_membership_id is null and auth_is_admin(workspace_id)
      or recipient_membership_id in (
        select id from public.memberships where user_id = auth.uid() and workspace_id = notifications.workspace_id
      )
    )
  );
-- Marquer comme lu (update is_read) sur ses propres notifications.
create policy notifications_update on public.notifications
  for update using (
    auth_is_member(workspace_id)
    and (
      (recipient_membership_id is null and auth_is_admin(workspace_id))
      or recipient_membership_id in (
        select id from public.memberships where user_id = auth.uid() and workspace_id = notifications.workspace_id
      )
    )
  )
  with check ( auth_is_member(workspace_id) );

-- ACTIVITY LOGS (lecture réservée aux admins ; écriture via serveur/trigger)
alter table public.activity_logs enable row level security;
create policy activity_logs_select on public.activity_logs
  for select using ( auth_is_admin(workspace_id) );

-- BACKUPS
alter table public.backups enable row level security;
create policy backups_select on public.backups
  for select using ( auth_has_permission(workspace_id, 'backups.manage') );
