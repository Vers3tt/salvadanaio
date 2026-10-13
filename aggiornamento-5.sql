-- Keepo, aggiornamento 5: monitoraggio del prezzo dai link degli obiettivi.
-- Una volta al giorno il database apre la pagina del prodotto, legge il prezzo e ne salva lo storico.
-- Funziona con i siti che pubblicano il prezzo nella pagina (Amazon, IKEA e molti e-commerce);
-- alcuni siti bloccano la lettura automatica e in quel caso l'app lo dice.

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
