-- Keepo, aggiornamento 6: lettura immediata di prezzo, nome e foto quando incolli un link.
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
