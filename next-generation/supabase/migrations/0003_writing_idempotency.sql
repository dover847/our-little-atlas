alter table public.writing_entries add column client_request_id uuid not null default gen_random_uuid();
alter table public.writing_entries add constraint writing_request_unique unique(author_id,client_request_id);
grant insert(client_request_id) on public.writing_entries to authenticated;
