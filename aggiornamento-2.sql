-- Salvadanaio, aggiornamento 2: impostazioni e budget, movimenti ricorrenti, eliminazione account.
-- Incolla tutto in Supabase → SQL Editor → Run. Si può rieseguire senza problemi.

-- Impostazioni per utente (budget mensili, primo avvio completato, ...)
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Movimenti ricorrenti: l'app crea da sola il movimento a ogni scadenza
create table if not exists public.recurring (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount integer not null check (amount > 0),
  cat text not null default '',
  note text not null default '',
  freq text not null check (freq in ('week', 'month', 'year')),
  next_ts bigint not null,
  active boolean not null default true,
  created_at bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.recurring enable row level security;

drop policy if exists "solo le mie impostazioni" on public.settings;
create policy "solo le mie impostazioni" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "solo i miei ricorrenti" on public.recurring;
create policy "solo i miei ricorrenti" on public.recurring
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.settings, public.recurring from anon;
grant select, insert, update, delete on public.settings, public.recurring to authenticated;

-- Link e data degli obiettivi (se non l'hai già eseguito)
alter table public.goals add column if not exists url text;
alter table public.goals add column if not exists deadline text;

-- Eliminazione account: cancella l'utente che la chiama e, a cascata, tutti i suoi dati
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
