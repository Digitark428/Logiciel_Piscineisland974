-- 0021 — Index de couverture pour les nouvelles clés étrangères (advisors performance).
create index if not exists service_series_contract_document_idx on public.service_series(contract_document_id);
create index if not exists service_series_invoice_document_idx on public.service_series(invoice_document_id);
create index if not exists service_client_notes_client_idx on public.service_client_notes(client_id);
create index if not exists team_notes_author_idx on public.team_notes(author_membership_id);
