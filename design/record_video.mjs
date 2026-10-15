// Registra l'app vera (modalità dimostrazione) mentre viene usata: tocchi, digitazione, scorrimenti.
// Salva i fotogrammi e la cronologia in design/rec/, poi design/build_video.py monta il video.
// Uso: node design/record_video.mjs   (serve Google Chrome)
import { spawn } from "node:child_process";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "design", "rec");
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, "f"), { recursive: true });
const PORT = 5181, DBG = 9333, W = 390, H = 828;   // 828: entra tutto sotto la barra di stato del telefono nel video
const wait = ms => new Promise(r => setTimeout(r, ms));
const now = () => Date.now() / 1000;

const srv = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "keepo-rec-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`,
  "--no-first-run", "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
const quit = () => { try { chrome.kill(); srv.kill(); } catch {} };
process.on("exit", quit);

let target;
for (let i = 0; i < 50 && !target; i++) { await wait(200); try { target = (await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json()).find(t => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(), frames = [], log = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  else if (m.method === "Page.screencastFrame") {
    const { data, metadata, sessionId } = m.params, n = frames.length;
    fs.writeFileSync(path.join(OUT, "f", n + ".jpg"), Buffer.from(data, "base64"));
    frames.push({ n, t: metadata.timestamp });
    send("Page.screencastFrameAck", { sessionId });
  }
  else if (m.method === "Page.fileChooserOpened")   // "Scegli dalla galleria": la foto del prodotto
    send("DOM.setFileInputFiles", { backendNodeId: m.params.backendNodeId, files: [path.join(ROOT, "guida", "img", "prodotto-sneakers.png")] });
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const pos = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,h:r.height};})()`);

// ---- gesti ----
async function tap(sel, pause = 650) {
  let p = await pos(sel); if (!p) throw new Error("manca " + sel);
  if (p.x < 8 || p.x > W - 8 || p.y > H - 30) {   // fuori dallo schermo: scorre fin lì come farebbe il dito
    await ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"})`);
    await wait(700); p = await pos(sel);
  }
  log.push({ type: "tap", t: now() + .35, x: p.x / W, y: p.y / H });
  await wait(350);
  await send("Input.synthesizeTapGesture", { x: p.x, y: p.y, duration: 90, gestureSourceType: "touch" });
  await wait(pause);
}
async function swipe(dy, { x = W / 2, y = H * .62, speed = 700 } = {}) {   // dy>0 = scorri in giù
  const y1 = Math.max(80, Math.min(H - 60, y - dy));
  log.push({ type: "swipe", t: now(), x: x / W, y0: y / H, y1: y1 / H, dur: Math.abs(dy) / speed + .25 });
  await send("Input.synthesizeScrollGesture", { x, y, yDistance: -dy, speed, gestureSourceType: "touch", preventFling: false });
  await wait(450);
}
async function reveal(sel, at = .42) {
  const p = await pos(sel); if (!p) throw new Error("manca " + sel);
  const dy = p.y - H * at; if (Math.abs(dy) > 40) await swipe(dy, { speed: 900 });
}
async function type(text) {
  for (const c of text) { await send("Input.insertText", { text: c }); await wait(70 + Math.random() * 90); }
  await wait(350);
}
async function keys(str) { for (const k of str) await tap(`[data-k="${k}"]`, 160); await wait(300); }
async function drag(sel, from, to, ms = 1400) {   // dito che scorre sopra un grafico
  const p = await pos(sel), r = await ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return {x:r.x,w:r.width};})()`);
  const xs = k => r.x + r.w * (from + (to - from) * k), steps = 40;
  log.push({ type: "drag", t: now(), x0: xs(0) / W, x1: xs(1) / W, y: p.y / H, dur: ms / 1000 });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: xs(0), y: p.y }] });
  for (let i = 1; i <= steps; i++) { await wait(ms / steps); await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: xs(i / steps), y: p.y }] }); }
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await wait(500);
}
const chap = (title, text) => log.push({ type: "chap", t: now(), title, text });

// ---- avvio ----
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/?demo&rec` });
await wait(3000);
await ev(`document.fonts.ready.then(()=>1)`);
await send("Page.setInterceptFileChooserDialog", { enabled: true });
await send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
await wait(400);
log.push({ type: "start", t: now() });

try {
  chap("Il tuo saldo, sempre davanti", "Quanto hai, come è cambiato negli ultimi mesi e quanto manca al prossimo acquisto.");
  await wait(2200);
  await drag("[data-chart=balance]", .15, .95, 1800);
  await tap('[data-range="365"]', 1300);
  await tap('[data-range="90"]', 900);

  chap("Una spesa in pochi secondi", "Tocca Uscita, scrivi l'importo, scegli categoria e conto. Fatto.");
  await tap(".act.out", 900);
  await keys("12,50");
  await tap('[data-cat="Ristoranti"]', 400);
  await tap('[data-acc="a-hype"]', 400);
  await tap("#txNote", 300); await type("Pizza con amici");
  await ev("document.activeElement.blur()");
  await tap("#txSave", 2200);

  chap("Anche le entrate", "Stipendio, regali, lavoretti: il saldo si aggiorna subito.");
  await tap(".act.in", 900);
  await keys("120");
  await tap('[data-cat="Lavoretto"]', 400);
  await tap('[data-acc="a-rev"]', 400);
  await tap("#txNote", 300); await type("Ripetizioni");
  await ev("document.activeElement.blur()");
  await tap("#txSave", 2200);

  chap("Ogni conto, il suo totale", "Conto corrente, Hype, Revolut: vedi quanto c'è su ognuno e sposta i soldi da uno all'altro.");
  await tap("[data-acc-toggle]", 1800);
  await tap("[data-transfer]", 900);
  await tap('#tTo [data-tt="a-hype"]', 400);
  await tap("#tAmt", 300); await type("50");
  await ev("document.activeElement.blur()");
  await tap("#tGo", 2200);
  await tap("[data-acc-toggle]", 900);

  chap("Dove vanno i tuoi soldi", "Le spese del mese per categoria, con il limite che ti sei dato e l'avviso quando ti avvicini.");
  await reveal(".cats-break", .5);
  await wait(2600);
  await reveal(".goal-strip", .5);
  await wait(1600);

  chap("Tutti i movimenti", "Ogni entrata e uscita, raggruppata per giorno, con i filtri per conto e categoria.");
  await tap('.tabbar [data-tab="mov"]', 1500);
  await swipe(700, { speed: 600 }); await wait(700);
  await swipe(-700, { speed: 900 }); await wait(500);

  chap("Obiettivi: cosa vuoi comprarti", "Tutto il saldo fa avanzare ogni obiettivo. Quando sei pronto premi L'ho comprato.");
  await tap('.tabbar [data-tab="goals"]', 2200);
  await tap('[data-goal="d-cuffie"]', 1600);

  chap("Il prezzo, giorno per giorno", "Con il link del prodotto Keepo legge il prezzo e ti dice quando conviene comprare.");
  await reveal("#priceBox", .45);
  await wait(800);
  await drag("[data-pchart]", .05, .97, 2200);
  await wait(1500);
  await swipe(-1500, { y: H * .4, speed: 2000 }); await tap(".sheet [data-x]", 1100);

  chap("Aggiungi un obiettivo", "Nome, prezzo e la foto del prodotto. Se vuoi anche il link e una data.");
  await tap('.nav [data-goal-new]', 900);
  await tap("#gName", 300); await type("Sneakers");
  await tap("#gPrice", 300); await type("129");
  await ev("document.activeElement.blur()");
  await tap("#gFile", 1800);
  await tap("#gSave", 2400);

  chap("Keepo ti parla", "La monetina legge i tuoi numeri: tocca per un consiglio sul mese e sugli obiettivi.");
  await tap('.nav [data-mascot]', 3200);
  await tap('.nav [data-mascot]', 3200);
  await tap('.nav [data-mascot]', 3000);

  chap("Siri, widget e Apple Pay", "Segna una spesa con la voce, da un widget o in automatico quando paghi con Apple Pay.");
  await tap('.tabbar [data-tab="more"]', 1500);
  await reveal('[data-more="siri"]', .45);
  await tap('[data-more="siri"]', 1500);
  await swipe(600, { y: H * .7, speed: 500 }); await wait(1500);
  await swipe(-1500, { y: H * .4, speed: 2000 }); await tap(".sheet [data-x]", 900);
  await swipe(900, { speed: 700 }); await wait(1800);
} catch (e) { console.error("ERRORE", e.message); }

log.push({ type: "end", t: now() });
await send("Page.stopScreencast");
await wait(300);
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ W, H, frames, log }, null, 1));
console.log(frames.length, "fotogrammi,", (log.at(-1).t - log[0].t).toFixed(1), "s");
quit(); process.exit(0);
