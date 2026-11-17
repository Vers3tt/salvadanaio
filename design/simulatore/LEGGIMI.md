# Registrare la guida nel simulatore iOS

1. Copia l'app in una cartella di lavoro, aggiungi `autopilot.js` in fondo a `index.html` e metti nel `manifest.webmanifest`
   `"start_url": "./?demo&rec&auto=guida"`.
2. Avvia il server sulla cartella: `python3 -I recsrv.py <cartella-app> <cartella-uscita> 5190 <UDID del simulatore>`.
3. Nel simulatore apri `http://127.0.0.1:5190/?demo` in Safari → Condividi → Aggiungi alla schermata Home.
4. Apri Keepo dalla Home: registra da solo il video (`guida.mov` + `guida.json`), poi la clip `daricevere`,
   poi le foto del passo per passo in `shots/` con `points.json` (dove va il cerchio del tocco).
5. Monta: `CLIP_SRC=<cartella-uscita> python3 design/build_clips.py daricevere guida`.
