-- 0012 — Corrige une régression introduite par 0011.
--
-- La migration 0011 a fait `create or replace function public.permission_keys()`
-- sans réintégrer le `set search_path = public` que le durcissement 0009 avait posé
-- (ligne 22 de 0009). Résultat : l'advisor Supabase signalait de nouveau
-- `function_search_path_mutable` sur cette fonction.
--
-- Note : les droits EXECUTE (révoqués à anon/authenticated/public par 0009) sont,
-- eux, préservés par `create or replace` — seul le search_path avait été perdu.
-- On le re-fige ici.

alter function public.permission_keys() set search_path = public;
