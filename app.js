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
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  layout: '<rect x="4" y="4" width="7" height="9" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="15" width="7" height="5" rx="2"/>',
  grip: '<circle cx="9" cy="6" r="1.1" fill="currentColor"/><circle cx="15" cy="6" r="1.1" fill="currentColor"/><circle cx="9" cy="12" r="1.1" fill="currentColor"/><circle cx="15" cy="12" r="1.1" fill="currentColor"/><circle cx="9" cy="18" r="1.1" fill="currentColor"/><circle cx="15" cy="18" r="1.1" fill="currentColor"/>',
  eye: '<path d="M2.5 12C3.5 9.3 7 5 12 5s8.5 4.3 9.5 7c-1 2.7-4.5 7-9.5 7s-8.5-4.3-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A9.6 9.6 0 0 1 12 5c5 0 8.5 4.3 9.5 7-.4 1-1.2 2.4-2.4 3.7M6.6 6.6C4.6 7.9 3.1 9.9 2.5 12c1 2.7 4.5 7 9.5 7 1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  paste: '<rect x="5.5" y="4" width="13" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h4"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  photo: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 15.5-4.5-4.5L7 20"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.8 5.8"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  cloudOff: '<path d="m3 3 18 18"/><path d="M8.2 6.2A6 6 0 0 1 16.4 10h.6a4 4 0 0 1 3.2 6.4M17 18H7a4.5 4.5 0 0 1-1.6-8.7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  percent: '<circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="17" r="2.6"/><path d="M19 5 5 19"/>',
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
/* Keepo's messages: built from the user's real data, most useful first.
   First tap shows the most relevant one; tapping again (mascot or bubble) moves to the next. */
const TIPS = [
  "Un caffè al bar ogni giorno sono circa 400 € all'anno.",
  "Segnare le spese appena le fai è il modo migliore per non dimenticarle.",
  "Tocca un obiettivo per vedere quando conviene comprarlo.",
  "Con i budget per categoria ti avviso prima di sforare.",
  "Puoi segnare una spesa anche con Siri: \"Uscita Salvadanaio\".",
  "Le spese piccole sono quelle che si notano meno: tienile d'occhio."
];
function mascotLines() {
  const L = [], add = (prio, text) => L.push({ prio, text });
  const now = new Date(), today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const p0 = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), pSame = p0 + (now - m0);
  const real = D.txs.filter(t => !isNeutral(t));
  const monthLabel = now.toLocaleDateString("it-IT", { month: "long" });
  const prevLabel = new Date(p0).toLocaleDateString("it-IT", { month: "long" });

  if (!D.txs.length) { add(100, "Ciao, sono Keepo! Tocca Entrata e segna i soldi che hai adesso: da lì partiamo."); return L; }
  if (checkDue()) add(85, "Controlliamo il saldo? Se in tasca o sul conto hai una cifra diversa da quella che vedo io, la sistemiamo in un attimo: tocca Allinea.");

  // budget
  const budgets = S.settings.budgets || {};
  for (const [cat, b] of Object.entries(budgets)) {
    if (!b) continue;
    const spent = real.filter(t => t.type === "out" && t.ts >= m0 && catInfo("out", t.cat)[0] === cat).reduce((a, t) => a + t.amount, 0);
    if (spent > b) add(95, `Budget ${cat} superato di ${money(spent - b)}. Per il resto di ${monthLabel} andiamoci piano.`);
    else if (spent >= b * .8) add(85, `Hai usato il ${Math.round(spent / b * 100)}% del budget ${cat}: restano ${money(b - spent)}.`);
  }
  // goals
  const ready = D.active.filter(g => g.price <= goalHave(g));
  if (ready.length) add(80, ready.length === 1 ? `Hai abbastanza per ${ready[0].name}. Quando vuoi, è tuo.` : `Hai abbastanza per ${ready.length} obiettivi. Quale prendi per primo?`);
  for (const g of D.active) {
    if (g.last_price && g.last_price < g.price) add(90, `Buone notizie: ${g.name} ora costa ${money(g.last_price)}, ${money(g.price - g.last_price)} in meno.`);
    if (g.deadline && g.price > goalHave(g)) { const plan = deadlinePlan(g); if (plan) add(60, `${g.name}: ${plan.charAt(0).toLowerCase() + plan.slice(1)}.`); }
  }
  const next = D.active.find(g => g.price > goalHave(g));
  if (next) {
    const left = next.price - goalHave(next), months = D.perMonth > 0 ? Math.ceil(left / D.perMonth) : 0;
    add(70, `Mancano ${money(left)} per ${next.name}.` + (months && months <= 36 ? ` Al tuo ritmo ci arrivi ${months <= 1 ? "entro un mese" : `in circa ${months} mesi`}.` : ""));
  }
  if (!D.active.length) add(40, "Dammi un obiettivo: cosa vuoi comprarti? Tutto il saldo lo fa avanzare.");
  // recurring coming soon
  for (const r of Object.values(S.rec)) {
    if (!r.active) continue;
    const days = Math.round((new Date(r.next_ts).setHours(0, 0, 0, 0) - today0) / DAY);
    if (days >= 0 && days <= 3) add(75, `${days === 0 ? "Oggi" : days === 1 ? "Domani" : `Tra ${days} giorni`} arriva ${r.note || catInfo(r.type, r.cat)[0]}: ${r.type === "in" ? "+" : "−"}${money(r.amount)}.`);
  }
  // accounts in the red
  if (accounts().length) { const { b } = accountBalances(); for (const a of accounts()) if ((b[a.id] || 0) < 0) add(88, `${a.name} è in rosso di ${money(-(b[a.id]))}. Vuoi spostarci qualcosa da un altro conto?`); }
  // today
  const todayOut = real.filter(t => t.type === "out" && t.ts >= today0).reduce((a, t) => a + t.amount, 0);
  if (todayOut) add(55, `Oggi hai speso ${money(todayOut)}.`);
  else if (now.getHours() >= 19 && !real.some(t => t.ts >= today0)) add(30, "Oggi non hai segnato niente. Tutto tranquillo o c'è qualcosa da aggiungere?");
  // month vs same days of last month
  const outNow = real.filter(t => t.type === "out" && t.ts >= m0).reduce((a, t) => a + t.amount, 0);
  const outPrev = real.filter(t => t.type === "out" && t.ts >= p0 && t.ts < pSame).reduce((a, t) => a + t.amount, 0);
  if (outPrev > 0 && outNow > 0 && now.getDate() >= 5) {
    const d = Math.round((outNow - outPrev) / outPrev * 100);
    if (d <= -10) add(65, `Finora hai speso il ${-d}% in meno rispetto agli stessi giorni di ${prevLabel}. Continua così!`);
    else if (d >= 10) add(65, `Finora hai speso il ${d}% in più rispetto agli stessi giorni di ${prevLabel}.`);
  }
  // biggest category and savings rate
  const cats = {}; real.filter(t => t.type === "out" && t.ts >= m0).forEach(t => { const c = catInfo("out", t.cat)[0]; cats[c] = (cats[c] || 0) + t.amount; });
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  if (top && outNow) add(45, `La voce più grande di ${monthLabel} è ${top[0]}: ${money(top[1])}, il ${Math.round(top[1] / outNow * 100)}% delle uscite.`);
  const inNow = real.filter(t => t.type === "in" && t.ts >= m0).reduce((a, t) => a + t.amount, 0);
  if (inNow > 0) {
    const rate = Math.round((inNow - outNow) / inNow * 100);
    if (rate > 0) add(50, `Questo mese hai messo da parte il ${rate}% di quello che è entrato.`);
    else if (rate < 0) add(58, `Questo mese le uscite superano le entrate di ${money(outNow - inNow)}.`);
  }
  add(10, TIPS[Math.floor(Math.random() * TIPS.length)]);
  return L.sort((a, b) => b.prio - a.prio);
}
let mascotQueue = [], mascotPos = 0, bubbleTimer = null;
function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "È tardi! " : h < 13 ? "Buongiorno! " : h < 18 ? "Buon pomeriggio! " : "Buonasera! ";
}
function mascotSay(btn) {
  const host = btn.closest(".nav, .ob-hero, .side-brand"); if (!host) return;
  const open = document.querySelector(".m-bubble:not(.out)");
  if (open && open.parentElement === host) mascotPos++;              // tap again: next message
  else { mascotQueue = mascotLines(); mascotPos = 0; }               // fresh look at the data
  if (mascotPos >= mascotQueue.length) mascotPos = 0;
  document.querySelectorAll(".m-bubble").forEach(b => b.remove());
  const item = mascotQueue[mascotPos]; if (!item) return;
  const text = (mascotPos === 0 && item.prio < 90 ? greeting() : "") + item.text;
  const more = mascotQueue.length > 1;
  const b = document.createElement("div");
  b.className = "m-bubble"; b.setAttribute("role", "status");
  b.innerHTML = `<span class="mb-text"></span>${more ? `<span class="mb-more">${mascotPos + 1} di ${mascotQueue.length} · tocca per il prossimo</span>` : ""}`;
  b.querySelector(".mb-text").textContent = text;
  b.addEventListener("click", ev => { ev.stopPropagation(); mascotReact("jump"); mascotSay(btn); });
  host.appendChild(b);
  clearTimeout(bubbleTimer);
  const ms = Math.min(9000, 3500 + text.length * 45);
  if (!DEMO) bubbleTimer = setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 400); }, ms);
}

const CATS = {
  out: [["Spesa","cart"],["Casa","home"],["Bollette","bolt"],["Trasporti","car"],["Svago","ticket"],["Ristoranti","fork"],["Shopping","bag"],["Salute","heart"],["Altro","dots"]],
  in:  [["Stipendio","case"],["Paghetta","coins"],["Regalo","gift"],["Vendita","label"],["Lavoretto","wrench"],["Interessi","percent"],["Altro","dots"]]
};
const TRANSFER = "Trasferimento";
const isTransfer = t => t.cat === TRANSFER;
const ADJUST = "Allineamento";   // corrections from "Allinea il saldo": they fix the balance but are not income or spending
const isNeutral = t => t.cat === TRANSFER || t.cat === ADJUST;
function catInfo(type, name) {
  if (name === "Obiettivo") return ["Obiettivo", "flag"];
  if (name === TRANSFER) return [TRANSFER, "transfer"];
  if (name === ADJUST) return [ADJUST, "sync"];
  return CATS[type].find(c => c[0] === name) || [type === "in" ? "Entrata" : "Uscita", type === "in" ? "arrowIn" : "arrowOut"];
}

/* ============ state & persistence ============ */
const LS = "salvadanaio.v2";
const CFG_LS = "salvadanaio.cfg";
let S = { tx: {}, goals: {}, rec: {}, settings: {}, pending: [], mode: null, lastSync: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || "{}")); } catch {}
S.rec = S.rec || {}; S.settings = S.settings || {};
// ?demo: example data kept only in memory, used for the guide and its screenshots
const DEMO = new URLSearchParams(location.search).has("demo");
if (DEMO) S = demoState();
function save() {
  if (DEMO) return;
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
    runRecurring(); runInterest();
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
  for (const t of txs) { if (t.ts < m0) break; if (isNeutral(t)) continue; t.type === "in" ? mIn += t.amount : mOut += t.amount; }
  const since = Date.now() - 90 * DAY;
  const first = txs.length ? txs[txs.length - 1].ts : Date.now();
  const span = Math.max(30, Math.min(90, (Date.now() - first) / DAY));
  const net = txs.filter(t => t.ts >= since).reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  const perMonth = txs.length >= 3 ? net / span * 30 : 0;
  return { txs, total, active, done, mIn, mOut, perMonth };
}
let D = derive();
// Money set aside for one goal (settings.goalSaved = { goalId: cents }). It is not a movement: it stays in the
// balance, but it counts only for its goal. What is not set aside still counts for every goal, as before.
const goalSaved = () => S.settings.goalSaved || {};
const savedFor = g => Math.max(0, goalSaved()[g.id] || 0);
const allocated = () => Object.entries(goalSaved()).reduce((a, [id, v]) => a + (S.goals[id] && !S.goals[id].done ? Math.max(0, v) : 0), 0);
const freeBalance = () => Math.max(0, D.total - allocated());
const goalHave = g => savedFor(g) + freeBalance();
const goalPct = g => Math.max(0, Math.min(100, goalHave(g) / g.price * 100));
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "il sito"; } };
const fmtDate = (d, opt = { day: "numeric", month: "long", year: "numeric" }) => new Date(d).toLocaleDateString("it-IT", opt);
function deadlinePlan(g) {
  if (!g.deadline) return "";
  const left = g.price - goalHave(g);
  const end = new Date(g.deadline + "T23:59:59");
  const days = (end - Date.now()) / DAY;
  const when = fmtDate(end, { day: "numeric", month: "short", year: end.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
  if (left <= 0) return `Obiettivo entro il ${when}: ci sei già`;
  if (days < 0) return `La data che avevi scelto (${when}) è passata`;
  const months = Math.max(1, days / 30.44);
  return `Per arrivarci entro ${[1, 8, 11].includes(end.getDate()) ? "l'" : "il "}${when} ti servono ${money(Math.ceil(left / months / 100) * 100)} al mese`;
}
function eta(g) {
  const left = g.price - goalHave(g);
  if (left <= 0) return "Hai abbastanza soldi: puoi comprarlo quando vuoi";
  if (D.perMonth <= 0) return "Mancano " + money(left);
  const m = Math.ceil(left / D.perMonth);
  return m <= 1 ? "Al tuo ritmo ci arrivi entro un mese" : m > 36 ? "Al tuo ritmo servono più di 3 anni" : `Al tuo ritmo ci arrivi in circa ${m} mesi`;
}

/* ============ rendering ============ */
let tab = "home", movFilter = "all";
try { tab = sessionStorage.getItem(LS + ".tab") || "home"; } catch {}

function render() {
  if (hlDrag) { hlDrag.renderAfter = true; return; }   // never rebuild the page under a widget being dragged
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
  maybeTour();
}
function setTab(t) { if (t !== tab) editHome = false; tab = t; try { sessionStorage.setItem(LS + ".tab", t); } catch {} render(); window.scrollTo(0, 0); }

function dateTitle() {
  const s = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const monthName = () => new Date().toLocaleDateString("it-IT", { month: "long" }).replace(/^./, c => c.toUpperCase());

let range = 90, selMonth = 5;
const RANGES = [[30, "1M"], [90, "3M"], [180, "6M"], [365, "1A"]];
const MONTHS_SHORT = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];

function homeScreen() {
  const next = D.active.find(g => g.price > goalHave(g));
  const ready = D.active.filter(g => g.price <= goalHave(g)).length;
  const months = monthStats();
  const W = {
    balance: () => `<section class="card balance">
    <div class="bal-top"><span class="lbl">Saldo<button class="bal-check" data-check aria-label="Allinea il saldo con quello che hai davvero">${ic("sync", 13)}Allinea</button></span>
      <div class="ranges" role="group" aria-label="Periodo del grafico">${RANGES.map(([d, l]) => `<button data-range="${d}" aria-pressed="${range === d}">${l}</button>`).join("")}</div></div>
    <span class="big num${D.total < 0 ? " neg" : ""}">${tag(D.total)}</span>
    ${balanceDelta()}
    ${duesIn().length ? `<p class="delta dues-line">${ic("clock", 13)}<b class="num">+${money(duesTotal(duesIn()))}</b> in arrivo, non ancora nel saldo</p>` : ""}
    ${accountsBlock()}
    ${balanceChart()}
    ${allocated() ? `<p class="delta set-line">${ic("flag", 13)}di cui <b class="num">${money(allocated())}</b> messi da parte per gli obiettivi</p>` : ""}
    <p class="next">${next ? `Mancano <b class="num">${money(next.price - goalHave(next))}</b> per ${esc(next.name)}`
      : ready ? `${ready === 1 ? "Hai abbastanza per un obiettivo" : `Hai abbastanza per ${ready} obiettivi`}` : `Aggiungi un obiettivo per vedere quanto ti manca`}</p>
  </section>
  <div class="actions">
    <button class="act out" data-new="out">${ic("minus", 20)}Uscita</button>
    <button class="act in" data-new="in">${ic("plus", 20)}Entrata</button>
  </div>`,
    dues: duesWidget,
    monthly: () => `<section class="section">
    <div class="sec-h"><h2>Mese per mese</h2></div>
    <div class="card monthly">${monthlyChart(months)}${monthSummary(months[selMonth])}</div>
  </section>`,
    cats: () => `<section class="section">
    <div class="sec-h"><h2>Dove vanno i soldi</h2><button class="link" data-budgets>${Object.keys(S.settings.budgets || {}).length ? "Budget" : "Imposta budget"}</button></div>
    <p class="sec-note">${esc(months[selMonth].label)}</p>
    ${categoryBreakdown(months[selMonth])}
  </section>`,
    goals: () => `<section class="section">
    <div class="sec-h"><h2>Obiettivi</h2>${D.active.length ? `<button class="link" data-tab="goals">Tutti</button>` : ""}</div>
    ${D.active.length ? `<div class="goal-strip">${D.active.map(goalCard).join("")}<button class="gcard gadd" data-goal-new>${ic("plus", 24)}<span>Nuovo</span></button></div>`
      : emptyCard("flag", "Cosa vuoi comprarti?", "Aggiungi un obiettivo con nome e prezzo. Tutto il saldo lo fa avanzare.", `<button class="save small" data-goal-new>Nuovo obiettivo</button>`)}
  </section>`,
    recent: () => `<section class="section">
    <div class="sec-h"><h2>Ultimi movimenti</h2>${D.txs.length > 5 ? `<button class="link" data-tab="mov">Tutti</button>` : ""}</div>
    ${D.txs.length ? `<div class="list">${D.txs.slice(0, 5).map(txRow).join("")}</div>`
      : emptyCard("receipt", "Nessun movimento", "Tocca Entrata e segna i soldi che hai adesso: diventa il tuo saldo di partenza.")}
  </section>`
  };
  return `
  <header class="nav brandnav"><div><small>${esc(dateTitle())}</small><h1>Keepo</h1></div><div class="nav-r">${editHome ? "" : `<button class="nav-btn ghost" data-hl-edit aria-label="Personalizza la Home" title="Personalizza la Home">${ic("layout", 19)}</button>`}${mascot()}</div></header>
  <div id="syncBadge"></div>
  ${iconNotice()}
  ${checkNotice()}
  ${homeGrid(W)}
  ${editHome ? `<button class="save small hl-done-float" data-hl-done>Fine</button>` : `<button class="hl-open" data-hl-edit>${ic("layout", 16)}Personalizza la Home</button>`}`;
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
// next 30 days: recurring movements and money to receive / give with a date. Drawn dashed after "oggi".
const PROJ_DAYS = 30;
function projectionEvents() {
  const now = Date.now(), end = now + PROJ_DAYS * DAY, ev = [];
  for (const r of Object.values(S.rec)) {
    if (!r.active) continue;
    let t = r.next_ts, g = 0;
    while (t <= end && g++ < 40) { if (t > now - DAY) ev.push({ t: Math.max(t, now), v: r.type === "in" ? r.amount : -r.amount }); t = advance(t, r.freq); }
  }
  const nx = new Date(); const firstNext = monthStart(nx.getFullYear(), nx.getMonth() + 1);
  if (firstNext <= end) { const { b } = accountBalances(); for (const a of accounts()) if (a.rate > 0 && a.autoInt) { const v = monthlyInterest(a, b[a.id] || 0); if (v) ev.push({ t: firstNext, v }); } }
  for (const d of dues()) if (d.due && d.due <= end) ev.push({ t: Math.max(d.due, now), v: d.dir === "out" ? -d.amount : d.amount });
  return ev;
}
function balanceChart() {
  if (D.txs.length < 2) return "";
  const past = balanceSeries(range), ev = projectionEvents();
  const pts = past.map(p => ({ ...p })), today = past.length - 1;
  if (ev.length) {
    // today's and overdue items are clamped to now: they land in the first future day
    for (let d = 1; d <= PROJ_DAYS; d++) {
      const dEnd = past[today].t + d * DAY;
      pts.push({ t: dEnd, v: past[today].v + ev.filter(e => e.t <= dEnd).reduce((a, e) => a + e.v, 0), future: true });
    }
  }
  chartPts = pts;
  const W = 1000, H = 120, vals = pts.map(p => p.v);
  const min = Math.min(0, ...vals), max = Math.max(...vals, 1);
  const x = k => k / (pts.length - 1) * W, y = v => H - (v - min) / (max - min || 1) * H;
  const path = list => list.map(([p, k], i) => (i ? "L" : "M") + x(k).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const pastIdx = past.map((p, k) => [p, k]), futIdx = pts.map((p, k) => [p, k]).slice(today);
  const line = path(pastIdx), fut = ev.length ? path(futIdx) : "";
  const up = past[today].v >= past[0].v, col = up ? "var(--green)" : "var(--neg)";
  const zero = min < 0 ? `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink3)" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/>` : "";
  const pct = k => k / (pts.length - 1) * 100, top = v => y(v) / H * 100;
  // highest and lowest day of the period, like a stock chart
  let hi = 0, lo = 0; past.forEach((p, k) => { if (p.v > past[hi].v) hi = k; if (p.v < past[lo].v) lo = k; });
  const mark = (k, cls) => Math.abs(pct(k) - pct(today)) < 6 || pct(k) < 3 ? "" : `<span class="bmark ${cls}" style="left:${pct(k)}%;top:${top(past[k].v)}%"><i></i><em class="num">${moneyShort(past[k].v)}</em></span>`;
  const lastF = pts[pts.length - 1];
  return `<div class="bchart" data-chart="balance">
    <div class="bchart-plot">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="bgrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
        <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="var(--line)" vector-effect="non-scaling-stroke"/>
        ${zero}
        <path d="${line} L${x(today)} ${H} L0 ${H}Z" fill="url(#bgrad)"/>
        <path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
        ${fut ? `<line x1="${x(today)}" x2="${x(today)}" y1="0" y2="${H}" stroke="var(--line)" vector-effect="non-scaling-stroke"/>
        <path d="${fut}" fill="none" stroke="var(--ink2)" stroke-width="1.8" stroke-dasharray="5 5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` : ""}
      </svg>
      ${hi !== lo ? mark(hi, "hi") + mark(lo, "lo") : ""}
      <span class="bdot end" style="left:${pct(today)}%;top:${top(past[today].v)}%;background:${col}"></span>
      <span class="bcross" hidden></span><span class="bdot hov" hidden></span>
      <div class="btip" hidden></div>
    </div>
    <div class="bchart-x"><span>${esc(fmtDate(pts[0].t, { day: "numeric", month: "short" }))}</span>${fut ? `<span class="bx-today" style="left:${pct(today)}%">oggi</span><span>${esc(fmtDate(lastF.t, { day: "numeric", month: "short" }))}</span>` : "<span>oggi</span>"}</div>
    ${fut ? `<p class="bproj">${ic("clock", 13)}<span>Fra 30 giorni (ricorrenti e soldi in arrivo compresi)</span><b class="num ${lastF.v < 0 ? "neg" : ""}">${money(lastF.v)}</b></p>` : ""}
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
  tip.innerHTML = `<span>${p.future ? "Previsto · " : ""}${esc(fmtDate(p.t, { weekday: "short", day: "numeric", month: "short" }))}</span><b class="num">${money(p.v)}</b>`;
  tip.style.left = Math.max(14, Math.min(86, left)) + "%";
  plot.querySelector(".end").hidden = !p.future && k === chartPts.findIndex(q => q.future) - 1 || (!chartPts.some(q => q.future) && k === chartPts.length - 1);
  plot.querySelectorAll(".bmark").forEach(m => m.style.opacity = .25);
}
function chartLeave(el) {
  const plot = el.querySelector(".bchart-plot");
  plot.querySelectorAll(".bcross,.hov,.btip").forEach(n => n.hidden = true);
  plot.querySelector(".end").hidden = false;
  plot.querySelectorAll(".bmark").forEach(m => m.style.opacity = "");
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
    if (isNeutral(t)) continue;
    const m = out.find(m => t.ts >= m.start && t.ts < m.end); if (!m) continue;
    if (t.type === "in") m.in += t.amount;
    else { m.out += t.amount; const c = catInfo("out", t.cat)[0]; m.cats[c] = (m.cats[c] || 0) + t.amount; }
  }
  return out;
}
function monthlyChart(months) {
  const max = Math.max(1, ...months.flatMap(m => [m.in, m.out]));
  const nice = niceMax(max);
  // average spending of the finished months that have movements (the current one is still running)
  const done = months.slice(0, -1).filter(m => m.in || m.out), avgOut = done.length >= 2 ? done.reduce((a, m) => a + m.out, 0) / done.length : 0;
  return `<div class="mchart">
    <div class="legend"><span><i class="sw in"></i>Entrate</span><span><i class="sw out"></i>Uscite</span></div>
    <div class="mplot">
      <div class="mgrid"><span class="num">${moneyShort(nice)}</span><span class="num">${moneyShort(nice / 2)}</span><span></span></div>
      ${avgOut ? `<div class="mavg" style="bottom:calc(22px + (100% - 22px) * ${(avgOut / nice).toFixed(4)})"><span class="num">media uscite ${moneyShort(avgOut)}</span></div>` : ""}
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
const CAT_COLORS = { Spesa: "#4C7DF0", Casa: "#8B6CF0", Bollette: "#E9A23B", Trasporti: "#2BAFBF", Svago: "#E0628C", Ristoranti: "#EE7A4A", Shopping: "#B85CD0", Salute: "#3BAF7C", Altro: "#98A2B3", Obiettivo: "#6B7A99" };
const catColor = n => CAT_COLORS[n] || "#98A2B3";
// ring with the month total in the middle; each slice is a category, biggest first, starting at 12 o'clock
function catDonut(m, rows) {
  const spent = rows.filter(r => r[1] > 0);
  if (!spent.length) return "";
  const R = 42, C = 2 * Math.PI * R, gap = spent.length > 1 ? 1.2 : 0;
  let acc = 0;
  const arcs = spent.map(([n, v]) => {
    const len = v / m.out * C, seg = `<circle r="${R}" cx="50" cy="50" fill="none" stroke="${catColor(n)}" stroke-width="13" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"><title>${esc(n)}: ${esc(money(v))}</title></circle>`;
    acc += len; return seg;
  }).join("");
  const top3 = spent.slice(0, 3).map(([n, v]) => `<span><i style="background:${catColor(n)}"></i>${esc(n)}<b class="num">${Math.round(v / m.out * 100)}%</b></span>`).join("");
  return `<div class="card donut-card">
    <div class="donut"><svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-90 50 50)">${arcs}</g></svg>
      <div class="donut-c"><small>Uscite</small><b class="num">${moneyShort(m.out)}</b></div></div>
    <div class="donut-leg">${top3}</div>
  </div>`;
}
function categoryBreakdown(m) {
  const budgets = S.settings.budgets || {};
  const names = new Set([...Object.keys(m.cats), ...Object.keys(budgets).filter(k => budgets[k] > 0)]);
  const rows = [...names].map(n => [n, m.cats[n] || 0, budgets[n] || 0]).sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  if (!rows.length) return emptyCard("cart", "Nessuna spesa", `In ${m.label.toLowerCase()} non hai segnato uscite.`);
  const top = Math.max(...rows.map(r => r[1]), 1);
  return catDonut(m, rows) + `<div class="list cats-break">${rows.map(([name, v, bud]) => {
    const icon = name === "Obiettivo" ? "flag" : (CATS.out.find(c => c[0] === name) || [, "arrowOut"])[1];
    const ratio = bud ? v / bud : 0, state = !bud ? "" : ratio > 1 ? "over" : ratio >= .8 ? "warn" : "";
    const sub = bud ? (ratio > 1 ? `Superato di ${money(v - bud)}` : `Restano ${money(bud - v)} di ${money(bud)}`) : "";
    return `<button class="crow ${state}" data-budgets style="--cc:${catColor(name)}">
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

let movQuery = "", movAcc = "", movCat = "", movNote = "";
// "Conad", " conad  " e "CONAD" sono la stessa cosa: minuscole, senza accenti, spazi ridotti
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const squash = s => norm(s).replace(/[^\p{L}\p{N}]/gu, "");
function movScreen() {
  return `
  <header class="nav"><div><h1>Movimenti</h1></div><div class="nav-r">${mascot()}<button class="nav-btn" data-new="out" aria-label="Nuovo movimento">${ic("plus", 20)}</button></div></header>
  <div class="mov-grid"><aside class="mov-side">
  <div class="search">${ic("search", 18)}<input id="movQ" type="search" placeholder="Cerca per nota, categoria o conto" value="${esc(movQuery)}" autocomplete="off"></div>
  <div class="seg" role="group">
    ${[["all","Tutti"],["in","Entrate"],["out","Uscite"]].map(([k, l]) => `<button data-filter="${k}" aria-pressed="${movFilter === k}">${l}</button>`).join("")}
  </div>
  <div id="movChips">${movChips()}</div>
  <div id="movSum">${movSummary()}</div>
  </aside>
  <div id="movList">${movList()}</div></div>`;
}
// what is left after every filter except `skip`, so each chip row counts what you would get by tapping it
function movBase(skip) {
  const q = squash(movQuery);
  return D.txs.filter(t => (movFilter === "all" || t.type === movFilter)
    && (skip === "acc" || !movAcc || t.account === movAcc)
    && (skip === "cat" || !movCat || catInfo(t.type, t.cat)[0] === movCat)
    && (skip === "note" || !movNote || norm(t.note) === movNote)
    && (!q || squash([t.note, catInfo(t.type, t.cat)[0], accById(t.account)?.name].join(" ")).includes(q)));
}
function movFiltered() { return movBase(); }
function countBy(list, key) {
  const m = new Map();
  for (const t of list) { const k = key(t); if (!k) continue; const e = m.get(k[0]) || { k: k[0], label: k[1], n: 0, spell: {} }; e.n++; e.spell[k[1]] = (e.spell[k[1]] || 0) + 1; m.set(k[0], e); }
  // the spelling you used most is the one shown
  return [...m.values()].map(e => ({ ...e, label: Object.entries(e.spell).sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}
// three compact drop-down menus instead of rows of buttons: a pill that shows the choice, with the
// native picker under it (the wheel on iPhone, a menu on the Mac). Each option says how many movements it has.
function movChips() {
  const pill = (key, label, value, opts) => {
    const on = !!value, cur = opts.find(o => o.v === value);
    return `<label class="fpill${on ? " on" : ""}"><span class="fpl">${esc(on && cur ? cur.l : label)}</span>${ic("chevD", 14)}
      <select data-mf="${key}" aria-label="${esc(label)}">${[{ v: "", l: label === "Conto" ? "Tutti i conti" : label === "Categoria" ? "Tutte le categorie" : "Tutte le note" }, ...opts]
        .map(o => `<option value="${esc(o.v)}"${o.v === value ? " selected" : ""}>${esc(o.l)}${o.n != null ? ` (${o.n})` : ""}</option>`).join("")}</select></label>`;
  };
  const accs = accounts(), accList = movBase("acc");
  const accOpts = accs.map(a => ({ v: a.id, l: a.name, n: accList.filter(t => t.account === a.id).length })).filter(o => o.n || o.v === movAcc);
  const catOpts = countBy(movBase("cat"), t => { const c = catInfo(t.type, t.cat)[0]; return [c, c]; }).map(c => ({ v: c.k, l: c.k, n: c.n }));
  const noteOpts = countBy(movBase("note"), t => { const n = norm(t.note); return n ? [n, t.note.trim().replace(/\s+/g, " ")] : null; })
    .filter(x => x.n > 1 || x.k === movNote).map(x => ({ v: x.k, l: x.label, n: x.n }));
  const any = movAcc || movCat || movNote;
  return `<div class="fpills">${accs.length ? pill("acc", "Conto", movAcc, accOpts) : ""}${pill("cat", "Categoria", movCat, catOpts)}${noteOpts.length || movNote ? pill("note", "Nota", movNote, noteOpts) : ""}
    ${any ? `<button class="fclear" data-mclear aria-label="Togli i filtri">${ic("close", 14)}</button>` : ""}</div>`;
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
    : movAcc || movCat || movNote ? emptyCard("search", "Nessun risultato", "Nessun movimento con questi filtri.")
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
    ${workTime(g.price) ? `<div class="gdate">${ic("clock", 14)}<span>${esc(workTime(g.price, true))} di lavoro</span></div>` : ""}
    ${savedFor(g) ? `<div class="gdate saved">${ic("wallet", 14)}<span>da parte ${esc(money(savedFor(g)))}</span></div>` : ""}
    ${g.deadline ? `<div class="gdate">${ic("calendar", 14)}<span>entro ${esc(fmtDate(g.deadline + "T12:00", { day: "numeric", month: "short" }))}</span></div>` : ""}
    ${g.last_price && g.last_price < g.price ? `<div class="gdate deal">${ic("label", 14)}<span>ora a ${esc(money(g.last_price))}</span></div>` : ""}
  </button>`;
}
function goalsScreen() {
  return `
  <header class="nav"><div><h1>Obiettivi</h1></div><div class="nav-r">${mascot()}<button class="nav-btn" data-goal-new aria-label="Nuovo obiettivo">${ic("plus", 20)}</button></div></header>
  ${D.active.length ? `<div class="goal-grid">${D.active.map(goalCard).join("")}<button class="gcard gadd" data-goal-new>${ic("plus", 24)}<span>Nuovo obiettivo</span></button></div>
    <p class="hint">${allocated() ? `Ogni obiettivo usa i soldi liberi del saldo (${money(freeBalance())}) più quelli che hai messo da parte apposta per lui.` : `Ogni obiettivo si confronta con tutto il saldo (${money(D.total)}).`} Quando ne compri uno il saldo scende e gli altri si aggiornano.</p>`
  : emptyCard("flag", "Nessun obiettivo", "Scrivi cosa vuoi comprare e quanto costa. Tutto il saldo lo fa avanzare.", `<button class="save small" data-goal-new>Nuovo obiettivo</button>`)}
  ${D.done.length ? `<div class="group-h" style="margin-top:28px"><span>Già comprati</span><span>${D.done.length}</span></div>
    <div class="list">${D.done.map(g => `<button class="row" data-goal="${esc(g.id)}">
      <span class="ico thumb">${g.img ? `<img src="${esc(g.img)}" alt="">` : ic("flag", 20)}</span>
      <span class="t"><b>${esc(g.name)}</b><small>${g.done_at ? esc(new Date(g.done_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })) : ""}</small></span>
      <span class="a num">${money(g.price)}</span></button>`).join("")}</div>` : ""}`;
}

function moreScreen() {
  const cloud = S.mode === "cloud" || DEMO;
  const last = S.lastSync ? new Date(S.lastSync).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "mai";
  return `
  <header class="nav"><div><h1>Altro</h1></div>${mascot()}</header>
  <a class="card guide-link" href="guida/" target="_blank" rel="noopener">${ic("receipt", 22)}<span><b>Guida all'uso</b><small>Come funziona Keepo, in due minuti</small></span>${ic("chevR", 16)}</a>
  <button class="card guide-link" data-more="tour">${ic("layout", 22)}<span><b>Rivedi il giro dell'app</b><small>Ti mostro di nuovo a cosa serve ogni parte</small></span>${ic("chevR", 16)}</button>
  <div class="group-h"><span>Account</span></div>
  <div class="list">
    ${cloud ? `<div class="cell"><span>Email</span><span>${esc(DEMO ? "giulia@esempio.it" : session?.user?.email || "")}</span></div>
      <div class="cell"><span>Ultimo aggiornamento</span><span id="syncText">${esc(last)}</span></div>
      <button class="cell btn" data-more="sync"><span>Aggiorna adesso</span></button>
      <button class="cell btn" data-more="password"><span>Cambia password</span></button>
      <button class="cell danger" data-more="logout"><span>Esci</span></button>`
    : `<div class="cell"><span>Dati salvati</span><span>Solo su questo dispositivo</span></div>
      <button class="cell btn" data-more="setup"><span>Accedi per salvare i dati online</span></button>`}
  </div>
  ${cloud ? `<div class="group-h"><span>Veloce</span></div>
  <div class="list"><button class="cell btn" data-more="siri"><span>Siri, widget e Comandi Rapidi</span><span>${ic("chevR", 16)}</span></button>
    <button class="cell btn" data-more="auto"><span>Automazioni</span><span class="cell-sub">Apple Pay, email della banca ${ic("chevR", 16)}</span></button></div>` : ""}
  <div class="group-h"><span>Pianificazione</span></div>
  <div class="list">
    <button class="cell btn" data-more="wage"><span>Quanto ti costa davvero</span><span>${S.settings.hourly ? esc(money(S.settings.hourly)) + "/ora" : "Imposta"}</span></button>
    <button class="cell btn" data-check><span>Allinea il saldo</span><span>${esc(CHECK_EVERY.find(c => c[0] === checkEvery())[1])}</span></button>
    <button class="cell btn" data-more="accounts"><span>Conti</span><span>${accounts().length || "Nessuno"}</span></button>
    <button class="cell btn" data-more="budgets"><span>Budget mensili</span><span>${Object.keys(S.settings.budgets || {}).filter(k => S.settings.budgets[k] > 0).length || "Nessuno"}</span></button>
    <button class="cell btn" data-more="dues"><span>Da ricevere e da dare</span><span>${dues().length || "Nessuno"}</span></button>
    <button class="cell btn" data-more="recurring"><span>Movimenti ricorrenti</span><span>${Object.values(S.rec).filter(r => r.active).length || "Nessuno"}</span></button>
  </div>
  <div class="group-h"><span>Prossimamente</span></div>
  <div class="list soon">${ROADMAP.map(r => `<div class="cell soonrow"><span class="ico">${ic(r.icon, 20)}</span>
    <span class="soont"><b>${esc(r.title)}${r.premium ? ` <i class="badge">Premium</i>` : ""}</b><small>${esc(r.text)}</small></span>
    <button class="pill sm${(S.settings.interest || []).includes(r.id) ? " on" : ""}" data-interest="${r.id}">${(S.settings.interest || []).includes(r.id) ? "Ti avviso" : "Mi interessa"}</button></div>`).join("")}</div>
  <p class="foot">Le funzioni Premium faranno parte di un abbonamento opzionale: quello che usi oggi resta gratis.</p>
  <div class="group-h"><span>Backup</span></div>
  <div class="list">
    <button class="cell btn" data-more="sheetimport"><span>Importa da Excel o da un'altra app</span><span class="cell-sub">CSV, Excel, Numbers ${ic("chevR", 16)}</span></button>
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
`;
}

// Sync state is shown only when something needs attention: offline or changes still waiting.
function syncBadge() {
  const f = $("#sideFoot");
  if (f) f.innerHTML = S.mode === "cloud"
    ? `<span>${esc(DEMO ? "giulia@esempio.it" : session?.user?.email || "")}</span>${!navigator.onLine ? `<span class="warn">${ic("cloudOff", 14)}Offline</span>` : S.pending.length ? `<span>${ic("sync", 14)}${S.pending.length} da inviare</span>` : ""}`
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
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
      authMsg(error ? italianAuthError(error) : "Ti ho mandato un'email con il link per scegliere una nuova password.", !error);
    };
    $("#lLocal").onclick = () => { S.mode = "local"; save(); render(); };
    $("#loginForm").insertAdjacentHTML("beforeend", `<p class="legal"><a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · <a href="termini.html" target="_blank" rel="noopener">Termini d'uso</a></p>`);
    $("#loginForm").onsubmit = async e => {
      e.preventDefault();
      const email = $("#lEmail").value.trim(), password = $("#lPass").value;
      $("#lGo").disabled = true; authMsg("");
      // the confirmation link must come back to this page (not to the Site URL set in Supabase)
      const { data, error } = signup ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } }) : await sb.auth.signInWithPassword({ email, password });
      $("#lGo").disabled = false;
      if (error) {
        authMsg(italianAuthError(error));
        if (/not confirmed/i.test(error.message || "")) $("#lErr").insertAdjacentHTML("beforeend", ` <button class="link" type="button" id="lResend">Mandami di nuovo l'email</button>`);
        const rs = $("#lResend"); if (rs) rs.onclick = async () => {
          const { error: e2 } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: appUrl() } });
          authMsg(e2 ? italianAuthError(e2) : "Email mandata di nuovo. Apri il link dal telefono o dal computer dove usi Keepo.", !e2);
        };
        return;
      }
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
// where links in Keepo's emails must lead: this page, without ?demo or other parameters
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, "");
function italianAuthError(e) {
  const m = String(e.message || "");
  if (/invalid login/i.test(m)) return "Email o password sbagliate.";
  if (/not confirmed/i.test(m)) return "Devi prima confermare l'email dal link che ti è arrivato.";
  if (/already registered/i.test(m)) return "Esiste già un account con questa email: accedi.";
  if (/signups not allowed/i.test(m)) return "La registrazione di nuovi account è disattivata.";
  if (/rate limit|too many|security purposes/i.test(m)) return "Troppe richieste in poco tempo: aspetta un minuto e riprova.";
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
    <div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${existing ? "Modifica" : "Nuovo movimento"}</h3>${existing ? "<span></span>" : `<button class="r scanbtn" id="txScan">${ic("camera", 18)}Scontrino</button>`}</div>
    <p class="peek" id="scanMsg"></p>
    <div id="scanItems"></div>
    <div class="seg" role="group"><button data-t="out">Uscita</button><button data-t="in">Entrata</button></div>
    <div class="amount"><div class="v num" id="amtV"></div><div class="worktime" id="wt"></div><div class="kbhint">Scrivi l'importo con la tastiera · Invio per salvare</div></div>
    <div class="cats" id="cats"></div>
    <div class="accs" id="accs"></div>
    <div class="fields">
      <div class="field"><input id="txNote" placeholder="Nota (facoltativa)" maxlength="80" value="${esc(existing?.note || "")}"></div>
      <div class="field"><label for="txDate">Data</label><input id="txDate" type="date" value="${dateVal}" style="text-align:right"></div>
      ${existing ? "" : `<div class="field"><label for="txRep">Ripeti</label><select id="txRep">
        <option value="">Mai</option><option value="week">Ogni settimana</option><option value="month">Ogni mese</option><option value="year">Ogni anno</option></select></div>`}
    </div>
    ${existing ? "" : `<div class="owe" id="oweBox" hidden><button class="link" id="oweOpen">${ic("clock", 15)}Qualcuno ti deve una parte?</button>
      <div class="fields" id="oweFields" hidden>
        <div class="field"><label for="oweAmt">Ti deve</label><input id="oweAmt" inputmode="decimal" placeholder="0,00" style="text-align:right"></div>
        <div class="field"><label for="oweWho">Chi</label><input id="oweWho" placeholder="Marco, Giulia…" maxlength="40" style="text-align:right"></div>
      </div></div>`}
    <div class="keypad" id="keypad">${["1","2","3","4","5","6","7","8","9",",","0","⌫"].map(k => `<button type="button" data-k="${k}" aria-label="${k === "⌫" ? "Cancella" : k}">${k}</button>`).join("")}</div>
    <button class="save" id="txSave">Salva</button>
    ${existing && accounts().length && !isNeutral(existing) ? `<button class="save ghost" id="txSplit">${ic("transfer", 18)}Dividi tra più conti</button>` : ""}
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
      const wt = workTime(parseAmt(str)); $("#wt").innerHTML = wt && t === "out" ? `${ic("clock", 14)}≈ ${esc(wt)} di lavoro` : "";
      if ($("#oweBox")) $("#oweBox").hidden = t !== "out";
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
    if ($("#oweOpen")) $("#oweOpen").onclick = () => { $("#oweOpen").hidden = true; $("#oweFields").hidden = false; const a = parseAmt(str); if (a) $("#oweAmt").value = centsToInput(Math.round(a / 2)); $("#oweWho").focus(); };
    sh.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { t = b.dataset.t; draw(); });
    $("#cats").onclick = e => { const b = e.target.closest("[data-cat]"); if (b) { cat = cat === b.dataset.cat ? "" : b.dataset.cat; draw(); } };
    $("#accs").onclick = e => { const b = e.target.closest("[data-acc]"); if (b) { acc = acc === b.dataset.acc ? "" : b.dataset.acc; draw(); } };
    $("#keypad").onclick = e => { const b = e.target.closest("[data-k]"); if (b) key(b.dataset.k); };
    if ($("#txScan")) $("#txScan").onclick = () => {
      const f = $("#fileIn"); f.value = ""; f.setAttribute("capture", "environment");
      f.onchange = async () => {
        f.removeAttribute("capture");
        const file = f.files[0]; if (!file) return;
        const msg = (text, cls = "") => { const el = $("#scanMsg"); if (el) { el.textContent = text; el.className = "peek " + cls; } };
        msg("Leggo lo scontrino sul telefono…", "busy");
        try {
          const r = await readReceipt(file, pct => msg(`Leggo lo scontrino… ${pct}%`, "busy"));
          if (!$("#amtV")) return;
          const got = [];
          if (r.total) { str = centsToInput(r.total).replace(/,00$/, ""); got.push("totale " + money(r.total)); }
          if (r.shop && !$("#txNote").value.trim()) { $("#txNote").value = r.shop; got.push("negozio"); }
          if (r.date) { $("#txDate").value = r.date; got.push("data"); }
          if (r.cat && !cat) { t = "out"; cat = r.cat; got.push("categoria " + r.cat); }
          t = "out"; draw();
          if (r.items.length) scanItems(r);
          msg(got.length ? `Letto: ${got.join(", ")}. Controlla e salva.` : "Non riesco a leggere il totale: prova con una foto più dritta e illuminata, o scrivilo tu.", got.length ? "ok" : "warn");
        } catch (err) {
          console.warn(err);
          msg("Non sono riuscito a leggere lo scontrino. Controlla la connessione la prima volta (scarico il lettore) e riprova.", "warn");
        }
      };
      f.click();
    };
    // the lines read from the receipt: untick what isn't yours and the amount follows
    const scanItems = r => {
      const off = new Set(), box = $("#scanItems");
      const paint = () => {
        const excl = r.items.reduce((a, it, i) => a + (off.has(i) ? it.amount : 0), 0);
        box.innerHTML = `<details class="sitems"${off.size ? " open" : ""}><summary>${r.items.length} righe lette${r.itemsMatch ? "" : ". La somma non fa il totale, controllale"}${off.size ? ` · tolti ${esc(money(excl))}` : ""}</summary>
          <div class="sitems-l">${r.items.map((it, i) => `<button type="button" class="sitem" data-si="${i}" aria-pressed="${!off.has(i)}"><span class="sbox">${ic("check", 13)}</span><span class="sn">${esc(it.name)}</span><span class="num${it.amount < 0 ? " pos" : ""}">${it.amount < 0 ? "−" : ""}${esc(money(Math.abs(it.amount)))}</span></button>`).join("")}</div>
          <p class="hint">Togli la spunta a quello che non è tuo e l'importo si abbassa.${off.size && $("#oweOpen") ? ` <button type="button" class="link" id="siOwe">Te li deve qualcuno?</button>` : ""}</p></details>`;
        str = centsToInput(Math.max(0, r.total - excl)).replace(/,00$/, ""); draw();
        const so = $("#siOwe"); if (so) so.onclick = () => { $("#oweOpen").click(); $("#oweAmt").value = centsToInput(excl); $("#oweWho").focus(); };
      };
      box.onclick = e => { const b = e.target.closest("[data-si]"); if (!b) return; const i = +b.dataset.si; off.has(i) ? off.delete(i) : off.add(i); paint(); };
      paint();
    };
    if (DEMO) window.__demoReceipt = r => { $("#scanItems").innerHTML = ""; scanItems(r); };
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
      const owe = !existing && t === "out" && $("#oweAmt") ? Math.min(parseAmt($("#oweAmt").value), amount) : 0;
      const oweWho = owe ? $("#oweWho").value.trim().replace(/\s+/g, " ") : "", oweId = uuid();
      close(); putTx(rec);
      if (freq) putRec({ id: uuid(), type: t, amount, cat, note: rec.note, account: rec.account, freq, next_ts: advance(ts, freq), active: true, created_at: Date.now() });
      if (owe) putDue({ id: oweId, dir: "in", amount: owe, who: oweWho, note: rec.note || catInfo("out", cat)[0], account: rec.account, due: null, tx: rec.id, created_at: Date.now() });
      toast(existing ? "Movimento aggiornato" : `${t === "in" ? "Entrata" : "Uscita"} di ${money(amount)} segnata${owe ? `, ${money(owe)} da ricevere` : ""}${freq ? `, si ripete ${FREQ[freq].toLowerCase()}` : ""}`, () => { if (before) putTx(before); else { delTx(rec.id); if (owe) delDue(oweId); } });
      if (!existing) mascotReact(t === "in" ? "jump" : "squish");
      if (!existing && t === "out") setTimeout(() => budgetAlert(cat, spentBefore, spentBefore + amount), 1800);
      celebrateIfReached(before ? before : null);
    };
    if (existing) $("#txDel").onclick = () => { const c = { ...existing }; close(); delTx(c.id); toast("Movimento eliminato", () => putTx(c)); };
    if ($("#txSplit")) $("#txSplit").onclick = () => splitSheet(existing);
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
    <p class="peek" id="gPeek"></p>
    <p class="hint">Incolla il link del prodotto: leggo io prezzo, nome e foto. Con una data ti dico quanto mettere da parte ogni mese.</p>
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
    // reading price, name and photo from the product link as soon as it is pasted
    let peekTimer = null, peekSeq = 0, typedPrice = !!existing;
    priceIn.addEventListener("input", () => { typedPrice = true; });
    const setPeek = (text, cls = "") => { const el = $("#gPeek"); if (el) { el.textContent = text; el.className = "peek " + cls; } };
    const peek = async () => {
      let u = $("#gUrl").value.trim();
      if (!u) { setPeek(""); return; }
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      if (S.mode !== "cloud" || !sb || !session || u === existing?.url) return;
      const seq = ++peekSeq;
      setPeek("Leggo prezzo, nome e foto dal link…", "busy");
      const { data: rid, error } = await sb.rpc("peek_price", { p_url: u });
      if (seq !== peekSeq) return;
      if (error || !rid) { setPeek(error && /function|schema/i.test(error.message) ? "" : "Non riesco a leggere questo link: scrivi il prezzo tu."); return; }
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 1500));
        if (seq !== peekSeq || !$("#gPeek")) return;
        const { data: r } = await sb.rpc("peek_price_result", { p_request: rid });
        if (!r || r.status === "pending") continue;
        if (r.status !== "ok") { setPeek("Questo sito non permette di leggere il prezzo: scrivilo tu. Lo riproverò ogni mattina.", "warn"); return; }
        const got = [];
        if (r.price) {
          if (!typedPrice || !parseAmt(priceIn.value)) { priceIn.value = centsToInput(r.price); got.push("prezzo " + money(r.price)); }
          else got.push("sul sito costa " + money(r.price));
        }
        const title = cleanTitle(r.title);
        if (title && !nameIn.value.trim()) { nameIn.value = title.slice(0, 60); got.push("nome"); }
        if (r.image && !img) { img = r.image; drawPrev(); got.push("foto"); }
        validate();
        setPeek(got.length ? `Letto dal link: ${got.join(", ")}. Controlla e salva.` : "Non trovo il prezzo in questa pagina: scrivilo tu.", got.length ? "ok" : "warn");
        return;
      }
      setPeek("Il sito non risponde: scrivi il prezzo tu, lo controllerò più tardi.", "warn");
    };
    $("#gUrl").addEventListener("input", () => { clearTimeout(peekTimer); peekTimer = setTimeout(peek, 700); });
    $("#gUrl").addEventListener("paste", e => {
      const t = e.clipboardData?.getData("text") || "", m = t.match(/https?:\/\/\S+/);
      if (m && m[0] !== t.trim()) { e.preventDefault(); $("#gUrl").value = m[0]; clearTimeout(peekTimer); peekTimer = setTimeout(peek, 100); }
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
  const pct = goalPct(g), ok = pct >= 100, left = Math.max(0, g.price - goalHave(g)), saved = savedFor(g);
  sheet(`
    <div class="sheet-h"><button class="l" id="gEdit">Modifica</button><h3></h3><button class="r" data-x>Fine</button></div>
    <div class="detail">
      <div class="gimg detail-img">${goalThumb(g)}</div>
      <h2>${esc(g.name)}</h2><p class="sub num">${money(g.price)}</p>
      <div class="dprog${ok ? " ok" : ""}"><span class="num">${ok ? "Raggiunto" : Math.floor(pct) + "%"}</span><div class="prog"><i style="width:${pct}%"></i></div></div>
      <div class="stats3">
        <div><span>Hai</span><b class="num">${money(goalHave(g))}</b></div>
        <div><span>Prezzo</span><b class="num">${money(g.price)}</b></div>
        <div><span>Mancano</span><b class="num${left ? "" : " pos"}">${left ? money(left) : "0 €"}</b></div>
      </div>
      <p class="eta">${esc(eta(g))}</p>
      <div class="gsave">
        <div class="gsave-t"><span>Messi da parte per questo</span><b class="num">${money(saved)}</b>
          <small>${saved ? `Contano solo qui. Gli altri obiettivi usano il resto del saldo (${esc(money(freeBalance()))}).` : "Tieni dei soldi solo per questo obiettivo: restano nel saldo, ma gli altri non li usano."}</small></div>
        <div class="gsave-b"><button class="pill sm" id="gsAdd">${ic("plus", 15)}Metti da parte</button>${saved ? `<button class="pill sm" id="gsDel">${ic("minus", 15)}Togli</button>` : ""}</div>
      </div>
      ${workTime(g.price) ? `<div class="plan">${ic("clock", 18)}<span>Ti costa circa <b>${esc(workTime(g.price))}</b> di lavoro.</span></div>` : ""}
      ${g.deadline && !ok ? `<div class="plan">${ic("calendar", 18)}<span>${esc(deadlinePlan(g))}</span></div>` : ""}
    </div>
    ${g.url && (S.mode === "cloud" || DEMO) ? `<div class="pricebox" id="priceBox">${priceBox(g, null)}</div>` : ""}
    ${g.url ? `<a class="save ghost linkbtn" href="${esc(g.url)}" target="_blank" rel="noopener">${ic("external", 18)}Apri su ${esc(hostOf(g.url))}</a>` : ""}
    <button class="save ${ok ? "in" : "ghost"}" id="gBuy">${ok ? "L'ho comprato" : "L'ho comprato lo stesso"}</button>
    <div id="buyBox"></div>
    <button class="save danger" id="gDel">Elimina obiettivo</button>
    <div id="delBox"></div>
  `, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    $("#gEdit").onclick = () => goalEditSheet(g);
    $("#gsAdd").onclick = () => setAsideSheet(g, 1);
    if ($("#gsDel")) $("#gsDel").onclick = () => setAsideSheet(g, -1);
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
        <p>Segno l'uscita per quanto l'hai pagato e lo sposto tra i comprati.${accounts().length ? " Se hai pagato con più conti o con un buono, dividi il pagamento." : ""}</p>
        <div id="payRows"></div>
        <div class="btnrow"><button class="save ghost" id="buyNo">Annulla</button><button class="save in" id="buyYes">Conferma</button></div></div>`;
      const pay = paymentRows($("#payRows"), [{ acc: lastAccount(), amount: g.price }], { label: "Pagato", total: g.price });
      $("#buyNo").onclick = () => { $("#buyBox").innerHTML = ""; $("#gBuy").hidden = false; };
      $("#buyYes").onclick = () => {
        const rows = pay.rows().filter(r => r.amount > 0);
        if (!rows.length) { toast("Scrivi quanto l'hai pagato"); return; }
        const paid = rows.reduce((a, r) => a + r.amount, 0), ts = Date.now();
        close();
        rows.forEach(r => { const t = { id: uuid(), type: "out", amount: r.amount, cat: "Obiettivo", note: g.name, ts, account: r.acc || null }; S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); });
        if (savedFor(g)) { const gs = { ...goalSaved() }; delete gs[g.id]; S.settings = { ...S.settings, goalSaved: gs }; enqueue({ op: "up", t: "settings", row: { data: S.settings } }); }
        putGoal({ ...g, price: paid, done: true, done_at: ts });
        toast(rows.length > 1 ? `${g.name} comprato: ${money(paid)} divisi su ${rows.length} conti` : `${g.name} comprato: uscita di ${money(paid)} segnata`);
        snapshotReached();
      };
    };
    $("#gDel").onclick = () => {
      $("#gDel").hidden = true;
      $("#delBox").innerHTML = `<div class="confirm"><p>Eliminare "${esc(g.name)}"? I movimenti non cambiano.</p>
        <div class="btnrow"><button class="save ghost" id="delNo">Annulla</button><button class="save" style="background:var(--neg);color:#fff" id="delYes">Elimina</button></div></div>`;
      $("#delNo").onclick = () => { $("#delBox").innerHTML = ""; $("#gDel").hidden = false; };
      $("#delYes").onclick = () => { const c = { ...g }, sv = savedFor(g); close(); if (sv) { const gs = { ...goalSaved() }; delete gs[g.id]; saveSettings({ goalSaved: gs }); } delGoal(g.id); toast("Obiettivo eliminato", () => { putGoal(c); if (sv) saveSettings({ goalSaved: { ...goalSaved(), [c.id]: sv } }); }); };
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

/* Scelta file. Il campo sta fuori da #app: su iPhone la scelta manda la pagina in secondo piano,
   al rientro parte una sincronizzazione che ridisegna la schermata e un campo dentro #app verrebbe
   sostituito, perdendo il file. Nessun filtro sui formati, su nessun dispositivo: iPhone, Android,
   Drive, OneDrive e Dropbox danno spesso tipi o estensioni strani e il filtro rende i file grigi.
   Il formato lo riconosce chi legge il file, dai primi byte (sniffFile). */
let pickAt = 0;   // when the last file picker was opened: an update waits for it (see controllerchange)
function pickFile(accept, onFile) {
  document.getElementById("filePick")?.remove();
  pickAt = Date.now();
  const f = document.createElement("input");
  f.type = "file"; f.id = "filePick"; if (accept) f.accept = accept;
  f.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  f.addEventListener("change", () => { const file = f.files[0]; f.remove(); pickAt = 0; if (file) onFile(file); });
  f.addEventListener("cancel", () => { f.remove(); pickAt = 0; });
  document.body.appendChild(f);
  f.click();
}

/* ============ import da Excel / CSV di altre app ============ */
const SUPPORT_EMAIL = window.SALVADANAIO_CONFIG?.supportEmail || "";
const IMP_FIELDS = [["", "Non importare"], ["date", "Data"], ["amount", "Importo (+/−)"], ["in", "Entrate"], ["out", "Uscite"], ["type", "Tipo (entrata/uscita)"], ["cat", "Categoria"], ["note", "Descrizione"], ["account", "Conto"]];
const IMP_HEAD = [["cat", /categor|category|tag\b|gruppo/], ["note", /descri|note|causale|memo|dettagl|beneficiar|payee|esercente|merchant|titolo|controparte|oggetto/],
  ["account", /^conto|account|wallet|portafogl|^banca|^bank/], ["type", /^tipo$|^type$|tipologia|^segno$|entrata\/uscita|in\/out/],
  ["date", /\bdata\b|date|giorno|^day$|quando/], ["in", /entrat|accredit|avere|income|credit|incass/], ["out", /uscit|addebit|\bdare\b|expense|debit|pagament/],
  ["amount", /importo|amount|valore|ammontare|somma|totale|^euro$|^eur$|cifra/]];
const CAT_SYN = {
  out: [[/spesa|supermerc|aliment|grocer|market/, "Spesa"], [/casa|affitto|mutuo|rent|condomin|arred/, "Casa"],
    [/bollet|luce|gas\b|acqua|internet|telefon|utilit|abbonament|subscript/, "Bollette"], [/traspor|benzin|carbur|auto\b|treno|bus\b|metro|taxi|parchegg|autostrad|fuel/, "Trasporti"],
    [/svago|diverti|cinema|viagg|vacanz|hobby|sport|palestra|gioc|entertain|travel|leisure/, "Svago"], [/ristor|\bbar\b|pizz|cibo|food|restaur|caff|coffee|delivery|pranzo|cena|aperitiv/, "Ristoranti"],
    [/shopping|abbigli|vestit|scarpe|cloth|elettron|acquist/, "Shopping"], [/salute|farmac|medic|dentist|health|pharma|visita|sanit/, "Salute"]],
  in: [[/stipend|salar|busta paga|payroll|wage|pension/, "Stipendio"], [/paghett|allowance/, "Paghetta"], [/regal|gift/, "Regalo"],
    [/vendit|vinted|subito|ebay|sold/, "Vendita"], [/lavorett|freelanc|ripetiz|prestaz/, "Lavoretto"], [/interess|interest|cedol|dividend|rendiment/, "Interessi"]]
};
const impNorm = s => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function impNum(v) {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/[\s €]|eur/gi, ""), neg = false;
  if (!s) return NaN;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }
  s = s.replace(/^\+/, "");
  const c = s.lastIndexOf(","), d = s.lastIndexOf(".");
  if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (c >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return isFinite(n) ? (neg ? -Math.abs(n) : n) : NaN;
}
function impDate(v) {
  if (v instanceof Date) return isNaN(v) ? NaN : v.getTime();
  if (typeof v === "number" && v > 20000 && v < 80000) { const u = new Date(Math.round((v - 25569) * DAY)); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12).getTime(); }
  const s = String(v ?? "").trim(); let m;
  const tm = s.match(/(\d{1,2}):(\d{2})/), hh = tm ? +tm[1] : 12, mi = tm ? +tm[2] : 0;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], m[2] - 1, +m[3], hh, mi).getTime();
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) {
    let [a, b, y] = [+m[1], +m[2], +m[3]]; if (y < 100) y += 2000; if (b > 12 && a <= 12) [a, b] = [b, a];
    return b >= 1 && b <= 12 && a >= 1 && a <= 31 ? new Date(y, b - 1, a, hh, mi).getTime() : NaN;
  }
  const p = Date.parse(s); return isNaN(p) || !/\d{4}/.test(s) ? NaN : p;
}
function impCsv(text) {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/).slice(0, 5).join("\n");
  const del = [";", "\t", ","].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === del) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
// Che file è, dai primi byte e non dal nome: da Android o dal cloud il nome può non avere estensione.
async function sniffFile(file) {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const hex = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("504b0304")) return "zip";                 // xlsx, ods, numbers
  if (hex.startsWith("d0cf11e0")) return "xls";                 // Excel 97-2003
  if (hex.startsWith("25504446")) return "pdf";
  if (/^(ffd8ff|89504e47|47494638|52494646)/.test(hex) || /^0000001[48]66747970/.test(hex)) return "image";
  const head = (await file.slice(0, 2000).text()).replace(/^\ufeff/, "").trimStart();
  if (head.startsWith("{")) return "json";
  if (/^<\?xml|^<html|^<table/i.test(head)) return "sheet";     // vecchi export "Excel" in XML/HTML: li legge SheetJS
  return "text";
}
async function impReadFile(file, kind) {
  if (kind === "text") return impCsv(await file.text());
  await loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheets = wb.SheetNames.map(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }));
  return sheets.sort((a, b) => b.length - a.length)[0] || [];
}
function impGuess(rows) {
  rows = rows.filter(r => r.some(c => String(c).trim()));
  let hi = -1, best = 0;
  rows.slice(0, 15).forEach((r, i) => { const sc = r.filter(c => typeof c === "string" && IMP_HEAD.some(([, re]) => re.test(impNorm(c)))).length; if (sc > best) { best = sc; hi = i; } });
  const width = Math.max(...rows.map(r => r.length));
  const head = hi >= 0 ? rows[hi] : [];
  const body = rows.slice(hi + 1);
  const cols = Array.from({ length: width }, (_, i) => ({ name: String(head[i] ?? "").trim() || "Colonna " + String.fromCharCode(65 + (i % 26)), field: "" }));
  const used = new Set();
  cols.forEach(c => { const h = impNorm(c.name); const f = IMP_HEAD.find(([k, re]) => !used.has(k) && re.test(h)); if (f && hi >= 0) { c.field = f[0]; used.add(f[0]); } });
  const sample = i => body.slice(0, 30).map(r => r[i]).filter(v => String(v).trim() !== "");
  const share = (i, fn) => { const s = sample(i); return s.length ? s.filter(fn).length / s.length : 0; };
  if (!used.has("date")) { const i = cols.findIndex((c, i) => !c.field && share(i, v => !isNaN(impDate(v))) > .6); if (i >= 0) { cols[i].field = "date"; used.add("date"); } }
  if (!used.has("amount") && !used.has("in") && !used.has("out")) { const i = cols.findIndex((c, i) => !c.field && share(i, v => !isNaN(impNum(v))) > .6); if (i >= 0) cols[i].field = "amount"; }
  if (!used.has("note")) { const i = cols.findIndex((c, i) => !c.field && share(i, v => typeof v === "string" && isNaN(impNum(v)) && isNaN(impDate(v))) > .6); if (i >= 0) cols[i].field = "note"; }
  return { cols, body };
}
function impCat(type, raw, note) {
  const r = impNorm(raw), list = CATS[type];
  if (r) {
    const exact = list.find(([n]) => impNorm(n) === r); if (exact) return { cat: exact[0] };
    if (/trasferiment|giroconto|transfer/.test(r)) return { cat: TRANSFER };
    const syn = CAT_SYN[type].find(([re]) => re.test(r)); if (syn) return { cat: syn[1] };
    return { cat: "Altro", unknown: String(raw).trim() };
  }
  const n = impNorm(note);
  const syn = CAT_SYN[type].find(([re]) => re.test(n)) || (type === "out" ? SHOP_CATS.find(([re]) => re.test(n)) : null);
  return { cat: syn ? syn[1] : "Altro" };
}
function impBuild(P) {
  const col = f => P.cols.findIndex(c => c.field === f);
  const ix = Object.fromEntries(IMP_FIELDS.slice(1).map(([f]) => [f, col(f)]));
  const out = [], unknownCats = new Set(), newAccs = new Set(); let bad = 0;
  P.body.forEach(r => {
    const ts = ix.date >= 0 ? impDate(r[ix.date]) : NaN;
    let v = NaN;
    if (ix.amount >= 0) v = impNum(r[ix.amount]);
    if ((isNaN(v) || !v) && (ix.in >= 0 || ix.out >= 0)) { const a = ix.in >= 0 ? impNum(r[ix.in]) : NaN, b = ix.out >= 0 ? impNum(r[ix.out]) : NaN; v = a ? Math.abs(a) : b ? -Math.abs(b) : NaN; }
    if (isNaN(ts) || isNaN(v) || !v) { bad++; return; }
    let type = v > 0 ? "in" : "out";
    if (ix.type >= 0) { const t = impNorm(r[ix.type]); if (/entrat|income|accredit|credit|ricev|topup|ricaric|^in$|^\+/.test(t)) type = "in"; else if (/uscit|expense|spes|addebit|debit|pagament|card|^out$|^-/.test(t)) type = "out"; }
    let note = ix.note >= 0 ? String(r[ix.note] ?? "").trim().slice(0, 200) : "";
    const { cat, unknown } = impCat(type, ix.cat >= 0 ? r[ix.cat] : "", note);
    if (unknown) { unknownCats.add(unknown); note = note ? `${note} · ${unknown}` : unknown; }
    let account = P.target || null;
    if (ix.account >= 0) { const an = String(r[ix.account] ?? "").trim(); if (an) { const a = accounts().find(a => impNorm(a.name) === impNorm(an)); if (a) account = a.id; else { newAccs.add(an); account = "new:" + an; } } }
    out.push({ type, amount: Math.round(Math.abs(v) * 100), cat, note, ts, account });
  });
  // già presenti: stesso tipo, importo, giorno e descrizione (reimportare lo stesso file non duplica)
  const key = t => `${t.type}|${t.amount}|${new Date(t.ts).toDateString()}|${impNorm(t.note)}`;
  const have = {}; Object.values(S.tx).forEach(t => { const k = key(t); have[k] = (have[k] || 0) + 1; });
  const fresh = out.filter(t => { const k = key(t); if (have[k]) { have[k]--; return false; } return true; });
  const unmapped = P.cols.filter((c, i) => !c.field && P.body.some(r => String(r[i] ?? "").trim())).map(c => c.name);
  return { rows: fresh, dup: out.length - fresh.length, bad, unknownCats: [...unknownCats], newAccs: [...newAccs], unmapped };
}
function impMail(R, ext) {
  const list = a => a.slice(0, 15).join(", ").slice(0, 400);
  const body = `Ciao, ho provato a importare in Keepo un file .${ext} esportato da un'altra app.\n\nApp da cui l'ho esportato: \n` +
    (R.unmapped.length ? `\nColonne che Keepo non legge ancora: ${list(R.unmapped)}\n` : "") +
    (R.unknownCats.length ? `\nCategorie che Keepo non ha: ${list(R.unknownCats)}\n` : "") +
    `\nVorrei che Keepo le gestisse così:\n\n`;
  return `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${encodeURIComponent("Keepo: richiesta per l'import da file")}&body=${encodeURIComponent(body)}`;
}
async function importSheetFile(file) {
  const kind = await sniffFile(file).catch(() => "text");
  if (kind === "json") return importBackup(file);
  if (kind === "pdf" || kind === "image") { toast(kind === "pdf" ? "I PDF non si possono importare: dall'app esporta in Excel o CSV" : "Questa è una foto: scegli un file Excel o CSV"); return; }
  let P;
  try { const rows = await impReadFile(file, kind); P = impGuess(rows); if (!P.body.length) throw 0; }
  catch { toast(/\.numbers$/i.test(file.name) ? "Da Numbers usa Esporta → Excel o CSV e riprova" : "Non riesco a leggere questo file: prova a esportarlo in Excel o CSV"); return; }
  if (P.body.length > 20000) P.body = P.body.slice(0, 20000);
  P.target = lastAccount() || "";
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const fd = ts => new Date(ts).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "2-digit" });
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Importa movimenti</h3><button class="r" id="impGo">Importa</button></div><div id="impBody"></div>`, (sh, close) => {
    let R;
    const draw = () => {
      R = impBuild(P);
      const inn = R.rows.filter(t => t.type === "in"), outt = R.rows.filter(t => t.type === "out"), sum = a => a.reduce((s, t) => s + t.amount, 0);
      const ts = R.rows.map(t => t.ts), hasAcc = P.cols.some(c => c.field === "account");
      $("#impBody").innerHTML = `<p class="hint" style="margin:0 4px 12px">${esc(file.name)}: ${P.body.length} righe. Controlla che ogni colonna vada nel campo giusto di Keepo.</p>
        <div class="group-h"><span>Colonne</span></div>
        <div class="list">${P.cols.map((c, i) => { const s = P.body.find(r => String(r[i] ?? "").trim())?.[i]; return `<label class="cell"><span>${esc(c.name)}${s !== undefined ? `<small style="display:block;color:var(--ink2);font-size:12.5px">es. ${esc(String(s).slice(0, 30))}</small>` : ""}</span>
          <select data-impcol="${i}">${IMP_FIELDS.map(([f, l]) => `<option value="${f}"${c.field === f ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`; }).join("")}</div>
        ${hasAcc ? (R.newAccs.length ? `<p class="hint">Creo i conti che non hai ancora: ${esc(R.newAccs.join(", "))}.</p>` : "")
          : accounts().length ? `<div class="list" style="margin-top:12px"><label class="cell"><span>Metti tutto su</span><select id="impAcc"><option value="">Nessun conto</option>${accounts().map(a => `<option value="${esc(a.id)}"${P.target === a.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label></div>` : ""}
        <div class="group-h"><span>Anteprima</span><span class="num">${R.rows.length}</span></div>
        ${R.rows.length ? `<div class="list">${R.rows.slice(0, 5).map(t => `<div class="row"><span class="t"><b>${esc(t.note || t.cat)}</b><small>${esc(fd(t.ts))} · ${esc(t.cat)}</small></span><span class="a num${t.type === "in" ? " in" : ""}">${t.type === "in" ? "+" : "−"}${money(t.amount)}</span></div>`).join("")}</div>
          <p class="hint">${inn.length} entrate per ${money(sum(inn))} e ${outt.length} uscite per ${money(sum(outt))}, dal ${esc(fd(Math.min(...ts)))} al ${esc(fd(Math.max(...ts)))}.</p>` : `<p class="hint">${R.dup && !R.bad ? "Questi movimenti ci sono già tutti in Keepo." : "Nessun movimento da importare con queste colonne. Serve almeno una data e un importo."}</p>`}
        ${R.dup || R.bad ? `<p class="hint">${R.dup ? `${R.dup} già presenti in Keepo, li salto. ` : ""}${R.bad ? `${R.bad} righe senza data o importo, le salto.` : ""}</p>` : ""}
        ${R.unmapped.length || R.unknownCats.length ? `<div class="confirm" style="margin-top:16px"><p><b>Keepo non sa ancora usare tutto</b></p>
          ${R.unmapped.length ? `<p class="hint" style="margin:0">Colonne non importate: ${esc(R.unmapped.join(", "))}.</p>` : ""}
          ${R.unknownCats.length ? `<p class="hint" style="margin:0">Categorie che Keepo non ha: ${esc(R.unknownCats.slice(0, 12).join(", "))}. Le metto in Altro e scrivo il nome nella descrizione.</p>` : ""}
          <a class="save ghost" style="display:block;text-align:center;text-decoration:none" href="${esc(impMail(R, ext))}">Chiedi di aggiungerlo</a>
          <p class="hint" style="margin:0">Si apre una mail con i nomi delle colonne e delle categorie, senza importi né movimenti.</p></div>` : ""}`;
    };
    draw();
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("change", e => {
      const s = e.target.closest("[data-impcol]");
      if (s) { const f = s.value; if (f) P.cols.forEach(c => { if (c.field === f) c.field = ""; }); P.cols[+s.dataset.impcol].field = f; draw(); }
      if (e.target.id === "impAcc") { P.target = e.target.value; draw(); }
    });
    $("#impGo").onclick = () => {
      if (!R.rows.length) { toast("Niente da importare"); return; }
      const made = {};
      if (R.newAccs.length) {
        const list = accounts().slice();
        R.newAccs.forEach(n => { const a = { id: uuid(), name: n.slice(0, 30), color: ACC_COLORS[list.length % ACC_COLORS.length] }; list.push(a); made[n] = a.id; });
        S.settings = { ...S.settings, accounts: list }; enqueue({ op: "up", t: "settings", row: { data: S.settings } });
      }
      const ids = [];
      R.rows.forEach(r => {
        const t = { id: uuid(), ...r, account: r.account?.startsWith("new:") ? made[r.account.slice(4)] : r.account };
        S.tx[t.id] = t; ids.push(t.id); enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) });
      });
      close(); commit();
      toast(`Importati ${ids.length} movimenti`, () => { ids.forEach(id => { delete S.tx[id]; enqueue({ op: "del", t: "transactions", id }); }); commit(); });
    };
  });
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

/* ============ soldi messi da parte per un obiettivo ============ */
function setAsideSheet(g, dir) {
  const saved = savedFor(g), free = freeBalance(), left = Math.max(0, g.price - saved);
  const max = dir > 0 ? Math.min(free, left || free) : saved;
  const quick = dir > 0 ? [1000, 5000, 10000].filter(v => v < max).concat(max ? [max] : []) : [saved];
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${dir > 0 ? "Metti da parte" : "Togli"}</h3><button class="r" id="saGo">Fatto</button></div>
    <p class="hint" style="margin:0 4px 12px">${dir > 0
      ? `Per ${esc(g.name)}. I soldi non escono dal saldo: li tengo solo per questo obiettivo. Liberi adesso: ${esc(money(free))}.`
      : `Tornano liberi per tutti gli obiettivi. Ora ne hai ${esc(money(saved))} da parte per ${esc(g.name)}.`}</p>
    <div class="fields"><div class="field"><label for="saAmt">Importo</label><input id="saAmt" inputmode="decimal" placeholder="0,00" style="text-align:right"></div></div>
    <div class="accs">${quick.map((v, i) => `<button class="achip" data-sa="${v}">${i === quick.length - 1 && dir > 0 ? (v === left ? "Tutto quello che manca · " : "Tutti i liberi · ") : i === quick.length - 1 ? "Tutti · " : ""}${esc(money(v))}</button>`).join("")}</div>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("click", e => { const b = e.target.closest("[data-sa]"); if (b) $("#saAmt").value = centsToInput(+b.dataset.sa); });
    setTimeout(() => $("#saAmt")?.focus(), 250);
    $("#saGo").onclick = () => {
      const v = Math.min(parseAmt($("#saAmt").value), dir > 0 ? free : saved);
      if (!v) { toast(dir > 0 && !free ? "Non ci sono soldi liberi da mettere da parte" : "Scrivi l'importo"); return; }
      const before = saved, after = saved + dir * v;
      close(); snapshotReached();
      const gs = { ...goalSaved() }; if (after > 0) gs[g.id] = after; else delete gs[g.id];
      saveSettings({ goalSaved: gs });
      toast(dir > 0 ? `${money(v)} da parte per ${g.name}` : `${money(v)} di nuovo liberi`, () => saveSettings({ goalSaved: { ...goalSaved(), [g.id]: before } }));
      mascotReact(dir > 0 ? "jump" : "squish"); celebrateIfReached();
    };
  });
}

/* ============ da ricevere / da dare ============ */
// Money you are waiting for (a Vinted sale, a friend who owes you) or that you owe. It lives in the
// settings JSON, never among the transactions: it is not in the balance, the charts or "Saldo Keepo"
// until you tap Arrivati / Pagato, which turns it into a normal movement on the chosen account.
const MARKETS = /vinted|subito|ebay|wallapop|depop|etsy|amazon/i;
const dues = () => (S.settings.dues || []).filter(d => d && d.amount > 0);
const duesIn = () => dues().filter(d => d.dir !== "out").sort((a, b) => (a.due || a.created_at) - (b.due || b.created_at));
const duesOut = () => dues().filter(d => d.dir === "out").sort((a, b) => (a.due || a.created_at) - (b.due || b.created_at));
const duesTotal = list => list.reduce((s, d) => s + d.amount, 0);
function putDue(d) { saveSettings({ dues: [...dues().filter(x => x.id !== d.id), d] }); }
function delDue(id) { saveSettings({ dues: dues().filter(x => x.id !== id) }); }
const dueTitle = d => d.who && d.note ? `${d.who} · ${d.note}` : d.who || d.note || (d.dir === "out" ? "Da dare" : "Da ricevere");
function dueWhen(d) {
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  if (d.due) {
    const days = Math.round((new Date(d.due).setHours(0, 0, 0, 0) - day0) / DAY);
    return days < 0 ? `in ritardo di ${-days === 1 ? "un giorno" : -days + " giorni"}` : days === 0 ? "atteso oggi" : days === 1 ? "atteso domani" : `atteso ${fmtDate(d.due, { day: "numeric", month: "short" })}`;
  }
  const ago = Math.floor((day0 - new Date(d.created_at).setHours(0, 0, 0, 0)) / DAY);
  return ago <= 0 ? "segnato oggi" : ago === 1 ? "da ieri" : `da ${ago} giorni`;
}
function dueRow(d) {
  const a = accById(d.account), late = d.due && d.due < new Date().setHours(0, 0, 0, 0);
  // like Reminders: an empty circle; the check appears only when you tap it
  return `<div class="row duerow">
    <button class="darr ${d.dir === "out" ? "out" : "in"}" data-due-done="${esc(d.id)}" aria-label="${d.dir === "out" ? "Segna come pagato" : "Segna come arrivati"}: ${esc(dueTitle(d))}" title="${d.dir === "out" ? "Pagato" : "Arrivati"}">${ic("check", 16)}</button>
    <button class="dmain" data-due="${esc(d.id)}">
      <span class="t"><b>${esc(d.who || d.note || (d.dir === "out" ? "Da dare" : "Da ricevere"))}</b><small class="${late ? "late" : ""}">${a ? `<i class="adot" style="background:${a.color}"></i>` : ""}${esc([d.who && d.note, dueWhen(d), a?.name].filter(Boolean).join(" · "))}</small></span>
      <span class="a num ${d.dir === "out" ? "out" : "in"}">${d.dir === "out" ? "−" : "+"}${money(d.amount)}</span>
    </button>
  </div>`;
}
function duesWidget() {
  const inn = duesIn(), out = duesOut();
  if (!inn.length && !out.length) return `<section class="section">
    <div class="sec-h"><h2>Da ricevere</h2></div>
    <div class="card empty dues-empty"><span class="empty-ico">${ic("clock", 26)}</span><b>Aspetti dei soldi?</b><span>Una vendita su Vinted, un amico che ti deve la cena: segnali qui e tocca il cerchio quando arrivano. Fino ad allora non contano nel saldo.</span>
    <button class="save small" data-due-new="in">Aggiungi</button></div></section>`;
  return `<section class="section">
    <div class="sec-h"><h2>Da ricevere</h2><button class="link" data-due-new="in">${ic("plus", 15)}Aggiungi</button></div>
    ${inn.length ? `<p class="sec-note">In arrivo <b class="num pos">${money(duesTotal(inn))}</b></p><div class="list">${inn.map(dueRow).join("")}</div>` : ""}
    ${out.length ? `<p class="sec-note" style="margin-top:${inn.length ? 14 : 0}px">Devi dare <b class="num">${money(duesTotal(out))}</b></p><div class="list">${out.map(dueRow).join("")}</div>` : ""}
  </section>`;
}
function dueSheet(existing, preset = {}) {
  let dir = existing?.dir || preset.dir || "in", acc = existing ? existing.account || "" : preset.account ?? lastAccount();
  const pastWho = [...new Map(dues().concat(S.settings.duesWho || []).map(d => [norm(d.who), (d.who || "").trim()])).values()].filter(Boolean);
  const whoChips = [...new Set(["Vinted", "Subito", ...pastWho])].slice(0, 8);
  const dueVal = existing?.due ? new Date(existing.due).toISOString().slice(0, 10) : "";
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${existing ? "Modifica" : "Nuovo"}</h3><button class="r" id="dGo">Salva</button></div>
    <div class="seg" role="group"><button data-d="in">Da ricevere</button><button data-d="out">Da dare</button></div>
    <div class="fields">
      <div class="field"><label for="dAmt">Importo</label><input id="dAmt" inputmode="decimal" placeholder="0,00" value="${existing ? esc(centsToInput(existing.amount)) : preset.amount ? esc(centsToInput(preset.amount)) : ""}" style="text-align:right"></div>
      <div class="field"><label for="dWho" id="dWhoL">Da chi</label><input id="dWho" placeholder="Vinted, Marco…" maxlength="40" value="${esc(existing?.who || preset.who || "")}" style="text-align:right"></div>
    </div>
    <div class="accs" id="dWhoChips">${whoChips.map(w => `<button class="achip" data-dwho="${esc(w)}">${esc(w)}</button>`).join("")}</div>
    <div class="fields">
      <div class="field"><input id="dNote" placeholder="Per cosa (facoltativo): maglione, cena…" maxlength="60" value="${esc(existing?.note || preset.note || "")}"></div>
      <div class="field"><label for="dDue">Quando arriva</label><input id="dDue" type="date" value="${dueVal}" style="text-align:right"></div>
    </div>
    <div class="accs" id="dAccs"></div>
    <p class="hint" id="dHint"></p>
    ${existing ? `<button class="save danger" id="dDel">Elimina</button>` : ""}`, (sh, close) => {
    const draw = () => {
      sh.querySelectorAll("[data-d]").forEach(b => b.setAttribute("aria-pressed", b.dataset.d === dir));
      $("#dWhoL").textContent = dir === "out" ? "A chi" : "Da chi";
      const accs = accounts();
      $("#dAccs").innerHTML = accs.length ? `<span class="accs-l">${dir === "out" ? "Da quale conto" : "Dove arriveranno"}</span>` + accs.map(a => `<button class="achip" data-dacc="${esc(a.id)}" aria-pressed="${acc === a.id}"><i class="adot" style="background:${a.color}"></i>${esc(a.name)}</button>`).join("") : "";
      $("#dHint").textContent = dir === "out" ? "Quando li hai dati tocca il cerchio e diventa un'uscita." : "Finché non tocchi il cerchio non conta nel saldo. Poi diventa un'entrata sul conto che scegli qui.";
    };
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("click", e => {
      const d = e.target.closest("[data-d]"); if (d) { dir = d.dataset.d; draw(); }
      const a = e.target.closest("[data-dacc]"); if (a) { acc = acc === a.dataset.dacc ? "" : a.dataset.dacc; draw(); }
      const w = e.target.closest("[data-dwho]"); if (w) { $("#dWho").value = w.dataset.dwho; $("#dNote").focus(); }
    });
    $("#dGo").onclick = () => {
      const amount = parseAmt($("#dAmt").value);
      if (!amount) { toast("Scrivi l'importo"); $("#dAmt").focus(); return; }
      const dv = $("#dDue").value, due = dv ? (([y, m, dd]) => new Date(y, m - 1, dd, 12).getTime())(dv.split("-").map(Number)) : null;
      const who = $("#dWho").value.trim().replace(/\s+/g, " ");
      const item = { id: existing?.id || uuid(), dir, amount, who, note: $("#dNote").value.trim(), account: acc || null, due, tx: existing?.tx || preset.tx || null, created_at: existing?.created_at || Date.now() };
      close(); putDue(item);
      toast(existing ? "Aggiornato" : dir === "out" ? `Da dare ${money(amount)}${who ? " a " + who : ""}` : `In arrivo ${money(amount)}${who ? " da " + who : ""}`, existing ? null : () => delDue(item.id));
    };
    if (existing) $("#dDel").onclick = () => { const c = { ...existing }; close(); delDue(c.id); toast("Eliminato", () => putDue(c)); };
    draw();
    if (!existing && !preset.amount) setTimeout(() => $("#dAmt")?.focus(), 250);
  });
}
// confirm what actually arrived: Vinted may pay a bit less, a friend may give back only part
function dueDoneSheet(d) {
  let acc = d.account || lastAccount(), keepRest = !MARKETS.test(d.who || "");   // Vinted pays less because of fees: nothing else will come
  const out = d.dir === "out";
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>${out ? "Pagato" : "Arrivati"}</h3><button class="r" id="ddGo">Segna</button></div>
    <p class="hint" style="margin:0 4px 12px">${esc(dueTitle(d))} · ${money(d.amount)}. ${out ? "La segno come uscita." : "La segno come entrata e il saldo cambia subito."}</p>
    <div class="fields"><div class="field"><label for="ddAmt">${out ? "Quanto hai dato" : "Quanto è arrivato"}</label><input id="ddAmt" inputmode="decimal" value="${esc(centsToInput(d.amount))}" style="text-align:right"></div></div>
    <div class="accs" id="ddAccs"></div>
    <div id="ddRest"></div>`, (sh, close) => {
    const draw = () => {
      const accs = accounts();
      $("#ddAccs").innerHTML = accs.length ? `<span class="accs-l">${out ? "Da quale conto" : "Su quale conto"}</span>` + accs.map(a => `<button class="achip" data-ddacc="${esc(a.id)}" aria-pressed="${acc === a.id}"><i class="adot" style="background:${a.color}"></i>${esc(a.name)}</button>`).join("") : "";
      const v = parseAmt($("#ddAmt").value);
      $("#ddRest").innerHTML = v && v < d.amount ? `<span class="accs"><span class="accs-l">Gli altri ${esc(money(d.amount - v))}</span><button class="achip" data-ddkeep="1" aria-pressed="${keepRest}">${out ? "Li do dopo" : "Arrivano dopo"}</button><button class="achip" data-ddkeep="0" aria-pressed="${!keepRest}">${out ? "Non li devo più" : "Non arrivano"}</button></span>` : "";
    };
    sh.querySelector("[data-x]").onclick = close;
    sh.addEventListener("click", e => { const a = e.target.closest("[data-ddacc]"); if (a) { acc = acc === a.dataset.ddacc ? "" : a.dataset.ddacc; draw(); } const k = e.target.closest("[data-ddkeep]"); if (k) { keepRest = k.dataset.ddkeep === "1"; draw(); } });
    $("#ddAmt").addEventListener("input", draw);
    $("#ddGo").onclick = () => {
      const v = parseAmt($("#ddAmt").value);
      if (!v) { toast("Scrivi l'importo"); return; }
      const cat = out ? "Altro" : MARKETS.test(d.who || "") ? "Vendita" : "Altro";
      const note = (d.tx && !out ? "Rimborso" + (d.who ? " da " + d.who : "") : dueTitle(d)).slice(0, 80);
      const tx = { id: uuid(), type: out ? "out" : "in", amount: v, cat, note, ts: Date.now(), account: acc || null };
      const before = { ...d }, rest = keepRest ? d.amount - v : 0;
      if (acc) rememberAccount(acc);
      snapshotReached(); close();
      S.settings = { ...S.settings, dues: rest > 0 ? dues().map(x => x.id === d.id ? { ...x, amount: rest } : x) : dues().filter(x => x.id !== d.id),
        duesWho: [...(S.settings.duesWho || []).filter(x => norm(x.who) !== norm(d.who)), { who: d.who }].slice(-12) };
      enqueue({ op: "up", t: "settings", row: { data: S.settings } });
      putTx(tx);
      toast(`${out ? "Uscita" : "Entrata"} di ${money(v)} segnata${rest > 0 ? `, restano ${money(rest)}` : ""}`, () => { delTx(tx.id); putDue(before); });
      mascotReact(out ? "squish" : "jump");
      celebrateIfReached();
    };
    draw();
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

/* ============ guida dinamica ============ */
// A short walk over the real Home the first time the app opens (and from Altro → Rivedi la guida):
// one element at a time is lit up, the rest is dimmed, and a bubble says what it is for.
const TOUR = [
  { sel: ".card.balance", tab: "home", t: "Il tuo saldo", d: "Qui vedi quanto hai. Il grafico mostra com'è andata e, tratteggiato, dove arrivi nei prossimi 30 giorni." },
  { sel: ".actions", tab: "home", t: "Una spesa? Due tocchi", d: "Tocca Uscita o Entrata, scrivi l'importo e scegli la categoria. Dallo stesso pannello puoi fotografare lo scontrino." },
  { sel: '[data-w="dues"]', tab: "home", t: "Soldi in arrivo", d: "Una vendita su Vinted, un amico che ti deve la cena: li segni qui e non contano nel saldo. Quando arrivano tocchi il cerchio accanto." },
  { sel: '[data-w="cats"]', tab: "home", t: "Dove vanno i soldi", d: "Le spese del mese divise per categoria. Tocca una riga per darti un budget: Keepo ti avvisa prima di sforarlo." },
  { sel: '.brandnav [data-hl-edit]', tab: "home", t: "La Home la decidi tu", d: "Tocca qui (o Personalizza la Home, in fondo alla pagina) per spostare i riquadri, nascondere quelli che non usi o scegliere una disposizione pronta." },
  { sel: '.tabbar [data-tab="mov"]', t: "Tutti i movimenti", d: "Li cerchi per nota o negozio e li filtri per conto e categoria con i menu sotto la ricerca." },
  { sel: '.tabbar [data-tab="goals"]', t: "Cosa vuoi comprarti?", d: "Aggiungi un obiettivo con nome e prezzo, anche incollando il link del prodotto. Tutto il saldo lo fa avanzare." },
  { sel: '.tabbar [data-tab="more"]', t: "Siri, Watch e il resto", d: "In Altro ci sono conti, budget, i Comandi Rapidi per Siri e il Centro di Controllo. E questa guida, se vuoi rivederla." }
];
let tourOn = false, tourAsked = false;
function maybeTour() {
  if (tourAsked || tourOn || S.settings.tourDone || needsOnboarding() || closeSheet || editHome || tab !== "home") return;
  if (DEMO && !new URLSearchParams(location.search).has("tour")) return;
  tourAsked = true; setTimeout(() => { if (!closeSheet && tab === "home") startTour(); }, 700);
}
function startTour() {
  if (tourOn) return; tourOn = true;
  const steps = TOUR.filter(st => st.tab !== "home" || !homeLayout().hidden.includes((st.sel.match(/data-w="(\w+)"/) || [])[1]));
  let k = 0;
  const L = document.createElement("div"); L.className = "tour"; L.setAttribute("role", "dialog"); L.setAttribute("aria-modal", "true"); L.setAttribute("aria-label", "Guida di Keepo");
  L.innerHTML = `<div class="tour-hole"></div><div class="tour-tip" tabindex="-1"></div>`;
  document.body.appendChild(L);
  const hole = L.querySelector(".tour-hole"), tip = L.querySelector(".tour-tip");
  const end = done => { tourOn = false; L.remove(); removeEventListener("resize", place); removeEventListener("scroll", place); document.removeEventListener("keydown", key, true); if (done) saveSettings({ tourDone: true }); };
  function place() {
    const el = document.querySelector(steps[k].sel); if (!el) return;
    const r = el.getBoundingClientRect(), pad = 8, vw = innerWidth, vh = innerHeight;
    Object.assign(hole.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
    const w = Math.min(340, vw - 32), th = tip.offsetHeight || 170;
    let top = r.bottom + pad + 12; if (top + th > vh - 12) top = Math.max(12, r.top - pad - 12 - th);
    if (top + th > vh - 12) top = Math.max(12, vh - th - 12);   // tall element: the bubble sits on it, at the bottom
    const left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    Object.assign(tip.style, { width: w + "px", left: left + "px", top: top + "px" });
  }
  function show() {
    const st = steps[k];
    if (st.tab && tab !== st.tab) setTab(st.tab);
    const el = document.querySelector(st.sel);
    if (!el) { if (k < steps.length - 1) { k++; return show(); } return end(true); }
    if (!st.sel.startsWith(".tabbar")) el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    tip.innerHTML = `<div class="tour-top"><span class="tour-n">${k + 1} di ${steps.length}</span><button class="tour-skip" data-tour="skip">Salta</button></div>
      <b class="tour-t">${esc(st.t)}</b><p class="tour-d">${esc(st.d)}</p>
      <div class="tour-btns">${k ? `<button class="tour-back" data-tour="back" aria-label="Indietro">${ic("chevL", 18)}</button>` : ""}<button class="save small" data-tour="next">${k === steps.length - 1 ? "Inizia a usare Keepo" : "Avanti"}</button></div>`;
    place(); setTimeout(place, 380); setTimeout(place, 800); tip.focus({ preventScroll: true });
  }
  function key(e) {
    if (e.key === "Escape") { e.preventDefault(); end(true); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  }
  function go(d) { k += d; if (k < 0) k = 0; if (k >= steps.length) { end(true); mascotReact("jump"); return; } show(); }
  L.addEventListener("click", e => { const b = e.target.closest("[data-tour]"); if (!b) return; const a = b.dataset.tour; a === "skip" ? end(true) : go(a === "back" ? -1 : 1); });
  addEventListener("resize", place); addEventListener("scroll", place, { passive: true }); document.addEventListener("keydown", key, true);
  show();
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

/* ============ nuova icona ============ */
// iOS keeps the name and icon saved when the app was added to the Home screen: tell old installs how to refresh them
const ICON_VERSION = 2;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
(function initIconVersion() {
  if (!isStandalone()) return;
  try {
    if (localStorage.getItem(LS + ".iconv") === null)
      localStorage.setItem(LS + ".iconv", Object.keys(S.tx).length ? "1" : String(ICON_VERSION)); // existing data = installed before the change
  } catch {}
})();
let iconSteps = false;
function iconNotice() {
  let v = ICON_VERSION; try { v = +(localStorage.getItem(LS + ".iconv") || ICON_VERSION); } catch {}
  if (DEMO || !isStandalone() || v >= ICON_VERSION) return "";
  const cloud = S.mode === "cloud";
  return `<div class="card notice"><img src="icons/icon-192.png" alt="" width="44" height="44">
    <div><b>Nuovo nome e nuova icona</b><span>Sulla schermata Home vedi ancora quelli vecchi: iOS non li aggiorna da solo.</span>
    ${iconSteps ? `<ol><li>${cloud ? "I tuoi dati sono salvati nel tuo account: non perdi niente." : "<b>Prima</b> vai in Altro → Esporta backup: i dati sono solo su questo telefono."}</li>
      <li>Tieni premuta l'icona sulla schermata Home → <b>Elimina app</b>.</li>
      <li>Apri <b>vers3tt.github.io/salvadanaio</b> in Safari → Condividi → <b>Aggiungi alla schermata Home</b>.</li>
      ${cloud ? "<li>Apri Keepo e accedi con la tua email.</li>" : "<li>Apri Keepo e usa Altro → Importa backup.</li>"}</ol>` : ""}
    <div class="notice-acts">${iconSteps ? "" : `<button class="link" data-icon-steps>Come si fa</button>`}<button class="link muted" data-icon-ok>Ho capito</button></div></div></div>`;
}

/* ============ demo ============ */
function demoState() {
  const now = Date.now(), d0 = new Date(), tx = {}, accs = [
    { id: "a-conto", name: "Conto corrente", color: "#0E9F8E" }, { id: "a-hype", name: "Hype", color: "#E0A100" }, { id: "a-rev", name: "Revolut", color: "#2F6FE4" }];
  let k = 0; const add = (type, euro, cat, note, daysAgo, account) => { const id = "d-tx" + (k++); tx[id] = { id, type, amount: Math.round(euro * 100), cat, note, ts: now - daysAgo * DAY - (k % 7) * 3600e3, account }; };
  for (let m = 3; m >= 0; m--) {
    const b = m * 30;
    if (b + 4 <= 120 && (m || d0.getDate() > 4)) add("in", 1450, "Stipendio", "Stipendio", b + 4 - (m ? 0 : 0), "a-conto");
    if (m) add("out", 390, "Casa", "Affitto", b + 1, "a-conto");
    add("out", 62.4 + m * 7, "Spesa", "Conad", b + 2, "a-hype"); add("out", 48.1 + m * 3, "Spesa", "Esselunga", b + 9, "a-conto");
    add("out", 18.5, "Ristoranti", "Pizzeria da Gino", b + 6, "a-rev"); add("out", 4.2, "Ristoranti", "Bar Centrale", b + 1, "a-hype");
    add("out", 39, "Trasporti", "Abbonamento metro", b + 5, "a-conto"); add("out", 65 + m * 4, "Bollette", "Luce e gas", b + 12, "a-conto");
    add("out", 12.99, "Svago", "Spotify e Netflix", b + 14, "a-rev"); add("out", 25 + m * 6, "Shopping", "Zalando", b + 18, "a-rev");
    add("out", 150, TRANSFER, "Conto corrente → Hype", b + 8, "a-conto"); add("in", 150, TRANSFER, "Conto corrente → Hype", b + 8, "a-hype");
  }
  add("in", 80, "Regalo", "Compleanno", 20, "a-rev"); add("in", 350, "Vendita", "Vinted", 45, "a-rev"); add("in", 120, "Lavoretto", "Ripetizioni", 11, "a-conto");
  add("out", 7.8, "Ristoranti", "Colazione", 0, "a-hype"); add("out", 3.5, "Trasporti", "Metro", 0, "a-hype");
  const goals = {
    "d-cuffie": { id: "d-cuffie", name: "Cuffie wireless", price: 27900, img: "guida/img/prodotto-cuffie.png", url: "https://www.amazon.it/dp/esempio", deadline: null, done: false, done_at: null, created_at: now - 40 * DAY, last_price: 24900, last_checked: new Date(now - 3600e3).toISOString() },
    "d-bici": { id: "d-bici", name: "Fotocamera mirrorless", price: 429900, img: "guida/img/prodotto-fotocamera.png", url: null, deadline: new Date(d0.getFullYear() + 1, 5, 1).toISOString().slice(0, 10), done: false, done_at: null, created_at: now - 60 * DAY },
    "d-console": { id: "d-console", name: "Sneakers", price: 12900, img: "guida/img/prodotto-sneakers.png", url: null, deadline: null, done: false, done_at: null, created_at: now - 20 * DAY }
  };
  if (new URLSearchParams(location.search).has("rec")) delete goals["d-console"];   // nel video le sneakers si aggiungono a mano
  const nextRent = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1, 9).getTime();
  const rec = { "d-rec": { id: "d-rec", type: "out", amount: 39000, cat: "Casa", note: "Affitto", freq: "month", next_ts: nextRent, active: true, created_at: now - 90 * DAY } };
  return { tx, goals, rec, pending: [], mode: "local", lastSync: now,
    settings: { onboarded: true, accounts: accs, budgets: { Ristoranti: 6000, Shopping: 8000 }, hourly: 1050, wageMode: "month", monthly: 145000, weekHours: "38",
      dues: [{ id: "d-due1", dir: "in", amount: 3500, who: "Vinted", note: "Giacca di jeans", account: "a-rev", due: now + 2 * DAY, tx: null, created_at: now - 3 * DAY },
             { id: "d-due2", dir: "in", amount: 1250, who: "Marco", note: "Pizzeria da Gino", account: "a-hype", due: null, tx: null, created_at: now - 6 * DAY }] } };
}

// ?demo&scene=… opens one screen of the guide, ready to be photographed
function demoScene() {
  const sc = new URLSearchParams(location.search).get("scene") || "home";
  const fill = (t, sel, val) => { const el = $(sel); if (el) { el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); } };
  const keys = str => [...str].forEach(k => document.querySelector(`[data-k="${k}"]`)?.click());
  const scenes = {
    home: () => setTab("home"),
    conti: () => { showAccounts = true; setTab("home"); },
    uscita: () => { setTab("home"); txSheet("out"); setTimeout(() => { keys("12,50"); document.querySelector('[data-cat="Ristoranti"]')?.click(); fill(0, "#txNote", "Pizza con amici"); }, 60); },
    scontrino: () => { setTab("home"); txSheet("out"); setTimeout(() => { keys("16,68"); document.querySelector('[data-cat="Spesa"]')?.click(); fill(0, "#txNote", "Conad Superstore"); const m = $("#scanMsg"); if (m) { m.textContent = "Letto: totale 16,68 €, negozio, data, categoria Spesa. Controlla e salva."; m.className = "peek ok"; }
      window.__demoReceipt?.({ total: 1668, items: [["Latte Granarolo 1l", 149], ["Pane comune", 210], ["Biscotti Mulino", 299], ["Detersivo Dash", 690], ["Mele Golden", 320]].map(([name, amount]) => ({ name, amount })), itemsMatch: true }); }, 60); },
    daricevere: () => { setTab("home"); setTimeout(() => { const w = document.querySelector('[data-w="dues"]'); if (w) window.scrollTo(0, w.getBoundingClientRect().top + scrollY - 70); }, 120); },
    arrivati: () => { setTab("home"); setTimeout(() => { const d = dues().find(x => x.id === "d-due1"); if (d) dueDoneSheet(d); }, 120); },
    filtri: () => { setTab("mov"); movCat = "Spesa"; render(); },
    movimenti: () => setTab("mov"),
    obiettivi: () => setTab("goals"),
    obiettivo: () => { setTab("goals"); goalSheet("d-cuffie"); },
    prezzo: () => { setTab("goals"); goalSheet("d-cuffie"); setTimeout(() => { const sh = $(".sheet"), pb = $("#priceBox"); if (sh && pb) { sh.style.animation = "none"; sh.scrollTop = pb.offsetTop - 30; } }, 900); },
    nuovoobiettivo: () => { setTab("goals"); goalEditSheet(); setTimeout(() => { fill(0, "#gName", "Cuffie wireless"); fill(0, "#gPrice", "249,00"); $("#gUrl").value = "https://amzn.eu/d/esempio"; const p = $("#gPeek"); p.textContent = "Letto dal link: prezzo 249,00 €, nome, foto. Controlla e salva."; p.className = "peek ok"; }, 80); },
    budget: () => { document.documentElement.classList.add("demo-budget"); setTab("home"); },
    keepo: () => { setTab("home"); setTimeout(() => { const b = $(".nav [data-mascot]") || $("[data-mascot]"); if (b) mascotSay(b); }, 60); },
    siri: () => { setTab("more"); siriSheet(); },
    altro: () => setTab("more"),
    trasferimento: () => { setTab("home"); transferSheet(); setTimeout(() => fill(0, "#tAmt", "150"), 60); },
    lavoro: () => { setTab("goals"); }
  };
  (scenes[sc] || scenes.home)();
  setTimeout(() => document.activeElement?.blur?.(), 400);
}

/* ============ prossimamente ============ */
const ROADMAP = [
  { id: "bank", icon: "wallet", premium: true, title: "Conti collegati in automatico", text: "Hype, Revolut e le banche italiane sincronizzate da sole tramite open banking: movimenti e saldi senza scrivere niente." },
  { id: "history", icon: "label", premium: true, title: "Storico prezzi completo", text: "Il prezzo degli ultimi mesi appena aggiungi un link, con avviso quando scende sotto la soglia che scegli." },
  { id: "shared", icon: "flag", premium: true, title: "Obiettivi condivisi", text: "Risparmiate in due o in gruppo per un viaggio o un regalo, ognuno con la sua parte." },
  { id: "wrapped", icon: "receipt", premium: false, title: "Il mese di Keepo", text: "A inizio mese un riepilogo animato di come è andata, da salvare o condividere." },
  { id: "roundup", icon: "coins", premium: false, title: "Arrotonda e risparmia", text: "Gli spiccioli di ogni spesa messi da parte in automatico." },
  { id: "native", icon: "sync", premium: false, title: "App per iPhone e Apple Watch", text: "Widget nativi sulla schermata Home, sul quadrante e nel Centro di Controllo, dall'App Store." }
];

/* ============ Siri, widget e Comandi Rapidi ============ */
const SHORTCUTS = [["Uscita Keepo", "Chiede importo e categoria e segna una spesa", "minus"],
                   ["Entrata Keepo", "Chiede importo e categoria e segna un'entrata", "plus"],
                   ["Saldo Keepo", "Ti dice il saldo e il riepilogo del mese", "receipt"],
                   ["Pagamento Keepo", "Per l'automazione Apple Pay: segna da solo ogni pagamento", "wallet"],
                   ["Accredito Keepo", "Per l'automazione email: segna i soldi che ricevi", "mail"]];
async function sha256hex(t) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
function siriSheet() {
  sheet(`<div class="sheet-h"><span></span><h3>Siri e widget</h3><button class="r" data-x>Fine</button></div>
    <p class="hint" style="margin:0 4px 14px">Segna entrate e uscite senza aprire l'app: dal Centro di Controllo, dalla schermata di blocco, con Siri, da Apple Watch o dalla barra dei menu del Mac.</p>

    <div class="group-h" style="margin-top:4px"><span>1 · Il tuo codice personale</span></div>
    <div class="card qcode" id="qBox">
      <p>I comandi usano questo codice al posto di email e password. Tienilo per te: chi lo ha può segnare movimenti e leggere il saldo.</p>
      <button class="save" id="qGen">Genera il codice</button>
    </div>

    <div class="group-h"><span>2 · Aggiungi i comandi</span></div>
    ${SHORTCUTS.map(([n, d, i]) => `<section class="cmd">
      <div class="auto-h"><span class="ico">${ic(i, 20)}</span><span><b>${esc(n)}</b><small>${esc(d)}</small></span></div>
      ${cmdRender(n)}
      <a class="save ghost auto-dl" href="comandi/${encodeURIComponent(n)}.shortcut" download="${esc(n)}.shortcut">${ic("external", 17)}Scarica ${esc(n)}</a>
    </section>`).join("")}
    <p class="hint">Copia il codice, poi tocca un comando per scaricarlo e aprilo (su iPhone dall'app File, su Mac con doppio clic). Quando tocchi <b>Aggiungi comando</b>, Comandi Rapidi ti chiede il codice: <b>incollalo lì</b>. Il codice resta salvato nel comando: per questo funziona su Apple Watch, e con Siri anche a iPhone bloccato. Hai già i comandi di prima? Prova prima il nuovo <b>Saldo Keepo</b>; se funziona sostituisci gli altri. Se sostituisci Pagamento o Accredito, ricollega la loro automazione (sotto, in Automazioni).</p>

    <div class="group-h"><span>3 · Usali dove ti serve</span></div>
    <div class="card howto">
      <p><b>Centro di Controllo</b> (iOS 18 e successivi): apri il Centro di Controllo, tieni premuto su uno spazio vuoto → <b>Aggiungi un controllo</b> → <b>Comandi Rapidi</b> → scegli Uscita Keepo. Puoi metterlo anche in basso nella <b>schermata di blocco</b>: tieni premuto sulla schermata di blocco → <b>Personalizza</b> → tocca un controllo in basso.</p>
      <p><b>Tasto Azione</b> (iPhone 15 Pro e successivi): Impostazioni → Tasto Azione → Comando rapido → Uscita Keepo.</p>
      <p><b>Siri:</b> "Ehi Siri, Uscita Keepo", poi di' l'importo e scegli la categoria. "Ehi Siri, Saldo Keepo" ti legge saldo e soldi in arrivo.</p>
      <p><b>Apple Watch:</b> in Comandi Rapidi sull'iPhone tieni premuto il comando → <b>Dettagli</b> → attiva <b>Mostra su Apple Watch</b>. Sul Watch lo trovi nell'app Comandi e come complicazione sul quadrante.</p>
      <p><b>Mac:</b> i comandi arrivano anche sul Mac con iCloud. In Comandi Rapidi apri il comando → <b>Dettagli</b> (ⓘ) → <b>Fissa nella barra dei menu</b>. Oppure aggiungili al widget Comandi Rapidi nel Centro Notifiche.</p>
      <p><b>Widget iPhone:</b> tieni premuto sulla schermata Home → <b>Modifica</b> → <b>Aggiungi widget</b> → <b>Comandi Rapidi</b>.</p>
    </div>

    <div class="group-h"><span>4 · In automatico</span></div>
    <button class="card auto-link" data-auto>${ic("bolt", 20)}<span><b>Automazioni</b><small>Uscite con Apple Pay ed entrate dalle email della banca, senza toccare niente</small></span>${ic("chevR", 16)}</button>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    sh.querySelector("[data-auto]").onclick = () => autoSheet();
    sh.querySelectorAll("[data-auto-open]").forEach(b => b.onclick = () => autoSheet(b.dataset.autoOpen));
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
        <p class="hint">Se ne generi uno nuovo, quello vecchio smette di funzionare: devi eliminare i comandi e aggiungerli di nuovo con il codice nuovo.</p>`;
      $("#qCopy").onclick = async () => {
        try { await navigator.clipboard.writeText(token); toast("Codice copiato"); }
        catch { const r = document.createRange(); r.selectNodeContents($("#qTok")); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Selezionato: copialo con Copia"); }
      };
      $("#qNew").onclick = () => { close(); siriSheet(); setTimeout(() => $("#qGen")?.click(), 350); };
    };
  });
}

/* ============ come appaiono i comandi ============ */
// Real screen recordings of each command on an iPhone (iOS 27 simulator), in guida/clip/
const clip = (name, label) => `<figure class="clip"><video src="guida/clip/${name}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="${esc(label)}"></video></figure>`;
function cmdRender(name) {
  const R = {
    "Uscita Keepo": () => clip("uscita", "Video: Uscita Keepo chiede l’importo e la categoria e segna la spesa"),
    "Entrata Keepo": () => clip("entrata", "Video: Entrata Keepo chiede l’importo e la categoria e segna l’entrata"),
    "Saldo Keepo": () => clip("saldo", "Video: Saldo Keepo risponde con il saldo e il riepilogo del mese"),
    "Pagamento Keepo": () => `<p class="ios-note">Non lo avvii tu: parte da solo quando paghi con Apple Pay.</p><button class="link ios-more" data-auto-open="pay">Guarda come si attiva ${ic("chevR", 14)}</button>`,
    "Accredito Keepo": () => `<p class="ios-note">Non lo avvii tu: parte da solo quando la banca ti scrive che hai ricevuto soldi.</p><button class="link ios-more" data-auto-open="mail">Guarda come si attiva ${ic("chevR", 14)}</button>`
  };
  return R[name]();
}

/* ============ automazioni ============ */
// Each automation is shown with a real recording of how it is set up in Comandi Rapidi, then the steps in words.
// Where banks send their alerts from. Only addresses confirmed by the bank go in "addr";
// otherwise the domain, and the user copies the exact address from one of their emails.
const BANK_MAIL = [
  { name: "Revolut", addr: "no-reply@revolut.com", domain: "revolut.com" },
  { name: "Hype", domain: "hype.it" },
  { name: "Intesa Sanpaolo", domain: "intesasanpaolo.com", match: /intesa|isybank/i },
  { name: "UniCredit", domain: "unicredit.it", match: /unicredit|buddy/i },
  { name: "Poste / Postepay", domain: "posteitaliane.it", match: /poste|bancoposta/i },
  { name: "Fineco", domain: "finecobank.com" },
  { name: "N26", domain: "n26.com" },
  { name: "PayPal", domain: "paypal.it" },
  { name: "Satispay", domain: "satispay.com" },
  { name: "BNL", domain: "bnl.it" },
  { name: "BPER", domain: "bper.it" },
  { name: "ING", domain: "ing.it", match: /^ing\b/i }
];
const bankFor = name => BANK_MAIL.find(b => (b.match || new RegExp(b.name.split(" ")[0], "i")).test(name));
let mailBank = null;
const AUTOMATIONS = [
  { id: "pay", icon: "wallet", title: "Uscite con Apple Pay", short: "Paghi con l'iPhone o l'Apple Watch e Keepo segna la spesa, sul conto della carta e con il nome del negozio.",
    shortcut: "Pagamento Keepo",
    render: () => clip("automazione-applepay", "Video: in Comandi Rapidi si aggiunge a Pagamento Keepo l’automazione Wallet"),
    steps: [
      `Aggiungi il comando <b>Pagamento Keepo</b> (in Siri e widget) e incolla il codice quando te lo chiede.`,
      `In Comandi Rapidi tieni premuto <b>Pagamento Keepo</b> e scegli <b>Modifica</b>.`,
      `Tocca <b>Cerca</b>, scegli <b>Automazioni</b> e cerca <b>Wallet</b>.`,
      `Tocca <b>Qualsiasi carta</b> e scegli le tue carte (es. Hype e Revolut), poi la spunta. In Libreria → Automazioni la vedi attiva.`],
    note: "Su iOS 18 o precedenti si fa da Comandi Rapidi → Automazione → + → Transazione. Il conto è riconosciuto se il nome della carta contiene il nome del conto in Keepo (es. \"Hype\"). Funziona solo con i pagamenti Apple Pay: gli acquisti online con la carta vanno segnati a mano. Per i soldi che ricevi c'è l'automazione qui sotto." },
  { id: "mail", icon: "mail", title: "Entrate dalle email della banca", short: "Quando la banca ti scrive che hai ricevuto soldi, Keepo segna l'entrata sul conto giusto.",
    shortcut: "Accredito Keepo",
    render: () => clip("automazione-email", "Video: in Comandi Rapidi si aggiunge ad Accredito Keepo l’automazione Email con il mittente della banca"),
    steps: [
      `Aggiungi il comando <b>Accredito Keepo</b> (in Siri e widget) e incolla il codice quando te lo chiede.`,
      `In Comandi Rapidi tieni premuto <b>Accredito Keepo</b> e scegli <b>Modifica</b>.`,
      `Tocca <b>Cerca</b>, scegli <b>Automazioni</b> e poi <b>Email</b>.`,
      `Tocca <b>Indirizzo email</b> e scrivi il mittente della tua banca: sceglila qui sotto e Keepo ti dice quale.`,
      `Conferma con la spunta. In Libreria → Automazioni compare "Quando ricevo un'email da …". Ripeti per ogni banca.`],
    note: "Su iOS 18 o precedenti si fa da Comandi Rapidi → Automazione → + → Email. Parte solo per le email del mittente che scegli tu: gli altri messaggi non li vede. L'email resta sull'iPhone: a Keepo arrivano solo la frase con l'importo (es. \"bonifico di 50,00 €\") e il nome della banca. Serve che la banca mandi un'email per ogni accredito: di solito si attiva tra le notifiche nell'app della banca. Se un'email arriva due volte, l'entrata viene segnata una volta sola." }
];
function bankOut() {
  const b = mailBank;
  if (!b) return `<p class="pnote">Scegli la banca da cui vuoi segnare le entrate.</p>`;
  return b.addr ? `<div class="bank-addr"><span class="num">${esc(b.addr)}</span><button class="pill sm" data-copy="${esc(b.addr)}">Copia</button></div>
      <p class="pnote">È l'indirizzo che ${esc(b.name)} indica per le sue email. Mettilo in Mittente.</p>`
    : `<div class="bank-addr"><span class="num">…@${esc(b.domain)}</span></div>
      <p class="pnote">${esc(b.name)} scrive da indirizzi che finiscono con <b>@${esc(b.domain)}</b>, ma quello preciso degli avvisi cambia. Apri in Mail un loro avviso di accredito, tocca il mittente e copia l'indirizzo: è quello da mettere in Mittente. Se non ti mandano email per gli accrediti, attivale tra le notifiche dell'app della banca.</p>`;
}
function autoSheet(focus) {
  if (!mailBank) mailBank = accounts().map(a => bankFor(a.name)).find(Boolean) || null;
  sheet(`<div class="sheet-h"><button class="l" data-back>‹ Siri</button><h3>Automazioni</h3><button class="r" data-x>Fine</button></div>
    <p class="hint" style="margin:0 4px 16px">Le automazioni sono regole di Comandi Rapidi sull'iPhone: quando succede una cosa (paghi, ti arriva un'email della banca), avviano un comando di Keepo da sole. Si preparano una volta, poi non devi più fare niente.</p>
    ${AUTOMATIONS.map(a => `<section class="auto" id="auto-${a.id}">
      <div class="auto-h"><span class="ico">${ic(a.icon, 20)}</span><span><b>${esc(a.title)}</b><small>${esc(a.short)}</small></span></div>
      ${a.render()}
      <ol class="auto-steps">${a.steps.map(t => `<li><span>${t}</span></li>`).join("")}</ol>
      ${a.id === "mail" ? `<div class="bankpick"><b>La tua banca</b><div class="bank-chips">${BANK_MAIL.map(b => `<button class="pill sm${mailBank === b ? " on" : ""}" data-bank="${esc(b.name)}">${esc(b.name)}</button>`).join("")}</div><div id="bankOut">${bankOut()}</div></div>` : ""}
      <a class="save ghost auto-dl" href="comandi/${encodeURIComponent(a.shortcut)}.shortcut" download="${esc(a.shortcut)}.shortcut">${ic("external", 17)}Scarica ${esc(a.shortcut)}</a>
      <p class="pnote">${esc(a.note)}</p>
    </section>`).join("")}
    <p class="foot">I comandi usano il tuo codice personale, che incolli quando li aggiungi: se non l'hai ancora generato, torna in Siri e widget.</p>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    sh.querySelector("[data-back]").onclick = () => siriSheet();
    sh.addEventListener("click", async e => {
      const bb = e.target.closest("[data-bank]");
      if (bb) {
        mailBank = BANK_MAIL.find(b => b.name === bb.dataset.bank);
        sh.querySelectorAll("[data-bank]").forEach(x => x.classList.toggle("on", x === bb));
        $("#bankOut").innerHTML = bankOut();
        return;
      }
      const cp = e.target.closest("[data-copy]");
      if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast("Indirizzo copiato"); } catch { toast(cp.dataset.copy); } }
    });
    if (focus) setTimeout(() => { const el = $("#auto-" + focus), sc = sh; if (el) sc.scrollTop = el.offsetTop - 12; }, 60);
  });
}

/* ============ conti ============ */
const ACC_COLORS = ["#162448", "#2F6FE4", "#0E9F8E", "#18795C", "#E0A100", "#F07A1A", "#D64545", "#7B5CD6", "#7A8193"];
const ACC_PRESETS = ["Conto corrente", "Hype", "Revolut", "Trade Republic", "Conto deposito", "Contanti", "PayPal", "Satispay", "Carta prepagata"];
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
/* ---- interessi: conti che rendono, come Trade Republic o un conto deposito ----
   a.rate = interesse annuo lordo in %, a.tax = tasse in % (in Italia 26), a.autoInt = segnali da soli a inizio mese,
   a.intFrom = primo mese ancora da accreditare. L'importo è il saldo del conto a fine mese × tasso / 12, al netto delle tasse. */
const accBalanceAt = (id, ts) => Object.values(S.tx).reduce((s, t) => s + (t.account === id && t.ts < ts ? (t.type === "in" ? t.amount : -t.amount) : 0), 0);
const monthlyInterest = (a, bal) => a.rate > 0 && bal > 0 ? Math.round(bal * a.rate / 100 / 12 * (1 - (a.tax ?? 26) / 100)) : 0;
const fmtRate = r => String(Math.round(r * 100) / 100).replace(".", ",") + "%";
const monthStart = (y, m) => new Date(y, m, 1).getTime();
let intRunning = false;
async function runInterest() {
  if (intRunning || !crypto.subtle) return; intRunning = true;
  try {
    let added = 0, changed = false; const now = new Date(), list = accounts().map(a => ({ ...a }));
    for (const a of list) {
      if (!(a.rate > 0) || !a.autoInt || !a.intFrom) continue;
      let d = new Date(a.intFrom), guard = 0;
      // one credit for each month that is over, dated the 1st of the following month
      while (monthStart(d.getFullYear(), d.getMonth() + 1) <= now.getTime() && guard++ < 24) {
        const at = monthStart(d.getFullYear(), d.getMonth() + 1), id = await occurrenceId(a.id + ":interessi", at);
        const v = monthlyInterest(a, accBalanceAt(a.id, at));
        if (v > 0 && !S.tx[id]) {
          const t = { id, type: "in", amount: v, cat: "Interessi", note: `Interessi ${a.name} · ${new Date(at - DAY).toLocaleDateString("it-IT", { month: "long" })}`, ts: at + 9 * 3600e3, account: a.id };
          S.tx[id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); added++;
        }
        d = new Date(at); a.intFrom = at; changed = true;
      }
    }
    if (changed) { S.settings = { ...S.settings, accounts: list }; enqueue({ op: "up", t: "settings", row: { data: S.settings } }); }
    if (added || changed) commit();
    if (added) toast(added === 1 ? "Accreditati gli interessi del mese" : `Accreditati ${added} mesi di interessi`);
  } finally { intRunning = false; }
}
function accountsBlock() {
  const accs = accounts();
  if (!accs.length) return `<button class="acc-toggle" data-acc-manage>${ic("wallet", 16)}Dividi il saldo per conto: Hype, Revolut, contanti…</button>`;
  const { b, none } = accountBalances();
  return `<button class="acc-toggle" data-acc-toggle aria-expanded="${showAccounts}">${ic("wallet", 16)}${showAccounts ? "Nascondi i conti" : `Vedi per conto (${accs.length})`}<span class="chev${showAccounts ? " up" : ""}">${ic("chevD", 14)}</span></button>
    ${showAccounts ? `<div class="acc-list">${accs.map(a => `<div class="acc-row"><i class="adot lg" style="background:${a.color}"></i><span>${esc(a.name)}${a.rate > 0 ? `<small class="acc-rate">${ic("percent", 12)}${esc(fmtRate(a.rate))} · circa ${esc(money(monthlyInterest(a, b[a.id] || 0)))} al mese</small>` : ""}</span><b class="num${(b[a.id] || 0) < 0 ? " neg" : ""}">${money(b[a.id] || 0)}</b></div>`).join("")}
      ${none ? `<div class="acc-row muted"><i class="adot lg" style="background:var(--ink3)"></i><span>Senza conto</span><b class="num">${money(none)}</b></div>` : ""}
      <div class="acc-acts"><button class="link" data-transfer>${ic("transfer", 15)}Sposta tra conti</button><button class="link" data-acc-manage>Gestisci</button></div></div>` : ""}`;
}
function accountsSheet() {
  const accs = accounts(), { b, none } = accountBalances();
  const unassigned = Object.values(S.tx).filter(t => !t.account || !accById(t.account)).length;
  sheet(`<div class="sheet-h"><span></span><h3>Conti</h3><button class="r" data-x>Fine</button></div>
    <p class="hint" style="margin:0 4px 12px">Dove tieni i soldi: conto in banca, Hype, Revolut, contanti… Ogni movimento può andare su un conto e vedi il totale di ognuno.</p>
    ${accs.length ? `<div class="list">${accs.map(a => `<button class="row" data-aedit="${esc(a.id)}"><span class="ico" style="background:${a.color}22;color:${a.color}">${ic("wallet", 20)}</span>
      <span class="t"><b>${esc(a.name)}</b><small>${a.rate > 0 ? `${esc(fmtRate(a.rate))} annuo · circa ${esc(money(monthlyInterest(a, b[a.id] || 0)))} al mese${a.autoInt ? ", segnati da soli" : ""}` : "Tocca per modificare"}</small></span><span class="a num${(b[a.id] || 0) < 0 ? " neg" : ""}">${money(b[a.id] || 0)}</span></button>`).join("")}</div>` : ""}
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
    <div class="group-h"><span>Interessi</span></div>
    <div class="fields">
      <div class="field"><label for="aRate">Interesse annuo %</label><input id="aRate" inputmode="decimal" placeholder="nessuno" value="${existing?.rate ? esc(String(existing.rate).replace(".", ",")) : ""}" style="text-align:right"></div>
      <div class="field"><label for="aTax">Tasse sugli interessi %</label><input id="aTax" inputmode="decimal" value="${esc(String(existing?.tax ?? 26).replace(".", ","))}" style="text-align:right"></div>
    </div>
    <label class="terms tgl"><input type="checkbox" id="aAuto" ${existing?.autoInt === false ? "" : "checked"}><span>Segna da solo gli interessi a inizio mese, come entrata su questo conto</span></label>
    <p class="hint" id="aRateHint"></p>
    <div class="group-h"><span>Colore</span></div>
    <div class="colors" id="aColors"></div>
    ${existing ? `<button class="save danger" id="aDel" style="margin-top:18px">Elimina conto</button><div id="aDelBox"></div>` : ""}`, (sh, close) => {
    const num = v => { const n = Number(String(v || "").replace(",", ".").replace(/[^\d.]/g, "")); return isFinite(n) ? n : 0; };
    const hint = () => {
      const r = num($("#aRate").value), tax = num($("#aTax").value), bal = existing ? accountBalances().b[existing.id] || 0 : parseAmt($("#aStart")?.value);
      $("#aRateHint").textContent = r > 0
        ? (bal > 0 ? `Con ${money(bal)} sul conto sono circa ${money(monthlyInterest({ rate: r, tax }, bal))} al mese, ${money(monthlyInterest({ rate: r, tax }, bal) * 12)} in un anno, già tolte le tasse.` : `Al ${fmtRate(r)} lordo, 1.000 € rendono circa ${money(monthlyInterest({ rate: r, tax }, 100000))} al mese dopo le tasse.`)
        : "Per i conti che pagano interessi, come Trade Republic o un conto deposito. Il tasso lo trovi nell'app della banca.";
    };
    sh.addEventListener("input", e => { if (e.target.closest("#aRate,#aTax,#aStart")) hint(); });
    hint();
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
      const rate = Math.min(20, num($("#aRate").value)), tax = Math.min(100, num($("#aTax").value)), autoInt = $("#aAuto").checked;
      const n0 = new Date(), thisMonth = monthStart(n0.getFullYear(), n0.getMonth());
      // interest is credited from the month you turn it on (not for the past)
      const intFrom = rate > 0 && autoInt ? (existing?.rate > 0 && existing?.autoInt && existing.intFrom ? existing.intFrom : thisMonth) : null;
      const extra = { rate: rate || null, tax, autoInt: rate > 0 ? autoInt : false, intFrom };
      if (existing) list[list.findIndex(a => a.id === existing.id)] = { ...existing, name, color, ...extra };
      else list.push({ id: uuid(), name, color, ...extra });
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

/* ============ home personalizzabile ============ */
// The Home is a set of widgets you can move and hide. Ported from the interaction of 21st.dev's
// "Draggable Widget Grid": mouse and pen drag at once, touch needs a long press (so the page still
// scrolls), keyboard uses Alt + arrows, and every move is animated. On desktop there are two columns.
const WIDGETS = { balance: "Saldo", dues: "Da ricevere", monthly: "Mese per mese", cats: "Dove vanno i soldi", goals: "Obiettivi", recent: "Ultimi movimenti" };
const HL_DEFAULT = { order: ["balance", "dues", "monthly", "cats", "goals", "recent"], col: { balance: "a", dues: "b", monthly: "a", cats: "b", goals: "b", recent: "b" } };
// ready-made layouts, one tap in edit mode
const HL_PRESETS = [
  { id: "full", name: "Completa", text: "Tutto in vista", order: ["balance", "dues", "monthly", "cats", "goals", "recent"], col: HL_DEFAULT.col, hidden: [] },
  { id: "essential", name: "Essenziale", text: "Saldo e ultimi movimenti", order: ["balance", "dues", "recent", "goals", "monthly", "cats"], col: { balance: "a", dues: "b", recent: "b", goals: "b", monthly: "a", cats: "b" }, hidden: ["goals", "monthly", "cats"] },
  { id: "goals", name: "Obiettivi prima", text: "Per chi mette da parte", order: ["balance", "goals", "dues", "recent", "cats", "monthly"], col: { balance: "a", goals: "b", dues: "b", recent: "b", cats: "a", monthly: "a" }, hidden: ["monthly"] },
  { id: "spending", name: "Controllo spese", text: "Budget e mesi davanti", order: ["balance", "cats", "monthly", "dues", "recent", "goals"], col: { balance: "a", cats: "b", monthly: "a", dues: "b", recent: "b", goals: "b" }, hidden: ["goals"] }
];
let editHome = false, hlDrag = null;
const isWide = () => matchMedia("(min-width: 900px)").matches;
function homeLayout() {
  const l = S.settings.homeLayout || {}, order = (l.order || []).filter(id => WIDGETS[id]);
  HL_DEFAULT.order.forEach((id, i) => { if (!order.includes(id)) order.splice(Math.min(i, order.length), 0, id); });
  return { order, col: { ...HL_DEFAULT.col, ...(l.col || {}) }, hidden: (l.hidden || []).filter(id => WIDGETS[id] && id !== "balance") };
}
function saveLayout(L, focusId) {
  saveSettings({ homeLayout: { order: L.order, col: L.col, hidden: L.hidden } });
  if (focusId) setTimeout(() => document.querySelector(`#homeGrid [data-w="${focusId}"]`)?.focus({ preventScroll: false }), 30);
}
function presetOf(L) {
  const vis = L => L.order.filter(k => !L.hidden.includes(k)), same = (a, b) => a.join() === b.join();
  return HL_PRESETS.find(p => same(vis(L), vis(p)) && (!isWide() || vis(L).every(k => L.col[k] === p.col[k])))?.id;
}
// tiny drawing of a preset: the widgets as blocks in their columns (one column on the phone)
function presetThumb(p) {
  const vis = p.order.filter(k => !p.hidden.includes(k)), h = { balance: 14, dues: 8, monthly: 9, cats: 11, goals: 9, recent: 10 };
  const col = list => `<i>${list.map(k => `<u class="${k === "balance" ? "b" : ""}" style="height:${h[k]}px"></u>`).join("")}</i>`;
  return `<span class="pthumb" aria-hidden="true">${isWide() ? col(vis.filter(k => p.col[k] === "a")) + col(vis.filter(k => p.col[k] === "b")) : col(vis)}</span>`;
}
function homeGrid(W) {
  const L = homeLayout(), vis = L.order.filter(id => !L.hidden.includes(id));
  const wrap = id => `<div class="w" data-w="${id}"${editHome ? ` tabindex="0" aria-roledescription="riquadro spostabile" aria-label="${WIDGETS[id]}. Alt e frecce per spostarlo"` : ""}>
    ${editHome ? `<div class="w-tools"><span class="grip" aria-hidden="true" title="Trascina">${ic("grip", 18)}</span>${id === "balance" ? "" : `<button class="w-hide" data-hl-hide="${id}" aria-label="Nascondi ${WIDGETS[id]}">${ic("eyeOff", 16)}Nascondi</button>`}</div>` : ""}
    <div class="w-body">${W[id]()}</div></div>`;
  const cols = isWide() ? ["a", "b"].map(c => `<div class="col" data-col="${c}">${vis.filter(id => L.col[id] === c).map(wrap).join("")}</div>`).join("")
    : `<div class="col" data-col="all">${vis.map(wrap).join("")}</div>`;
  return `${editHome ? `<div class="edit-bar" role="region" aria-label="Personalizza la Home">
      <div><b>Personalizza la Home</b><span>${matchMedia("(pointer: coarse)").matches ? "Tieni premuto un riquadro e trascinalo." : "Trascina i riquadri dove vuoi" + (isWide() ? ", anche nell'altra colonna." : ".")}</span></div>
      <div class="edit-acts"><button class="save small" data-hl-done>Fine</button></div>
      <div class="hl-presets" role="group" aria-label="Disposizioni pronte">${HL_PRESETS.map(p => `<button class="preset" data-hl-preset="${p.id}" aria-pressed="${presetOf(L) === p.id}">${presetThumb(p)}<span><b>${p.name}</b><small>${p.text}</small></span></button>`).join("")}</div>
      ${L.hidden.length ? `<div class="hl-hidden"><span>Nascosti</span>${L.hidden.map(id => `<button class="pill sm" data-hl-show="${id}">${ic("eye", 15)}${WIDGETS[id]}</button>`).join("")}</div>` : ""}</div>` : ""}
    <div class="home-grid${editHome ? " editing" : ""}" id="homeGrid">${cols}</div>`;
}

// FLIP: measure, change the DOM, then animate every widget from where it was to where it is
function hlFlip(mutate) {
  const els = [...document.querySelectorAll("#homeGrid .w:not(.dragging), #homeGrid .w-ph")];
  const before = new Map(els.map(el => [el, el.getBoundingClientRect()]));
  mutate();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const el of els) {
    const a = before.get(el), b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) continue;
    el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`;
    el.getBoundingClientRect();
    el.style.transition = "transform .24s cubic-bezier(.2,.8,.2,1)"; el.style.transform = "";
  }
}
function hlBegin(w, x, y) {
  const r = w.getBoundingClientRect(), ph = document.createElement("div");
  ph.className = "w-ph"; ph.style.height = r.height + "px";
  w.parentNode.insertBefore(ph, w);
  hlDrag = { w, ph, id: w.dataset.w, dx: x - r.left, dy: y - r.top, x, y, raf: 0 };
  w.classList.add("dragging");
  Object.assign(w.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", margin: "0", zIndex: "60", transition: "none", transform: "" });
  document.documentElement.classList.add("hl-dragging");
  navigator.vibrate?.(12);
  const tick = () => {   // auto-scroll near the edges while holding still
    if (!hlDrag) return;
    const edge = 80, v = hlDrag.y < edge ? -(edge - hlDrag.y) / 5 : hlDrag.y > innerHeight - edge ? (hlDrag.y - innerHeight + edge) / 5 : 0;
    if (v) { scrollBy(0, v); hlPlace(); }
    hlDrag.raf = requestAnimationFrame(tick);
  };
  hlDrag.raf = requestAnimationFrame(tick);
}
function hlPlace() {
  const { w, ph, x, y } = hlDrag;
  w.style.left = x - hlDrag.dx + "px"; w.style.top = y - hlDrag.dy + "px";
  const cols = [...document.querySelectorAll("#homeGrid .col")];
  const col = cols.find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right; })
    || cols.reduce((best, c) => { const r = c.getBoundingClientRect(), d = Math.abs(x - (r.left + r.right) / 2); return !best || d < best.d ? { c, d } : best; }, null).c;
  const items = [...col.children].filter(el => el.classList.contains("w") && el !== w);
  const before = items.find(el => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
  if (ph.parentNode !== col || ph.nextElementSibling !== before) hlFlip(() => col.insertBefore(ph, before));
}
function hlEnd() {
  const { w, ph, id, raf, renderAfter } = hlDrag; cancelAnimationFrame(raf);
  const r = ph.getBoundingClientRect();
  w.style.transition = "left .2s cubic-bezier(.2,.8,.2,1), top .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s";
  w.style.left = r.left + "px"; w.style.top = r.top + "px";
  setTimeout(() => {
    const col = ph.parentNode, L = homeLayout();
    if (col.dataset.col === "all") {
      const seq = [...col.children].filter(el => el !== w).map(el => el === ph ? id : el.dataset.w).filter(Boolean);
      L.order = [...seq, ...L.order.filter(k => !seq.includes(k))];
    } else {
      L.col[id] = col.dataset.col;
      const sib = [...col.children].filter(el => el.classList.contains("w") && el !== w);
      const idx = [...col.children].indexOf(ph), prev = [...col.children].slice(0, idx).filter(el => sib.includes(el)).pop(), next = [...col.children].slice(idx + 1).find(el => sib.includes(el));
      L.order = L.order.filter(k => k !== id);
      if (prev) L.order.splice(L.order.indexOf(prev.dataset.w) + 1, 0, id);
      else if (next) L.order.splice(L.order.indexOf(next.dataset.w), 0, id);
      else L.order.push(id);
    }
    document.documentElement.classList.remove("hl-dragging");
    hlDrag = null;
    saveLayout(L);
  }, 210);
}
// keyboard: Alt + up/down moves inside the column, Alt + left/right changes column on desktop
function hlKey(e) {
  const w = e.target.closest?.("#homeGrid .w"); if (!editHome || !w || !e.altKey || !e.key.startsWith("Arrow")) return;
  e.preventDefault();
  const id = w.dataset.w, L = homeLayout(), wide = isWide();
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { if (wide) { L.col[id] = e.key === "ArrowLeft" ? "a" : "b"; saveLayout(L, id); } return; }
  const vis = L.order.filter(k => !L.hidden.includes(k) && (!wide || L.col[k] === L.col[id])), i = vis.indexOf(id), j = i + (e.key === "ArrowUp" ? -1 : 1);
  if (j < 0 || j >= vis.length) return;
  const a = L.order.indexOf(id), b = L.order.indexOf(vis[j]);
  [L.order[a], L.order[b]] = [L.order[b], L.order[a]];
  saveLayout(L, id);
}
document.addEventListener("keydown", hlKey);
document.addEventListener("pointerdown", e => {
  if (tab !== "home" || hlDrag || e.button > 0) return;
  const w = e.target.closest("#homeGrid .w"); if (!w) return;
  const touch = e.pointerType === "touch";
  if (!editHome && !touch) return;
  if (editHome && e.target.closest("button:not(.grip), a, input, select")) return;
  const x0 = e.clientX, y0 = e.clientY, onGrip = !!e.target.closest(".grip");
  let started = false, timer = 0, last = { x: x0, y: y0 };
  // touch: long press (on the grip it starts at once). Outside edit mode a long press opens it.
  if (touch && !onGrip) timer = setTimeout(() => {
    timer = 0;
    if (!editHome) { editHome = true; navigator.vibrate?.(15); render(); stop(); return; }
    started = true; hlBegin(w, last.x, last.y);
  }, editHome ? 260 : 520);
  const move = ev => {
    last = { x: ev.clientX, y: ev.clientY };
    if (!started) {
      const moved = Math.hypot(ev.clientX - x0, ev.clientY - y0);
      if (timer) { if (moved > 9) stop(); return; }
      if (!editHome || moved < 5) return;
      started = true; hlBegin(w, x0, y0);
    }
    hlDrag.x = ev.clientX; hlDrag.y = ev.clientY; hlPlace();
  };
  const up = () => { stop(); if (started && hlDrag) hlEnd(); };
  const stop = () => { clearTimeout(timer); timer = 0; removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
});
// while dragging with a finger the page must not scroll
document.addEventListener("touchmove", e => { if (hlDrag) e.preventDefault(); }, { passive: false });
// a click that ends a drag is not a tap on what is underneath
document.addEventListener("click", e => { if (document.documentElement.classList.contains("hl-dragging")) { e.stopPropagation(); e.preventDefault(); } }, true);
matchMedia("(min-width: 900px)").addEventListener?.("change", () => { if (tab === "home") render(); });

/* ============ allinea il saldo ============ */
// Keepo's balance drifts from real life (a forgotten coffee, coins found in a pocket). Here you type
// what you really have and the difference is booked as an "Allineamento" movement on that account.
const CHECK_EVERY = [[0, "Mai"], [7, "Ogni settimana"], [14, "Ogni 2 settimane"], [30, "Ogni mese"]];
const checkEvery = () => S.settings.checkEvery ?? 14;
function checkDue() {
  const every = checkEvery(); if (!every || DEMO) return false;
  const txs = Object.values(S.tx); if (!txs.length) return false;
  const since = S.settings.checkedAt || Math.min(...txs.map(t => t.ts));
  return Date.now() - since > every * DAY && Date.now() > (S.settings.checkSnooze || 0);
}
function checkNotice() {
  if (!checkDue()) return "";
  const days = Math.round((Date.now() - (S.settings.checkedAt || Math.min(...Object.values(S.tx).map(t => t.ts)))) / DAY);
  return `<div class="card notice check"><span class="ico">${ic("sync", 22)}</span>
    <div><b>I conti tornano?</b><span>${S.settings.checkedAt ? `L'ultimo controllo è di ${days} giorni fa.` : "Non hai ancora controllato il saldo."} Guarda quanto hai davvero, in tasca e sui conti, e allinea Keepo in un attimo.</span>
    <div class="notice-acts"><button class="link" data-check>Controlla adesso</button><button class="link muted" data-check-later>Più tardi</button></div></div></div>`;
}
const parseReal = s => {   // like parseAmt, but 0 and negative balances are allowed; blank = unchanged
  s = String(s || "").trim().replace(/\s|€/g, ""); if (!s || s === "-") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s); return isFinite(n) ? Math.round(n * 100) : null;
};
function checkSheet() {
  const accs = accounts(), { b, none } = accountBalances();
  const rows = accs.length ? [...accs.map(a => ({ id: a.id, name: a.name, color: a.color, app: b[a.id] || 0 })),
    ...(none ? [{ id: "", name: "Senza conto", color: "var(--ink3)", app: none }] : [])]
    : [{ id: "", name: "Totale", app: D.total }];
  const signed = v => (v > 0 ? "+" : v < 0 ? "−" : "") + money(Math.abs(v));
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Allinea il saldo</h3><button class="r" id="cGo">Salva</button></div>
    <p class="hint" style="margin:0 4px 14px">Scrivi quanto hai davvero${accs.length ? " su ogni conto: lo vedi nell'app della banca o contando i contanti." : ": sul conto e in tasca, tutto insieme."} Se è diverso, Keepo segna la differenza come <b>Allineamento</b>: il saldo torna giusto e le entrate e uscite del mese non cambiano.</p>
    <div class="list check-list">${rows.map((r, i) => `<div class="check-row">
      <div class="cr-t">${r.color ? `<i class="adot lg" style="background:${r.color}"></i>` : ""}<span><b>${esc(r.name)}</b><small>In Keepo: <span class="num">${money(r.app)}</span></small></span></div>
      <div class="field cr-in"><input data-ci="${i}" inputmode="decimal" placeholder="${esc((r.app / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}" aria-label="Quanto hai davvero su ${esc(r.name)}"><span class="eur">€</span></div>
      <small class="cr-d" id="cd${i}"></small></div>`).join("")}</div>
    <p class="check-sum" id="cSum">Lascia vuoto quello che è già giusto.</p>
    <div class="group-h" style="margin-top:18px"><span>Ricordamelo</span></div>
    <div class="list"><label class="cell"><span>Chiedimelo</span><select id="cEvery">${CHECK_EVERY.map(([d, l]) => `<option value="${d}"${d === checkEvery() ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <p class="foot">${S.settings.checkedAt ? `Ultimo controllo: ${esc(new Date(S.settings.checkedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long" }))}.` : "Ti chiedo di controllare ogni tanto, così il saldo resta vero."}</p>`, (sh, close) => {
    sh.querySelector("[data-x]").onclick = close;
    const diffs = () => rows.map((r, i) => { const v = parseReal(sh.querySelector(`[data-ci="${i}"]`).value); return v == null ? 0 : v - r.app; });
    const draw = () => {
      const d = diffs(); let tot = 0;
      d.forEach((v, i) => { tot += v; const el = $("#cd" + i); el.textContent = v ? `Hai ${money(Math.abs(v))} ${v > 0 ? "in più" : "in meno"} di quanto pensava Keepo` : ""; el.className = "cr-d" + (v > 0 ? " pos" : v < 0 ? " neg" : ""); });
      $("#cSum").innerHTML = d.some(v => v) ? `Differenza totale: <b class="num${tot < 0 ? " neg" : tot > 0 ? " pos" : ""}">${signed(tot)}</b> · nuovo saldo <b class="num">${money(D.total + tot)}</b>` : "Lascia vuoto quello che è già giusto.";
    };
    sh.addEventListener("input", e => { if (e.target.matches("[data-ci]")) draw(); });
    setTimeout(() => sh.querySelector("[data-ci]")?.focus(), 250);
    $("#cGo").onclick = () => {
      const d = diffs(), ts = Date.now(), made = [];
      d.forEach((v, i) => {
        if (!v) return;
        const t = { id: uuid(), type: v > 0 ? "in" : "out", amount: Math.abs(v), cat: ADJUST, note: "Saldo allineato" + (rows[i].id ? " · " + rows[i].name : ""), ts, account: rows[i].id || null };
        S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) }); made.push(t);
      });
      const every = +$("#cEvery").value;
      S.settings = { ...S.settings, checkEvery: every, checkedAt: ts, checkSnooze: 0 };
      enqueue({ op: "up", t: "settings", row: { data: S.settings } });
      close(); commit();
      const tot = made.reduce((a, t) => a + (t.type === "in" ? t.amount : -t.amount), 0);
      if (made.length) { toast(`Saldo allineato: ${signed(tot)}`, () => made.forEach(t => delTx(t.id))); mascotReact("jump"); }
      else toast("Perfetto, i conti tornano");
    };
  });
}

/* ============ prezzi dai link ============ */
// product page titles: decode HTML entities and drop shop names ("Amazon.it: …", "… | IKEA")
function cleanTitle(t) {
  if (!t) return "";
  const ta = document.createElement("textarea"); ta.innerHTML = t; t = ta.value.replace(/\s+/g, " ").trim();
  t = t.replace(/^amazon\.[a-z.]+\s*:\s*/i, "").replace(/\s*:\s*amazon\.[a-z.]+.*$/i, "");
  t = t.split(/\s+[|–—]\s+/)[0].trim();
  t = t.replace(/\s+-\s+[^-]{2,25}$/, "").trim(); // "Nome prodotto - IKEA Italia"
  return t;
}
async function loadPriceHistory(goalId) {
  if (DEMO) { const n = Date.now(), base = [29900, 29900, 28990, 29490, 27900, 27990, 26900, 27490, 24900]; return goalId === "d-cuffie" ? base.map((p, i) => ({ p, t: n - (base.length - 1 - i) * 3 * DAY })) : []; }
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
let priceHist = [];
function priceChart(h, g) {
  if (!h || !h.length) return "";
  const fd = t => fmtDate(t, { day: "numeric", month: "short" });
  if (h.length === 1) return `<p class="pnote">Primo prezzo registrato il ${esc(fd(h[0].t))}: ${money(h[0].p)}. Il grafico compare da domani mattina, dopo il prossimo controllo.</p>`;
  priceHist = h;
  const W = 600, H = 150, ps = h.map(x => x.p), ref = g.price;
  let min = Math.min(...ps, ref), max = Math.max(...ps, ref);
  const pad = (max - min) * .12 || max * .05 || 100; min -= pad; max += pad;
  const t0 = h[0].t, t1 = h[h.length - 1].t, span = t1 - t0 || 1;
  const x = t => (t - t0) / span * W, y = v => H - (v - min) / (max - min) * H;
  const d = h.map((q, k) => (k ? "L" : "M") + x(q.t).toFixed(1) + " " + y(q.p).toFixed(1)).join(" ");
  const low = Math.min(...ps), lowIdx = ps.lastIndexOf(low);
  const pts = h.map((q, k) => {
    const cls = k === lowIdx ? "low" : k === h.length - 1 ? "last" : "";
    return `<span class="pdot ${cls}" style="left:${x(q.t) / W * 100}%;top:${y(q.p) / H * 100}%"></span>`;
  }).join("");
  return `<div class="pchart" data-pchart>
      <div class="pplot">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" x2="${W}" y1="${y(ref)}" y2="${y(ref)}" stroke="var(--ink3)" stroke-dasharray="5 6" vector-effect="non-scaling-stroke"/>
          <path d="${d} L${W} ${H} L0 ${H}Z" fill="var(--ink)" opacity=".05"/>
          <path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        </svg>
        ${pts}
        <span class="pref" style="top:${y(ref) / H * 100}%">tuo prezzo ${esc(moneyShort(ref))}</span>
        <span class="pcross" hidden></span><div class="ptip" hidden></div>
      </div>
      <div class="pchart-x"><span>${esc(fd(t0))}</span><span class="plow">min ${money(low)} · ${esc(fd(h[lowIdx].t))}</span><span>${esc(fd(t1))}</span></div>
    </div>`;
}
function priceHover(el, clientX) {
  if (!priceHist.length) return;
  const plot = el.querySelector(".pplot"), r = plot.getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  const t0 = priceHist[0].t, span = (priceHist[priceHist.length - 1].t - t0) || 1, at = t0 + f * span;
  let k = 0; priceHist.forEach((q, i) => { if (Math.abs(q.t - at) < Math.abs(priceHist[k].t - at)) k = i; });
  const q = priceHist[k], left = (q.t - t0) / span * 100;
  const cross = plot.querySelector(".pcross"), tip = plot.querySelector(".ptip");
  cross.hidden = tip.hidden = false; cross.style.left = left + "%";
  tip.innerHTML = `<span>${esc(fmtDate(q.t, { weekday: "short", day: "numeric", month: "short" }))}</span><b class="num">${money(q.p)}</b>`;
  tip.style.left = Math.max(12, Math.min(88, left)) + "%";
}
function priceBox(g, h) {
  if (legacyPrice) return `<div class="ptop"><b>Prezzo sul sito</b></div><p class="pnote">Per seguire il prezzo esegui su Supabase l'aggiornamento SQL dei prezzi (aggiornamento-5.sql).</p>`;
  const when = g.last_checked ? fmtDate(g.last_checked, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const adv = g.last_price ? priceAdvice(h, g) : null;
  return `<div class="ptop"><b>Prezzo su ${esc(hostOf(g.url))}</b><button class="link" data-pcheck>${ic("sync", 15)}Controlla ora</button></div>
    ${g.last_price ? `<div class="pnow"><span class="num">${money(g.last_price)}</span>${g.last_price !== g.price ? `<small class="${g.last_price < g.price ? "pos" : "neg"}">${g.last_price < g.price ? "−" : "+"}${money(Math.abs(g.last_price - g.price))} rispetto al tuo obiettivo</small>` : ""}</div>`
      : `<p class="pnote">${esc(g.price_note || (g.last_checked ? "Prezzo non disponibile" : "Primo controllo in corso: torna tra qualche minuto."))}</p>`}
    ${h === null ? "" : priceChart(h, g)}
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

/* ============ quanto ti costa davvero ============ */
// amount in cents -> working time, from the hourly net pay set in Altro
function workTime(cents, short = false) {
  const h = S.settings.hourly; if (!h || !cents) return "";
  const mins = Math.round(cents / h * 60);
  if (mins < 1) return short ? "< 1 min" : "meno di un minuto";
  if (mins < 60) return `${mins} min`;
  if (mins < 8 * 60) { const hh = Math.floor(mins / 60), mm = mins % 60; return mm && !short ? `${hh} h ${mm} min` : `${hh}${mm && short ? "," + Math.round(mm / 6) : ""} h`; }
  const days = mins / (8 * 60);
  return days < 10 ? `${days.toFixed(1).replace(".", ",").replace(",0", "")} giorni` : `${Math.round(days)} giorni`;
}
function wageSheet() {
  const st = S.settings, mode = st.wageMode || "month";
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Quanto ti costa davvero</h3><button class="r" id="wSave">Salva</button></div>
    <p class="hint" style="margin:0 4px 12px">Ogni obiettivo e ogni spesa ti mostrano anche quante ore di lavoro costano. Il dato resta tuo: serve solo per il calcolo.</p>
    <div class="seg" role="group"><button data-wm="month" aria-pressed="${mode === "month"}">Stipendio mensile</button><button data-wm="hour" aria-pressed="${mode === "hour"}">Paga oraria</button></div>
    <div class="fields" id="wFields"></div>
    <p class="hint" id="wPrev"></p>
    ${st.hourly ? `<button class="save danger" id="wOff">Non mostrare più il tempo di lavoro</button>` : ""}`, (sh, close) => {
    let m = mode;
    const draw = () => {
      sh.querySelectorAll("[data-wm]").forEach(b => b.setAttribute("aria-pressed", b.dataset.wm === m));
      $("#wFields").innerHTML = m === "month"
        ? `<div class="field"><label for="wMonth">Netto al mese €</label><input id="wMonth" inputmode="decimal" placeholder="1.500" style="text-align:right" value="${st.monthly ? esc(centsToInput(st.monthly).replace(/,00$/, "")) : ""}"></div>
           <div class="field"><label for="wHours">Ore a settimana</label><input id="wHours" inputmode="decimal" placeholder="40" style="text-align:right" value="${esc(st.weekHours || "")}"></div>`
        : `<div class="field"><label for="wHour">Netto all'ora €</label><input id="wHour" inputmode="decimal" placeholder="10,00" style="text-align:right" value="${st.hourly && st.wageMode === "hour" ? esc(centsToInput(st.hourly)) : ""}"></div>`;
      sh.querySelectorAll("#wFields input").forEach(i => i.oninput = preview); preview();
    };
    const calc = () => {
      if (m === "hour") return parseAmt($("#wHour").value);
      const monthly = parseAmt($("#wMonth").value), hours = parseFloat(String($("#wHours").value).replace(",", ".")) || 40;
      return monthly ? Math.round(monthly / (hours * 52 / 12)) : 0;
    };
    const preview = () => { const h = calc(); $("#wPrev").textContent = h ? `Circa ${money(h)} netti all'ora. Un caffè da 1,20 € ≈ ${Math.max(1, Math.round(120 / h * 60))} minuti di lavoro.` : ""; };
    sh.querySelector("[data-x]").onclick = close;
    sh.querySelectorAll("[data-wm]").forEach(b => b.onclick = () => { m = b.dataset.wm; draw(); });
    $("#wSave").onclick = () => {
      const h = calc(); if (!h) { toast("Scrivi quanto guadagni"); return; }
      const patch = { hourly: h, wageMode: m };
      if (m === "month") { patch.monthly = parseAmt($("#wMonth").value); patch.weekHours = $("#wHours").value.trim() || "40"; }
      close(); saveSettings(patch); toast(`Fatto: ${money(h)} all'ora`);
    };
    if ($("#wOff")) $("#wOff").onclick = () => { close(); saveSettings({ hourly: null }); toast("Tempo di lavoro nascosto"); };
    draw();
  });
}

/* ============ scontrino ============ */
// OCR runs in the browser with Tesseract.js: the photo never leaves the device.
let ocrWorker = null;
function loadScript(src) {
  return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
// Phone photos of thermal receipts: grey paper, uneven light, small text. Make the text tall enough
// for Tesseract (long side ~2000 px) and, for the first pass, turn it into clean black on white with a
// local threshold (each pixel against the average of its neighbourhood), which survives shadows.
async function loadImg(file) {
  const url = URL.createObjectURL(file);
  try { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}
function prepReceipt(im, binarize) {
  const k = Math.min(2.5, 2000 / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(im, 0, 0, w, h);
  // grey with a bit more contrast, computed here (canvas filters are missing on older Safari)
  const img = x.getImageData(0, 0, w, h), d = img.data, g = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { const o = i * 4, l = .299 * d[o] + .587 * d[o + 1] + .114 * d[o + 2]; g[i] = Math.max(0, Math.min(255, (l - 128) * 1.25 + 128)); }
  if (!binarize) { for (let i = 0; i < w * h; i++) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g[i]; x.putImageData(img, 0, 0); return c; }
  const S = new Float64Array((w + 1) * (h + 1));   // integral image: any box sum in four lookups
  for (let yy = 1; yy <= h; yy++) { let row = 0; for (let xx = 1; xx <= w; xx++) { row += g[(yy - 1) * w + xx - 1]; S[yy * (w + 1) + xx] = S[(yy - 1) * (w + 1) + xx] + row; } }
  const r = Math.max(8, Math.round(Math.min(w, h) / 40));
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const x0 = Math.max(0, xx - r), x1 = Math.min(w, xx + r + 1), y0 = Math.max(0, yy - r), y1 = Math.min(h, yy + r + 1);
    const mean = (S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    const v = g[yy * w + xx] < mean * 0.86 ? 0 : 255, o = (yy * w + xx) * 4;
    d[o] = d[o + 1] = d[o + 2] = v;
  }
  x.putImageData(img, 0, 0);
  return c;
}
const SHOP_CATS = [
  [/conad|coop|esselunga|lidl|carrefour|eurospin|despar|pam|penny|aldi|md\b|famila|sigma|crai|todis|tigre|iper|supermercat|market/i, "Spesa"],
  [/bar\b|caff[eè]|pizzer|ristorant|trattori|osteri|sushi|mcdonald|burger|kebab|gelater|pasticceri|panific|bistrot/i, "Ristoranti"],
  [/farmaci|parafarm|sanitari/i, "Salute"],
  [/\beni\b|\bq8\b|\bip\b|tamoil|esso|agip|carburant|benzin|parcheggi|autostrad|trenitalia|italo|atm\b|atac/i, "Trasporti"],
  [/zara|h&m|primark|ovs|decathlon|ikea|mediaworld|unieuro|euronics|amazon|zalando|shein|douglas|sephora|tiger/i, "Shopping"],
  [/cinema|teatro|museo|steam|playstation|netflix|spotify/i, "Svago"]
];
async function readReceipt(file, onProgress) {
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  let pass = 0;
  if (!ocrWorker) ocrWorker = await Tesseract.createWorker("ita", 1, { logger: m => { if (m.status === "recognizing text") onProgress(Math.round((pass + m.progress) / 2 * 100)); } });
  const im = await loadImg(file);
  // pass 1: black and white, the receipt read as one block of lines
  await ocrWorker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
  let r = parseReceipt((await ocrWorker.recognize(prepReceipt(im, true))).data.text || "");
  // pass 2 only if the total is missing or doesn't match the lines: the grey image, same layout
  if (!r.total || !r.itemsMatch) {
    pass = 1;
    await ocrWorker.setParameters({ tessedit_pageseg_mode: "6" });
    const r2 = parseReceipt((await ocrWorker.recognize(prepReceipt(im, false))).data.text || "");
    const score = x => (x.total ? 2 : 0) + (x.itemsMatch ? 2 : 0) + Math.min(x.items.length, 10) / 10 + (x.date ? .5 : 0) + (x.shop ? .3 : 0);
    if (score(r2) > score(r)) r = { ...r2, shop: r2.shop || r.shop, date: r2.date || r.date, cat: r2.cat || r.cat };
    else r = { ...r, shop: r.shop || r2.shop, date: r.date || r2.date, cat: r.cat || r2.cat };
  }
  return r;
}
const RECEIPT_SKIP = /sub\s*-?\s*tot|t[o0]t[a4]l|iva\b|i\.v\.a|imponib|aliquot|resto|contant|pagament|bancomat|carta|credit|debit|import[o0]|euro\b|n\.\s*pezzi|articol|scontrino|document|operator|cassa\b|p\.\s*iva|c\.f\.|tel\b|via\b|piazza|corso|grazie|arriveder|transaz|autoriz|esercent|terminal|stan\b|mod\.?\s*pag/i;
function parseReceipt(text) {
  // OCR mistakes inside numbers: O→0, l/I→1, S→5 next to digits; "23 , 47" → "23,47"
  const fix = l => l.replace(/(\d)[oO](?=[\d.,])/g, "$10").replace(/([\d.,])[oO](?=\d)/g, "$10").replace(/(\d)[lI|](?=\d)/g, "$11").replace(/([.,]\d)[oO]\b/g, "$10").replace(/([.,])[oO](\d)\b/g, "$10$2")
    .replace(/(\d)\s*([.,])\s*(\d{2})\b/g, "$1$2$3").replace(/€\s*/g, "€ ");
  const lines = text.split(/\n/).map(l => fix(l.replace(/\s+/g, " ").trim())).filter(Boolean);
  const amountIn = l => { const m = l.match(/-?\s?(\d{1,5}(?:[.\s]\d{3})*[.,]\d{2})(?!\d)/g); return m ? m.map(v => (/-/.test(v) ? -1 : 1) * parseAmt(v.replace(/[-\s]/g, "").replace(/\.(?=\d{3}[.,])/g, ""))) : []; };
  let total = 0, totalLine = -1;
  for (const re of [/t[o0]t[a4]l[e3]\s*(c[o0]mplessiv[o0]|eur[o0]?|€|d[a4]\s*p[a4]g[a4]re)?/i, /imp[o0]rt[o0]\s*(p[a4]g[a4]t[o0]|t[o0]t[a4]le)/i, /\bt[o0]t\b/i, /p[a4]g[a4]ment[o0]\s*(elettr|c[a4]rt|contactless)|c[o0]nt[a4]nte|b[a4]nc[o0]m[a4]t|c[a4]rt[a4]/i]) {
    for (let i = 0; i < lines.length && !total; i++) {
      if (!re.test(lines[i]) || /sub\s*-?\s*t[o0]t|iva|resto|sc[o0]nt[o0]|risparmi/i.test(lines[i])) continue;
      const nextOk = lines[i + 1] && !/resto|iva|sconto|subtot/i.test(lines[i + 1]);
      const v = amountIn(lines[i]).filter(x => x > 0).concat(nextOk ? amountIn(lines[i + 1]).filter(x => x > 0) : []);
      if (v.length) { total = v[0]; totalLine = i; }
    }
    if (total) break;
  }
  // the bought lines: "DESCRIZIONE ... 1,99" above the total, discounts as negative lines
  const items = [];
  const end = totalLine >= 0 ? totalLine : lines.length;
  for (let i = 0; i < end; i++) {
    const l = lines[i], m = l.match(/^(.*?[a-zà-ù].*?)\s+(-?\s?\d{1,4}(?:\.\d{3})?[.,]\d{2})\s*(?:[A-Z]{1,2}|\d{1,2}\s?%)?[\s+!|*'"`.,:;]*$/i);
    if (!m) continue;
    let name = m[1].replace(/\s+\d{1,2}\s?%$/, "").replace(/^[^\p{L}\d]+|[^\p{L}\d)]+$/gu, "").trim();
    const isDisc = /sc[o0]nt|promo|offert|-\s?\d/i.test(l);
    if (!isDisc && RECEIPT_SKIP.test(name)) continue;
    if (name.length < 2 || /^\d+$/.test(name)) continue;
    let v = amountIn(m[2])[0]; if (!v) continue;
    if (isDisc && v > 0) v = -v;
    // "2 x 1,50" quantity lines belong to the next/previous description: keep the amount only
    name = name.replace(/^\d+\s*[xX*]\s*\d+[.,]\d{2}\s*/, "").slice(0, 40) || "Articolo";
    items.push({ name: name.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w+/g, w => w.toLowerCase()), amount: v });
  }
  const sum = items.reduce((a, it) => a + it.amount, 0);
  const fromTotalLine = total > 0;
  if (!total && items.length >= 2 && sum > 0) total = sum;
  if (!total) { const all = lines.filter(l => !/resto|contante|pagamento/i.test(l)).flatMap(amountIn).filter(v => v > 0 && v < 500000); if (all.length) total = Math.max(...all); }
  const itemsMatch = fromTotalLine && items.length > 0 && Math.abs(sum - total) <= 2;
  // shop name: a known brand in the first lines, else the first line written in capitals (receipt headers are)
  const head = lines.slice(0, 6).filter(l => /[a-zà-ù]{3,}/i.test(l) && !/scontrino|documento|commerciale|vendita|prestazione|via |viale|piazza|p\.?\s?iva|partita|tel|www|benvenut/i.test(l));
  const caps = l => { const L = l.replace(/[^a-zà-ù]/gi, ""); return L.length >= 3 && L.replace(/[^A-ZÀ-Ù]/g, "").length / L.length > .7; };
  const shop = (head.find(l => SHOP_CATS.some(([re]) => re.test(l))) || head.find(caps) || head[0] || "").replace(/[^\p{L}\p{N}&' .-]/gu, "").trim().slice(0, 40);
  const MESI = { gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6, lug: 7, ago: 8, set: 9, ott: 10, nov: 11, dic: 12 };
  let date = "";
  const dm = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/) || text.match(/\b(\d{1,2})\s?(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*\.?\s?(\d{2,4})\b/i);
  if (dm) { let d = +dm[1], mo = MESI[String(dm[2]).toLowerCase()] || +dm[2], y = +dm[3]; if (y < 100) y += 2000; if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2015 && y <= new Date().getFullYear() + 1) date = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
  const cat = (SHOP_CATS.find(([re]) => re.test(text)) || [])[1] || "";
  return { total, shop: shop ? shop.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w+/g, w => w.toLowerCase()) : "", date, cat, items: itemsMatch || items.length >= 2 ? items : [], itemsMatch };
}

/* ============ pagamenti divisi tra conti ============ */
// rows of [account, amount]; "+ altro conto" adds a row with what is still missing
function paymentRows(el, initial, { label = "Importo", total = 0, restNoAccount = false } = {}) {
  const gap = sum => !total || sum === total ? "" : sum < total ? (restNoAccount ? ` · il resto (${money(total - sum)}) senza conto` : ` · mancano ${money(total - sum)}`) : ` · ${money(sum - total)} in più`;
  let rows = initial.map(r => ({ ...r }));
  const accs = accounts();
  const draw = () => {
    const sum = rows.reduce((a, r) => a + (r.amount || 0), 0);
    el.innerHTML = rows.map((r, i) => `<div class="payrow">
        ${accs.length ? `<select data-pacc="${i}" aria-label="Conto">${[["", "Nessun conto"], ...accs.map(a => [a.id, a.name])].map(([id, n]) => `<option value="${esc(id)}"${r.acc === id ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>` : `<span class="paylabel">${esc(label)} €</span>`}
        <input data-pamt="${i}" inputmode="decimal" value="${r.amount ? esc(centsToInput(r.amount)) : ""}" placeholder="0,00" aria-label="Importo">
        ${rows.length > 1 ? `<button class="payx" data-pdel="${i}" aria-label="Togli">${ic("close", 16)}</button>` : ""}
      </div>`).join("")
      + (accs.length ? `<div class="payfoot"><button class="link" data-padd>${ic("plus", 15)}Paga anche con un altro conto</button><span class="num">${rows.length > 1 ? "Totale " + money(sum) : ""}${gap(sum)}</span></div>` : "");
  };
  el.addEventListener("input", e => {
    const a = e.target.closest("[data-pamt]"); if (a) { rows[+a.dataset.pamt].amount = parseAmt(a.value); const f = el.querySelector(".payfoot span"); if (f) { const sum = rows.reduce((x, r) => x + (r.amount || 0), 0); f.textContent = (rows.length > 1 ? "Totale " + money(sum) : "") + gap(sum); } }
  });
  el.addEventListener("change", e => { const s = e.target.closest("[data-pacc]"); if (s) rows[+s.dataset.pacc].acc = s.value; });
  el.addEventListener("click", e => {
    if (e.target.closest("[data-padd]")) {
      const target = total;
      const sum = rows.reduce((a, r) => a + (r.amount || 0), 0);
      const used = new Set(rows.map(r => r.acc));
      rows.push({ acc: (accs.find(a => !used.has(a.id)) || accs[0]).id, amount: Math.max(0, (target || 0) - sum) });
      draw(); el.querySelectorAll("[data-pamt]")[rows.length - 1]?.focus();
    }
    const d = e.target.closest("[data-pdel]"); if (d) { rows.splice(+d.dataset.pdel, 1); draw(); }
  });
  draw();
  return { rows: () => rows };
}
function splitSheet(tx) {
  sheet(`<div class="sheet-h"><button class="l" data-x>Annulla</button><h3>Dividi tra conti</h3><button class="r" id="spGo">Salva</button></div>
    <p class="hint" style="margin:0 4px 12px">${esc(tx.note || catInfo(tx.type, tx.cat)[0])} · ${money(tx.amount)}. Scegli quanto è uscito da ogni conto, per esempio una parte dal buono e il resto da Hype.</p>
    <div class="card qcode" id="spRows"></div>`, (sh, close) => {
    const pay = paymentRows($("#spRows"), [{ acc: tx.account || lastAccount(), amount: tx.amount }], { total: tx.amount, restNoAccount: true });
    sh.querySelector("[data-x]").onclick = close;
    $("#spGo").onclick = () => {
      const rows = pay.rows().filter(r => r.amount > 0);
      const sum = rows.reduce((a, r) => a + r.amount, 0);
      if (!rows.length) { toast("Scrivi almeno un importo"); return; }
      if (sum > tx.amount) { toast(`La somma è ${money(sum)}: supera il movimento di ${money(sum - tx.amount)}`); return; }
      if (sum < tx.amount) rows.push({ acc: "", amount: tx.amount - sum }); // the rest stays without account
      const before = { ...tx }, created = [];
      rows.forEach((r, i) => {
        const t = i === 0 ? { ...tx, amount: r.amount, account: r.acc || null } : { ...tx, id: uuid(), amount: r.amount, account: r.acc || null };
        if (i) created.push(t.id);
        S.tx[t.id] = t; enqueue({ op: "up", t: "transactions", row: pick(t, COLS.transactions) });
      });
      close(); commit();
      toast(`Diviso su ${rows.length} conti`, () => { created.forEach(id => delTx(id)); putTx(before); });
    };
  });
}

/* ============ events ============ */
document.addEventListener("click", e => {
  const ob = e.target.closest("[data-ob]"); if (ob) { onboardingAction(ob.dataset.ob); return; }
  if (!e.target.closest(".sheet")) {
    if (e.target.closest("[data-acc-toggle]")) { showAccounts = !showAccounts; try { localStorage.setItem(LS + ".showacc", showAccounts ? "1" : ""); } catch {} render(); return; }
    if (e.target.closest("[data-acc-manage]")) { accountsSheet(); return; }
    if (e.target.closest("[data-transfer]")) { transferSheet(); return; }
    if (e.target.closest("[data-mclear]")) { movAcc = movCat = movNote = ""; render(); return; }
  }
  if (e.target.closest("[data-check]") && !e.target.closest(".sheet")) { checkSheet(); return; }
  if (e.target.closest("[data-hl-edit]")) { editHome = true; render(); document.querySelector(".edit-bar")?.scrollIntoView({ block: "nearest" }); return; }
  if (e.target.closest("[data-hl-done]")) { editHome = false; render(); toast("Home salvata"); return; }
  const hp = e.target.closest("[data-hl-preset]");
  if (hp) { const p = HL_PRESETS.find(x => x.id === hp.dataset.hlPreset); saveLayout({ order: [...p.order], col: { ...p.col }, hidden: [...p.hidden] }); toast(`Home: ${p.name}`); return; }
  const hh = e.target.closest("[data-hl-hide]"); if (hh) { const L = homeLayout(); L.hidden.push(hh.dataset.hlHide); saveLayout(L); return; }
  const hs = e.target.closest("[data-hl-show]"); if (hs) { const L = homeLayout(); L.hidden = L.hidden.filter(k => k !== hs.dataset.hlShow); saveLayout(L); return; }
  if (e.target.closest("[data-check-later]")) { saveSettings({ checkSnooze: Date.now() + 2 * DAY }); return; }
  if (e.target.closest("[data-icon-steps]")) { iconSteps = true; render(); return; }
  if (e.target.closest("[data-icon-ok]")) { try { localStorage.setItem(LS + ".iconv", String(ICON_VERSION)); } catch {} render(); return; }
  const it = e.target.closest("[data-interest]");
  if (it) {
    const list = new Set(S.settings.interest || []), id = it.dataset.interest;
    list.has(id) ? list.delete(id) : list.add(id);
    saveSettings({ interest: [...list] });
    if (list.has(id)) { toast("Segnato: ti avviso quando arriva"); mascotReact("jump"); }
    return;
  }
  if (e.target.closest("[data-budgets]") && !e.target.closest(".sheet")) { budgetSheet(); return; }
  if (!e.target.closest(".sheet")) {
    const dn = e.target.closest("[data-due-new]"); if (dn) { dueSheet(null, { dir: dn.dataset.dueNew }); return; }
    const dd = e.target.closest("[data-due-done]");
    if (dd) {
      const d = dues().find(x => x.id === dd.dataset.dueDone); if (!d || dd.classList.contains("done")) return;
      dd.classList.add("done");   // the circle fills with the check, then the sheet asks where the money went
      setTimeout(() => {
        dueDoneSheet(d);
        // cancelled: the row is still there, so the circle goes back to empty
        const t = setInterval(() => { if (!closeSheet) { clearInterval(t); if (dd.isConnected) dd.classList.remove("done"); } }, 250);
      }, 420);
      return;
    }
    const de = e.target.closest("[data-due]"); if (de) { const d = dues().find(x => x.id === de.dataset.due); if (d) dueSheet(d); return; }
  }
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
    else if (a === "tour") { setTab("home"); setTimeout(startTour, 350); }
    else if (a === "dues") { const L = homeLayout(); if (L.hidden.includes("dues")) { L.hidden = L.hidden.filter(k => k !== "dues"); saveLayout(L); } setTab("home"); setTimeout(() => document.querySelector('[data-w="dues"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }
    else if (a === "password") passwordSheet(false);
    else if (a === "delete") deleteAccountSheet();
    else if (a === "siri") siriSheet();
    else if (a === "auto") autoSheet();
    else if (a === "accounts") accountsSheet();
    else if (a === "wage") wageSheet();
    else if (a === "sheetimport") pickFile("", importSheetFile);
    else if (a === "import") pickFile("", importBackup);
  }
});
// Sul computer: trascina un file Excel, CSV o un backup sulla finestra per importarlo.
const dragFiles = e => [...(e.dataTransfer?.types || [])].includes("Files");
const canImport = () => S.mode && !(S.mode === "cloud" && !session) && !needsOnboarding();
document.addEventListener("dragover", e => { if (dragFiles(e) && canImport()) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; document.body.classList.add("dropping"); } });
document.addEventListener("dragleave", e => { if (!e.relatedTarget) document.body.classList.remove("dropping"); });
document.addEventListener("drop", e => {
  document.body.classList.remove("dropping");
  if (!dragFiles(e) || !canImport()) return;
  e.preventDefault();
  const f = e.dataTransfer.files[0]; if (f) importSheetFile(f);   // riconosce da solo anche i backup .json
});
document.addEventListener("pointermove", e => { const c = e.target.closest("[data-chart=balance]"); if (c) chartHover(c, e.clientX); const p = e.target.closest("[data-pchart]"); if (p) priceHover(p, e.clientX); });
document.addEventListener("pointerdown", e => { const p = e.target.closest("[data-pchart]"); if (p) priceHover(p, e.clientX); });
document.addEventListener("pointerdown", e => { const c = e.target.closest("[data-chart=balance]"); if (c) chartHover(c, e.clientX); });
document.addEventListener("pointerout", e => { const c = e.target.closest("[data-chart=balance]"); if (c && !c.contains(e.relatedTarget)) chartLeave(c); });
document.addEventListener("change", e => {
  const f = e.target.closest("[data-mf]"); if (!f) return;
  if (f.dataset.mf === "acc") movAcc = f.value; else if (f.dataset.mf === "cat") movCat = f.value; else movNote = f.value;
  render();
});
document.addEventListener("input", e => {
  if (e.target.id === "movQ") { movQuery = e.target.value; $("#movList").innerHTML = movList(); $("#movSum").innerHTML = movSummary(); $("#movChips").innerHTML = movChips(); }
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
  if (DEMO) { el.remove(); splashOn = false; return; }
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
if (DEMO) { document.documentElement.classList.add("demo"); const z = +new URLSearchParams(location.search).get("zoom"); if (z) { document.documentElement.style.zoom = z; document.documentElement.classList.add("demo-zoom"); } render(); setTimeout(demoScene, 50); window.__keepo = { txSheet, goalSheet, goalEditSheet, accountsSheet, budgetSheet, siriSheet, wageSheet, transferSheet, splitSheet, recurringSheet, setTab, mascotSay, render }; }
else if (cfg.supabaseUrl && cfg.supabaseAnonKey && S.mode !== "local") startCloud();
else { render(); runRecurring(); runInterest(); }
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
    if (!hadController || reloaded) return;
    reloaded = true;
    // not while a sheet is open or a file is being picked (iPhone checks for updates when you come back from Files)
    const go = () => { if (closeSheet || Date.now() - pickAt < 120000) setTimeout(go, 1500); else location.reload(); };
    go();
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then(reg => { reg.update(); document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update(); }); })
    .catch(() => {});
}
})();
