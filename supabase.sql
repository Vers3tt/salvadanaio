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

-- ===== Aggiornamento 5 =====

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table public.goals add column if not exists last_price integer;
alter table public.goals add column if not exists last_checked timestamptz;
alter table public.goals add column if not exists price_note text;

create table if not exists public.price_history (
  id bigserial primary key,
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  price integer not null,
  checked_at timestamptz not null default now()
);
create index if not exists price_history_goal_idx on public.price_history (goal_id, checked_at);
alter table public.price_history enable row level security;
drop policy if exists "solo i miei prezzi" on public.price_history;
create policy "solo i miei prezzi" on public.price_history for select using (auth.uid() = user_id);
revoke all on public.price_history from anon;
grant select on public.price_history to authenticated;

create table if not exists public.price_requests (
  request_id bigint primary key,
  goal_id uuid not null references public.goals(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.price_requests enable row level security;
revoke all on public.price_requests from anon, authenticated;

-- legge il prezzo da una pagina: meta tag, dati strutturati (JSON-LD) o Amazon
create or replace function public.parse_price(html text) returns integer language plpgsql immutable as $$
declare m text[]; v text; n numeric;
begin
  if html is null then return null; end if;
  m := regexp_match(html, '(?:product:price:amount|og:price:amount|itemprop="price")[^>]*content="([0-9][0-9.,]*)"', 'i');
  if m is null then m := regexp_match(html, 'content="([0-9][0-9.,]*)"[^>]*(?:product:price:amount|og:price:amount|itemprop="price")', 'i'); end if;
  if m is null then m := regexp_match(html, 'class="a-offscreen">\s*([0-9][0-9.,]*)', 'i'); end if;
  if m is null then m := regexp_match(html, '"price"\s*:\s*"?([0-9][0-9.,]*)"?', 'i'); end if;
  if m is null then m := regexp_match(html, 'priceAmount"\s*:\s*([0-9.]+)', 'i'); end if;
  if m is null then return null; end if;
  v := regexp_replace(m[1], '[.,]+$', '');
  if v ~ ',' and v ~ '\.' then
    if strpos(reverse(v), ',') < strpos(reverse(v), '.') then v := replace(replace(v, '.', ''), ',', '.'); else v := replace(v, ',', ''); end if;
  elsif v ~ ',' then
    if v ~ ',[0-9]{1,2}$' then v := replace(v, ',', '.'); else v := replace(v, ',', ''); end if;
  elsif v ~ '\.[0-9]{3}$' then
    v := replace(v, '.', '');
  end if;
  begin n := v::numeric; exception when others then return null; end;
  if n <= 0 or n > 1000000 then return null; end if;
  return round(n * 100);
end $$;

-- chiede le pagine: dall'app solo per i propri obiettivi, dal giro notturno per tutti
create or replace function public.request_price_checks(p_goal uuid default null) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare g record; rid bigint; n integer := 0;
begin
  for g in select id, url from public.goals
           where url ~* '^https?://' and not done
             and (p_goal is null or id = p_goal)
             and (auth.uid() is null or user_id = auth.uid())
  loop
    rid := net.http_get(
      url := g.url,
      headers := jsonb_build_object(
        'User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        'Accept-Language', 'it-IT,it;q=0.9', 'Accept', 'text/html'),
      timeout_milliseconds := 15000);
    insert into public.price_requests (request_id, goal_id) values (rid, g.id) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

-- legge le risposte arrivate e aggiorna prezzi e storico
create or replace function public.process_price_checks() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare r record; p integer; uid uuid; n integer := 0;
begin
  for r in select pr.request_id, pr.goal_id, resp.status_code, resp.content
           from public.price_requests pr join net._http_response resp on resp.id = pr.request_id
  loop
    p := case when r.status_code between 200 and 299 then public.parse_price(r.content) end;
    select user_id into uid from public.goals where id = r.goal_id;
    if uid is not null then
      if p is not null then
        insert into public.price_history (goal_id, user_id, price) values (r.goal_id, uid, p);
        update public.goals set last_price = p, last_checked = now(), price_note = null where id = r.goal_id;
        n := n + 1;
      else
        update public.goals set last_checked = now(),
          price_note = case when r.status_code in (401, 403, 429, 503) or r.content ilike '%captcha%' then 'Il sito blocca la lettura automatica del prezzo'
                            else 'Non trovo il prezzo in questa pagina' end
        where id = r.goal_id;
      end if;
    end if;
    delete from public.price_requests where request_id = r.request_id;
  end loop;
  delete from public.price_requests where created_at < now() - interval '1 hour';
  return n;
end $$;

revoke all on function public.parse_price(text) from public, anon, authenticated;
revoke all on function public.request_price_checks(uuid) from public, anon;
revoke all on function public.process_price_checks() from public, anon;
grant execute on function public.request_price_checks(uuid) to authenticated;
grant execute on function public.process_price_checks() to authenticated;

-- giro automatico: ogni mattina alle 8 (ora UTC) chiede i prezzi, ogni 10 minuti legge le risposte
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('keepo-prezzi', 'keepo-prezzi-leggi');
end $$;
select cron.schedule('keepo-prezzi', '0 6 * * *', $$select public.request_price_checks()$$);
select cron.schedule('keepo-prezzi-leggi', '*/10 * * * *', $$select public.process_price_checks()$$);

-- ===== Aggiornamento 6 =====
create table if not exists public.price_peeks (
  request_id bigint primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.price_peeks enable row level security;
revoke all on public.price_peeks from anon, authenticated;

create or replace function public.peek_price(p_url text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare rid bigint;
begin
  if auth.uid() is null or coalesce(p_url, '') !~* '^https?://' then return null; end if;
  delete from public.price_peeks where created_at < now() - interval '1 hour';
  rid := net.http_get(
    url := p_url,
    headers := jsonb_build_object(
      'User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      'Accept-Language', 'it-IT,it;q=0.9', 'Accept', 'text/html'),
    timeout_milliseconds := 15000);
  insert into public.price_peeks (request_id, user_id) values (rid, auth.uid());
  return rid;
end $$;

create or replace function public.peek_price_result(p_request bigint) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare r record; t text; img text; ok boolean;
begin
  if not exists (select 1 from public.price_peeks where request_id = p_request and user_id = auth.uid()) then
    return json_build_object('status', 'unknown');
  end if;
  select status_code, content into r from net._http_response where id = p_request;
  if not found then return json_build_object('status', 'pending'); end if;
  delete from public.price_peeks where request_id = p_request;
  ok := r.status_code between 200 and 299 and coalesce(r.content, '') not ilike '%captcha%';
  t := (regexp_match(r.content, 'id="productTitle"[^>]*>\s*([^<]+)', 'i'))[1];
  if t is null then t := (regexp_match(r.content, '<meta[^>]+property="og:title"[^>]+content="([^"]+)"', 'i'))[1]; end if;
  if t is null then t := (regexp_match(r.content, '<title[^>]*>([^<]+)</title>', 'i'))[1]; end if;
  img := (regexp_match(r.content, '<meta[^>]+property="og:image"[^>]+content="([^"]+)"', 'i'))[1];
  if img is null then img := (regexp_match(r.content, '"hiRes":"(https:[^"]+)"'))[1]; end if;
  if img is null then img := (regexp_match(r.content, 'id="landingImage"[^>]+src="(https:[^"]+)"', 'i'))[1]; end if;
  return json_build_object(
    'status', case when ok then 'ok' else 'blocked' end,
    'price', case when ok then public.parse_price(r.content) end,
    'title', left(trim(t), 160), 'image', img, 'code', r.status_code);
end $$;

revoke all on function public.peek_price(text) from public, anon;
revoke all on function public.peek_price_result(bigint) from public, anon;
grant execute on function public.peek_price(text) to authenticated;
grant execute on function public.peek_price_result(bigint) to authenticated;

-- ===== Aggiornamento 7 =====
-- L'automazione "Transazione" dell'iPhone passa importo, negozio e carta separati da ";":
-- qui si riconosce l'importo, si abbina la carta a uno dei conti (Hype, Revolut…) e si indovina la categoria.

create or replace function public.amount_from_text(t text) returns integer language plpgsql immutable as $$
declare v text; n numeric;
begin
  v := (regexp_match(coalesce(t, ''), '([0-9]+(?:[.,\s][0-9]{3})*(?:[.,][0-9]{1,2})?)'))[1];
  if v is null then return null; end if;
  v := replace(v, ' ', '');
  if v ~ ',' and v ~ '\.' then
    if strpos(reverse(v), ',') < strpos(reverse(v), '.') then v := replace(replace(v, '.', ''), ',', '.'); else v := replace(v, ',', ''); end if;
  elsif v ~ ',' then
    if v ~ ',[0-9]{1,2}$' then v := replace(v, ',', '.'); else v := replace(v, ',', ''); end if;
  elsif v ~ '\.[0-9]{3}$' then v := replace(v, '.', '');
  end if;
  begin n := v::numeric; exception when others then return null; end;
  if n <= 0 or n > 1000000 then return null; end if;
  return round(n * 100);
end $$;

create or replace function public.quick_pay(p_token text, p_raw text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; part text; cents integer; shop text; acc_id text; acc_name text; a jsonb; cat text := 'Altro';
begin
  uid := public.quick_user(p_token);
  if uid is null then return json_build_object('ok', false, 'messaggio', 'Codice non valido: generane uno nuovo in Keepo, Altro → Siri e widget.'); end if;
  foreach part in array regexp_split_to_array(coalesce(p_raw, ''), '\s*[;\n]\s*') loop
    part := trim(part);
    continue when part = '';
    if cents is null and part ~ '[0-9]' and part !~* '[a-z]{4,}' then cents := public.amount_from_text(part); continue; end if;
    if acc_id is null then
      select x->>'id', x->>'name' into acc_id, acc_name
      from public.settings s, jsonb_array_elements(coalesce(s.data->'accounts', '[]'::jsonb)) x
      where s.user_id = uid and (lower(part) like '%' || lower(x->>'name') || '%' or lower(x->>'name') like '%' || lower(part) || '%')
      limit 1;
      continue when acc_id is not null;
    end if;
    if shop is null then shop := left(part, 60); end if;
  end loop;
  if cents is null then return json_build_object('ok', false, 'messaggio', 'Keepo: non trovo l''importo del pagamento.'); end if;
  cat := case
    when shop ~* 'conad|coop|esselunga|lidl|carrefour|eurospin|despar|penny|aldi|famila|sigma|crai|todis|iper|supermerc|market' then 'Spesa'
    when shop ~* 'bar|caff|pizz|ristor|trattor|osteria|sushi|mcdonald|burger|kebab|gelat|pasticc|panific|bistrot|glovo|deliveroo|just ?eat' then 'Ristoranti'
    when shop ~* 'farmac|parafarm' then 'Salute'
    when shop ~* 'eni|q8|tamoil|esso|agip|carburant|parcheggi|autostrad|trenitalia|italo|atm|atac|uber|free ?now|telepass' then 'Trasporti'
    when shop ~* 'zara|h&m|primark|ovs|decathlon|ikea|mediaworld|unieuro|euronics|amazon|zalando|shein|douglas|sephora' then 'Shopping'
    when shop ~* 'cinema|teatro|museo|steam|playstation|netflix|spotify|disney' then 'Svago'
    else 'Altro' end;
  insert into public.transactions (id, user_id, type, amount, cat, note, ts, account)
  values (gen_random_uuid(), uid, 'out', cents, cat, coalesce(shop, 'Apple Pay'), (extract(epoch from now()) * 1000)::bigint, acc_id);
  return json_build_object('ok', true, 'messaggio',
    'Uscita di ' || public.eur_it(cents / 100.0) || coalesce(' da ' || shop, '') || coalesce(' (' || acc_name || ')', '') || '. Saldo: ' || public.eur_it(public.quick_saldo(uid)));
end $$;

revoke all on function public.amount_from_text(text) from public, anon, authenticated;
revoke all on function public.quick_pay(text, text) from public;
grant execute on function public.quick_pay(text, text) to anon, authenticated;
