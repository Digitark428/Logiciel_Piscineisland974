-- 0020 — Correctif assistance (régression pré-existante découverte).
-- La migration 0014 (appliquée en base, non commitée) a restreint author_type à ('user','admin'),
-- alors que le code du portail en production insère encore 'client' → tout nouveau message
-- d'assistance client échouait la contrainte. On accepte 'client' en plus (non destructif) pour
-- rétablir le fonctionnement du widget d'assistance côté portail.

alter table public.support_messages drop constraint if exists support_messages_author_type_check;
alter table public.support_messages
  add constraint support_messages_author_type_check check (author_type in ('client','user','admin'));
