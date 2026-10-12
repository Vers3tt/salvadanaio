(() => {
"use strict";

/* ============ helpers ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uuid = () => crypto.randomUUID ? crypto.randomUUID()
  : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
const EUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const money = c => EUR.format((c || 0) / 100);
const parseAmt = s => {
  s = String(s || "").trim().replace(/\s|€/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const centsToInput = c => (c / 100).toFixed(2).replace(".", ",");
const DAY = 864e5;

const CATS = {
  out: [["Spesa","🛒","#FF9500"],["Casa","🏠","#5856D6"],["Bollette","💡","#FFCC00"],["Trasporti","🚗","#007AFF"],["Svago","🎮","#AF52DE"],["Ristoranti","🍕","#FF3B30"],["Shopping","🛍️","#FF2D55"],["Salute","💊","#34C759"],["Altro","•","#8E8E93"]],
  in:  [["Stipendio","💼","#34C759"],["Paghetta","🪙","#FF9500"],["Regalo","🎁","#FF2D55"],["Vendita","🏷️","#007AFF"],["Lavoretto","🔧","#5856D6"],["Altro","•","#8E8E93"]]
};
const CAT_GOAL = ["Obiettivo","🎯","#5E5CE6"];
function catInfo(type, name) {
  if (name === "Obiettivo") return CAT_GOAL;
  return CATS[type].find(c => c[0] === name) || [name || (type === "in" ? "Entrata" : "Uscita"), type === "in" ? "+" : "−", "#8E8E93"];
}
const icoStyle = color => `background:${color}26;color:${color}`;

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.3 3.3a1 1 0 0 1 1.4 0l8 7.6a1 1 0 0 1-.7 1.7H19v7a1.4 1.4 0 0 1-1.4 1.4h-3.2v-5.2a.8.8 0 0 0-.8-.8h-3.2a.8.8 0 0 0-.8.8V21H6.4A1.4 1.4 0 0 1 5 19.6v-7H4a1 1 0 0 1-.7-1.7z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 2.5l.4 2.3c.6.2 1.2.5 1.7.9l2.2-.8 1.6 2.8-1.8 1.5a7 7 0 0 1 0 2l1.8 1.5-1.6 2.8-2.2-.8c-.5.4-1.1.7-1.7.9l-.4 2.3h-3.2l-.4-2.3a7 7 0 0 1-1.7-.9l-2.2.8-1.6-2.8 1.8-1.5a7 7 0 0 1 0-2L4.5 7.7l1.6-2.8 2.2.8c.5-.4 1.1-.7 1.7-.9l.4-2.3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" transform="translate(0 1.5)"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h4"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg>'
};

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
    ${[["home","Home",ICONS.home],["mov","Movimenti",ICONS.list],["goals","Obiettivi",ICONS.target],["more","Altro",ICONS.gear]]
      .map(([k, l, i]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ""}>${i}<span>${l}</span></button>`).join("")}
  </nav></div>`;
  syncBadge();
}
function setTab(t) { tab = t; try { sessionStorage.setItem(LS + ".tab", t); } catch {} render(); window.scrollTo(0, 0); }

function dateTitle() {
  const s = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function homeScreen() {
  const next = D.active.find(g => g.price > D.total);
  const ready = D.active.filter(g => g.price <= D.total).length;
  return `
  <header class="nav"><div><small>${esc(dateTitle())}</small><h1>Salvadanaio</h1></div>
    ${S.mode === "cloud" ? `<span class="hint" id="syncBadge"></span>` : ""}</header>
  <section class="card balance">
    <span class="lbl">Saldo</span>
    <span class="big num${D.total < 0 ? " neg" : ""}">${money(D.total)}</span>
    <div class="split">${next ? `<span>Prossimo obiettivo: <b>${esc(next.name)}</b>, mancano <b class="num">${money(next.price - D.total)}</b></span>`
      : ready ? `<span><b>${ready === 1 ? "1 obiettivo raggiunto" : ready + " obiettivi raggiunti"}</b></span>` : `<span>Aggiungi un obiettivo per vedere quanto ti manca</span>`}</div>
    <div class="spark">${spark()}</div>
  </section>
  <div class="actions">
    <button class="act out" data-new="out"><i>−</i>Uscita</button>
    <button class="act in" data-new="in"><i>+</i>Entrata</button>
  </div>
  <section class="section">
    <div class="sec-h"><h2>${esc(new Date().toLocaleDateString("it-IT", { month: "long" }).replace(/^./, c => c.toUpperCase()))}</h2></div>
    <div class="card month">
      <div><span>Entrate</span><b class="num pos">${money(D.mIn)}</b></div>
      <div><span>Uscite</span><b class="num neg">${money(D.mOut)}</b></div>
      <div><span>Risparmiato</span><b class="num">${money(D.mIn - D.mOut)}</b></div>
    </div>
  </section>
  <section class="section">
    <div class="sec-h"><h2>Obiettivi</h2>${D.active.length ? `<button class="link" data-tab="goals">Vedi tutti</button>` : ""}</div>
    ${D.active.length ? `<div class="goal-strip">${D.active.map(goalCard).join("")}<button class="gcard gadd" data-goal-new>${ICONS.plus.replace("<svg", '<svg width="28" height="28"')}Nuovo</button></div>`
      : `<div class="card empty"><span class="emoji">🎯</span><b>Cosa vuoi comprarti?</b><span>Aggiungi un obiettivo: tutto quello che risparmi lo fa avanzare.</span><button class="save" style="width:auto;padding:11px 20px" data-goal-new>Nuovo obiettivo</button></div>`}
  </section>
  <section class="section">
    <div class="sec-h"><h2>Ultimi movimenti</h2>${D.txs.length > 5 ? `<button class="link" data-tab="mov">Vedi tutti</button>` : ""}</div>
    ${D.txs.length ? `<div class="list">${D.txs.slice(0, 5).map(txRow).join("")}</div>`
      : `<div class="card empty"><span class="emoji">🪙</span><b>Nessun movimento</b><span>Tocca Entrata per segnare i soldi che hai adesso.</span></div>`}
  </section>`;
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
  const W = 400, H = 56, min = Math.min(...pts), max = Math.max(...pts);
  const x = k => k / (days - 1) * W, y = v => H - 6 - (v - min) / (max - min || 1) * (H - 14);
  const line = pts.map((v, k) => (k ? "L" : "M") + x(k).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--tint)" stop-opacity=".28"/><stop offset="1" stop-color="var(--tint)" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${W} ${H} L0 ${H}Z" fill="url(#sg)"/>
    <path d="${line}" fill="none" stroke="var(--tint)" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

function txRow(t) {
  const [name, emo, color] = catInfo(t.type, t.cat);
  const d = new Date(t.ts);
  const when = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `<button class="row" data-tx="${esc(t.id)}">
    <span class="ico" style="${icoStyle(color)}">${esc(emo)}</span>
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
  <header class="nav"><div><h1>Movimenti</h1></div><button class="nav-btn" data-new="out" aria-label="Nuovo movimento">${ICONS.plus}</button></header>
  <div class="seg" role="group">
    ${[["all","Tutti"],["in","Entrate"],["out","Uscite"]].map(([k, l]) => `<button data-filter="${k}" aria-pressed="${movFilter === k}">${l}</button>`).join("")}
  </div>
  ${groups.length ? groups.map(g => `
    <div class="group-h"><span>${esc(g.d.toLocaleDateString("it-IT", { month: "long", year: "numeric" }))}</span><span class="num">${g.net >= 0 ? "+" : "−"}${money(Math.abs(g.net))}</span></div>
    <div class="list">${g.items.map(txRow).join("")}</div>`).join("")
    : `<div class="card empty"><span class="emoji">🧾</span><b>Niente da mostrare</b><span>I movimenti che segni compaiono qui, divisi per mese.</span></div>`}`;
}

function goalCard(g) {
  const pct = goalPct(g), ok = pct >= 100;
  return `<button class="gcard" data-goal="${esc(g.id)}">
    <div class="gimg">${g.img ? `<img src="${esc(g.img)}" alt="" loading="lazy">` : `<span class="ph">${esc(g.name.trim().charAt(0).toUpperCase())}</span>`}
      <span class="pct${ok ? " ok" : ""}">${ok ? "✓" : Math.floor(pct) + "%"}</span></div>
    <b>${esc(g.name)}</b>
    <div class="prog${ok ? " ok" : ""}"><i style="width:${pct}%"></i></div>
    <small class="num">${ok ? "Pronto da comprare" : money(g.price)}</small>
  </button>`;
}
function goalsScreen() {
  return `
  <header class="nav"><div><h1>Obiettivi</h1></div><button class="nav-btn" data-goal-new aria-label="Nuovo obiettivo">${ICONS.plus}</button></header>
  ${D.active.length ? `<div class="goal-grid">${D.active.map(goalCard).join("")}<button class="gcard gadd" data-goal-new>Nuovo obiettivo</button></div>
    <p class="hint">Tutto il tuo saldo (${money(D.total)}) conta per ogni obiettivo. Quando ne compri uno, il saldo scende e gli altri si aggiornano.</p>`
  : `<div class="card empty"><span class="emoji">🎯</span><b>Nessun obiettivo</b><span>Scrivi cosa vuoi comprare e quanto costa. Tutto quello che risparmi lo fa avanzare.</span><button class="save" style="width:auto;padding:11px 20px" data-goal-new>Nuovo obiettivo</button></div>`}
  ${D.done.length ? `<div class="group-h" style="margin-top:28px"><span>Già comprati</span><span>${D.done.length}</span></div>
    <div class="list">${D.done.map(g => `<button class="row" data-goal="${esc(g.id)}">
      <span class="ico" style="background:var(--tile);overflow:hidden">${g.img ? `<img src="${esc(g.img)}" alt="" style="width:100%;height:100%;object-fit:contain;padding:3px">` : "🎯"}</span>
      <span class="t"><b>${esc(g.name)}</b><small>${g.done_at ? esc(new Date(g.done_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })) : ""}</small></span>
      <span class="a num">${money(g.price)}</span></button>`).join("")}</div>` : ""}`;
}

function moreScreen() {
  const cloud = S.mode === "cloud";
  return `
  <header class="nav"><div><h1>Altro</h1></div></header>
  <div class="group-h"><span>Sincronizzazione</span></div>
  <div class="list">
    ${cloud ? `<div class="cell"><span>Account</span><span>${esc(session?.user?.email || "")}</span></div>
      <div class="cell"><span>Stato</span><span id="syncText"></span></div>
      <button class="cell btn" data-more="sync"><span>Sincronizza adesso</span></button>
      <button class="cell danger" data-more="logout"><span>Esci</span></button>`
    : `<div class="cell"><span>Modalità</span><span>Solo questo dispositivo</span></div>
      <button class="cell btn" data-more="setup"><span>Attiva la sincronizzazione</span></button>`}
  </div>
  <div class="group-h"><span>Backup</span></div>
  <div class="list">
    <button class="cell btn" data-more="export"><span>Esporta backup</span></button>
    <button class="cell btn" data-more="import"><span>Importa backup</span></button>
  </div>
  <p class="foot">Il backup è un file .json con tutti i movimenti e gli obiettivi, immagini comprese.</p>
  <div class="group-h"><span>Riepilogo</span></div>
  <div class="list">
    <div class="cell"><span>Movimenti</span><span class="num">${D.txs.length}</span></div>
    <div class="cell"><span>Obiettivi attivi</span><span class="num">${D.active.length}</span></div>
    <div class="cell"><span>Obiettivi comprati</span><span class="num">${D.done.length}</span></div>
  </div>
  <input type="file" id="importIn" accept="application/json,.json" hidden>`;
}

function syncBadge() {
  const b = $("#syncBadge"), t = $("#syncText");
  let dot = "off", text = "Solo su questo dispositivo";
  if (S.mode === "cloud") {
    if (!navigator.onLine) { dot = "wait"; text = S.pending.length ? `Offline, ${S.pending.length} da inviare` : "Offline"; }
    else if (syncing || flushing || S.pending.length) { dot = "wait"; text = "Sincronizzo…"; }
    else { dot = ""; text = "Sincronizzato"; }
  }
  const html = `<span class="sync-dot ${dot}"></span>${esc(text)}`;
  if (b) b.innerHTML = html;
  if (t) t.innerHTML = html;
}

/* ============ setup / login ============ */
function renderSetup() {
  $("#app").innerHTML = `<div class="auth"><form class="box" id="setupForm" autocomplete="off">
    <img class="logo" src="icons/icon-192.png" alt="">
    <h1>Salvadanaio</h1>
    <p>Per avere gli stessi dati su telefono e computer collega il tuo progetto Supabase.</p>
    <div class="fields">
      <div class="field"><input id="sUrl" placeholder="URL progetto (https://…supabase.co)" inputmode="url" value="${esc(cfg.supabaseUrl || "")}"></div>
      <div class="field"><input id="sKey" placeholder="anon public key" value="${esc(cfg.supabaseAnonKey || "")}"></div>
    </div>
    <div class="err" id="sErr"></div>
    <button class="save" type="submit">Collega</button>
    <button class="alt" type="button" id="localOnly">Usa solo su questo dispositivo</button>
  </form></div>`;
  $("#localOnly").onclick = () => { S.mode = "local"; save(); render(); };
  $("#setupForm").onsubmit = e => {
    e.preventDefault();
    const url = $("#sUrl").value.trim().replace(/\/+$/, ""), key = $("#sKey").value.trim();
    if (!/^https:\/\/.+/.test(url) || key.length < 20) { $("#sErr").textContent = "Controlla URL e chiave: li trovi in Project Settings → API."; return; }
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
      <h1>${signup ? "Crea il tuo account" : "Bentornato"}</h1>
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
    if (!!s !== had || ev === "SIGNED_IN") { render(); if (s) sync(); }
  });
  sb.auth.getSession().then(({ data }) => { session = data.session; authReady = true; render(); if (session) sync(); });
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
      const ip = i ? Number(i).toLocaleString("it-IT") : "0";
      $("#amtV").className = "v num " + t;
      $("#amtV").innerHTML = `${t === "in" ? "+" : "−"}${esc(ip)}<span class="${str.includes(",") ? "" : "c"}">,${esc((d + "00").slice(0, 2))}</span> €`;
      if (!CATS[t].some(c => c[0] === cat) && cat !== "Obiettivo") cat = "";
      $("#cats").innerHTML = CATS[t].map(([n, e, c]) => `<button class="cat" data-cat="${esc(n)}" aria-pressed="${cat === n}"><span class="ico" style="${icoStyle(c)}">${e}</span>${esc(n)}</button>`).join("");
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
  if (now.length) { confetti(); toast(`Obiettivo raggiunto: ${now[0].name}! 🎉`); }
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
        <a class="pill" id="gSearch" target="_blank" rel="noopener">${ICONS.search}Cerca su Google</a>
        <button class="pill" type="button" id="gPaste">${ICONS.paste}Incolla foto</button>
        <button class="pill" type="button" id="gFile">${ICONS.photo}Scegli dalla galleria</button>
      </div>
    </div>
    <div class="pastezone" id="pasteZone" contenteditable="true" data-ph="Oppure tieni premuto qui e scegli Incolla" hidden></div>
    <p class="hint">Cerca su Google, tieni premuto sulla foto e scegli Copia, poi torna qui e tocca Incolla foto.</p>
  `, (sh, close) => {
    const nameIn = $("#gName"), priceIn = $("#gPrice"), saveB = $("#gSave");
    const drawPrev = () => {
      $("#gPrev").innerHTML = img ? `<img src="${esc(img)}" alt="">` : `<span class="ph">${esc((nameIn.value.trim()[0] || "?").toUpperCase())}</span>`;
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

function ringSvg(pct, ok) {
  const r = 44, c = 2 * Math.PI * r;
  return `<svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--fill)" stroke-width="12"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${ok ? "var(--green)" : "var(--tint)"}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 60 60)"/>
    <text x="60" y="67" text-anchor="middle" font-size="24" font-weight="700" fill="var(--label)" font-family="-apple-system,system-ui,sans-serif">${ok ? "✓" : Math.floor(pct) + "%"}</text></svg>`;
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
      <div class="gimg detail-img">${g.img ? `<img src="${esc(g.img)}" alt="">` : `<span class="ph">${esc(g.name[0].toUpperCase())}</span>`}</div>
      <h2>${esc(g.name)}</h2><p class="sub num">${money(g.price)}</p>
      <div class="ring">${ringSvg(pct, ok)}</div>
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
        confetti(); toast(`Goditi ${g.name}! Uscita di ${money(paid)} segnata`);
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

/* ============ confetti ============ */
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("#confetti"), ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1;
  cv.hidden = false; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ["#5E5CE6", "#34C759", "#FF9500", "#FF2D55", "#FFCC00", "#007AFF"];
  const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35, vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[Math.random() * colors.length | 0] }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
    if (t - t0 < 2600) requestAnimationFrame(frame); else { ctx.setTransform(1, 0, 0, 1, 0, 0); cv.hidden = true; }
  })(t0);
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
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
