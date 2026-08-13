-- 0009 — Durcissement : verrouillage des fonctions mutatrices + search_path figé.
-- Les fonctions de provisioning sont SECURITY DEFINER et ne doivent JAMAIS être
-- appelables via l'API REST par anon/authenticated (sinon un membre pourrait
-- s'auto-promouvoir). Elles restent appelables par service_role (serveur).

revoke all on function public.provision_workspace(uuid, text, text, text, text, jsonb, boolean, text) from anon, authenticated, public;
revoke all on function public.provision_member(uuid, uuid, text, text, text, text, text, text[]) from anon, authenticated, public;
revoke all on function public.assign_all_permissions(uuid, uuid) from anon, authenticated, public;
revoke all on function public.set_member_permissions(uuid, uuid, text[]) from anon, authenticated, public;
revoke all on function public.seed_demo_data(uuid) from anon, authenticated, public;
revoke all on function public.generate_company_code(text) from anon, authenticated, public;
revoke all on function public.next_service_code() from anon, authenticated, public;
revoke all on function public.permission_keys() from anon, authenticated, public;

-- Fige le search_path (bonne pratique de sécurité) des fonctions non-definer.
-- NB : les fonctions auth_* et storage_workspace_id restent exécutables car
-- utilisées à l'intérieur des policies RLS / Storage.
alter function public.set_updated_at() set search_path = public;
alter function public.generate_company_code(text) set search_path = public;
alter function public.next_service_code() set search_path = public;
alter function public.services_set_code() set search_path = public;
alter function public.permission_keys() set search_path = public;
alter function public.storage_workspace_id(text) set search_path = public;
alter function public.memberships_guard() set search_path = public;
alter function public.workspaces_guard() set search_path = public;
