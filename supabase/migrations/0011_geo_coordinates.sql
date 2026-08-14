-- 0011 — Géolocalisation : coordonnées GPS sur clients et piscines
--        + nouvelle permission 'map.view' pour l'onglet Carte interactive.
--
-- Les coordonnées sont renseignées automatiquement via l'autocomplétion d'adresse
-- (Base Adresse Nationale — api-adresse.data.gouv.fr, service officiel gratuit).
-- Aucune saisie manuelle X/Y : l'utilisateur choisit une adresse, lat/lng sont remplis.

-- =========================================================================
-- Coordonnées GPS
-- =========================================================================
alter table public.clients
  add column if not exists latitude     double precision,
  add column if not exists longitude    double precision,
  add column if not exists geo_label    text,   -- libellé retourné par le géocodeur
  add column if not exists geo_precision text;  -- housenumber | street | locality | municipality

alter table public.pools
  add column if not exists latitude     double precision,
  add column if not exists longitude    double precision,
  add column if not exists geo_label    text,
  add column if not exists geo_precision text;

-- Index partiels : accélère le chargement de la carte (seules les entités géocodées).
create index if not exists clients_geo_idx
  on public.clients (workspace_id)
  where latitude is not null and longitude is not null;

create index if not exists pools_geo_idx
  on public.pools (workspace_id)
  where latitude is not null and longitude is not null;

-- =========================================================================
-- Permission 'map.view' — ajoutée à la liste maîtresse des permissions
-- =========================================================================
create or replace function public.permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'clients.view','clients.edit','clients.delete',
    'pools.view','pools.edit',
    'services.view','services.create','services.edit','services.complete',
    'planning.view',
    'map.view',
    'tasks.view','tasks.manage',
    'documents.view','documents.manage',
    'contracts.manage',
    'invoices.manage',
    'team.manage',
    'settings.manage',
    'backups.manage',
    'sensitive.view'
  ]::text[];
$$;

-- Donne 'map.view' à tous les membres existants (comme planning.view) pour ne pas
-- casser l'usage : chaque membre ne verra de toute façon que ses propres prestations.
insert into public.permissions (membership_id, workspace_id, key, granted)
select m.id, m.workspace_id, 'map.view', true
from public.memberships m
on conflict (membership_id, key) do nothing;
