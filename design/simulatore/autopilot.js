// Copione per la registrazione nel simulatore: usa l'app vera (modalità demo) con tocchi, digitazione e scorrimenti.
// Solo nella copia di registrazione, mai in app.js. ?auto=guida | daricevere | prova | shots
(() => {
  const P = new URLSearchParams(location.search), MODE = P.get("auto"); if (!MODE) return;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const log = []; let T0 = 0; const now = () => (performance.now() - T0) / 1000;
  const off = () => Math.max(0, screen.height - innerHeight);   // status bar above the web view (style "default")
  const $ = s => document.querySelector(s);
  const api = (p, body) => fetch("/api/" + p, { method: "POST", body: body ? JSON.stringify(body) : undefined }).then(r => r.json()).catch(() => ({}));
  const rect = sel => { const e = $(sel); if (!e) throw new Error("manca " + sel); return e.getBoundingClientRect(); };
  async function show(sel) {
    const r = rect(sel);
    if (r.top < 70 || r.bottom > innerHeight - 90) {
      const box = $(sel).closest(".sheet") || null;
      const dy = r.top + r.height / 2 - innerHeight * .45;
      log.push({ type: "swipe", t: now(), dur: .6 });
      (box || window).scrollBy({ top: dy, behavior: "smooth" }); await wait(700);
    }
  }
  async function tap(sel, pause = 650) {
    await show(sel); const r = rect(sel), x = r.left + r.width / 2, y = r.top + r.height / 2;
    log.push({ type: "tap", t: now() + .3, x, y: y + off() });
    await wait(300);
    const el = $(sel); el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: x, clientY: y }));
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.focus({ preventScroll: true }); else el.click();
    await wait(pause);
  }
  async function type(sel, text) {
    const el = $(sel); el.focus({ preventScroll: true });
    for (const c of text) { el.value += c; el.dispatchEvent(new Event("input", { bubbles: true })); await wait(70 + Math.random() * 80); }
    el.blur(); await wait(350);
  }
  // drop-down filter: tap the pill (the picker opens on a real tap; here we choose the value directly)
  async function pick(key, value, pause) {
    await tap(`.fpill:has([data-mf="${key}"])`, 500);
    const s = $(`[data-mf="${key}"]`); s.value = value; s.dispatchEvent(new Event("change", { bubbles: true })); await wait(pause);
  }
  async function keys(str) { for (const k of str) await tap(`[data-k="${k}"]`, 170); await wait(300); }
  async function scroll(dy, box) { log.push({ type: "swipe", t: now(), dur: Math.abs(dy) / 700 + .3 }); (box ? $(box) : window).scrollBy({ top: dy, behavior: "smooth" }); await wait(Math.abs(dy) / 0.7 + 400); }
  async function drag(sel, from, to, ms = 1600) {
    const r = rect(sel), y = r.top + r.height / 2, xs = k => r.left + r.width * (from + (to - from) * k), el = $(sel);
    log.push({ type: "drag", t: now(), dur: ms / 1000, y: y + off() });
    for (let i = 0; i <= 40; i++) { el.dispatchEvent(new PointerEvent(i ? "pointermove" : "pointerdown", { bubbles: true, clientX: xs(i / 40), clientY: y })); await wait(ms / 40); }
    el.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body })); await wait(500);
  }
  const chap = title => log.push({ type: "chap", t: now(), title });

  const SCRIPTS = {
    async prova() {
      await wait(1500); await tap(".act.out", 900); await keys("4,50"); await tap('[data-cat="Ristoranti"]', 500); await tap(".sheet [data-x]", 900);
    },
    async daricevere() {
      chap("Da ricevere"); await wait(1200);
      await show('[data-w="dues"]'); await wait(900);
      await tap('[data-due-new="in"]', 900);
      await tap("#dAmt", 250); await type("#dAmt", "28");
      await tap('[data-dwho="Vinted"]', 400);
      await type("#dNote", "Felpa grigia");
      await tap('#dAccs [data-dacc="a-rev"]', 500);
      await tap("#dGo", 1800);
      chap("Arrivati");
      await tap('[data-due-done="d-due1"]', 1000);
      await tap("#ddGo", 2200);
      chap("Fine"); await wait(1500);
    },
    async guida() {
      chap("saldo"); await wait(2200);
      await drag("[data-chart=balance]", .15, .98, 1900);
      await tap('[data-range="365"]', 1200); await tap('[data-range="90"]', 900);

      chap("uscita");
      await tap(".act.out", 900); await keys("12,50");
      await tap('[data-cat="Ristoranti"]', 400); await tap('#accs [data-acc="a-hype"]', 400);
      await tap("#txNote", 250); await type("#txNote", "Pizza con amici");
      await tap("#oweOpen", 700); await tap("#oweWho", 250); await type("#oweWho", "Marco");
      await tap("#txSave", 2200);

      chap("entrata");
      await tap(".act.in", 900); await keys("120");
      await tap('[data-cat="Lavoretto"]', 400); await tap('#accs [data-acc="a-rev"]', 400);
      await tap("#txNote", 250); await type("#txNote", "Ripetizioni");
      await tap("#txSave", 2200);

      chap("daricevere");
      await show('[data-w="dues"]'); await wait(1400);
      await tap('[data-due-new="in"]', 900);
      await tap("#dAmt", 250); await type("#dAmt", "28");
      await tap('[data-dwho="Vinted"]', 400); await type("#dNote", "Felpa grigia");
      await tap('#dAccs [data-dacc="a-rev"]', 400); await tap("#dGo", 1700);
      await tap('[data-due-done="d-due1"]', 1000); await tap("#ddGo", 2200);

      chap("conti");
      window.scrollTo({ top: 0, behavior: "smooth" }); await wait(800);
      await tap("[data-acc-toggle]", 1700);
      await tap("[data-transfer]", 900); await tap('#tTo [data-tt="a-hype"]', 400);
      await tap("#tAmt", 250); await type("#tAmt", "50"); await tap("#tGo", 2000);
      await tap("[data-acc-toggle]", 800);

      chap("categorie");
      await show(".donut-card"); await wait(2600);
      await show(".cats-break .crow:nth-child(3)"); await wait(1400);

      chap("movimenti");
      await tap('.tabbar [data-tab="mov"]', 1400);
      await pick("cat", "Spesa", 1300); await pick("note", "conad", 1500);
      await tap("[data-mclear]", 900);
      await tap("#movQ", 250); await type("#movQ", "  CONAD "); await wait(1200);
      const q = $("#movQ"); q.value = ""; q.dispatchEvent(new Event("input", { bubbles: true })); await wait(500);

      chap("obiettivi");
      await tap('.tabbar [data-tab="goals"]', 2000); await tap('[data-goal="d-cuffie"]', 1500);

      chap("prezzo");
      await show("#priceBox"); await wait(800);
      await drag("[data-pchart]", .05, .97, 2200); await wait(1200);
      await tap(".sheet [data-x]", 1000);

      chap("nuovo");
      await tap('.nav [data-goal-new]', 900);
      await tap("#gName", 250); await type("#gName", "Sneakers");
      await tap("#gPrice", 250); await type("#gPrice", "129");
      await tap("#gSave", 2200);

      chap("keepo");
      await tap(".nav [data-mascot]", 3000); await tap(".nav [data-mascot]", 3000);

      chap("siri");
      await tap('.tabbar [data-tab="more"]', 1400);
      await tap('[data-more="siri"]', 1500);
      await scroll(700, ".sheet"); await wait(1500);
      await tap(".sheet [data-x]", 900); await wait(1500);
    }
  };

  // one screenshot per step of the guide player, plus where the tap marker goes (in % of the whole screen)
  const SHOTS = [["home", ".act.out"], ["uscita", '[data-cat="Spesa"]'], ["scontrino", "#txScan"], ["daricevere", "[data-due-done]"],
    ["conti", "[data-acc-toggle]"], ["trasferimento", null], ["filtri", '.fpill:has([data-mf="cat"])'], ["budget", ".donut-card"], ["obiettivi", '[data-goal="d-cuffie"]'],
    ["nuovoobiettivo", "#gUrl"], ["prezzo", "#priceBox"], ["keepo", ".nav [data-mascot]"], ["siri", "#qGen"], ["altro", null]];
  async function shots() {
    const i = +(P.get("i") || 0), [name, sel] = SHOTS[i];
    if (P.get("scene") !== name) { location.replace(`./?demo&scene=${name}&auto=shots&i=${i}`); return; }
    await wait(1800);
    let xy = "";
    try { if (sel) { const r = rect(sel); xy = `&x=${((r.left + r.width / 2) / innerWidth * 100).toFixed(1)}&y=${((r.top + r.height / 2 + off()) / screen.height * 100).toFixed(1)}`; } } catch {}
    await api(`shot?name=${name}${xy}`); await wait(400);
    if (i + 1 < SHOTS.length) location.replace(`./?demo&scene=${SHOTS[i + 1][0]}&auto=shots&i=${i + 1}`);
  }
  async function run() {
    await wait(2500); await document.fonts.ready;
    if (MODE === "shots") return shots();
    // black flash: the frame where it disappears syncs the video with this log
    const cover = document.createElement("div"); cover.style.cssText = "position:fixed;inset:0;background:#000;z-index:99999";
    document.body.appendChild(cover);
    await api("start?name=" + MODE); await wait(1200);
    T0 = performance.now(); cover.remove(); log.push({ type: "start", t: 0 });
    try { await SCRIPTS[MODE](); } catch (e) { log.push({ type: "error", t: now(), msg: String(e.message || e) }); }
    log.push({ type: "end", t: now() });
    await api("log", { log, W: innerWidth, H: innerHeight, screenH: screen.height, off: off(), dpr: devicePixelRatio });
    await wait(300); await api("stop");
    // one launch from the Home Screen records everything: guide video, then the Da ricevere clip, then the photos
    const NEXT = { guida: "./?demo&rec&auto=daricevere", daricevere: "./?demo&scene=home&auto=shots&i=0" };
    if (NEXT[MODE]) { await wait(2500); location.replace(NEXT[MODE]); }
  }
  if (document.readyState === "complete") run(); else addEventListener("load", run);
})();
