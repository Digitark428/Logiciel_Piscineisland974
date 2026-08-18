-- Couvre la clé étrangère client_id lors des suppressions et des contrôles
-- d'intégrité PostgreSQL ; l'index composite workspace/client reste dédié aux
-- synthèses de fiche client.
create index service_financials_client_idx on public.service_financials(client_id);
