-- 0026 — Correctif du trigger d'interactions des notes d'équipe.
--
-- La fonction est partagée par trois tables dont les clés d'auteur ne portent
-- pas le même nom. Accéder directement à NEW.membership_id et
-- NEW.author_membership_id dans une fonction de trigger générique fait échouer
-- PostgreSQL avant même que la branche correspondante soit choisie.
-- La conversion du nouveau record en JSONB permet de lire uniquement la clé
-- présente, sans retirer les vérifications d'intégrité tenant ni la RLS.

create or replace function public.team_note_interaction_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  note_workspace uuid;
  actor_workspace uuid;
  actor_label text;
  actor_id uuid;
begin
  select workspace_id into note_workspace
  from public.team_notes
  where id = new.team_note_id;

  if note_workspace is distinct from new.workspace_id then
    raise exception 'team_note_id must belong to the interaction workspace';
  end if;

  actor_id := (
    to_jsonb(new) ->> case
      when tg_table_name = 'team_note_comments' then 'author_membership_id'
      else 'membership_id'
    end
  )::uuid;

  select
    workspace_id,
    coalesce(nullif(concat_ws(' ', first_name, last_name), ''), email, 'Membre')
  into actor_workspace, actor_label
  from public.memberships
  where id = actor_id;

  if actor_workspace is distinct from new.workspace_id then
    raise exception 'interaction member must belong to the interaction workspace';
  end if;

  if tg_table_name = 'team_note_comments' then
    new.author_label := actor_label;
  elsif tg_table_name = 'team_note_reads' then
    new.reader_label := actor_label;
  else
    new.executor_label := actor_label;
  end if;

  return new;
end;
$$;

revoke all on function public.team_note_interaction_guard() from public, anon, authenticated;
