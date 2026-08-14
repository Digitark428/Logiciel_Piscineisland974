-- 0018 — Notes du client depuis le portail (changements d'accès, remarques…).
-- Le client final écrit une note depuis la fiche d'une de ses prestations. Elle est ensuite
-- visible par l'équipe (gérant + membres autorisés). Écriture via service_role uniquement
-- (portail), workspace_id/client_id/service_id dérivés côté serveur de la session portail
-- vérifiée — aucune usurpation possible (même patron que le module Assistance).

create table if not exists public.service_client_notes (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  service_id    uuid not null references public.services(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  content       text not null,
  is_important  boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists service_client_notes_service_idx on public.service_client_notes(service_id);
create index if not exists service_client_notes_workspace_idx on public.service_client_notes(workspace_id);

alter table public.service_client_notes enable row level security;

-- Lecture : membres du workspace (une entreprise ne voit jamais les notes d'une autre).
create policy service_client_notes_select on public.service_client_notes
  for select using ( auth_is_member(workspace_id) );

-- Aucune policy insert/update/delete : écritures via service_role (portail) uniquement.
