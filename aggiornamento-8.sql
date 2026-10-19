-- Keepo · aggiornamento 8: entrate dalle email della banca (comando "Accredito Keepo")
-- Il comando sull'iPhone legge l'email e manda solo la frase con l'importo e il nome della banca:
-- "ricevuto un bonifico di 50,00 €;Hype". Qui si trova l'importo, il conto e si segna l'entrata.

create or replace function public.quick_income(p_token text, p_raw text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; part text; cents integer; acc_id text; acc_name text; raw text := coalesce(p_raw, ''); note text; cat text := 'Altro';
begin
  uid := public.quick_user(p_token);
  if uid is null then return json_build_object('ok', false, 'messaggio', 'Codice non valido: generane uno nuovo in Keepo, Altro → Siri e widget.'); end if;
  foreach part in array regexp_split_to_array(raw, '\s*[;\n]\s*') loop
    part := trim(part);
    continue when part = '';
    if cents is null and part ~ '[0-9]' then cents := public.amount_from_text(part); end if;
    if acc_id is null then
      select x->>'id', x->>'name' into acc_id, acc_name
      from public.settings s, jsonb_array_elements(coalesce(s.data->'accounts', '[]'::jsonb)) x
      where s.user_id = uid and length(x->>'name') >= 3
        and (lower(part) like '%' || lower(x->>'name') || '%' or lower(x->>'name') like '%' || lower(part) || '%')
      limit 1;
    end if;
  end loop;
  if cents is null then return json_build_object('ok', false, 'messaggio', 'Keepo: in questa email non trovo l''importo, segnalo tu con Entrata Keepo.'); end if;
  note := case when raw ~* 'stipend|emolument|busta paga' then 'Stipendio'
               when raw ~* 'rimbors|storn' then 'Rimborso'
               when raw ~* 'ricaric' then 'Ricarica'
               when raw ~* 'bonific' then 'Bonifico ricevuto'
               else 'Accredito' end;
  if note = 'Stipendio' then cat := 'Stipendio'; end if;
  -- la stessa email non va segnata due volte
  if exists (select 1 from public.transactions t where t.user_id = uid and t.type = 'in' and t.amount = cents
             and t.account is not distinct from acc_id and t.ts > (extract(epoch from now()) * 1000)::bigint - 180000) then
    return json_build_object('ok', true, 'messaggio', 'Keepo: questa entrata è già segnata.');
  end if;
  insert into public.transactions (id, user_id, type, amount, cat, note, ts, account)
  values (gen_random_uuid(), uid, 'in', cents, cat, note, (extract(epoch from now()) * 1000)::bigint, acc_id);
  return json_build_object('ok', true, 'messaggio',
    'Entrata di ' || public.eur_it(cents / 100.0) || coalesce(' su ' || acc_name, '') || '. Saldo: ' || public.eur_it(public.quick_saldo(uid)));
end $$;

revoke all on function public.quick_income(text, text) from public;
grant execute on function public.quick_income(text, text) to anon, authenticated;
