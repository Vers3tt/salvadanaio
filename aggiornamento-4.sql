-- Keepo, aggiornamento 4: conti (Hype, Revolut, contanti…) sui movimenti.
alter table public.transactions add column if not exists account text;
