-- 0002 — Schéma cœur multi-tenant : workspaces, memberships, permissions, platform_admins

-- =========================================================================
-- WORKSPACES (un espace = une entreprise)
-- =========================================================================
create table public.workspaces (
  id                uuid primary key default gen_random_uuid(),
  company_code      text not null unique,
  name              text not null,
  -- Coordonnées / identification légale
  address_line1     text,
  address_line2     text,
  postal_code       text,
  city              text,
  country           text default 'France',
  phone             text,
  email             citext,
  siret             text,
  vat_number        text,
  legal_form        text,
  legal_info        jsonb not null default '{}'::jsonb,   -- flexible : infos légales additionnelles
  settings          jsonb not null default '{}'::jsonb,   -- flexible : préférences de l'espace
  -- Statut & démo
  status            text not null default 'active' check (status in ('active','disabled')),
  is_demo           boolean not null default false,
  -- Réservé évolutions (abonnements) — non actif en V1
  plan              text not null default 'free',
  trial_ends_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index workspaces_status_idx on public.workspaces(status);
create index workspaces_is_demo_idx on public.workspaces(is_demo);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- =========================================================================
-- MEMBERSHIPS (lien user ↔ workspace, profil, rôle)
-- =========================================================================
create table public.memberships (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  role              text not null default 'member' check (role in ('admin','member')),
  member_type       text not null default 'employe'
                      check (member_type in ('employe','prestataire','stagiaire','alternant')),
  status            text not null default 'active' check (status in ('active','disabled')),
  -- Profil
  first_name        text,
  last_name         text,
  email             citext,               -- copie pratique (source de vérité = auth.users)
  phone             text,
  photo_path        text,                 -- chemin dans le bucket 'avatars'
  job_title         text,
  professional_info jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index memberships_workspace_idx on public.memberships(workspace_id);
create index memberships_user_idx on public.memberships(user_id);
create index memberships_role_idx on public.memberships(workspace_id, role);

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- =========================================================================
-- PERMISSIONS granulaires par membership
-- =========================================================================
create table public.permissions (
  id                uuid primary key default gen_random_uuid(),
  membership_id     uuid not null references public.memberships(id) on delete cascade,
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  key               text not null,
  granted           boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (membership_id, key)
);

create index permissions_membership_idx on public.permissions(membership_id);
create index permissions_workspace_idx on public.permissions(workspace_id);

-- =========================================================================
-- PLATFORM ADMINS (Super Admin — totalement séparé des workspaces)
-- =========================================================================
create table public.platform_admins (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  status            text not null default 'active' check (status in ('active','disabled')),
  created_at        timestamptz not null default now()
);
