-- Index de couverture pour la suppression/mise à jour d'un membre demandeur.
create index if not exists backups_requested_by_idx
  on public.backups (requested_by)
  where requested_by is not null;
