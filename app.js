(() => {
"use strict";

/* ============ helpers ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uuid = () => crypto.randomUUID ? crypto.randomUUID()
  : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
// Italian format with grouping also for 4 digits (1.034,00 €), which Intl it-IT omits
function fmt(c) {
  const n = Math.abs(Math.round(c || 0)), int = Math.floor(n / 100), dec = String(n % 100).padStart(2, "0");
  return { sign: c < 0 ? "−" : "", int: String(int).replace(/\B(?=(\d{3})+(?!\d))/g, "."), dec };
}
const money = c => { const f = fmt(c); return `${f.sign}${f.int},${f.dec}\u00a0€`; };
// price-tag style: cents smaller and raised, like a shelf label
const tag = c => { const f = fmt(c); return `${f.sign}${f.int}<span class="cents">,${f.dec}</span><span class="cur">€</span>`; };
const parseAmt = s => {
  s = String(s || "").trim().replace(/\s|€/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const centsToInput = c => (c / 100).toFixed(2).replace(".", ",");
const DAY = 864e5;

const P = {
  cart: '<circle cx="8" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/><path d="M2.5 3h2.2l2.4 11.6a1.6 1.6 0 0 0 1.6 1.3h9.1a1.6 1.6 0 0 0 1.6-1.2L21 7H5.6"/>',
  home: '<path d="M3.5 10.2 12 3.5l8.5 6.7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  car: '<path d="M4 16.5V12l2-5.2A1.5 1.5 0 0 1 7.4 6h9.2a1.5 1.5 0 0 1 1.4.8L20 12v4.5"/><path d="M3.5 12h17v4.5h-17z"/><path d="M6.5 16.5V19M17.5 16.5V19"/><circle cx="7.5" cy="14.2" r=".6"/><circle cx="16.5" cy="14.2" r=".6"/>',
  ticket: '<path d="M3 8.5a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v1.5a2 2 0 0 0 0 4v1.5a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2V14a2 2 0 0 0 0-4z"/><path d="M14 7v1.5M14 11.25v1.5M14 15.5V17"/>',
  fork: '<path d="M6 2.5v6.5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2.5M8 11v10.5"/><path d="M18 21.5V2.5c-2.2 0-4 2.5-4 6v5h4"/>',
  bag: '<path d="M5 7.5h14l-1 12.5a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 6 20z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  heart: '<path d="M12 20.5s-8-4.6-8-10.4A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4z"/>',
  dots: '<circle cx="5.5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="18.5" cy="12" r="1.1"/>',
  case: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
  coins: '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M9.5 16.4c.9.4 2 .6 3.3.6 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.8-2.2-4.3-2.4"/><path d="M8.5 13.4v1.1c0 1.4 2.5 2.5 5.5 2.5"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12M12 8v12.5"/><path d="M12 8S10.5 3.5 8 3.5a2.2 2.2 0 0 0 0 4.5M12 8s1.5-4.5 4-4.5a2.2 2.2 0 0 1 0 4.5"/>',
  label: '<path d="M3 4.5v6.3a1.5 1.5 0 0 0 .44 1.06l8.2 8.2a1.5 1.5 0 0 0 2.12 0l6.3-6.3a1.5 1.5 0 0 0 0-2.12l-8.2-8.2A1.5 1.5 0 0 0 10.8 3H4.5A1.5 1.5 0 0 0 3 4.5z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 1 5.3-3.8l-2.6 2.6.4 2.3 2.3.4 2.6-2.6a4 4 0 0 1-5.3 5.2L8.5 19a2.1 2.1 0 0 1-3-3l8.3-8.7"/>',
  flag: '<path d="M5 21V3.5"/><path d="M5 4h12.5l-2.5 4.25L17.5 12.5H5"/>',
  arrowIn: '<path d="M17 7 7 17M7 8.5V17h8.5"/>',
  arrowOut: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  receipt: '<path d="M5.5 2.5v19l2.2-1.4 2.1 1.4 2.2-1.4 2.2 1.4 2.1-1.4 2.2 1.4v-19l-2.2 1.4-2.1-1.4-2.2 1.4-2.2-1.4-2.1 1.4z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
  sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  paste: '<rect x="5.5" y="4" width="13" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h4"/>',
  photo: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 15.5-4.5-4.5L7 20"/>',
  cloudOff: '<path d="m3 3 18 18"/><path d="M8.2 6.2A6 6 0 0 1 16.4 10h.6a4 4 0 0 1 3.2 6.4M17 18H7a4.5 4.5 0 0 1-1.6-8.7"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 13a8 8 0 0 0 14.3 4.3L20 15.5"/><path d="M4 3.5v5h5M20 20.5v-5h-5"/>'
};
const ic = (name, size = 22) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;

const CATS = {
  out: [["Spesa","cart"],["Casa","home"],["Bollette","bolt"],["Trasporti","car"],["Svago","ticket"],["Ristoranti","fork"],["Shopping","bag"],["Salute","heart"],["Altro","dots"]],
  in:  [["Stipendio","case"],["Paghetta","coins"],["Regalo","gift"],["Vendita","label"],["Lavoretto","wrench"],["Altro","dots"]]
};
function catInfo(type, name) {
  if (name === "Obiettivo") return ["Obiettivo", "flag"];
  return CATS[type].find(c => c[0] === name) || [type === "in" ? "Entrata" : "Uscita", type === "in" ? "arrowIn" : "arrowOut"];
}

/* ============ state & persistence ============ */
const LS = "salvadanaio.v2";
const CFG_LS = "salvadanaio.cfg";
let S = { tx: {}, goals: {}, pending: [], mode: null, lastSync: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || "{}")); } catch {}
function save() {
  try { localStorage.setItem(LS, JSON.stringify(S)); }
  catch { toast("Memoria del telefono piena: elimina qualche immagine"); }
}

const fileCfg = window.SALVADANAIO_CONFIG || {};
let cfg = { supabaseUrl: fileCfg.supabaseUrl, supabaseAnonKey: fileCfg.supabaseAnonKey };
try { if (!cfg.supabaseUrl) Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_LS) || "{}")); } catch {}

let sb = null, session = null, authReady = false, syncing = false, flushing = false;

/* ============ cloud sync (Supabase) ============ */
const COLS = {
  transactions: ["id","type","amount","cat","note","ts"],
  goals: ["id","name","price","img","done","done_at","created_at"]
};
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] ?? null]));
const isNetErr = e => !navigator.onLine || /fetch|network|load failed|timeout/i.test(String(e?.message || e));

function enqueue(op) {
  if (S.mode !== "cloud") return;
  const key = op.t + ":" + (op.id || op.row.id);
  S.pending = S.pending.filter(p => p.t + ":" + (p.id || p.row.id) !== key);
  S.pending.push(op);
}
async function flush() {
  if (flushing || S.mode !== "cloud" || !session) return;
  flushing = true; syncBadge();
  try {
    while (S.pending.length) {
      const op = S.pending[0];
      const res = op.op === "up"
        ? await sb.from(op.t).upsert(op.row)
        : await sb.from(op.t).delete().eq("id", op.id);
      if (res.error) {
        if (isNetErr(res.error)) break;
        console.error(res.error);
        toast("Non salvato sul cloud: " + res.error.message);
      }
      S.pending.shift(); save();
    }
  } catch (e) { console.warn("flush interrotto", e); }
  flushing = false; syncBadge();
}
async function fetchAll(table) {
  const out = [], step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await sb.from(table).select(COLS[table].join(",")).range(from, from + step - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < step) return out;
  }
}
async function sync() {
  if (syncing || S.mode !== "cloud" || !session) return;
  syncing = true; syncBadge();
  try {
    await flush();
    if (S.pending.length) return;
    const [tx, goals] = await Promise.all([fetchAll("transactions"), fetchAll("goals")]);
    if (S.pending.length) return; // a change happened while downloading: next sync will catch up
    S.tx = Object.fromEntries(tx.map(r => [r.id, { ...r, amount: +r.amount, ts: +r.ts }]));
    S.goals = Object.fromEntries(goals.map(r => [r.id, { ...r, price: +r.price, created_at: +r.created_at, done_at: r.done_at && +r.done_at }]));
    S.lastSync = Date.now(); save(); render();
  } catch (e) {
    console.warn("sync", e);
  } finally { syncing = false; syncBadge(); }
}

/* ============ mutations ============ */
function putTx(t) { S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); commit(); }
function delTx(id) { delete S.tx[id]; enqueue({ op: "del", t: "transactions", id }); commit(); }
function putGoal(g) { S.goals[g.id] = g; enqueue({ op: "up", t: "goals", row: pick(g, COLS.goals) }); commit(); }
function delGoal(id) { delete S.goals[id]; enqueue({ op: "del", t: "goals", id }); commit(); }
function commit() { save(); render(); flush(); }

/* ============ derived ============ */
function derive() {
  const txs = Object.values(S.tx).sort((a, b) => b.ts - a.ts);
  const total = txs.reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  const goals = Object.values(S.goals);
  const active = goals.filter(g => !g.done).sort((a, b) => a.price - b.price || a.created_at - b.created_at);
  const done = goals.filter(g => g.done).sort((a, b) => (b.done_at || 0) - (a.done_at || 0));
  const now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let mIn = 0, mOut = 0;
  for (const t of txs) { if (t.ts < m0) break; t.type === "in" ? mIn += t.amount : mOut += t.amount; }
  const since = Date.now() - 90 * DAY;
  const first = txs.length ? txs[txs.length - 1].ts : Date.now();
  const span = Math.max(30, Math.min(90, (Date.now() - first) / DAY));
  const net = txs.filter(t => t.ts >= since).reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  const perMonth = txs.length >= 3 ? net / span * 30 : 0;
  return { txs, total, active, done, mIn, mOut, perMonth };
}
let D = derive();
const goalPct = g => Math.max(0, Math.min(100, D.total / g.price * 100));
function eta(g) {
  const left = g.price - D.total;
  if (left <= 0) return "Hai abbastanza soldi: puoi comprarlo quando vuoi";
  if (D.perMonth <= 0) return "Mancano " + money(left);
  const m = Math.ceil(left / D.perMonth);
  return m <= 1 ? "Al tuo ritmo ci arrivi entro un mese" : m > 36 ? "Al tuo ritmo servono più di 3 anni" : `Al tuo ritmo ci arrivi in circa ${m} mesi`;
}

/* ============ rendering ============ */
let tab = "home", movFilter = "all";
try { tab = sessionStorage.getItem(LS + ".tab") || "home"; } catch {}

function render() {
  if (!S.mode) return renderSetup();
  if (S.mode === "cloud" && !authReady) { $("#app").innerHTML = ""; return; }
  if (S.mode === "cloud" && !session) return renderLogin();
  D = derive();
  const screens = { home: homeScreen, mov: movScreen, goals: goalsScreen, more: moreScreen };
  $("#app").innerHTML = `<main class="screen">${screens[tab]()}</main>
  <div class="tabbar"><nav>
    ${[["home","Home","home"],["mov","Movimenti","receipt"],["goals","Obiettivi","flag"],["more","Altro","sliders"]]
      .map(([k, l, i]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ""}>${ic(i, 24)}<span>${l}</span></button>`).join("")}
  </nav></div>`;
  syncBadge();
}
function setTab(t) { tab = t; try { sessionStorage.setItem(LS + ".tab", t); } catch {} render(); window.scrollTo(0, 0); }

function dateTitle() {
  const s = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const monthName = () => new Date().toLocaleDateString("it-IT", { month: "long" }).replace(/^./, c => c.toUpperCase());

function homeScreen() {
  const next = D.active.find(g => g.price > D.total);
  const ready = D.active.filter(g => g.price <= D.total).length;
  return `
  <header class="nav"><div><small>${esc(dateTitle())}</small><h1>Salvadanaio</h1></div></header>
  <div id="syncBadge"></div>
  <section class="card balance">
    <span class="lbl">Saldo</span>
    <span class="big num${D.total < 0 ? " neg" : ""}">${tag(D.total)}</span>
    <p class="next">${next ? `Mancano <b class="num">${money(next.price - D.total)}</b> per ${esc(next.name)}`
      : ready ? `${ready === 1 ? "Hai abbastanza per un obiettivo" : `Hai abbastanza per ${ready} obiettivi`}` : `Aggiungi un obiettivo per vedere quanto ti manca`}</p>
    ${spark()}
  </section>
  <div class="actions">
    <button class="act out" data-new="out">${ic("minus", 20)}Uscita</button>
    <button class="act in" data-new="in">${ic("plus", 20)}Entrata</button>
  </div>
  <section class="section">
    <div class="sec-h"><h2>${esc(monthName())}</h2></div>
    <div class="card month">
      <div><span>Entrate</span><b class="num">${money(D.mIn)}</b></div>
      <div><span>Uscite</span><b class="num">${money(D.mOut)}</b></div>
      <div><span>Risparmio</span><b class="num${D.mIn - D.mOut < 0 ? " neg" : " pos"}">${money(D.mIn - D.mOut)}</b></div>
    </div>
  </section>
  <section class="section">
    <div class="sec-h"><h2>Obiettivi</h2>${D.active.length ? `<button class="link" data-tab="goals">Tutti</button>` : ""}</div>
    ${D.active.length ? `<div class="goal-strip">${D.active.map(goalCard).join("")}<button class="gcard gadd" data-goal-new>${ic("plus", 24)}<span>Nuovo</span></button></div>`
      : emptyCard("flag", "Cosa vuoi comprarti?", "Aggiungi un obiettivo con nome e prezzo. Tutto il saldo lo fa avanzare.", `<button class="save small" data-goal-new>Nuovo obiettivo</button>`)}
  </section>
  <section class="section">
    <div class="sec-h"><h2>Ultimi movimenti</h2>${D.txs.length > 5 ? `<button class="link" data-tab="mov">Tutti</button>` : ""}</div>
    ${D.txs.length ? `<div class="list">${D.txs.slice(0, 5).map(txRow).join("")}</div>`
      : emptyCard("receipt", "Nessun movimento", "Tocca Entrata e segna i soldi che hai adesso: diventa il tuo saldo di partenza.")}
  </section>`;
}
function emptyCard(icon, title, text, action = "") {
  return `<div class="card empty"><span class="empty-ico">${ic(icon, 26)}</span><b>${esc(title)}</b><span>${esc(text)}</span>${action}</div>`;
}

function spark() {
  if (D.txs.length < 2) return "";
  const days = 60, end = new Date(); end.setHours(23, 59, 59, 999);
  const start = end.getTime() - (days - 1) * DAY;
  const asc = [...D.txs].reverse();
  let bal = 0, i = 0; const pts = [];
  while (i < asc.length && asc[i].ts <= start - DAY) { bal += asc[i].type === "in" ? asc[i].amount : -asc[i].amount; i++; }
  for (let d = 0; d < days; d++) {
    const dEnd = start + d * DAY;
    while (i < asc.length && asc[i].ts <= dEnd) { bal += asc[i].type === "in" ? asc[i].amount : -asc[i].amount; i++; }
    pts.push(bal);
  }
  const W = 400, H = 48, min = Math.min(...pts), max = Math.max(...pts);
  const x = k => k / (days - 1) * W, y = v => H - 4 - (v - min) / (max - min || 1) * (H - 10);
  const line = pts.map((v, k) => (k ? "L" : "M") + x(k).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const from = new Date(start).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `<div class="spark"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${line}" fill="none" stroke="var(--ink)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
    <div class="spark-x"><span>${esc(from)}</span><span>oggi</span></div></div>`;
}

function txRow(t) {
  const [name, icon] = catInfo(t.type, t.cat);
  const d = new Date(t.ts);
  const when = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `<button class="row" data-tx="${esc(t.id)}">
    <span class="ico">${ic(icon, 20)}</span>
    <span class="t"><b>${esc(t.note || name)}</b><small>${esc(t.note ? name + " · " + when : when)}</small></span>
    <span class="a num ${t.type}">${t.type === "in" ? "+" : "−"}${money(t.amount)}</span>
  </button>`;
}

function movScreen() {
  const list = D.txs.filter(t => movFilter === "all" || t.type === movFilter);
  const groups = [];
  for (const t of list) {
    const d = new Date(t.ts), k = d.getFullYear() + "-" + d.getMonth();
    if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, d, items: [], net: 0 });
    const g = groups[groups.length - 1]; g.items.push(t); g.net += t.type === "in" ? t.amount : -t.amount;
  }
  return `
  <header class="nav"><div><h1>Movimenti</h1></div><button class="nav-btn" data-new="out" aria-label="Nuovo movimento">${ic("plus", 20)}</button></header>
  <div class="seg" role="group">
    ${[["all","Tutti"],["in","Entrate"],["out","Uscite"]].map(([k, l]) => `<button data-filter="${k}" aria-pressed="${movFilter === k}">${l}</button>`).join("")}
  </div>
  ${groups.length ? groups.map(g => `
    <div class="group-h"><span>${esc(g.d.toLocaleDateString("it-IT", { month: "long", year: "numeric" }))}</span><span class="num">${g.net >= 0 ? "+" : "−"}${money(Math.abs(g.net))}</span></div>
    <div class="list">${g.items.map(txRow).join("")}</div>`).join("")
    : emptyCard("receipt", "Niente da mostrare", "I movimenti che segni compaiono qui, divisi per mese.")}`;
}

function goalThumb(g) {
  return g.img ? `<img src="${esc(g.img)}" alt="" loading="lazy">` : `<span class="ph">${ic("flag", 30)}</span>`;
}
function goalCard(g) {
  const pct = goalPct(g), ok = pct >= 100;
  return `<button class="gcard${ok ? " ok" : ""}" data-goal="${esc(g.id)}">
    <div class="gimg">${goalThumb(g)}</div>
    <b>${esc(g.name)}</b>
    <div class="prog"><i style="width:${pct}%"></i></div>
    <div class="gmeta"><span class="num">${ok ? "Raggiunto" : Math.floor(pct) + "%"}</span><span class="num">${money(g.price)}</span></div>
  </button>`;
}
function goalsScreen() {
  return `
  <header class="nav"><div><h1>Obiettivi</h1></div><button class="nav-btn" data-goal-new aria-label="Nuovo obiettivo">${ic("plus", 20)}</button></header>
  ${D.active.length ? `<div class="goal-grid">${D.active.map(goalCard).join("")}<button class="gcard gadd" data-goal-new>${ic("plus", 24)}<span>Nuovo obiettivo</span></button></div>
    <p class="hint">Ogni obiettivo si confronta con tutto il saldo (${money(D.total)}). Quando ne compri uno il saldo scende e gli altri si aggiornano.</p>`
  : emptyCard("flag", "Nessun obiettivo", "Scrivi cosa vuoi comprare e quanto costa. Tutto il saldo lo fa avanzare.", `<button class="save small" data-goal-new>Nuovo obiettivo</button>`)}
  ${D.done.length ? `<div class="group-h" style="margin-top:28px"><span>Già comprati</span><span>${D.done.length}</span></div>
    <div class="list">${D.done.map(g => `<button class="row" data-goal="${esc(g.id)}">
      <span class="ico thumb">${g.img ? `<img src="${esc(g.img)}" alt="">` : ic("flag", 20)}</span>
      <span class="t"><b>${esc(g.name)}</b><small>${g.done_at ? esc(new Date(g.done_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })) : ""}</small></span>
      <span class="a num">${money(g.price)}</span></button>`).join("")}</div>` : ""}`;
}

function moreScreen() {
  const cloud = S.mode === "cloud";
  const last = S.lastSync ? new Date(S.lastSync).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "mai";
  return `
  <header class="nav"><div><h1>Altro</h1></div></header>
  <div class="group-h"><span>Account</span></div>
  <div class="list">
    ${cloud ? `<div class="cell"><span>Email</span><span>${esc(session?.user?.email || "")}</span></div>
      <div class="cell"><span>Ultimo aggiornamento</span><span id="syncText">${esc(last)}</span></div>
      <button class="cell btn" data-more="sync"><span>Aggiorna adesso</span></button>
      <button class="cell danger" data-more="logout"><span>Esci</span></button>`
    : `<div class="cell"><span>Dati salvati</span><span>Solo su questo dispositivo</span></div>
      <button class="cell btn" data-more="setup"><span>Collega Supabase</span></button>`}
  </div>
  <div class="group-h"><span>Backup</span></div>
  <div class="list">
    <button class="cell btn" data-more="export"><span>Esporta backup</span></button>
    <button class="cell btn" data-more="import"><span>Importa backup</span></button>
  </div>
  <p class="foot">Il backup è un file .json con tutti i movimenti e gli obiettivi, foto comprese.</p>
  <div class="group-h"><span>Riepilogo</span></div>
  <div class="list">
    <div class="cell"><span>Movimenti</span><span class="num">${D.txs.length}</span></div>
    <div class="cell"><span>Obiettivi attivi</span><span class="num">${D.active.length}</span></div>
    <div class="cell"><span>Obiettivi comprati</span><span class="num">${D.done.length}</span></div>
  </div>
  <input type="file" id="importIn" accept="application/json,.json" hidden>`;
}

// Sync state is shown only when something needs attention: offline or changes still waiting.
function syncBadge() {
  const b = $("#syncBadge");
  if (!b || S.mode !== "cloud") { if (b) b.innerHTML = ""; return; }
  const n = S.pending.length;
  let html = "";
  if (!navigator.onLine) html = `${ic("cloudOff", 16)}<span>Offline${n ? ` · ${n === 1 ? "1 modifica" : n + " modifiche"} da inviare` : ""}</span>`;
  else if (n && !flushing) html = `${ic("sync", 16)}<span>${n === 1 ? "1 modifica" : n + " modifiche"} da inviare</span>`;
  b.className = html ? "status" : "";
  b.innerHTML = html;
}

/* ============ setup / login ============ */
function renderSetup() {
  $("#app").innerHTML = `<div class="auth"><form class="box" id="setupForm" autocomplete="off">
    <img class="logo" src="icons/icon-192.png" alt="">
    <h1>Salvadanaio</h1>
    <p>Collega il tuo progetto Supabase per avere gli stessi dati su telefono e computer.</p>
    <div class="list steps">
      <div class="cell"><span><b>1.</b> Crea un progetto gratuito su <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">supabase.com</a></span></div>
      <div class="cell"><span><b>2.</b> In <b>SQL Editor</b> incolla il codice e premi Run</span><button type="button" class="link" id="copySql">Copia SQL</button></div>
      <div class="cell"><span><b>3.</b> In <b>Authentication → Sign In / Providers → Email</b> disattiva <b>Confirm email</b></span></div>
      <div class="cell"><span><b>4.</b> In <b>Project Settings → API</b> copia URL e anon key qui sotto</span></div>
    </div>
    <div class="fields">
      <div class="field"><input id="sUrl" placeholder="Project URL (https://…supabase.co)" inputmode="url" autocapitalize="off" spellcheck="false" value="${esc(cfg.supabaseUrl || "")}"></div>
      <div class="field"><input id="sKey" placeholder="anon public key" autocapitalize="off" spellcheck="false" value="${esc(cfg.supabaseAnonKey || "")}"></div>
    </div>
    <div class="err" id="sErr"></div>
    <button class="save" type="submit">Collega</button>
    <button class="alt" type="button" id="localOnly">Per ora usa solo su questo dispositivo</button>
    <p class="hint" style="text-align:center">Quello che segni adesso verrà caricato su Supabase quando lo colleghi da Altro.</p>
  </form></div>`;
  $("#localOnly").onclick = () => { S.mode = "local"; save(); render(); };
  $("#copySql").onclick = async () => {
    try {
      const sql = await (await fetch("supabase.sql", { cache: "no-store" })).text();
      await navigator.clipboard.writeText(sql);
      toast("Codice SQL copiato: incollalo in SQL Editor");
    } catch { window.open("supabase.sql", "_blank"); }
  };
  $("#setupForm").onsubmit = e => {
    e.preventDefault();
    const url = $("#sUrl").value.trim().replace(/\/+$/, ""), key = $("#sKey").value.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url) && !/^https:\/\/.+/.test(url)) { $("#sErr").textContent = "L'URL deve iniziare con https:// (lo trovi in Project Settings → API)."; return; }
    if (key.length < 20) { $("#sErr").textContent = "La chiave sembra incompleta: copia tutta la anon public key."; return; }
    cfg = { supabaseUrl: url, supabaseAnonKey: key };
    try { localStorage.setItem(CFG_LS, JSON.stringify(cfg)); } catch {}
    startCloud();
  };
}
function renderLogin() {
  let signup = false;
  const draw = () => {
    $("#app").innerHTML = `<div class="auth"><form class="box" id="loginForm">
      <img class="logo" src="icons/icon-192.png" alt="">
      <h1>${signup ? "Crea il tuo account" : "Accedi"}</h1>
      <p>${signup ? "Serve solo la prima volta. Poi accedi con la stessa email su ogni dispositivo." : "Accedi per vedere i tuoi risparmi."}</p>
      <div class="fields">
        <div class="field"><input id="lEmail" type="email" autocomplete="email" placeholder="Email" required></div>
        <div class="field"><input id="lPass" type="password" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="Password${signup ? " (almeno 6 caratteri)" : ""}" required minlength="6"></div>
      </div>
      <div class="err" id="lErr"></div>
      <button class="save" type="submit" id="lGo">${signup ? "Crea account" : "Accedi"}</button>
      <button class="alt" type="button" id="lSwap">${signup ? "Ho già un account" : "Prima volta? Crea un account"}</button>
      <button class="alt" type="button" id="lLocal" style="color:var(--label2)">Usa senza account, solo su questo dispositivo</button>
    </form></div>`;
    $("#lSwap").onclick = () => { signup = !signup; draw(); };
    $("#lLocal").onclick = () => { S.mode = "local"; save(); render(); };
    $("#loginForm").onsubmit = async e => {
      e.preventDefault();
      const email = $("#lEmail").value.trim(), password = $("#lPass").value;
      $("#lGo").disabled = true; $("#lErr").textContent = "";
      const { data, error } = signup ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
      $("#lGo").disabled = false;
      if (error) { $("#lErr").textContent = italianAuthError(error); return; }
      if (signup && !data.session) { $("#lErr").textContent = "Account creato. Conferma l'email dal link che ti è arrivato, poi accedi."; signup = false; return; }
    };
  };
  draw();
}
function italianAuthError(e) {
  const m = String(e.message || "");
  if (/invalid login/i.test(m)) return "Email o password sbagliate.";
  if (/not confirmed/i.test(m)) return "Devi prima confermare l'email dal link che ti è arrivato.";
  if (/already registered/i.test(m)) return "Esiste già un account con questa email: accedi.";
  if (/signups not allowed/i.test(m)) return "La registrazione di nuovi account è disattivata.";
  if (isNetErr(e)) return "Sei offline. Collegati a internet per accedere.";
  return m;
}

function startCloud() {
  if (!window.supabase) { toast("Libreria Supabase non caricata: controlla la connessione"); S.mode = S.mode || null; render(); return; }
  const wasLocal = S.mode === "local";
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "salvadanaio-auth" } });
  S.mode = "cloud";
  if (wasLocal) {
    // carry this device's data to the cloud once logged in
    Object.values(S.tx).forEach(t => enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }));
    Object.values(S.goals).forEach(g => enqueue({ op: "up", t: "goals", row: pick(g, COLS.goals) }));
  }
  save();
  sb.auth.onAuthStateChange((ev, s) => {
    const had = !!session; session = s;
    if (!authReady) return;
    if (ev === "SIGNED_OUT") { S.tx = {}; S.goals = {}; S.pending = []; save(); }
    if (!!s !== had || ev === "SIGNED_IN") { render(); if (s) { sync(); live(); } }
    if (!s) live(false);
  });
  sb.auth.getSession().then(({ data }) => { session = data.session; authReady = true; render(); if (session) { sync(); live(); } });
}

/* realtime: changes made on another device show up here within a second */
let channel = null;
function live(on = true) {
  if (channel) { sb.removeChannel(channel); channel = null; }
  if (!on || !sb || !session) return;
  const apply = (table, store, norm) => p => {
    const id = (p.new && p.new.id) || (p.old && p.old.id);
    if (!id || S.pending.some(op => op.t === table && (op.id || op.row.id) === id)) return;
    if (p.eventType === "DELETE") delete S[store][id];
    else S[store][id] = norm(p.new);
    save(); render();
  };
  channel = sb.channel("salvadanaio-" + session.user.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "transactions" },
      apply("transactions", "tx", r => ({ ...pick(r, COLS.transactions), amount: +r.amount, ts: +r.ts })))
    .on("postgres_changes", { event: "*", schema: "public", table: "goals" },
      apply("goals", "goals", r => ({ ...pick(r, COLS.goals), price: +r.price, created_at: +r.created_at, done_at: r.done_at && +r.done_at })))
    .subscribe();
}

/* ============ toast & sheets ============ */
let toastTimer;
function toast(msg, undo) {
  clearTimeout(toastTimer);
  $("#toastRoot").innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${undo ? `<button id="undoBtn">Annulla</button>` : ""}</div>`;
  if (undo) $("#undoBtn").onclick = () => { undo(); $("#toastRoot").innerHTML = ""; };
  toastTimer = setTimeout(() => $("#toastRoot").innerHTML = "", undo ? 5000 : 3200);
}
let closeSheet = null;
function sheet(html, mount) {
  if (closeSheet) closeSheet();
  const L = $("#layer");
  L.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  const onKey = e => { if (e.key === "Escape") close(); };
  const close = () => { L.innerHTML = ""; document.removeEventListener("keydown", onKey); closeSheet = null; };
  closeSheet = close;
  document.addEventListener("keydown", onKey);
  L.querySelector(".scrim").onclick = close;
  // drag the grabber down to close
  const sh = L.querySelector(".sheet"); let y0 = null;
  sh.addEventListener("touchstart", e => { if (sh.scrollTop <= 0 && e.target.closest(".grab,.sheet-h")) y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener("touchmove", e => { if (y0 != null) { const dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; } }, { passive: true });
  sh.addEventListener("touchend", e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; if (dy > 110) close(); else sh.style.transform = ""; });
  mount(sh, close);
}

/* ============ transaction sheet ============ */
function txSheet(type, existing) {
  let t = type, str = existing ? centsToInput(existing.amount).replace(/,00$/, "") : "", cat = existing?.cat || "";
  const when = existing ? new Date(existing.ts) : new Date();
  const dateVal = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  sheet(`
    <div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${existing ? "Modifica" : "Nuovo movimento"}</h3><span></span></div>
    <div class="seg" role="group"><button data-t="out">Uscita</button><button data-t="in">Entrata</button></div>
    <div class="amount"><div class="v num" id="amtV"></div></div>
    <div class="cats" id="cats"></div>
    <div class="fields">
      <div class="field"><input id="txNote" placeholder="Nota (facoltativa)" maxlength="80" value="${esc(existing?.note || "")}"></div>
      <div class="field"><label for="txDate">Data</label><input id="txDate" type="date" value="${dateVal}" style="text-align:right"></div>
    </div>
    <div class="keypad" id="keypad">${["1","2","3","4","5","6","7","8","9",",","0","⌫"].map(k => `<button type="button" data-k="${k}" aria-label="${k === "⌫" ? "Cancella" : k}">${k}</button>`).join("")}</div>
    <button class="save" id="txSave">Salva</button>
    ${existing ? `<button class="save danger" id="txDel">Elimina movimento</button>` : ""}
  `, (sh, close) => {
    const draw = () => {
      sh.querySelectorAll("[data-t]").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === t));
      const [i, d = ""] = str.split(",");
      const ip = i ? String(Number(i)) : "0";
      $("#amtV").className = "v num " + t;
      $("#amtV").innerHTML = `${t === "in" ? "+" : "−"}${esc(ip.replace(/\B(?=(\d{3})+(?!\d))/g, "."))}<span class="cents${str.includes(",") ? "" : " ghost"}">,${esc((d + "00").slice(0, 2))}</span><span class="cur">€</span>`;
      if (!CATS[t].some(c => c[0] === cat) && cat !== "Obiettivo") cat = "";
      $("#cats").innerHTML = CATS[t].map(([n, icon]) => `<button class="cat" data-cat="${esc(n)}" aria-pressed="${cat === n}"><span class="ico">${ic(icon, 22)}</span>${esc(n)}</button>`).join("");
      const s = $("#txSave"); s.className = "save " + t; s.disabled = !parseAmt(str);
      s.textContent = existing ? "Salva modifiche" : t === "in" ? "Aggiungi entrata" : "Aggiungi uscita";
    };
    const key = k => {
      if (k === "⌫") str = str.slice(0, -1);
      else if (k === ",") { if (!str.includes(",")) str = (str || "0") + ","; }
      else {
        const [i, d] = str.split(",");
        if (d != null ? d.length >= 2 : (i || "").length >= 7) return;
        str = str === "0" ? k : str + k;
      }
      draw();
    };
    sh.querySelector("[data-x]").onclick = close;
    sh.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { t = b.dataset.t; draw(); });
    $("#cats").onclick = e => { const b = e.target.closest("[data-cat]"); if (b) { cat = cat === b.dataset.cat ? "" : b.dataset.cat; draw(); } };
    $("#keypad").onclick = e => { const b = e.target.closest("[data-k]"); if (b) key(b.dataset.k); };
    sh.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT") { if (e.key === "Enter") { e.preventDefault(); $("#txSave").click(); } return; }
      if (/^[0-9]$/.test(e.key)) key(e.key);
      else if (e.key === "," || e.key === ".") key(",");
      else if (e.key === "Backspace") key("⌫");
      else if (e.key === "Enter") $("#txSave").click();
      else return;
      e.preventDefault();
    });
    sh.tabIndex = -1; sh.focus({ preventScroll: true });
    $("#txSave").onclick = () => {
      const amount = parseAmt(str); if (!amount) return;
      const dv = $("#txDate").value;
      let ts = existing ? existing.ts : Date.now();
      if (dv) {
        const [y, m, d] = dv.split("-").map(Number), base = new Date(ts);
        if (base.getFullYear() !== y || base.getMonth() !== m - 1 || base.getDate() !== d) ts = new Date(y, m - 1, d, 12).getTime();
      }
      const rec = { id: existing?.id || uuid(), type: t, amount, cat, note: $("#txNote").value.trim(), ts };
      const before = existing ? { ...existing } : null;
      close(); putTx(rec);
      toast(existing ? "Movimento aggiornato" : `${t === "in" ? "Entrata" : "Uscita"} di ${money(amount)} segnata`, () => before ? putTx(before) : delTx(rec.id));
      celebrateIfReached(before ? before : null);
    };
    if (existing) $("#txDel").onclick = () => { const c = { ...existing }; close(); delTx(c.id); toast("Movimento eliminato", () => putTx(c)); };
    draw();
  });
}

/* ============ goal sheets ============ */
let reachedBefore = new Set();
function snapshotReached() { reachedBefore = new Set(D.active.filter(g => goalPct(g) >= 100).map(g => g.id)); }
function celebrateIfReached() {
  const now = D.active.filter(g => goalPct(g) >= 100 && !reachedBefore.has(g.id));
  if (now.length) toast(`Hai abbastanza per ${now[0].name}`);
  snapshotReached();
}

async function compressImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 480, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    let out = c.toDataURL("image/webp", .82);
    if (!out.startsWith("data:image/webp")) out = blob.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", .84);
    return out;
  } finally { URL.revokeObjectURL(url); }
}

function goalEditSheet(existing) {
  let img = existing?.img || null;
  sheet(`
    <div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${existing ? "Modifica obiettivo" : "Nuovo obiettivo"}</h3><button class="r" id="gSave" disabled>${existing ? "Salva" : "Aggiungi"}</button></div>
    <div class="fields">
      <div class="field"><input id="gName" placeholder="Cosa vuoi comprare? Es. AirPods Pro" maxlength="60" value="${esc(existing?.name || "")}"></div>
      <div class="field"><label for="gPrice">Prezzo €</label><input id="gPrice" inputmode="decimal" placeholder="0,00" style="text-align:right" value="${existing ? esc(centsToInput(existing.price)) : ""}"></div>
    </div>
    <div class="group-h"><span>Foto del prodotto</span></div>
    <div class="pick">
      <div class="gimg" id="gPrev"></div>
      <div class="pick-btns">
        <a class="pill" id="gSearch" target="_blank" rel="noopener">${ic("search", 18)}Cerca su Google</a>
        <button class="pill" type="button" id="gPaste">${ic("paste", 18)}Incolla foto</button>
        <button class="pill" type="button" id="gFile">${ic("photo", 18)}Scegli dalla galleria</button>
      </div>
    </div>
    <div class="pastezone" id="pasteZone" contenteditable="true" data-ph="Oppure tieni premuto qui e scegli Incolla" hidden></div>
    <p class="hint">Cerca su Google, tieni premuto sulla foto e scegli Copia, poi torna qui e tocca Incolla foto.</p>
  `, (sh, close) => {
    const nameIn = $("#gName"), priceIn = $("#gPrice"), saveB = $("#gSave");
    const drawPrev = () => {
      $("#gPrev").innerHTML = img ? `<img src="${esc(img)}" alt="">` : `<span class="ph">${ic("photo", 28)}</span>`;
    };
    const validate = () => {
      saveB.disabled = !nameIn.value.trim() || !parseAmt(priceIn.value);
      const q = nameIn.value.trim();
      $("#gSearch").href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q ? q + " png" : "prodotto png");
      $("#gSearch").style.opacity = q ? 1 : .45;
      if (!img) drawPrev();
    };
    const setImg = async blob => {
      if (!blob || !/^image\//.test(blob.type)) { toast("Negli appunti non c'è un'immagine"); return; }
      try { img = await compressImage(blob); drawPrev(); $("#pasteZone").hidden = true; toast("Foto aggiunta"); }
      catch { toast("Non riesco a leggere questa immagine"); }
    };
    nameIn.oninput = validate; priceIn.oninput = validate;
    sh.querySelector("[data-x]").onclick = close;
    $("#gSearch").onclick = e => { if (!nameIn.value.trim()) { e.preventDefault(); toast("Scrivi prima il nome del prodotto"); nameIn.focus(); } };
    $("#gFile").onclick = () => { const f = $("#fileIn"); f.value = ""; f.onchange = () => setImg(f.files[0]); f.click(); };
    $("#gPaste").onclick = async () => {
      try {
        if (!navigator.clipboard?.read) throw 0;
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const type = it.types.find(t => t.startsWith("image/"));
          if (type) return setImg(await it.getType(type));
        }
        toast("Negli appunti non c'è un'immagine: copiala prima");
      } catch { $("#pasteZone").hidden = false; $("#pasteZone").focus(); toast("Tieni premuto nel riquadro e scegli Incolla"); }
    };
    sh.addEventListener("paste", e => {
      const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith("image/"));
      if (it) { e.preventDefault(); setImg(it.getAsFile()); }
      else if (e.target.id === "pasteZone") { e.preventDefault(); toast("Negli appunti non c'è un'immagine"); }
    });
    $("#pasteZone").addEventListener("input", async () => {
      const im = $("#pasteZone").querySelector("img"); $("#pasteZone").innerHTML = "";
      if (im?.src) { try { setImg(await (await fetch(im.src)).blob()); } catch { toast("Questa foto non si può incollare: salvala e scegli dalla galleria"); } }
    });
    saveB.onclick = () => {
      const name = nameIn.value.trim(), price = parseAmt(priceIn.value);
      if (!name || !price) return;
      const g = existing ? { ...existing, name, price, img } : { id: uuid(), name, price, img, done: false, done_at: null, created_at: Date.now() };
      close(); putGoal(g); if (!existing && tab !== "goals" && tab !== "home") setTab("goals");
      toast(existing ? "Obiettivo aggiornato" : `${name} aggiunto agli obiettivi`);
      celebrateIfReached();
    };
    drawPrev(); validate();
    if (!existing) setTimeout(() => nameIn.focus(), 300);
  });
}

function goalSheet(id) {
  const g = S.goals[id]; if (!g) return;
  if (g.done) {
    sheet(`<div class="sheet-h"><span></span><h3>Già comprato</h3><button class="r" data-x>Fine</button></div>
      <div class="detail">${g.img ? `<div class="gimg detail-img"><img src="${esc(g.img)}" alt=""></div>` : ""}
      <h2>${esc(g.name)}</h2><p class="sub">Comprato il ${g.done_at ? esc(new Date(g.done_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })) : "—"} per ${money(g.price)}</p></div>
      <button class="save ghost" id="gRestore">Rimetti tra gli obiettivi</button>
      <button class="save danger" id="gDel">Togli dalla lista</button>
      <p class="hint">Togliendolo dalla lista l'uscita registrata resta nei movimenti.</p>`, (sh, close) => {
      sh.querySelector("[data-x]").onclick = close;
      $("#gRestore").onclick = () => { close(); putGoal({ ...g, done: false, done_at: null }); toast("Rimesso tra gli obiettivi. L'uscita resta nei movimenti: eliminala se serve."); };
      $("#gDel").onclick = () => { const c = { ...g }; close(); delGoal(g.id); toast("Tolto dalla lista", () => putGoal(c)); };
    });
    return;
  }
  const pct = goalPct(g), ok = pct >= 100, left = Math.max(0, g.price - D.total);
  sheet(`
    <div class="sheet-h"><button class="l" id="gEdit">Modifica</button><h3></h3><button class="r" data-x>Fine</button></div>
    <div class="detail">
      <div class="gimg detail-img">${goalThumb(g)}</div>
      <h2>${esc(g.name)}</h2><p class="sub num">${money(g.price)}</p>
      <div class="dprog${ok ? " ok" : ""}"><span class="num">${ok ? "Raggiunto" : Math.floor(pct) + "%"}</span><div class="prog"><i style="width:${pct}%"></i></div></div>
      <div class="stats3">
        <div><span>Hai</span><b class="num">${money(Math.max(0, D.total))}</b></div>
        <div><span>Prezzo</span><b class="num">${money(g.price)}</b></div>
        <div><span>Mancano</span><b class="num${left ? "" : " pos"}">${left ? money(left) : "0 €"}</b></div>
      </div>
      <div class="eta">${esc(eta(g))}</div>
    </div>
    <button class="save ${ok ? "in" : "ghost"}" id="gBuy">${ok ? "L'ho comprato" : "L'ho comprato lo stesso"}</button>
    <div id="buyBox"></div>
    <button class="save danger" id="gDel">Elimina obiettivo</button>
    <div id="delBox"></div>
  `, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#gEdit").onclick = () => goalEditSheet(g);
    $("#gBuy").onclick = () => {
      $("#gBuy").hidden = true;
      $("#buyBox").innerHTML = `<div class="confirm" style="background:var(--green-soft)">
        <p>Segno un'uscita per quanto l'hai pagato e lo sposto tra i comprati.</p>
        <div class="field"><label for="paid">Pagato €</label><input id="paid" inputmode="decimal" style="text-align:right" value="${esc(centsToInput(g.price))}"></div>
        <div class="btnrow"><button class="save ghost" id="buyNo">Annulla</button><button class="save in" id="buyYes">Conferma</button></div></div>`;
      $("#buyNo").onclick = () => { $("#buyBox").innerHTML = ""; $("#gBuy").hidden = false; };
      $("#buyYes").onclick = () => {
        const paid = parseAmt($("#paid").value) || g.price;
        const tx = { id: uuid(), type: "out", amount: paid, cat: "Obiettivo", note: g.name, ts: Date.now() };
        close(); putTx(tx); putGoal({ ...g, price: paid, done: true, done_at: Date.now() });
        toast(`${g.name} comprato: uscita di ${money(paid)} segnata`);
        snapshotReached();
      };
    };
    $("#gDel").onclick = () => {
      $("#gDel").hidden = true;
      $("#delBox").innerHTML = `<div class="confirm"><p>Eliminare "${esc(g.name)}"? I movimenti non cambiano.</p>
        <div class="btnrow"><button class="save ghost" id="delNo">Annulla</button><button class="save" style="background:var(--red)" id="delYes">Elimina</button></div></div>`;
      $("#delNo").onclick = () => { $("#delBox").innerHTML = ""; $("#gDel").hidden = false; };
      $("#delYes").onclick = () => { const c = { ...g }; close(); delGoal(g.id); toast("Obiettivo eliminato", () => putGoal(c)); };
    };
  });
}

/* ============ backup ============ */
function exportBackup() {
  const data = JSON.stringify({ app: "salvadanaio", version: 2, exported: new Date().toISOString(), tx: Object.values(S.tx), goals: Object.values(S.goals) });
  const blob = new Blob([data], { type: "application/json" });
  const name = `salvadanaio-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importBackup(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== "salvadanaio" || !Array.isArray(d.tx)) throw 0;
    let n = 0;
    d.tx.forEach(t => { if (t.id && t.amount && !S.tx[t.id]) { S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); n++; } });
    (d.goals || []).forEach(g => { if (g.id && g.price && !S.goals[g.id]) { S.goals[g.id] = g; enqueue({ op: "up", t: "goals", row: pick(g, COLS.goals) }); n++; } });
    commit(); toast(n ? `Importati ${n} elementi` : "Niente di nuovo da importare");
  } catch { toast("Questo file non è un backup del Salvadanaio"); }
}

/* ============ events ============ */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-tab],[data-new],[data-goal-new],[data-goal],[data-tx],[data-filter],[data-more]");
  if (!el || el.closest(".sheet")) return;
  if (el.dataset.tab) setTab(el.dataset.tab);
  else if (el.dataset.new) { snapshotReached(); txSheet(el.dataset.new); }
  else if (el.hasAttribute("data-goal-new")) { snapshotReached(); goalEditSheet(); }
  else if (el.dataset.goal) goalSheet(el.dataset.goal);
  else if (el.dataset.tx) { snapshotReached(); const t = S.tx[el.dataset.tx]; if (t) txSheet(t.type, t); }
  else if (el.dataset.filter) { movFilter = el.dataset.filter; render(); }
  else if (el.dataset.more) {
    const a = el.dataset.more;
    if (a === "sync") { sync().then(() => toast(S.pending.length ? "Ancora offline: riprovo dopo" : "Sincronizzato")); }
    else if (a === "logout") { sb.auth.signOut(); }
    else if (a === "setup") { cfg.supabaseUrl ? startCloud() : renderSetup(); }
    else if (a === "export") exportBackup();
    else if (a === "import") { const f = $("#importIn"); f.onchange = () => f.files[0] && importBackup(f.files[0]); f.click(); }
  }
});
addEventListener("online", () => { syncBadge(); sync(); });
addEventListener("offline", syncBadge);
document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });

/* ============ boot ============ */
if (cfg.supabaseUrl && cfg.supabaseAnonKey && S.mode !== "local") startCloud();
else render();
snapshotReached();
navigator.storage?.persist?.().catch(() => {});
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
