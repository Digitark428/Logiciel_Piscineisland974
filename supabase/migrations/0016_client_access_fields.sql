-- 0016 — Fiche client : informations d'accès structurées (au lieu d'un seul champ libre).
-- Champs séparés : code portail, code d'accès, autres informations. La « note importante »
-- reste le champ notes. Les infos d'accès restent sensibles (permission sensitive.view).

alter table public.clients
  add column if not exists access_portal_code text,
  add column if not exists access_code text,
  add column if not exists access_details text;

-- Reprise des données existantes : l'ancien champ libre alimente « Autres informations ».
update public.clients
   set access_details = access_info
 where access_info is not null
   and (access_details is null or access_details = '');

-- On conserve access_info (rétrocompatibilité / non destructif) ; l'UI utilise les nouveaux champs.
