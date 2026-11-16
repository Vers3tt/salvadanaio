-- Keepo · aggiornamento 9: "Saldo Keepo" dice anche quanto è in arrivo (lista Da ricevere)
-- e i messaggi dei comandi spiegano che con un codice nuovo vanno reinstallati.
-- I soldi da ricevere stanno in settings.data->'dues' e non entrano nel saldo finché non tocchi Arrivati.

create or replace function public.quick_dues(uid uuid, p_dir text) returns numeric language sql stable as $$
  select coalesce(sum((x->>'amount')::numeric), 0) / 100.0
  from public.settings s, jsonb_array_elements(case when jsonb_typeof(s.data->'dues') = 'array' then s.data->'dues' else '[]'::jsonb end) x
  where s.user_id = uid and coalesce(x->>'amount', '') ~ '^[0-9]+$'
    and (case when p_dir = 'out' then x->>'dir' = 'out' else coalesce(x->>'dir', 'in') <> 'out' end)
$$;
revoke all on function public.quick_dues(uuid, text) from public, anon, authenticated;

create or replace function public.quick_add(p_token text, p_type text, p_amount text, p_cat text default '', p_note text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; cents integer;
begin
  uid := public.quick_user(p_token);
  if uid is null then return json_build_object('ok', false, 'messaggio', 'Codice non valido. In Keepo apri Altro, Siri e widget: copia il codice e reinstalla il comando.'); end if;
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
declare uid uuid; m0 bigint; inn numeric; outt numeric; arriving numeric; owed numeric;
begin
  uid := public.quick_user(p_token);
  if uid is null then return json_build_object('ok', false, 'messaggio', 'Codice non valido. In Keepo apri Altro, Siri e widget: copia il codice e reinstalla il comando.'); end if;
  m0 := (extract(epoch from date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') * 1000)::bigint;
  select coalesce(sum(amount) filter (where type = 'in'), 0) / 100.0, coalesce(sum(amount) filter (where type = 'out'), 0) / 100.0
    into inn, outt from public.transactions where user_id = uid and ts >= m0;
  arriving := public.quick_dues(uid, 'in'); owed := public.quick_dues(uid, 'out');
  return json_build_object('ok', true, 'saldo', public.quick_saldo(uid), 'in_arrivo', arriving, 'messaggio',
    'Saldo: ' || public.eur_it(public.quick_saldo(uid)) || '. Questo mese: entrate ' || public.eur_it(inn) || ', uscite ' || public.eur_it(outt) || '.'
    || case when arriving > 0 then ' In arrivo: ' || public.eur_it(arriving) || '.' else '' end
    || case when owed > 0 then ' Da dare: ' || public.eur_it(owed) || '.' else '' end);
end $$;

grant execute on function public.quick_add(text, text, text, text, text) to anon, authenticated;
grant execute on function public.quick_balance(text) to anon, authenticated;
