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
const moneyShort = c => { const f = fmt(Math.round((c || 0) / 100) * 100); return `${f.sign}${f.int}\u00a0€`; };
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
  transfer: '<path d="M4 8.5h15M15.5 5l3.5 3.5-3.5 3.5M20 15.5H5M8.5 12 5 15.5 8.5 19"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.5"/><circle cx="16" cy="13.5" r="1.2"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  arrowOut: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  receipt: '<path d="M5.5 2.5v19l2.2-1.4 2.1 1.4 2.2-1.4 2.2 1.4 2.1-1.4 2.2 1.4v-19l-2.2 1.4-2.1-1.4-2.2 1.4-2.2-1.4-2.1 1.4z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
  sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  paste: '<rect x="5.5" y="4" width="13" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h4"/>',
  photo: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 15.5-4.5-4.5L7 20"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.8 5.8"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  cloudOff: '<path d="m3 3 18 18"/><path d="M8.2 6.2A6 6 0 0 1 16.4 10h.6a4 4 0 0 1 3.2 6.4M17 18H7a4.5 4.5 0 0 1-1.6-8.7"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 13a8 8 0 0 0 14.3 4.3L20 15.5"/><path d="M4 3.5v5h5M20 20.5v-5h-5"/>'
};
const ic = (name, size = 22) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;

/* Logo: la moneta-muso blu notte con due monete dietro (stessa forma dell'icona dell'app) */
function coinSvg(cls, cx, cy, r, detail) {
  if (!detail) return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" fill="#162448"/>`;
  const reed = 2 * Math.PI * r * .94;
  return `<g class="${cls}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#162448"/>
    <circle cx="${cx}" cy="${cy}" r="${r * .94}" fill="none" stroke="#46609C" stroke-width="${r * .08}" stroke-dasharray="${reed / 72 * .35} ${reed / 72 * .65}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * .84}" fill="none" stroke="#46609C" stroke-width="${r * .045}"/>
    <path d="M${cx - r * .62} ${cy - r * .5}A${r * .74} ${r * .74} 0 0 1 ${cx - r * .25} ${cy - r * .7}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="${r * .045}" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${cy + r * .06}" rx="${r * .56}" ry="${r * .4}" fill="#26386A"/>
    <g class="nostrils" fill="#fff"><ellipse cx="${cx - r * .2}" cy="${cy + r * .06}" rx="${r * .12}" ry="${r * .22}"/><ellipse cx="${cx + r * .2}" cy="${cy + r * .06}" rx="${r * .12}" ry="${r * .22}"/></g>
  </g>`;
}
const logoInner = () => `<g opacity=".35">${coinSvg("back2", 60, 40, 30)}</g><g opacity=".6">${coinSvg("back1", 55, 45, 30)}</g>${coinSvg("front", 47, 53, 30, true)}`;
// the tile behind the coins is invisible in light mode and becomes a light square in dark mode
const logoTile = () => `<rect class="logo-tile" x="-8" y="-8" width="116" height="116" rx="27"/>`;
const logoSvg = (size = 84) => `<svg class="logo logo-svg" width="${size}" height="${size}" viewBox="-8 -8 116 116" aria-hidden="true">${logoTile()}${logoInner()}</svg>`;

/* Mascotte: la moneta-muso, sempre in alto a destra. Fluttua, sbatte le narici,
   salta quando entrano soldi, si schiaccia quando escono, e se la tocchi ti dice come vai. */
function mascot() {
  const r = 30, cx = 50, cy = 46, reed = 2 * Math.PI * r * .94;
  return `<button class="mascot" data-mascot aria-label="Keepo: tocca per un consiglio">
    <svg viewBox="16 6 68 90" aria-hidden="true">
      <ellipse class="m-shadow" cx="50" cy="90" rx="22" ry="4.5" fill="var(--ink)" opacity=".14"/>
      <g class="m-float"><g class="m-react">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#162448"/>
        <circle cx="${cx}" cy="${cy}" r="${r * .94}" fill="none" stroke="#46609C" stroke-width="${r * .08}" stroke-dasharray="${reed / 72 * .35} ${reed / 72 * .65}"/>
        <circle cx="${cx}" cy="${cy}" r="${r * .84}" fill="none" stroke="#46609C" stroke-width="${r * .045}"/>
        <path d="M${cx - r * .62} ${cy - r * .5}A${r * .74} ${r * .74} 0 0 1 ${cx - r * .25} ${cy - r * .7}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="${r * .05}" stroke-linecap="round"/>
        <g class="m-snout">
          <ellipse cx="${cx}" cy="${cy + r * .06}" rx="${r * .56}" ry="${r * .4}" fill="#26386A"/>
          <g class="m-nos" fill="#fff"><ellipse cx="${cx - r * .2}" cy="${cy + r * .06}" rx="${r * .12}" ry="${r * .22}"/><ellipse cx="${cx + r * .2}" cy="${cy + r * .06}" rx="${r * .12}" ry="${r * .22}"/></g>
        </g>
      </g></g>
    </svg></button>`;
}
let pendingReaction = null;
function mascotReact(kind) {
  const go = () => document.querySelectorAll(".mascot").forEach(m => {
    m.classList.remove("jump", "squish", "wiggle"); void m.offsetWidth; m.classList.add(kind);
    setTimeout(() => m.classList.remove(kind), 900);
  });
  setTimeout(go, 30);
}
function mascotLine() {
  const next = D.active.find(g => g.price > D.total), ready = D.active.find(g => g.price <= D.total);
  const m = new Date(), m0 = new Date(m.getFullYear(), m.getMonth(), 1).getTime();
  const net = D.txs.filter(t => t.ts >= m0).reduce((a, t) => a + (t.type === "in" ? t.amount : -t.amount), 0);
  const lines = [];
  if (!D.txs.length) lines.push("Ciao! Segna i soldi che hai adesso con Entrata, io li tengo al sicuro.");
  if (ready) lines.push(`Hai abbastanza per ${ready.name}. Lo prendi?`);
  if (next) lines.push(`Mancano ${money(next.price - D.total)} per ${next.name}. Ce la facciamo!`);
  if (D.txs.length && net > 0) lines.push(`Questo mese hai messo da parte ${money(net)}. Ottimo lavoro!`);
  if (D.txs.length && net < 0) lines.push(`Questo mese sei sotto di ${money(-net)}. Occhio alle uscite.`);
  if (!D.active.length && D.txs.length) lines.push("Dammi un obiettivo: cosa vuoi comprarti?");
  return lines[Math.floor(Math.random() * lines.length)] || "Ogni moneta conta.";
}
function mascotSay(btn) {
  document.querySelectorAll(".m-bubble").forEach(b => b.remove());
  const b = document.createElement("div"); b.className = "m-bubble"; b.textContent = mascotLine();
  const host = btn.closest(".nav, .ob-hero, .side-brand"); if (!host) return;
  host.appendChild(b);
  setTimeout(() => b.classList.add("out"), 3600); setTimeout(() => b.remove(), 4000);
}

const CATS = {
  out: [["Spesa","cart"],["Casa","home"],["Bollette","bolt"],["Trasporti","car"],["Svago","ticket"],["Ristoranti","fork"],["Shopping","bag"],["Salute","heart"],["Altro","dots"]],
  in:  [["Stipendio","case"],["Paghetta","coins"],["Regalo","gift"],["Vendita","label"],["Lavoretto","wrench"],["Altro","dots"]]
};
const TRANSFER = "Trasferimento";
const isTransfer = t => t.cat === TRANSFER;
function catInfo(type, name) {
  if (name === "Obiettivo") return ["Obiettivo", "flag"];
  if (name === TRANSFER) return [TRANSFER, "transfer"];
  return CATS[type].find(c => c[0] === name) || [type === "in" ? "Entrata" : "Uscita", type === "in" ? "arrowIn" : "arrowOut"];
}

/* ============ state & persistence ============ */
const LS = "salvadanaio.v2";
const CFG_LS = "salvadanaio.cfg";
let S = { tx: {}, goals: {}, rec: {}, settings: {}, pending: [], mode: null, lastSync: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || "{}")); } catch {}
S.rec = S.rec || {}; S.settings = S.settings || {};
function save() {
  try { localStorage.setItem(LS, JSON.stringify(S)); }
  catch { toast("Memoria del telefono piena: elimina qualche immagine"); }
}

const fileCfg = window.SALVADANAIO_CONFIG || {};
let cfg = { supabaseUrl: fileCfg.supabaseUrl, supabaseAnonKey: fileCfg.supabaseAnonKey };
try { if (!cfg.supabaseUrl) Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_LS) || "{}")); } catch {}

let sb = null, session = null, authReady = false, syncing = false, flushing = false, firstSyncDone = false;

/* ============ cloud sync (Supabase) ============ */
const COLS = {
  transactions: ["id","type","amount","cat","note","ts","account"],
  goals: ["id","name","price","img","done","done_at","created_at","url","deadline"],
  recurring: ["id","type","amount","cat","note","freq","next_ts","active","created_at"]
};
let schemaWarned = false; // settings/recurring tables not created yet: keep those data on this device
const missingTable = e => /could not find the table|does not exist|schema cache/i.test(String(e?.message || "")) && !/column/i.test(String(e?.message || ""));
function warnSchema() {
  if (schemaWarned) return; schemaWarned = true;
  toast("Budget e ricorrenti restano su questo dispositivo finché non esegui l'aggiornamento SQL su Supabase");
}
const NEW_GOAL_COLS = ["url", "deadline"];
const PRICE_COLS = ["last_price", "last_checked", "price_note"];
let legacyPrice = false; // price tracking columns not created yet
let legacyTx = false; // true while the database still lacks transactions.account
const missingAccCol = e => /account/.test(String(e?.message || "")) && /column|schema/i.test(String(e?.message || ""));
function warnLegacyTx() {
  if (legacyTx) return; legacyTx = true;
  toast("I conti restano su questo dispositivo finché non esegui l'aggiornamento SQL su Supabase");
}
let legacyGoals = false; // true while the database still lacks the url/deadline columns
const missingCol = e => /url|deadline/.test(String(e?.message || "")) && /column|schema/i.test(String(e?.message || ""));
function warnLegacy() {
  if (legacyGoals) return;
  legacyGoals = true;
  toast("Link e date degli obiettivi restano su questo dispositivo: esegui l'aggiornamento SQL su Supabase");
}
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
      let res = op.op === "up"
        ? await sb.from(op.t).upsert(op.row, op.t === "settings" ? { onConflict: "user_id" } : undefined)
        : await sb.from(op.t).delete().eq("id", op.id);
      if (res.error && (op.t === "settings" || op.t === "recurring") && missingTable(res.error)) { warnSchema(); res = { error: null }; }
      if (res.error && op.t === "transactions" && op.op === "up" && missingAccCol(res.error)) {
        warnLegacyTx(); const row = { ...op.row }; delete row.account; res = await sb.from(op.t).upsert(row);
      }
      if (res.error && op.t === "goals" && missingCol(res.error)) {
        warnLegacy();
        const row = { ...op.row }; NEW_GOAL_COLS.forEach(k => delete row[k]);
        res = await sb.from(op.t).upsert(row);
      }
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
    const cols = table === "goals" && legacyGoals ? COLS.goals.filter(c => !NEW_GOAL_COLS.includes(c))
      : table === "goals" && !legacyPrice ? [...COLS.goals, ...PRICE_COLS]
      : table === "transactions" && legacyTx ? COLS.transactions.filter(c => c !== "account") : COLS[table];
    const { data, error } = await sb.from(table).select(cols.join(",")).range(from, from + step - 1);
    if (error && table === "goals" && !legacyGoals && missingCol(error)) { warnLegacy(); from -= step; continue; }
    if (error && table === "transactions" && !legacyTx && missingAccCol(error)) { warnLegacyTx(); from -= step; continue; }
    if (error && table === "goals" && !legacyPrice && /last_price|last_checked|price_note/.test(error.message || "")) { legacyPrice = true; from -= step; continue; }
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
    const optional = p => p.catch(e => { if (missingTable(e)) { warnSchema(); return null; } throw e; });
    const [tx, goals, rec, settingsRows] = await Promise.all([fetchAll("transactions"), fetchAll("goals"),
      optional(fetchAll("recurring")),
      optional(sb.from("settings").select("data").limit(1).then(({ data, error }) => { if (error) throw error; return data; }))]);
    if (S.pending.length) return; // a change happened while downloading: next sync will catch up
    S.tx = Object.fromEntries(tx.map(r => [r.id, { ...r, ...(legacyTx ? { account: S.tx[r.id]?.account || null } : {}), amount: +r.amount, ts: +r.ts }]));
    S.goals = Object.fromEntries(goals.map(r => {
      const local = S.goals[r.id] || {};
      const extra = legacyGoals ? { url: local.url || null, deadline: local.deadline || null } : {};
      return [r.id, { ...r, ...extra, price: +r.price, created_at: +r.created_at, done_at: r.done_at && +r.done_at }];
    }));
    if (rec) S.rec = Object.fromEntries(rec.map(r => [r.id, { ...r, amount: +r.amount, next_ts: +r.next_ts, created_at: +r.created_at }]));
    if (settingsRows) {
      if (settingsRows.length) S.settings = settingsRows[0].data || {};
      else if (Object.keys(S.settings).length) enqueue({ op: "up", t: "settings", row: { data: S.settings } });
    }
    firstSyncDone = true;
    S.lastSync = Date.now(); save(); render();
    runRecurring();
  } catch (e) {
    console.warn("sync", e);
  } finally { syncing = false; syncBadge(); }
}

/* ============ mutations ============ */
function putTx(t) { S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); commit(); }
function delTx(id) { delete S.tx[id]; enqueue({ op: "del", t: "transactions", id }); commit(); }
function putGoal(g) { S.goals[g.id] = g; enqueue({ op: "up", t: "goals", row: pick(g, COLS.goals) }); commit(); }
function delGoal(id) { delete S.goals[id]; enqueue({ op: "del", t: "goals", id }); commit(); }
function putRec(r) { S.rec[r.id] = r; enqueue({ op: "up", t: "recurring", row: pick(r, COLS.recurring) }); commit(); }
function delRec(id) { delete S.rec[id]; enqueue({ op: "del", t: "recurring", id }); commit(); }
function saveSettings(patch) { S.settings = { ...S.settings, ...patch }; enqueue({ op: "up", t: "settings", row: { data: S.settings } }); commit(); }
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
  for (const t of txs) { if (t.ts < m0) break; if (isTransfer(t)) continue; t.type === "in" ? mIn += t.amount : mOut += t.amount; }
  const since = Date.now() - 90 * DAY;
  const first = txs.length ? txs[txs.length - 1].ts : Date.now();
  const span = Math.max(30, Math.min(90, (Date.now() - first) / DAY));
  const net = txs.filter(t => t.ts >= since).reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  const perMonth = txs.length >= 3 ? net / span * 30 : 0;
  return { txs, total, active, done, mIn, mOut, perMonth };
}
let D = derive();
const goalPct = g => Math.max(0, Math.min(100, D.total / g.price * 100));
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "il sito"; } };
const fmtDate = (d, opt = { day: "numeric", month: "long", year: "numeric" }) => new Date(d).toLocaleDateString("it-IT", opt);
function deadlinePlan(g) {
  if (!g.deadline) return "";
  const left = g.price - D.total;
  const end = new Date(g.deadline + "T23:59:59");
  const days = (end - Date.now()) / DAY;
  const when = fmtDate(end, { day: "numeric", month: "short", year: end.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
  if (left <= 0) return `Obiettivo entro il ${when}: ci sei già`;
  if (days < 0) return `La data che avevi scelto (${when}) è passata`;
  const months = Math.max(1, days / 30.44);
  return `Per arrivarci entro il ${when} ti servono ${money(Math.ceil(left / months / 100) * 100)} al mese`;
}
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
  const needsAuth = !S.mode || (S.mode === "cloud" && authReady && !session);
  if (needsAuth && splashOn) { authHeld = true; $("#app").innerHTML = ""; return; }
  if (!S.mode) return renderSetup();
  if (S.mode === "cloud" && !authReady) { $("#app").innerHTML = ""; return; }
  if (S.mode === "cloud" && !session) return renderLogin();
  D = derive();
  if (needsOnboarding()) return renderOnboarding();
  const screens = { home: homeScreen, mov: movScreen, goals: goalsScreen, more: moreScreen };
  $("#app").innerHTML = `<main class="screen">${screens[tab]()}</main>
  <div class="tabbar"><div class="side-brand">${mascot()}<b>Keepo</b></div><nav>
    ${[["home","Home","home"],["mov","Movimenti","receipt"],["goals","Obiettivi","flag"],["more","Altro","sliders"]]
      .map(([k, l, i]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ""}>${ic(i, 24)}<span>${l}</span></button>`).join("")}
  </nav>
  <div class="side-actions">
    <button class="side-new out" data-new="out">${ic("minus", 18)}Uscita<kbd>U</kbd></button>
    <button class="side-new in" data-new="in">${ic("plus", 18)}Entrata<kbd>E</kbd></button>
  </div>
  <div class="side-foot" id="sideFoot"></div></div>`;
  syncBadge();
}
function setTab(t) { tab = t; try { sessionStorage.setItem(LS + ".tab", t); } catch {} render(); window.scrollTo(0, 0); }

function dateTitle() {
  const s = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const monthName = () => new Date().toLocaleDateString("it-IT", { month: "long" }).replace(/^./, c => c.toUpperCase());

let range = 90, selMonth = 5;
const RANGES = [[30, "1M"], [90, "3M"], [180, "6M"], [365, "1A"]];
const MONTHS_SHORT = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];

function homeScreen() {
  const next = D.active.find(g => g.price > D.total);
  const ready = D.active.filter(g => g.price <= D.total).length;
  const months = monthStats();
  return `
  <header class="nav brandnav"><div><small>${esc(dateTitle())}</small><h1>Keepo</h1></div>${mascot()}</header>
  <div id="syncBadge"></div>
  <div class="home-grid"><div class="col-a">
  <section class="card balance">
    <div class="bal-top"><span class="lbl">Saldo</span>
      <div class="ranges" role="group" aria-label="Periodo del grafico">${RANGES.map(([d, l]) => `<button data-range="${d}" aria-pressed="${range === d}">${l}</button>`).join("")}</div></div>
    <span class="big num${D.total < 0 ? " neg" : ""}">${tag(D.total)}</span>
    ${balanceDelta()}
    ${accountsBlock()}
    ${balanceChart()}
    <p class="next">${next ? `Mancano <b class="num">${money(next.price - D.total)}</b> per ${esc(next.name)}`
      : ready ? `${ready === 1 ? "Hai abbastanza per un obiettivo" : `Hai abbastanza per ${ready} obiettivi`}` : `Aggiungi un obiettivo per vedere quanto ti manca`}</p>
  </section>
  <div class="actions">
    <button class="act out" data-new="out">${ic("minus", 20)}Uscita</button>
    <button class="act in" data-new="in">${ic("plus", 20)}Entrata</button>
  </div>
  <section class="section">
    <div class="sec-h"><h2>Mese per mese</h2></div>
    <div class="card monthly">${monthlyChart(months)}${monthSummary(months[selMonth])}</div>
  </section>
  </div><div class="col-b">
  <section class="section first">
    <div class="sec-h"><h2>Dove vanno i soldi</h2><button class="link" data-budgets>${Object.keys(S.settings.budgets || {}).length ? "Budget" : "Imposta budget"}</button></div>
    <p class="sec-note">${esc(months[selMonth].label)}</p>
    ${categoryBreakdown(months[selMonth])}
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
  </section>
  </div></div>`;
}

/* daily balance for the chosen range, oldest first */
function balanceSeries(days) {
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = end.getTime() - (days - 1) * DAY;
  const asc = [...D.txs].reverse();
  let bal = 0, i = 0; const pts = [];
  while (i < asc.length && asc[i].ts <= start - DAY) { bal += asc[i].type === "in" ? asc[i].amount : -asc[i].amount; i++; }
  for (let d = 0; d < days; d++) {
    const dEnd = start + d * DAY;
    while (i < asc.length && asc[i].ts <= dEnd) { bal += asc[i].type === "in" ? asc[i].amount : -asc[i].amount; i++; }
    pts.push({ t: dEnd, v: bal });
  }
  return pts;
}
let chartPts = [];
function balanceDelta() {
  if (!D.txs.length) return "";
  const pts = balanceSeries(range), diff = pts[pts.length - 1].v - pts[0].v;
  const label = { 30: "nell'ultimo mese", 90: "negli ultimi 3 mesi", 180: "negli ultimi 6 mesi", 365: "nell'ultimo anno" }[range];
  return `<p class="delta"><b class="num ${diff >= 0 ? "pos" : "neg"}">${diff >= 0 ? "+" : "−"}${money(Math.abs(diff))}</b> ${label}</p>`;
}
function balanceChart() {
  if (D.txs.length < 2) return "";
  const pts = chartPts = balanceSeries(range);
  const W = 1000, H = 120, vals = pts.map(p => p.v);
  const min = Math.min(0, ...vals), max = Math.max(...vals, 1);
  const x = k => k / (pts.length - 1) * W, y = v => H - (v - min) / (max - min || 1) * H;
  const line = pts.map((p, k) => (k ? "L" : "M") + x(k).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const zero = min < 0 ? `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink3)" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/>` : "";
  const lastY = y(pts[pts.length - 1].v) / H * 100;
  return `<div class="bchart" data-chart="balance">
    <div class="bchart-plot">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="${W}" y1="0" y2="0" stroke="var(--line)" vector-effect="non-scaling-stroke"/>
        <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="var(--line)" vector-effect="non-scaling-stroke"/>
        ${zero}
        <path d="${line} L${W} ${H} L0 ${H}Z" fill="var(--ink)" opacity=".05"/>
        <path d="${line}" fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <span class="bdot end" style="left:100%;top:${lastY}%"></span>
      <span class="bcross" hidden></span><span class="bdot hov" hidden></span>
      <div class="btip" hidden></div>
      <span class="ylab top num">${moneyShort(max)}</span><span class="ylab bot num">${moneyShort(min)}</span>
    </div>
    <div class="bchart-x"><span>${esc(fmtDate(pts[0].t, { day: "numeric", month: "short" }))}</span><span>oggi</span></div>
  </div>`;
}
function chartHover(el, clientX) {
  const plot = el.querySelector(".bchart-plot"), r = plot.getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  const k = Math.round(f * (chartPts.length - 1)), p = chartPts[k];
  const vals = chartPts.map(q => q.v), min = Math.min(0, ...vals), max = Math.max(...vals, 1);
  const left = k / (chartPts.length - 1) * 100, top = 100 - (p.v - min) / (max - min || 1) * 100;
  const cross = plot.querySelector(".bcross"), dot = plot.querySelector(".hov"), tip = plot.querySelector(".btip");
  cross.hidden = dot.hidden = tip.hidden = false;
  cross.style.left = dot.style.left = left + "%"; dot.style.top = top + "%";
  tip.innerHTML = `<span>${esc(fmtDate(p.t, { weekday: "short", day: "numeric", month: "short" }))}</span><b class="num">${money(p.v)}</b>`;
  tip.style.left = Math.max(14, Math.min(86, left)) + "%";
  plot.querySelector(".end").hidden = k === chartPts.length - 1;
}
function chartLeave(el) {
  const plot = el.querySelector(".bchart-plot");
  plot.querySelectorAll(".bcross,.hov,.btip").forEach(n => n.hidden = true);
  plot.querySelector(".end").hidden = false;
}

/* last six months: income, spending and category split */
function monthStats() {
  const now = new Date(), out = [];
  for (let k = 5; k >= 0; k--) {
    const a = new Date(now.getFullYear(), now.getMonth() - k, 1), b = new Date(now.getFullYear(), now.getMonth() - k + 1, 1);
    out.push({ start: a.getTime(), end: b.getTime(), short: MONTHS_SHORT[a.getMonth()],
      label: a.toLocaleDateString("it-IT", { month: "long", year: a.getFullYear() !== now.getFullYear() ? "numeric" : undefined }).replace(/^./, c => c.toUpperCase()),
      in: 0, out: 0, cats: {} });
  }
  for (const t of D.txs) {
    if (isTransfer(t)) continue;
    const m = out.find(m => t.ts >= m.start && t.ts < m.end); if (!m) continue;
    if (t.type === "in") m.in += t.amount;
    else { m.out += t.amount; const c = catInfo("out", t.cat)[0]; m.cats[c] = (m.cats[c] || 0) + t.amount; }
  }
  return out;
}
function monthlyChart(months) {
  const max = Math.max(1, ...months.flatMap(m => [m.in, m.out]));
  const nice = niceMax(max);
  return `<div class="mchart">
    <div class="legend"><span><i class="sw in"></i>Entrate</span><span><i class="sw out"></i>Uscite</span></div>
    <div class="mplot">
      <div class="mgrid"><span class="num">${moneyShort(nice)}</span><span class="num">${moneyShort(nice / 2)}</span><span></span></div>
      <div class="mbars">${months.map((m, k) => `<button class="mgroup${k === selMonth ? " sel" : ""}" data-month="${k}" aria-label="${esc(m.label)}: entrate ${money(m.in)}, uscite ${money(m.out)}">
        <span class="bars"><i class="bin" style="height:${m.in / nice * 100}%"></i><i class="bout" style="height:${m.out / nice * 100}%"></i></span>
        <span class="mlab">${m.short}</span></button>`).join("")}</div>
    </div></div>`;
}
function niceMax(v) {
  const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
function monthSummary(m) {
  const net = m.in - m.out;
  return `<div class="msum">
    <div><span>Entrate</span><b class="num">${money(m.in)}</b></div>
    <div><span>Uscite</span><b class="num">${money(m.out)}</b></div>
    <div><span>Risparmio</span><b class="num ${net < 0 ? "neg" : "pos"}">${net < 0 ? "−" : ""}${money(Math.abs(net))}</b></div>
  </div>`;
}
function categoryBreakdown(m) {
  const budgets = S.settings.budgets || {};
  const names = new Set([...Object.keys(m.cats), ...Object.keys(budgets).filter(k => budgets[k] > 0)]);
  const rows = [...names].map(n => [n, m.cats[n] || 0, budgets[n] || 0]).sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  if (!rows.length) return emptyCard("cart", "Nessuna spesa", `In ${m.label.toLowerCase()} non hai segnato uscite.`);
  const top = Math.max(...rows.map(r => r[1]), 1);
  return `<div class="list cats-break">${rows.map(([name, v, bud]) => {
    const icon = name === "Obiettivo" ? "flag" : (CATS.out.find(c => c[0] === name) || [, "arrowOut"])[1];
    const ratio = bud ? v / bud : 0, state = !bud ? "" : ratio > 1 ? "over" : ratio >= .8 ? "warn" : "";
    const sub = bud ? (ratio > 1 ? `Superato di ${money(v - bud)}` : `Restano ${money(bud - v)} di ${money(bud)}`) : "";
    return `<button class="crow ${state}" data-budgets>
      <span class="ico">${ic(icon, 20)}</span>
      <div class="cmain"><div class="ctop"><b>${esc(name)}</b><span class="num">${money(v)}</span></div>
      <div class="cbar"><i style="width:${Math.min(100, bud ? ratio * 100 : v / top * 100)}%"></i></div>
      ${sub ? `<small class="csub num">${esc(sub)}</small>` : ""}</div>
      <span class="cpct num">${bud ? Math.round(ratio * 100) : m.out ? Math.round(v / m.out * 100) : 0}%</span></button>`;
  }).join("")}</div>`;
}

function emptyCard(icon, title, text, action = "") {
  return `<div class="card empty"><span class="empty-ico">${ic(icon, 26)}</span><b>${esc(title)}</b><span>${esc(text)}</span>${action}</div>`;
}

function txRow(t) {
  const [name, icon] = catInfo(t.type, t.cat);
  const d = new Date(t.ts);
  const when = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `<button class="row" data-tx="${esc(t.id)}">
    <span class="ico">${ic(icon, 20)}</span>
    <span class="t"><b>${esc(t.note || name)}</b><small>${t.account && accById(t.account) ? `<i class="adot" style="background:${accById(t.account).color}"></i>${esc(accById(t.account).name)} · ` : ""}${esc(t.note ? name + " · " + when : when)}</small></span>
    <span class="a num ${t.type}">${t.type === "in" ? "+" : "−"}${money(t.amount)}</span>
  </button>`;
}

let movQuery = "", movAcc = "";
function movScreen() {
  return `
  <header class="nav"><div><h1>Movimenti</h1></div><div class="nav-r">${mascot()}<button class="nav-btn" data-new="out" aria-label="Nuovo movimento">${ic("plus", 20)}</button></div></header>
  <div class="mov-grid"><aside class="mov-side">
  <div class="search">${ic("search", 18)}<input id="movQ" type="search" placeholder="Cerca per nota o categoria" value="${esc(movQuery)}" autocomplete="off"></div>
  <div class="seg" role="group">
    ${[["all","Tutti"],["in","Entrate"],["out","Uscite"]].map(([k, l]) => `<button data-filter="${k}" aria-pressed="${movFilter === k}">${l}</button>`).join("")}
  </div>
  ${accounts().length ? `<div class="accs mov-accs">${[["", "Tutti i conti", ""], ...accounts().map(a => [a.id, a.name, a.color])].map(([id, n, c]) => `<button class="achip" data-macc="${esc(id)}" aria-pressed="${movAcc === id}">${c ? `<i class="adot" style="background:${c}"></i>` : ""}${esc(n)}</button>`).join("")}</div>` : ""}
  <div id="movSum">${movSummary()}</div>
  </aside>
  <div id="movList">${movList()}</div></div>`;
}
function movFiltered() {
  const q = movQuery.trim().toLowerCase();
  return D.txs.filter(t => (movFilter === "all" || t.type === movFilter) && (!movAcc || t.account === movAcc)
    && (!q || (t.note || "").toLowerCase().includes(q) || catInfo(t.type, t.cat)[0].toLowerCase().includes(q)));
}
function movSummary() {
  const l = movFiltered(), inn = l.reduce((a, t) => a + (t.type === "in" ? t.amount : 0), 0), out = l.reduce((a, t) => a + (t.type === "out" ? t.amount : 0), 0);
  return `<div class="card mov-sum">
    <div><span>${l.length === 1 ? "1 movimento" : l.length + " movimenti"}</span></div>
    <div><span>Entrate</span><b class="num pos">${money(inn)}</b></div>
    <div><span>Uscite</span><b class="num">${money(out)}</b></div>
    <div><span>Differenza</span><b class="num ${inn - out < 0 ? "neg" : ""}">${inn - out < 0 ? "−" : ""}${money(Math.abs(inn - out))}</b></div>
  </div>`;
}
function movList() {
  const q = movQuery.trim().toLowerCase();
  const list = movFiltered();
  const groups = [];
  for (const t of list) {
    const d = new Date(t.ts), k = d.getFullYear() + "-" + d.getMonth();
    if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, d, items: [], net: 0 });
    const g = groups[groups.length - 1]; g.items.push(t); g.net += t.type === "in" ? t.amount : -t.amount;
  }
  if (!groups.length) return q ? emptyCard("search", "Nessun risultato", `Nessun movimento contiene "${movQuery.trim()}".`)
    : emptyCard("receipt", "Niente da mostrare", "I movimenti che segni compaiono qui, divisi per mese.");
  return groups.map(g => `
    <div class="group-h"><span>${esc(g.d.toLocaleDateString("it-IT", { month: "long", year: "numeric" }))}</span><span class="num">${g.net >= 0 ? "+" : "−"}${money(Math.abs(g.net))}</span></div>
    <div class="list">${g.items.map(txRow).join("")}</div>`).join("");
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
    ${g.deadline ? `<div class="gdate">${ic("calendar", 14)}<span>entro ${esc(fmtDate(g.deadline + "T12:00", { day: "numeric", month: "short" }))}</span></div>` : ""}
    ${g.last_price && g.last_price < g.price ? `<div class="gdate deal">${ic("label", 14)}<span>ora a ${esc(money(g.last_price))}</span></div>` : ""}
  </button>`;
}
function goalsScreen() {
  return `
  <header class="nav"><div><h1>Obiettivi</h1></div><div class="nav-r">${mascot()}<button class="nav-btn" data-goal-new aria-label="Nuovo obiettivo">${ic("plus", 20)}</button></div></header>
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
  <header class="nav"><div><h1>Altro</h1></div>${mascot()}</header>
  <div class="group-h"><span>Account</span></div>
  <div class="list">
    ${cloud ? `<div class="cell"><span>Email</span><span>${esc(session?.user?.email || "")}</span></div>
      <div class="cell"><span>Ultimo aggiornamento</span><span id="syncText">${esc(last)}</span></div>
      <button class="cell btn" data-more="sync"><span>Aggiorna adesso</span></button>
      <button class="cell btn" data-more="password"><span>Cambia password</span></button>
      <button class="cell danger" data-more="logout"><span>Esci</span></button>`
    : `<div class="cell"><span>Dati salvati</span><span>Solo su questo dispositivo</span></div>
      <button class="cell btn" data-more="setup"><span>Accedi per salvare i dati online</span></button>`}
  </div>
  ${cloud ? `<div class="group-h"><span>Veloce</span></div>
  <div class="list"><button class="cell btn" data-more="siri"><span>Siri, widget e Comandi Rapidi</span><span>${ic("chevR", 16)}</span></button></div>` : ""}
  <div class="group-h"><span>Pianificazione</span></div>
  <div class="list">
    <button class="cell btn" data-more="accounts"><span>Conti</span><span>${accounts().length || "Nessuno"}</span></button>
    <button class="cell btn" data-more="budgets"><span>Budget mensili</span><span>${Object.keys(S.settings.budgets || {}).filter(k => S.settings.budgets[k] > 0).length || "Nessuno"}</span></button>
    <button class="cell btn" data-more="recurring"><span>Movimenti ricorrenti</span><span>${Object.values(S.rec).filter(r => r.active).length || "Nessuno"}</span></button>
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
  ${cloud ? `<div class="list" style="margin-top:22px"><button class="cell danger" data-more="delete"><span>Elimina account e dati</span></button></div>` : ""}
  <div class="about">${logoSvg(56)}<b>Keepo</b><span>I tuoi risparmi, sempre con te</span>
    <span class="legal"><a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · <a href="termini.html" target="_blank" rel="noopener">Termini d'uso</a></span></div>
  <input type="file" id="importIn" accept="application/json,.json" hidden>`;
}

// Sync state is shown only when something needs attention: offline or changes still waiting.
function syncBadge() {
  const f = $("#sideFoot");
  if (f) f.innerHTML = S.mode === "cloud"
    ? `<span>${esc(session?.user?.email || "")}</span>${!navigator.onLine ? `<span class="warn">${ic("cloudOff", 14)}Offline</span>` : S.pending.length ? `<span>${ic("sync", 14)}${S.pending.length} da inviare</span>` : ""}`
    : `<span>Dati solo su questo dispositivo</span>`;
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
    ${logoSvg()}
    <h1>Keepo</h1>
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
      ${logoSvg()}
      <h1>${signup ? "Crea il tuo account" : "Accedi"}</h1>
      <p>${signup ? "Serve solo la prima volta. Poi accedi con la stessa email su ogni dispositivo." : "Accedi per vedere i tuoi risparmi."}</p>
      <div class="fields">
        <div class="field"><input id="lEmail" type="email" autocomplete="email" placeholder="Email" required></div>
        <div class="field"><input id="lPass" type="password" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="Password${signup ? " (almeno 6 caratteri)" : ""}" required minlength="6"></div>
      </div>
      ${signup ? `<label class="terms"><input type="checkbox" id="lTerms" required><span>Accetto i <a href="termini.html" target="_blank" rel="noopener">Termini d'uso</a> e l'<a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a></span></label>` : ""}
      <div class="err" id="lErr"></div>
      <button class="save" type="submit" id="lGo">${signup ? "Crea account" : "Accedi"}</button>
      ${signup ? "" : `<button class="alt" type="button" id="lForgot" style="color:var(--ink2)">Password dimenticata?</button>`}
      <button class="alt" type="button" id="lSwap">${signup ? "Ho già un account" : "Prima volta? Crea un account"}</button>
      <button class="alt" type="button" id="lLocal" style="color:var(--ink2)">Usa senza account, solo su questo dispositivo</button>
    </form></div>`;
    $("#lSwap").onclick = () => { signup = !signup; draw(); };
    if ($("#lForgot")) $("#lForgot").onclick = async () => {
      const email = $("#lEmail").value.trim();
      if (!/.+@.+\..+/.test(email)) { authMsg("Scrivi la tua email qui sopra, poi tocca di nuovo Password dimenticata."); $("#lEmail").focus(); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      authMsg(error ? italianAuthError(error) : "Ti ho mandato un'email con il link per scegliere una nuova password.", !error);
    };
    $("#lLocal").onclick = () => { S.mode = "local"; save(); render(); };
    $("#loginForm").insertAdjacentHTML("beforeend", `<p class="legal"><a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · <a href="termini.html" target="_blank" rel="noopener">Termini d'uso</a></p>`);
    $("#loginForm").onsubmit = async e => {
      e.preventDefault();
      const email = $("#lEmail").value.trim(), password = $("#lPass").value;
      $("#lGo").disabled = true; authMsg("");
      const { data, error } = signup ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
      $("#lGo").disabled = false;
      if (error) { authMsg(italianAuthError(error)); return; }
      if (signup && !data.session) { const email = $("#lEmail").value; signup = false; draw(); $("#lEmail").value = email; authMsg("Account creato. Apri l'email che ti è arrivata e conferma l'indirizzo, poi accedi qui.", true); return; }
    };
  };
  draw();
}
// one place for messages under the sign-in form: errors in red, confirmations in green
function authMsg(text, ok = false) {
  const el = $("#lErr"); if (!el) return;
  el.textContent = text; el.classList.toggle("ok", ok);
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
    Object.values(S.rec).forEach(r => enqueue({ op: "up", t: "recurring", row: pick(r, COLS.recurring) }));
    if (Object.keys(S.settings).length) enqueue({ op: "up", t: "settings", row: { data: S.settings } });
  }
  save();
  sb.auth.onAuthStateChange((ev, s) => {
    const had = !!session; session = s;
    if (!authReady) return;
    if (ev === "SIGNED_OUT") { S.tx = {}; S.goals = {}; S.rec = {}; S.settings = {}; S.pending = []; firstSyncDone = false; save(); }
    if (ev === "PASSWORD_RECOVERY") setTimeout(() => passwordSheet(true), 300);
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
  let acc = existing ? (existing.account || "") : lastAccount();
  const when = existing ? new Date(existing.ts) : new Date();
  const dateVal = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  sheet(`
    <div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${existing ? "Modifica" : "Nuovo movimento"}</h3><span></span></div>
    <div class="seg" role="group"><button data-t="out">Uscita</button><button data-t="in">Entrata</button></div>
    <div class="amount"><div class="v num" id="amtV"></div></div>
    <div class="cats" id="cats"></div>
    <div class="accs" id="accs"></div>
    <div class="fields">
      <div class="field"><input id="txNote" placeholder="Nota (facoltativa)" maxlength="80" value="${esc(existing?.note || "")}"></div>
      <div class="field"><label for="txDate">Data</label><input id="txDate" type="date" value="${dateVal}" style="text-align:right"></div>
      ${existing ? "" : `<div class="field"><label for="txRep">Ripeti</label><select id="txRep">
        <option value="">Mai</option><option value="week">Ogni settimana</option><option value="month">Ogni mese</option><option value="year">Ogni anno</option></select></div>`}
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
      const accs = accounts();
      $("#accs").innerHTML = accs.length ? `<span class="accs-l">Conto</span>` + accs.map(a => `<button class="achip" data-acc="${esc(a.id)}" aria-pressed="${acc === a.id}"><i class="adot" style="background:${a.color}"></i>${esc(a.name)}</button>`).join("") : "";
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
    $("#accs").onclick = e => { const b = e.target.closest("[data-acc]"); if (b) { acc = acc === b.dataset.acc ? "" : b.dataset.acc; draw(); } };
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
      const rec = { id: existing?.id || uuid(), type: t, amount, cat, note: $("#txNote").value.trim(), ts, account: acc || null };
      if (acc) rememberAccount(acc);
      const before = existing ? { ...existing } : null;
      const freq = existing ? "" : $("#txRep").value;
      const spentBefore = t === "out" ? spentThisMonth(cat) : 0;
      close(); putTx(rec);
      if (freq) putRec({ id: uuid(), type: t, amount, cat, note: rec.note, account: rec.account, freq, next_ts: advance(ts, freq), active: true, created_at: Date.now() });
      toast(existing ? "Movimento aggiornato" : `${t === "in" ? "Entrata" : "Uscita"} di ${money(amount)} segnata${freq ? `, si ripete ${FREQ[freq].toLowerCase()}` : ""}`, () => before ? putTx(before) : delTx(rec.id));
      if (!existing) mascotReact(t === "in" ? "jump" : "squish");
      if (!existing && t === "out") setTimeout(() => budgetAlert(cat, spentBefore, spentBefore + amount), 1800);
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
  if (now.length) { toast(`Hai abbastanza per ${now[0].name}`); mascotReact("wiggle"); }
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
      <div class="field">${ic("link", 18)}<input id="gUrl" type="url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="Link al prodotto (facoltativo)" value="${esc(existing?.url || "")}"></div>
      <div class="field"><label for="gDate">Entro il</label><input id="gDate" type="date" style="text-align:right" value="${esc(existing?.deadline || "")}"></div>
    </div>
    <p class="hint">Con una data l'app ti dice quanto mettere da parte ogni mese.</p>
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
    $("#gUrl").addEventListener("paste", e => {
      const t = e.clipboardData?.getData("text") || "", m = t.match(/https?:\/\/\S+/);
      if (m && m[0] !== t.trim()) { e.preventDefault(); $("#gUrl").value = m[0]; }
    });
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
      let url = $("#gUrl").value.trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      const deadline = $("#gDate").value || null;
      const g = existing ? { ...existing, name, price, img, url: url || null, deadline } : { id: uuid(), name, price, img, url: url || null, deadline, done: false, done_at: null, created_at: Date.now() };
      close(); putGoal(g); if (!existing && tab !== "goals" && tab !== "home") setTab("goals");
      if (g.url && g.url !== existing?.url) setTimeout(() => checkPrice(g.id, true), 1500);
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
      <p class="eta">${esc(eta(g))}</p>
      ${g.deadline && !ok ? `<div class="plan">${ic("calendar", 18)}<span>${esc(deadlinePlan(g))}</span></div>` : ""}
    </div>
    ${g.url && S.mode === "cloud" ? `<div class="pricebox" id="priceBox">${priceBox(g, null)}</div>` : ""}
    ${g.url ? `<a class="save ghost linkbtn" href="${esc(g.url)}" target="_blank" rel="noopener">${ic("external", 18)}Apri su ${esc(hostOf(g.url))}</a>` : ""}
    <button class="save ${ok ? "in" : "ghost"}" id="gBuy">${ok ? "L'ho comprato" : "L'ho comprato lo stesso"}</button>
    <div id="buyBox"></div>
    <button class="save danger" id="gDel">Elimina obiettivo</button>
    <div id="delBox"></div>
  `, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#gEdit").onclick = () => goalEditSheet(g);
    if ($("#priceBox")) {
      loadPriceHistory(g.id).then(h => { if ($("#priceBox")) $("#priceBox").innerHTML = priceBox(S.goals[g.id] || g, h); });
      $("#priceBox").addEventListener("click", e => {
        if (e.target.closest("[data-pcheck]")) checkPrice(g.id);
        if (e.target.closest("[data-puse]")) { const cur = S.goals[g.id]; putGoal({ ...cur, price: cur.last_price }); close(); toast(`Prezzo dell'obiettivo aggiornato a ${money(cur.last_price)}`); }
      });
    }
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
        <div class="btnrow"><button class="save ghost" id="delNo">Annulla</button><button class="save" style="background:var(--neg);color:#fff" id="delYes">Elimina</button></div></div>`;
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
  } catch { toast("Questo file non è un backup di Keepo"); }
}

/* ============ recurring ============ */
const FREQ = { week: "Ogni settimana", month: "Ogni mese", year: "Ogni anno" };
function advance(ts, freq) {
  const d = new Date(ts);
  if (freq === "week") return ts + 7 * DAY;
  const day = d.getDate(), add = freq === "year" ? 12 : 1;
  const n = new Date(d.getFullYear(), d.getMonth() + add, 1, d.getHours(), d.getMinutes());
  n.setDate(Math.min(day, new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()));
  return n.getTime();
}
// same id on every device for the same occurrence, so two phones never create it twice
async function occurrenceId(ruleId, ts) {
  const h = [...new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(ruleId + ":" + ts)))].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${(8 + (parseInt(h[16], 16) & 3)).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
let recRunning = false;
async function runRecurring() {
  if (recRunning || !crypto.subtle) return; recRunning = true;
  try {
    let added = 0; const now = Date.now();
    for (const r of Object.values(S.rec)) {
      if (!r.active || r.next_ts > now) continue;
      let next = r.next_ts, guard = 0;
      while (next <= now && guard++ < 60) {
        const id = await occurrenceId(r.id, next);
        if (!S.tx[id]) {
          const t = { id, type: r.type, amount: r.amount, cat: r.cat, note: r.note, ts: next, account: r.account || null };
          S.tx[id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); added++;
        }
        next = advance(next, r.freq);
      }
      const upd = { ...r, next_ts: next }; S.rec[r.id] = upd;
      enqueue({ op: "up", t: "recurring", row: pick(upd, COLS.recurring) });
    }
    if (added) { commit(); toast(added === 1 ? "Aggiunto 1 movimento ricorrente" : `Aggiunti ${added} movimenti ricorrenti`); }
  } finally { recRunning = false; }
}
function recurringSheet() {
  const list = Object.values(S.rec).sort((a, b) => a.next_ts - b.next_ts);
  sheet(`<div class="sheet-h"><span></span><h3>Ricorrenti</h3><button class="r" data-x>Fine</button></div>
    ${list.length ? `<div class="list">${list.map(r => {
      const [name, icon] = catInfo(r.type, r.cat);
      return `<div class="row rrow${r.active ? "" : " paused"}">
        <span class="ico">${ic(icon, 20)}</span>
        <span class="t"><b>${esc(r.note || name)}</b><small>${esc(FREQ[r.freq])} · ${r.active ? "prossimo " + esc(fmtDate(r.next_ts, { day: "numeric", month: "short" })) : "in pausa"}</small></span>
        <span class="a num ${r.type}">${r.type === "in" ? "+" : "−"}${money(r.amount)}</span>
        <span class="ract"><button class="pill sm" data-rpause="${esc(r.id)}">${r.active ? "Pausa" : "Riprendi"}</button><button class="pill sm danger" data-rdel="${esc(r.id)}">Elimina</button></span>
      </div>`; }).join("")}</div>`
    : emptyCard("sync", "Nessun movimento ricorrente", "Quando segni un movimento scegli Ripeti: ogni mese, settimana o anno. L'app lo aggiunge da sola alla scadenza.")}
    <p class="hint">I movimenti ricorrenti vengono aggiunti quando apri l'app, con la data giusta.</p>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("click", e => {
      const p = e.target.closest("[data-rpause]"), d = e.target.closest("[data-rdel]");
      if (p) { const r = S.rec[p.dataset.rpause]; let next = r.next_ts; if (!r.active) while (next <= Date.now()) next = advance(next, r.freq); putRec({ ...r, active: !r.active, next_ts: next }); close(); recurringSheet(); }
      if (d) { const r = { ...S.rec[d.dataset.rdel] }; delRec(r.id); close(); recurringSheet(); toast("Ricorrente eliminato. I movimenti già segnati restano.", () => putRec(r)); }
    });
  });
}

/* ============ budgets ============ */
function spentThisMonth(cat) {
  const n = new Date(), m0 = new Date(n.getFullYear(), n.getMonth(), 1).getTime();
  return Object.values(S.tx).reduce((a, t) => a + (t.type === "out" && t.ts >= m0 && catInfo("out", t.cat)[0] === catInfo("out", cat)[0] ? t.amount : 0), 0);
}
function budgetAlert(cat, before, after) {
  const name = catInfo("out", cat)[0], b = (S.settings.budgets || {})[name];
  if (!b) return;
  if (before <= b && after > b) { toast(`Hai superato il budget ${name} di ${money(after - b)}`); mascotReact("squish"); }
  else if (before < b * .8 && after >= b * .8) { toast(`Hai usato l'${Math.round(after / b * 100)}% del budget ${name}`); mascotReact("wiggle"); }
}
function budgetSheet() {
  const b = S.settings.budgets || {};
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Budget mensili</h3><button class="r" id="bSave">Salva</button></div>
    <p class="hint" style="margin:0 4px 12px">Un tetto di spesa al mese per categoria. Ti avviso all'80% e quando lo superi. Lascia vuoto per non avere limiti.</p>
    <div class="list">${CATS.out.map(([n, icon]) => `<label class="cell bud"><span class="ico">${ic(icon, 20)}</span><span class="bname">${esc(n)}</span>
      <input inputmode="decimal" data-bud="${esc(n)}" placeholder="—" value="${b[n] ? esc(centsToInput(b[n]).replace(/,00$/, "")) : ""}"><span class="beur">€</span></label>`).join("")}</div>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#bSave").onclick = () => {
      const out = {}; sh.querySelectorAll("[data-bud]").forEach(i => { const v = parseAmt(i.value); if (v) out[i.dataset.bud] = v; });
      close(); saveSettings({ budgets: out }); toast(Object.keys(out).length ? "Budget salvati" : "Budget rimossi");
    };
  });
}

/* ============ onboarding ============ */
function needsOnboarding() {
  if (S.settings.onboarded || Object.keys(S.tx).length) return false;
  return S.mode === "local" || firstSyncDone;
}
let obStep = 0, obData = {};
function renderOnboarding() {
  const steps = [
    () => `<div class="ob-hero">${mascot()}</div>
      <h1>Ciao, sono Keepo</h1>
      <p>Ti aiuto a segnare entrate e uscite in due tocchi e a mettere da parte i soldi per quello che vuoi comprarti.</p>
      <button class="save" data-ob="next">Iniziamo</button>`,
    () => `<div class="ob-hero">${mascot()}</div>
      <h1>Quanto hai adesso?</h1>
      <p>Lo segno come saldo di partenza. Puoi sempre cambiarlo dopo dai movimenti.</p>
      <div class="field ob-amt"><input id="obAmt" inputmode="decimal" placeholder="0,00" value="${esc(obData.amt || "")}"><span class="beur">€</span></div>
      <button class="save" data-ob="next">Avanti</button><button class="alt" data-ob="skip">Parto da zero</button>`,
    () => `<div class="ob-hero">${mascot()}</div>
      <h1>Cosa vuoi comprarti?</h1>
      <p>Il tuo primo obiettivo. Tutto quello che risparmi lo fa avanzare.</p>
      <div class="fields"><div class="field"><input id="obGoal" placeholder="Es. AirPods Pro" maxlength="60" value="${esc(obData.goal || "")}"></div>
      <div class="field"><label for="obPrice">Prezzo €</label><input id="obPrice" inputmode="decimal" placeholder="0,00" style="text-align:right" value="${esc(obData.price || "")}"></div></div>
      <button class="save" data-ob="done">Fatto</button><button class="alt" data-ob="finish">Più tardi</button>`
  ];
  $("#app").innerHTML = `<div class="auth onboarding"><div class="box">${steps[obStep]()}
    <div class="dots">${steps.map((_, k) => `<i class="${k === obStep ? "on" : ""}"></i>`).join("")}</div></div></div>`;
  const amt = $("#obAmt"); if (amt) setTimeout(() => amt.focus(), 200);
}
function onboardingAction(a) {
  if ($("#obAmt")) obData.amt = $("#obAmt").value;
  if ($("#obGoal")) { obData.goal = $("#obGoal").value; obData.price = $("#obPrice").value; }
  if (a === "next" || a === "skip") { if (a === "skip") obData.amt = ""; obStep++; renderOnboarding(); mascotReact("jump"); return; }
  if (a === "done" && obData.goal?.trim() && !parseAmt(obData.price)) { toast("Scrivi anche il prezzo, per esempio 279"); return; }
  const start = parseAmt(obData.amt);
  if (start) putTx({ id: uuid(), type: "in", amount: start, cat: "Altro", note: "Saldo iniziale", ts: Date.now() });
  if (a === "done" && obData.goal?.trim()) putGoal({ id: uuid(), name: obData.goal.trim(), price: parseAmt(obData.price), img: null, url: null, deadline: null, done: false, done_at: null, created_at: Date.now() });
  obStep = 0; obData = {};
  saveSettings({ onboarded: true });
  setTab("home"); mascotReact("jump");
}

/* ============ account ============ */
function passwordSheet(recovery) {
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${recovery ? "Nuova password" : "Cambia password"}</h3><span></span></div>
    <div class="fields"><div class="field"><input id="np1" type="password" autocomplete="new-password" placeholder="Nuova password (almeno 6 caratteri)" minlength="6"></div>
    <div class="field"><input id="np2" type="password" autocomplete="new-password" placeholder="Ripeti la nuova password"></div></div>
    <p class="hint" id="npErr" style="color:var(--neg)"></p>
    <button class="save" id="npGo">Salva password</button>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#npGo").onclick = async () => {
      const a = $("#np1").value, b = $("#np2").value;
      if (a.length < 6) { $("#npErr").textContent = "La password deve avere almeno 6 caratteri."; return; }
      if (a !== b) { $("#npErr").textContent = "Le due password non coincidono."; return; }
      $("#npGo").disabled = true;
      const { error } = await sb.auth.updateUser({ password: a });
      $("#npGo").disabled = false;
      if (error) { $("#npErr").textContent = italianAuthError(error); return; }
      close(); toast("Password aggiornata");
    };
  });
}
function deleteAccountSheet() {
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Elimina account</h3><span></span></div>
    <div class="confirm"><p>Elimino il tuo account e <b>tutti</b> i tuoi dati: movimenti, obiettivi, budget e ricorrenti. Non si può annullare.</p>
    <p>Se vuoi tenerne una copia, prima usa <b>Esporta backup</b>.</p>
    <div class="field"><input id="delWord" placeholder="Scrivi ELIMINA per confermare" autocapitalize="characters"></div></div>
    <p class="hint" id="delErr" style="color:var(--neg)"></p>
    <button class="save" id="delGo" style="background:var(--neg);color:#fff" disabled>Elimina definitivamente</button>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#delWord").oninput = () => { $("#delGo").disabled = $("#delWord").value.trim().toUpperCase() !== "ELIMINA"; };
    $("#delGo").onclick = async () => {
      $("#delGo").disabled = true;
      const { error } = await sb.rpc("delete_my_account");
      if (error) { $("#delGo").disabled = false; $("#delErr").textContent = /function|schema/i.test(error.message) ? "Prima esegui l'aggiornamento SQL su Supabase (aggiornamento-2.sql)." : error.message; return; }
      close();
      try { localStorage.removeItem(LS); } catch {}
      S = { tx: {}, goals: {}, rec: {}, settings: {}, pending: [], mode: "cloud", lastSync: 0 };
      await sb.auth.signOut().catch(() => {});
      toast("Account eliminato");
    };
  });
}

/* ============ Siri, widget e Comandi Rapidi ============ */
const SHORTCUTS = [["Uscita Keepo", "Chiede importo e categoria e segna una spesa", "minus"],
                   ["Entrata Keepo", "Chiede importo e categoria e segna un'entrata", "plus"],
                   ["Saldo Keepo", "Ti dice il saldo e il riepilogo del mese", "receipt"]];
async function sha256hex(t) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
function siriSheet() {
  sheet(`<div class="sheet-h"><span></span><h3>Siri e widget</h3><button class="r" data-x>Fine</button></div>
    <p class="hint" style="margin:0 4px 14px">Segna entrate e uscite senza aprire l'app: con Siri ("Ehi Siri, Uscita Keepo"), da un widget nella schermata Home o dal Centro Notifiche del Mac.</p>

    <div class="group-h" style="margin-top:4px"><span>1 · Il tuo codice personale</span></div>
    <div class="card qcode" id="qBox">
      <p>I comandi usano questo codice al posto di email e password. Tienilo per te: chi lo ha può segnare movimenti e leggere il saldo.</p>
      <button class="save" id="qGen">Genera il codice</button>
    </div>

    <div class="group-h"><span>2 · Aggiungi i comandi</span></div>
    <div class="list">${SHORTCUTS.map(([n, d, i]) => `<a class="row" href="comandi/${encodeURIComponent(n)}.shortcut" download="${esc(n)}.shortcut">
      <span class="ico">${ic(i, 20)}</span><span class="t"><b>${esc(n)}</b><small>${esc(d)}</small></span><span class="a" style="color:var(--ink2)">${ic("external", 18)}</span></a>`).join("")}</div>
    <p class="hint">Tocca un comando per scaricarlo e aprilo (su Mac doppio clic dalla cartella Download, su iPhone dall'app File): in Comandi Rapidi tocca <b>Aggiungi comando</b>. La <b>prima volta che lo avvii</b> ti chiede il codice, già compilato se l'hai copiato: confermalo e non te lo chiederà più, nemmeno negli altri comandi e sugli altri dispositivi con iCloud.</p>

    <div class="group-h"><span>3 · Usali</span></div>
    <div class="card howto">
      <p><b>Siri:</b> "Ehi Siri, Uscita Keepo", poi rispondi con l'importo e la categoria.</p>
      <p><b>Widget iPhone:</b> tieni premuto sulla schermata Home → <b>Modifica</b> → <b>Aggiungi widget</b> → <b>Comandi Rapidi</b>, e scegli i comandi di Keepo.</p>
      <p><b>Mac:</b> i comandi arrivano anche sul Mac con iCloud. Aggiungili al widget Comandi Rapidi nel Centro Notifiche, o fissali nella barra dei menu da Comandi Rapidi → Impostazioni.</p>
      <p><b>Tasto Azione</b> (iPhone 15 Pro e successivi): Impostazioni → Tasto Azione → Comando rapido → Uscita Keepo.</p>
    </div>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#qGen").onclick = async () => {
      $("#qGen").disabled = true;
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const token = "sd_" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const { error } = await sb.from("quick_tokens").upsert({ token_hash: await sha256hex(token) }, { onConflict: "user_id" });
      if (error) {
        $("#qGen").disabled = false;
        $("#qBox").insertAdjacentHTML("beforeend", `<p class="hint" style="color:var(--neg)">${missingTable(error) ? "Prima esegui su Supabase l'aggiornamento SQL per Siri (aggiornamento-3.sql)." : esc(error.message)}</p>`);
        return;
      }
      $("#qBox").innerHTML = `<p>Ecco il tuo codice. <b>Copialo adesso</b>: per sicurezza non lo salvo e non potrò mostrartelo di nuovo. Se lo perdi, generane uno nuovo.</p>
        <div class="qtoken num" id="qTok">${esc(token)}</div>
        <div class="btnrow"><button class="save" id="qCopy">Copia codice</button><button class="save ghost" id="qNew">Genera di nuovo</button></div>
        <p class="hint">Se ne generi uno nuovo, quello vecchio smette di funzionare: al prossimo avvio i comandi te lo richiedono da soli.</p>`;
      $("#qCopy").onclick = async () => {
        try { await navigator.clipboard.writeText(token); toast("Codice copiato"); }
        catch { const r = document.createRange(); r.selectNodeContents($("#qTok")); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Selezionato: copialo con Copia"); }
      };
      $("#qNew").onclick = () => { close(); siriSheet(); setTimeout(() => $("#qGen")?.click(), 350); };
    };
  });
}

/* ============ conti ============ */
const ACC_COLORS = ["#162448", "#2F6FE4", "#0E9F8E", "#18795C", "#E0A100", "#F07A1A", "#D64545", "#7B5CD6", "#7A8193"];
const ACC_PRESETS = ["Conto corrente", "Hype", "Revolut", "Contanti", "PayPal", "Satispay", "Carta prepagata"];
const accounts = () => S.settings.accounts || [];
const accById = id => accounts().find(a => a.id === id);
let showAccounts = false; try { showAccounts = localStorage.getItem(LS + ".showacc") === "1"; } catch {}
function lastAccount() { try { const id = localStorage.getItem(LS + ".acc"); return accById(id) ? id : (accounts()[0]?.id || ""); } catch { return accounts()[0]?.id || ""; } }
function rememberAccount(id) { try { localStorage.setItem(LS + ".acc", id); } catch {} }
function accountBalances() {
  const b = {}; let none = 0;
  for (const t of Object.values(S.tx)) {
    const v = t.type === "in" ? t.amount : -t.amount;
    if (t.account && accById(t.account)) b[t.account] = (b[t.account] || 0) + v; else none += v;
  }
  return { b, none };
}
function accountsBlock() {
  const accs = accounts();
  if (!accs.length) return `<button class="acc-toggle" data-acc-manage>${ic("wallet", 16)}Dividi il saldo per conto: Hype, Revolut, contanti…</button>`;
  const { b, none } = accountBalances();
  return `<button class="acc-toggle" data-acc-toggle aria-expanded="${showAccounts}">${ic("wallet", 16)}${showAccounts ? "Nascondi i conti" : `Vedi per conto (${accs.length})`}<span class="chev${showAccounts ? " up" : ""}">${ic("chevD", 14)}</span></button>
    ${showAccounts ? `<div class="acc-list">${accs.map(a => `<div class="acc-row"><i class="adot lg" style="background:${a.color}"></i><span>${esc(a.name)}</span><b class="num${(b[a.id] || 0) < 0 ? " neg" : ""}">${money(b[a.id] || 0)}</b></div>`).join("")}
      ${none ? `<div class="acc-row muted"><i class="adot lg" style="background:var(--ink3)"></i><span>Senza conto</span><b class="num">${money(none)}</b></div>` : ""}
      <div class="acc-acts"><button class="link" data-transfer>${ic("transfer", 15)}Sposta tra conti</button><button class="link" data-acc-manage>Gestisci</button></div></div>` : ""}`;
}
function accountsSheet() {
  const accs = accounts(), { b, none } = accountBalances();
  const unassigned = Object.values(S.tx).filter(t => !t.account || !accById(t.account)).length;
  sheet(`<div class="sheet-h"><span></span><h3>Conti</h3><button class="r" data-x>Fine</button></div>
    <p class="hint" style="margin:0 4px 12px">Dove tieni i soldi: conto in banca, Hype, Revolut, contanti… Ogni movimento può andare su un conto e vedi il totale di ognuno.</p>
    ${accs.length ? `<div class="list">${accs.map(a => `<button class="row" data-aedit="${esc(a.id)}"><span class="ico" style="background:${a.color}22;color:${a.color}">${ic("wallet", 20)}</span>
      <span class="t"><b>${esc(a.name)}</b><small>Tocca per modificare</small></span><span class="a num${(b[a.id] || 0) < 0 ? " neg" : ""}">${money(b[a.id] || 0)}</span></button>`).join("")}</div>` : ""}
    <button class="save" id="aAdd" style="margin-top:12px">Aggiungi conto</button>
    ${accs.length > 1 ? `<button class="save ghost" id="aMove">${"Sposta soldi tra conti"}</button>` : ""}
    ${accs.length && unassigned ? `<div class="group-h"><span>Movimenti senza conto</span><span class="num">${unassigned} · ${money(none)}</span></div>
      <div class="card qcode"><p>Hai ${unassigned === 1 ? "1 movimento" : unassigned + " movimenti"} segnati prima di creare i conti. Assegnali tutti insieme a:</p>
      <div class="accs">${accs.map(a => `<button class="achip" data-aassign="${esc(a.id)}"><i class="adot" style="background:${a.color}"></i>${esc(a.name)}</button>`).join("")}</div></div>` : ""}`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#aAdd").onclick = () => accountEditSheet();
    if ($("#aMove")) $("#aMove").onclick = () => transferSheet();
    sh.addEventListener("click", e => {
      const ed = e.target.closest("[data-aedit]"); if (ed) { accountEditSheet(accById(ed.dataset.aedit)); return; }
      const as = e.target.closest("[data-aassign]");
      if (as) {
        const id = as.dataset.aassign, list = Object.values(S.tx).filter(t => !t.account || !accById(t.account));
        list.forEach(t => { const u = { ...t, account: id }; S.tx[t.id] = u; enqueue({ op: "up", t: "transactions", row: pick(u, COLS.transactions) }); });
        commit(); close(); toast(`${list.length === 1 ? "1 movimento assegnato" : list.length + " movimenti assegnati"} a ${accById(id).name}`);
      }
    });
  });
}
function accountEditSheet(existing) {
  let color = existing?.color || ACC_COLORS[accounts().length % ACC_COLORS.length];
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${existing ? "Modifica conto" : "Nuovo conto"}</h3><button class="r" id="aSave">Salva</button></div>
    ${existing ? "" : `<div class="accs" style="margin-bottom:10px">${ACC_PRESETS.filter(n => !accounts().some(a => a.name.toLowerCase() === n.toLowerCase())).map(n => `<button class="achip" data-preset="${esc(n)}">${esc(n)}</button>`).join("")}</div>`}
    <div class="fields">
      <div class="field"><input id="aName" placeholder="Nome del conto, es. Hype" maxlength="30" value="${esc(existing?.name || "")}"></div>
      ${existing ? "" : `<div class="field"><label for="aStart">Ci sono adesso €</label><input id="aStart" inputmode="decimal" placeholder="0,00" style="text-align:right"></div>`}
    </div>
    ${existing ? "" : `<p class="hint">Se indichi quanto c'è adesso, lo segno come saldo iniziale del conto.</p>`}
    <div class="group-h"><span>Colore</span></div>
    <div class="colors" id="aColors"></div>
    ${existing ? `<button class="save danger" id="aDel" style="margin-top:18px">Elimina conto</button><div id="aDelBox"></div>` : ""}`, (sh, close) => {
    const drawColors = () => $("#aColors").innerHTML = ACC_COLORS.map(c => `<button class="cdot" data-color="${c}" aria-pressed="${c === color}" style="background:${c}" aria-label="Colore"></button>`).join("");
    drawColors();
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("click", e => {
      const c = e.target.closest("[data-color]"); if (c) { color = c.dataset.color; drawColors(); }
      const p = e.target.closest("[data-preset]"); if (p) { $("#aName").value = p.dataset.preset; $("#aStart")?.focus(); }
    });
    $("#aSave").onclick = () => {
      const name = $("#aName").value.trim();
      if (!name) { toast("Scrivi il nome del conto"); $("#aName").focus(); return; }
      const list = accounts().slice();
      if (existing) list[list.findIndex(a => a.id === existing.id)] = { ...existing, name, color };
      else list.push({ id: uuid(), name, color });
      const added = existing ? null : list[list.length - 1];
      const start = parseAmt($("#aStart")?.value);
      close(); saveSettings({ accounts: list });
      if (added) {
        rememberAccount(added.id);
        if (start) putTx({ id: uuid(), type: "in", amount: start, cat: "Altro", note: "Saldo iniziale " + name, ts: Date.now(), account: added.id });
      }
      toast(existing ? "Conto aggiornato" : `${name} aggiunto`);
    };
    if (existing) $("#aDel").onclick = () => {
      $("#aDel").hidden = true;
      const n = Object.values(S.tx).filter(t => t.account === existing.id).length;
      $("#aDelBox").innerHTML = `<div class="confirm"><p>Eliminare "${esc(existing.name)}"? ${n ? `I suoi ${n} movimenti restano, ma senza conto.` : ""}</p>
        <div class="btnrow"><button class="save ghost" id="aNo">Annulla</button><button class="save" style="background:var(--neg);color:#fff" id="aYes">Elimina</button></div></div>`;
      $("#aNo").onclick = () => { $("#aDelBox").innerHTML = ""; $("#aDel").hidden = false; };
      $("#aYes").onclick = () => {
        Object.values(S.tx).filter(t => t.account === existing.id).forEach(t => { const u = { ...t, account: null }; S.tx[t.id] = u; enqueue({ op: "up", t: "transactions", row: pick(u, COLS.transactions) }); });
        close(); saveSettings({ accounts: accounts().filter(a => a.id !== existing.id) }); toast("Conto eliminato");
      };
    };
  });
}
function transferSheet() {
  const accs = accounts();
  if (accs.length < 2) { toast("Servono almeno due conti: aggiungili in Altro → Conti"); accountsSheet(); return; }
  let from = lastAccount() || accs[0].id, to = accs.find(a => a.id !== from).id;
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Sposta tra conti</h3><button class="r" id="tGo">Sposta</button></div>
    <p class="hint" style="margin:0 4px 12px">Per esempio una ricarica da conto corrente a Hype. Il saldo totale non cambia e non conta come entrata o uscita del mese.</p>
    <div class="group-h"><span>Da</span></div><div class="accs" id="tFrom"></div>
    <div class="group-h"><span>A</span></div><div class="accs" id="tTo"></div>
    <div class="fields" style="margin-top:14px"><div class="field"><label for="tAmt">Importo €</label><input id="tAmt" inputmode="decimal" placeholder="0,00" style="text-align:right"></div></div>`, (sh, close) => {
    const chips = (sel, attr) => accs.map(a => `<button class="achip" ${attr}="${esc(a.id)}" aria-pressed="${sel === a.id}"><i class="adot" style="background:${a.color}"></i>${esc(a.name)}</button>`).join("");
    const draw = () => { $("#tFrom").innerHTML = chips(from, "data-tf"); $("#tTo").innerHTML = chips(to, "data-tt"); };
    draw();
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("click", e => {
      const f = e.target.closest("[data-tf]"), t = e.target.closest("[data-tt]");
      if (f) { from = f.dataset.tf; if (to === from) to = accs.find(a => a.id !== from).id; draw(); }
      if (t) { to = t.dataset.tt; if (to === from) from = accs.find(a => a.id !== to).id; draw(); }
    });
    setTimeout(() => $("#tAmt").focus(), 250);
    $("#tGo").onclick = () => {
      const amount = parseAmt($("#tAmt").value);
      if (!amount) { toast("Scrivi quanto vuoi spostare"); return; }
      const ts = Date.now(), A = accById(from), B = accById(to);
      const note = `${A.name} → ${B.name}`;
      const o = { id: uuid(), type: "out", amount, cat: TRANSFER, note, ts, account: from }, i = { id: uuid(), type: "in", amount, cat: TRANSFER, note, ts, account: to };
      [o, i].forEach(t => { S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); });
      close(); commit(); toast(`Spostati ${money(amount)} da ${A.name} a ${B.name}`, () => { delTx(o.id); delTx(i.id); });
    };
  });
}

/* ============ prezzi dai link ============ */
async function loadPriceHistory(goalId) {
  if (!sb || !session) return [];
  const { data, error } = await sb.from("price_history").select("price,checked_at").eq("goal_id", goalId).order("checked_at");
  if (error) return null;
  return data.map(r => ({ p: +r.price, t: new Date(r.checked_at).getTime() }));
}
function priceAdvice(h, g) {
  if (!h || h.length < 3) return { text: "Sto raccogliendo i prezzi: dopo qualche giorno ti dico se conviene comprare ora o aspettare.", tone: "" };
  const cur = h[h.length - 1].p, ps = h.map(x => x.p), min = Math.min(...ps), avg = ps.reduce((a, b) => a + b, 0) / ps.length;
  const diff = Math.round((cur - avg) / avg * 100);
  if (cur <= min) return { text: `È il prezzo più basso visto finora (media ${money(Math.round(avg))}): buon momento per comprare.`, tone: "good" };
  if (diff <= -5) return { text: `È il ${-diff}% sotto la media degli ultimi controlli: buon momento per comprare.`, tone: "good" };
  if (diff >= 5) return { text: `È il ${diff}% sopra la media (${money(Math.round(avg))}). Il più basso visto è ${money(min)}: se puoi, aspetta.`, tone: "wait" };
  return { text: `Prezzo nella media degli ultimi controlli. Il più basso visto è ${money(min)}.`, tone: "" };
}
function priceSpark(h) {
  if (!h || h.length < 2) return "";
  const W = 300, H = 46, ps = h.map(x => x.p), min = Math.min(...ps), max = Math.max(...ps);
  const x = k => k / (h.length - 1) * W, y = v => H - 4 - (v - min) / (max - min || 1) * (H - 8);
  const d = h.map((q, k) => (k ? "L" : "M") + x(k).toFixed(1) + " " + y(q.p).toFixed(1)).join(" ");
  return `<svg class="pspark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
    <div class="pspark-x"><span>${esc(fmtDate(h[0].t, { day: "numeric", month: "short" }))}</span><span>min ${money(min)} · max ${money(max)}</span></div>`;
}
function priceBox(g, h) {
  if (legacyPrice) return `<div class="ptop"><b>Prezzo sul sito</b></div><p class="pnote">Per seguire il prezzo esegui su Supabase l'aggiornamento SQL dei prezzi (aggiornamento-5.sql).</p>`;
  const when = g.last_checked ? fmtDate(g.last_checked, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const adv = g.last_price ? priceAdvice(h, g) : null;
  return `<div class="ptop"><b>Prezzo su ${esc(hostOf(g.url))}</b><button class="link" data-pcheck>${ic("sync", 15)}Controlla ora</button></div>
    ${g.last_price ? `<div class="pnow"><span class="num">${money(g.last_price)}</span>${g.last_price !== g.price ? `<small class="${g.last_price < g.price ? "pos" : "neg"}">${g.last_price < g.price ? "−" : "+"}${money(Math.abs(g.last_price - g.price))} rispetto al tuo obiettivo</small>` : ""}</div>`
      : `<p class="pnote">${esc(g.price_note || (g.last_checked ? "Prezzo non disponibile" : "Primo controllo in corso: torna tra qualche minuto."))}</p>`}
    ${h === null ? "" : priceSpark(h)}
    ${adv ? `<p class="padv ${adv.tone}">${esc(adv.text)}</p>` : ""}
    ${g.last_price && g.last_price !== g.price ? `<button class="pill sm" data-puse>Usa ${esc(money(g.last_price))} come prezzo dell'obiettivo</button>` : ""}
    ${when ? `<p class="pwhen">Controllato ${esc(when)} · si aggiorna ogni mattina</p>` : ""}`;
}
let checking = new Set();
async function checkPrice(goalId, silent = false) {
  if (!sb || !session || checking.has(goalId)) return;
  checking.add(goalId);
  const box = $("#priceBox"); if (box && !silent) box.classList.add("busy");
  try {
    const { error } = await sb.rpc("request_price_checks", { p_goal: goalId });
    if (error) { if (/function|schema/i.test(error.message)) { legacyPrice = true; } else if (!silent) toast("Controllo del prezzo non riuscito: " + error.message); return; }
    for (const wait of [5000, 6000, 8000]) {
      await new Promise(r => setTimeout(r, wait));
      await sb.rpc("process_price_checks");
      const { data } = await sb.from("goals").select("last_price,last_checked,price_note").eq("id", goalId).single();
      if (data?.last_checked && (!S.goals[goalId]?.last_checked || data.last_checked !== S.goals[goalId].last_checked)) {
        S.goals[goalId] = { ...S.goals[goalId], ...data, last_price: data.last_price && +data.last_price }; save(); render();
        break;
      }
    }
  } finally {
    checking.delete(goalId);
    const b = $("#priceBox");
    if (b) { b.classList.remove("busy"); const g = S.goals[goalId]; loadPriceHistory(goalId).then(h => { if ($("#priceBox") && g) $("#priceBox").innerHTML = priceBox(g, h); }); }
  }
}

/* ============ events ============ */
document.addEventListener("click", e => {
  const ob = e.target.closest("[data-ob]"); if (ob) { onboardingAction(ob.dataset.ob); return; }
  if (!e.target.closest(".sheet")) {
    if (e.target.closest("[data-acc-toggle]")) { showAccounts = !showAccounts; try { localStorage.setItem(LS + ".showacc", showAccounts ? "1" : ""); } catch {} render(); return; }
    if (e.target.closest("[data-acc-manage]")) { accountsSheet(); return; }
    if (e.target.closest("[data-transfer]")) { transferSheet(); return; }
    const ma = e.target.closest("[data-macc]"); if (ma) { movAcc = ma.dataset.macc; render(); return; }
  }
  if (e.target.closest("[data-budgets]") && !e.target.closest(".sheet")) { budgetSheet(); return; }
  const mb0 = e.target.closest("[data-mascot]");
  if (mb0) { mascotReact("jump"); mascotSay(mb0); return; }
  const rb = e.target.closest("[data-range]"), mb = e.target.closest("[data-month]");
  if (rb) { range = +rb.dataset.range; render(); return; }
  if (mb) { selMonth = +mb.dataset.month; render(); return; }
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
    else if (a === "budgets") budgetSheet();
    else if (a === "recurring") recurringSheet();
    else if (a === "password") passwordSheet(false);
    else if (a === "delete") deleteAccountSheet();
    else if (a === "siri") siriSheet();
    else if (a === "accounts") accountsSheet();
    else if (a === "import") { const f = $("#importIn"); f.onchange = () => f.files[0] && importBackup(f.files[0]); f.click(); }
  }
});
document.addEventListener("pointermove", e => { const c = e.target.closest("[data-chart=balance]"); if (c) chartHover(c, e.clientX); });
document.addEventListener("pointerdown", e => { const c = e.target.closest("[data-chart=balance]"); if (c) chartHover(c, e.clientX); });
document.addEventListener("pointerout", e => { const c = e.target.closest("[data-chart=balance]"); if (c && !c.contains(e.relatedTarget)) chartLeave(c); });
document.addEventListener("input", e => {
  if (e.target.id === "movQ") { movQuery = e.target.value; $("#movList").innerHTML = movList(); $("#movSum").innerHTML = movSummary(); }
});
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey || closeSheet || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !S.mode || needsOnboarding()) return;
  const k = e.key.toLowerCase();
  if (k === "u" || k === "e") { e.preventDefault(); snapshotReached(); txSheet(k === "u" ? "out" : "in"); }
  else if (k === "o") { e.preventDefault(); snapshotReached(); goalEditSheet(); }
  else if (k === "/") { e.preventDefault(); if (tab !== "mov") setTab("mov"); setTimeout(() => $("#movQ")?.focus(), 0); }
  else if ("1234".includes(k)) setTab(["home", "mov", "goals", "more"][+k - 1]);
});
addEventListener("online", () => { syncBadge(); sync(); });
addEventListener("offline", syncBadge);
document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });

/* ============ splash ============ */
// While the launch animation runs, the sign-in form is not in the page: otherwise iOS opens its
// saved-passwords prompt on top of the animation.
let splashOn = !!document.getElementById("splash"), authHeld = false;
(function splash() {
  const el = $("#splash"); if (!el) return;
  $("#splashLogo").setAttribute("viewBox", "-8 -8 116 116");
  $("#splashLogo").innerHTML = logoTile() + logoInner();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let done = false;
  const hide = () => {
    if (done) return; done = true;
    el.classList.add("out");
    setTimeout(() => { el.remove(); splashOn = false; if (authHeld) { authHeld = false; render(); } }, 450);
  };
  setTimeout(hide, reduce ? 500 : 1650);
  el.addEventListener("click", hide);
})();

/* ============ boot ============ */
if (cfg.supabaseUrl && cfg.supabaseAnonKey && S.mode !== "local") startCloud();
else { render(); runRecurring(); }
(function quickFromUrl() {
  const p = new URLSearchParams(location.search), n = p.get("new");
  if (n !== "out" && n !== "in") return;
  history.replaceState(null, "", location.pathname);
  const open = () => { if (S.mode && (S.mode === "local" || session) && !needsOnboarding()) txSheet(n); else setTimeout(open, 400); };
  setTimeout(open, splashOn ? 1900 : 300);
})();
snapshotReached();
navigator.storage?.persist?.().catch(() => {});
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  // a new version took over: reload once so the screen shows it right away
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then(reg => { reg.update(); document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update(); }); })
    .catch(() => {});
}
})();
