-- Salvadanaio, aggiornamento 3: Siri, widget e Comandi Rapidi.
-- Ogni utente può generare dall'app un codice personale: i Comandi Rapidi lo usano per segnare
-- entrate e uscite e leggere il saldo senza email e password. Nel database si salva solo l'impronta
-- (hash) del codice, mai il codice stesso.

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
