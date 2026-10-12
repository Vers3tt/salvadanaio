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
