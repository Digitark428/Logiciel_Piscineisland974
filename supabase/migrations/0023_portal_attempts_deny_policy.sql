-- 0023 — Table interne de limitation portail : aucun accès direct depuis l'API.
create policy portal_auth_attempts_no_direct_access on public.portal_auth_attempts
  as restrictive for all to anon, authenticated
  using (false) with check (false);
