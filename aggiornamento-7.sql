-- Keepo, aggiornamento 7: pagamenti Apple Pay registrati in automatico.
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
