-- 0025 — Index FK complémentaires pour les interactions de notes.
-- Les index composites de 0024 servent les lectures par workspace ; ceux-ci
-- couvrent explicitement les suppressions en cascade et les recherches par auteur.
create index team_note_comments_team_note_id_idx
  on public.team_note_comments(team_note_id);
create index team_note_comments_author_membership_idx
  on public.team_note_comments(author_membership_id);
create index team_note_executions_membership_idx
  on public.team_note_executions(membership_id);
