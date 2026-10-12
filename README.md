# Keepo

App personale per segnare entrate e uscite e seguire gli obiettivi di risparmio.
Tutto il saldo conta per ogni obiettivo: quando decidi di comprare qualcosa premi **L'ho comprato**, l'app segna l'uscita e gli altri obiettivi si aggiornano.

Funziona come app sul telefono (PWA), anche offline, e sincronizza i dati con Supabase.

## Configurare Supabase (una volta sola)

1. Crea un account su [supabase.com](https://supabase.com) e un nuovo progetto (piano gratuito).
2. **SQL Editor → New query**: incolla il contenuto di `supabase.sql` e premi **Run**.
3. **Authentication → Sign In / Providers → Email**: disattiva **Confirm email** (così accedi subito senza link di conferma).
4. **Project Settings → API**: copia **Project URL** e **anon public key** dentro `config.js`
   (oppure inseriscili nella schermata iniziale dell'app).
5. Apri l'app, tocca **Crea account** e scegli email e password.
6. Consigliato: dopo aver creato il tuo account, in **Authentication → Sign In / Providers** disattiva
   **Allow new users to sign up**, così nessun altro può registrarsi.

La anon key è fatta per stare nel browser: i dati sono protetti dalle regole RLS, ogni utente vede solo i propri.

## Installare sul telefono

- **iPhone (Safari)**: apri il link, tocca Condividi → **Aggiungi alla schermata Home**.
- **Android (Chrome)**: menu ⋮ → **Installa app**.

## Sviluppo in locale

```bash
python3 -m http.server 5178
```

Poi apri http://localhost:5178.
