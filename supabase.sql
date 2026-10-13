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

-- ===== Aggiornamento 2 =====

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

-- ===== Aggiornamento 3 =====

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.quick_tokens (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.quick_tokens enable row level security;
drop policy if exists "solo il mio codice" on public.quick_tokens;
create policy "solo il mio codice" on public.quick_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.quick_tokens from anon;
grant select, insert, update, delete on public.quick_tokens to authenticated;

-- importo in formato italiano: 1234.5 -> "1.234,50 €"
create or replace function public.eur_it(v numeric) returns text language sql immutable as $$
  select replace(replace(replace(to_char(v, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') || ' €'
$$;

create or replace function public.quick_user(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select user_id from public.quick_tokens where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;
revoke all on function public.quick_user(text) from public, anon, authenticated;

create or replace function public.quick_saldo(uid uuid) returns numeric language sql stable as $$
  select coalesce(sum(case when type = 'in' then amount else -amount end), 0) / 100.0 from public.transactions where user_id = uid
$$;
revoke all on function public.quick_saldo(uuid) from public, anon, authenticated;

create or replace function public.quick_add(p_token text, p_type text, p_amount text, p_cat text default '', p_note text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; cents integer;
begin
  uid := public.quick_user(p_token);
  if uid is null then return json_build_object('ok', false, 'messaggio', 'Codice non valido: copialo di nuovo dall''app, in Altro → Siri e widget.'); end if;
  if p_type not in ('in', 'out') then return json_build_object('ok', false, 'messaggio', 'Tipo di movimento non valido.'); end if;
  begin cents := round(replace(trim(p_amount), ',', '.')::numeric * 100);
  exception when others then cents := 0; end;
  if cents <= 0 or cents > 100000000 then return json_build_object('ok', false, 'messaggio', 'Importo non valido.'); end if;
  insert into public.transactions (id, user_id, type, amount, cat, note, ts)
  values (gen_random_uuid(), uid, p_type, cents, left(coalesce(p_cat, ''), 40), left(coalesce(p_note, ''), 80), (extract(epoch from now()) * 1000)::bigint);
  return json_build_object('ok', true, 'messaggio',
    (case when p_type = 'in' then 'Entrata di ' else 'Uscita di ' end) || public.eur_it(cents / 100.0) || ' segnata. Saldo: ' || public.eur_it(public.quick_saldo(uid)));
end $$;

create or replace function public.quick_balance(p_token text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid; m0 bigint; inn numeric; outt numeric;
begin
  uid := public.quick_user(p_token);
  if uid is null then return json_build_object('ok', false, 'messaggio', 'Codice non valido: copialo di nuovo dall''app, in Altro → Siri e widget.'); end if;
  m0 := (extract(epoch from date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') * 1000)::bigint;
  select coalesce(sum(amount) filter (where type = 'in'), 0) / 100.0, coalesce(sum(amount) filter (where type = 'out'), 0) / 100.0
    into inn, outt from public.transactions where user_id = uid and ts >= m0;
  return json_build_object('ok', true, 'saldo', public.quick_saldo(uid), 'messaggio',
    'Saldo: ' || public.eur_it(public.quick_saldo(uid)) || '. Questo mese: entrate ' || public.eur_it(inn) || ', uscite ' || public.eur_it(outt) || '.');
end $$;

grant execute on function public.quick_add(text, text, text, text, text) to anon, authenticated;
grant execute on function public.quick_balance(text) to anon, authenticated;

-- ===== Aggiornamento 4 =====
alter table public.transactions add column if not exists account text;
