-- Salvadanaio: tabelle e regole di sicurezza.
-- Incolla tutto in Supabase → SQL Editor → New query → Run.

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount integer not null check (amount > 0),   -- centesimi
  cat text not null default '',
  note text not null default '',
  ts bigint not null,                            -- millisecondi
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  price integer not null check (price > 0),     -- centesimi
  img text,                                      -- immagine compressa (data URL)
  done boolean not null default false,
  done_at bigint,
  created_at bigint not null,
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_idx on public.transactions (user_id, ts desc);
create index if not exists goals_user_idx on public.goals (user_id);

alter table public.transactions enable row level security;
alter table public.goals enable row level security;

drop policy if exists "solo i miei movimenti" on public.transactions;
create policy "solo i miei movimenti" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "solo i miei obiettivi" on public.goals;
create policy "solo i miei obiettivi" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Accesso solo agli utenti che hanno fatto login (funziona anche con "Automatically expose new tables" disattivato)
revoke all on public.transactions, public.goals from anon;
grant select, insert, update, delete on public.transactions, public.goals to authenticated;

-- Aggiornamenti in tempo reale tra i dispositivi
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'transactions') then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'goals') then
    alter publication supabase_realtime add table public.goals;
  end if;
end $$;

-- Aggiornamento: link e data obiettivo per gli obiettivi
alter table public.goals add column if not exists url text;
alter table public.goals add column if not exists deadline text;
