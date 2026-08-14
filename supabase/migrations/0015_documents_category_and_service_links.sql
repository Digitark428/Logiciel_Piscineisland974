-- 0015 — Factures & contrats = documents stockés + liens prestation → contrat / facture.
-- Piscine Island ne GÉNÈRE pas les factures/contrats : ce sont des fichiers importés
-- (bucket privé 'documents' existant, RLS et permissions inchangées). On catégorise les
-- documents et on permet de rattacher une prestation à un contrat et/ou une facture existants.

-- Catégorie du document (facture / contrat / photo / autre). Rétrocompatible : 'other' par défaut.
alter table public.documents
  add column if not exists category text not null default 'other';

alter table public.documents
  drop constraint if exists documents_category_check;
alter table public.documents
  add constraint documents_category_check check (category in ('invoice','contract','photo','other'));

create index if not exists documents_category_idx
  on public.documents(workspace_id, entity_type, entity_id, category);

-- Liens prestation → document contrat / facture (le document reste dans la fiche client).
-- on delete set null : si le document est supprimé, la prestation n'est pas supprimée.
alter table public.services
  add column if not exists contract_document_id uuid references public.documents(id) on delete set null,
  add column if not exists invoice_document_id  uuid references public.documents(id) on delete set null;

alter table public.service_series
  add column if not exists contract_document_id uuid references public.documents(id) on delete set null,
  add column if not exists invoice_document_id  uuid references public.documents(id) on delete set null;

create index if not exists services_contract_document_idx on public.services(contract_document_id);
create index if not exists services_invoice_document_idx on public.services(invoice_document_id);
