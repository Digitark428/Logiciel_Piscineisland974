-- Le créateur est placé en tête pour couvrir la clé étrangère tout en servant
-- la vue personnelle, dont les trois prédicats sont des égalités.
drop index if exists public.tasks_workspace_category_created_idx;

create index tasks_created_workspace_category_idx
  on public.tasks (created_by, workspace_id, category);
