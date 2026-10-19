"""Monta le clip della guida (guida/clip/*.mp4) dalle registrazioni reali del simulatore iOS.
Stile: colori pieni del marchio che si alternano con una tendina, scritte grandi che entrano riga per riga,
la "telecamera" che segue il telefono (avvicinamenti, leggera inclinazione), tocchi come nelle registrazioni di iOS.
Uso: CLIP_SRC=/cartella/registrazioni python3 design/build_clips.py [nome ... | guida]
("guida" rifà guida/keepo-guida.mp4 dalla registrazione di design/record_video.mjs)
(registrazioni: mp4 a 30 fps, larghe 600 px, dello schermo dell'iPhone da 402x874 punti)"""
import os, sys, math, re, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get("CLIP_SRC", "")
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 720, 1280, 30
SF = "/System/Library/Fonts/SFNS.ttf"
LIGHT, NAVY, INK, WHITE = (243, 245, 249), (22, 36, 72), (17, 28, 56), (255, 255, 255)
ACC = {LIGHT: (24, 121, 92), NAVY: (94, 230, 181)}
PT_W, PT_H = 402, 874

def font(px, w=400):
    f = ImageFont.truetype(SF, px); f.set_variation_by_axes([100, min(96, max(17, px * .75)), 400, w]); return f
def clamp(t): return max(0., min(1., t))
def ease(t): t = clamp(t); return t * t * (3 - 2 * t)
def out3(t): t = clamp(t); return 1 - (1 - t) ** 3
def back(t, c=1.5): t = clamp(t); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2

# beats: (source time, lines, small line). cam: (source time, zoom, focus x, focus y on the screen)
CLIPS = {
  "uscita": dict(
    cuts=[(0, 1.1, 1), (1.1, 3.8, 5), (3.8, 6.4, 1), (6.4, 8.6, 1), (13.0, 14.2, 1)],
    beats=[(0, ["Ehi Siri,", "Uscita Keepo."], None), (1.1, ["Quanto", "hai speso?"], None),
           (4.7, ["Dove?"], "Ristoranti, spesa, trasporti…"), (6.3, ["Segnato."], "Il saldo è già aggiornato.")],
    taps=[(0.8, 166, 501), (3.95, 68, 619), (4.2, 200, 619), (4.6, 293, 252), (5.85, 87, 424), (13.05, 293, 177)],
    cam=[(0, 1, .5, .5), (3.6, 1, .5, .5), (4.7, 1.12, .5, .3), (6.2, 1.12, .5, .3), (6.6, 1.32, .5, .12), (12.8, 1.32, .5, .12), (13.3, 1, .5, .5)]),
  "entrata": dict(
    cuts=[(0, 1.1, 1), (1.1, 7.0, 8), (7.0, 9.0, 1), (9.0, 11.4, 1), (16.2, 17.7, 1)],
    beats=[(0, ["Ehi Siri,", "Entrata Keepo."], None), (1.1, ["Quanto", "è entrato?"], None),
           (7.6, ["Da dove?"], "Stipendio, regalo, lavoretto…"), (8.4, ["Segnato."], "E il saldo sale.")],
    taps=[(0.8, 357, 378), (7.2, 200, 673), (7.38, 200, 782), (7.55, 293, 252), (8.0, 87, 369), (16.3, 293, 177)],
    cam=[(0, 1, .5, .5), (6.9, 1, .5, .5), (7.7, 1.12, .5, .25), (8.2, 1.12, .5, .25), (8.6, 1.32, .5, .12), (16.0, 1.32, .5, .12), (16.5, 1, .5, .5)]),
  "saldo": dict(
    cuts=[(0, 1.0, 1), (1.0, 4.4, 1), (8.1, 9.2, 1)],
    beats=[(0, ["Ehi Siri,", "Saldo Keepo."], None), (1.0, ["Tutto il mese,", "in una frase."], "Saldo, entrate e uscite.")],
    taps=[(0.8, 166, 378), (8.3, 293, 177)],
    cam=[(0, 1, .5, .5), (1.1, 1, .5, .5), (1.6, 1.32, .5, .1), (8.0, 1.32, .5, .1), (8.5, 1, .5, .5)]),
  "automazione-applepay": dict(
    cuts=[(0, 4.25, 1), (4.25, 6.4, 4), (6.4, 13.0, 1)],
    beats=[(0, ["Cerca", "«Wallet»."], "Modifica il comando → Automazioni"), (7.4, ["Scegli", "le carte."], "Hype, Revolut, quelle che vuoi"),
           (9.0, ["Fatto."], "Ogni pagamento Apple Pay finisce in Keepo.")],
    taps=[(0.25, 190, 770), (0.5, 92, 158), (6.5, 97, 211), (7.5, 217, 333), (8.75, 363, 100), (9.05, 38, 84), (10.25, 38, 84), (11.25, 157, 402)],
    cam=[(0, 1, .5, .5), (6.2, 1, .5, .5), (6.6, 1.3, .5, .2), (7.3, 1.3, .5, .2), (7.6, 1.45, .5, .12), (8.6, 1.45, .5, .12), (9.1, 1, .5, .5), (11.8, 1, .5, .5), (12.3, 1.35, .5, .33)]),
  "automazione-email": dict(
    cuts=[(0, 0.5, 1), (5.0, 7.4, 1), (9.0, 10.4, 1), (12.9, 13.5, 1), (15.8, 17.8, 1), (17.8, 35.6, 2.5), (35.6, 37.6, 1), (38.6, 41.5, 1)],
    beats=[(0, ["Apri", "il comando."], "Tieni premuto → Modifica"), (9.0, ["Cerca", "«Email»."], None),
           (17.5, ["Scrivi", "la banca."], "Il mittente giusto te lo dice Keepo"), (36.0, ["Fatto."], "Ogni accredito finisce in Keepo.")],
    taps=[(0.2, 145, 194), (5.1, 95, 310), (6.75, 113, 393), (10.0, 190, 770), (13.0, 92, 158), (16.0, 131, 668), (17.5, 212, 459),
          (35.5, 349, 780), (36.0, 363, 100), (38.75, 38, 84), (40.3, 157, 402)],
    cam=[(0, 1, .5, .5), (17.4, 1, .5, .5), (18.2, 2.2, .36, .18), (35.4, 2.2, .36, .18), (35.9, 2.2, .42, .18), (36.4, 1.2, .5, .25), (37.5, 1.2, .5, .25), (38.6, 1, .5, .5), (40.8, 1, .5, .5), (41.3, 1.3, .5, .3)]),
}

def rmask(w, h, r):
    m = Image.new("L", (w * 2, h * 2), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255); return m.resize((w, h), Image.LANCZOS)

# ---------------- timeline ----------------
def out_len(cuts): return sum((b - a) / s for a, b, s in cuts)
def src_at(cuts, t):
    for a, b, s in cuts:
        d = (b - a) / s
        if t < d: return a + t * s
        t -= d
    return cuts[-1][1]
def out_at(cuts, ts):
    acc = 0
    for a, b, s in cuts:
        if ts <= b: return acc + max(0, ts - a) / s
        acc += (b - a) / s
    return acc
def cam_at(keys, ts):
    if ts <= keys[0][0]: return keys[0][1:]
    for (t0, *k0), (t1, *k1) in zip(keys, keys[1:]):
        if ts <= t1:
            u = ease((ts - t0) / max(1e-6, t1 - t0)); return tuple(a + (b - a) * u for a, b in zip(k0, k1))
    return keys[-1][1:]

# ---------------- type ----------------
TX, TY = 44, 112
def beat_type(lines, sub, bg):
    size = 104
    while max(font(size, 860).getlength(l) for l in lines) > W - 2 * TX and size > 60: size -= 4
    f = font(size, 860); lh = int(size * 1.04); fg = INK if bg == LIGHT else WHITE; acc = ACC[bg]
    imgs = []
    for l in lines:
        im = Image.new("RGBA", (W, int(lh * 1.15)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        body, last = (l[:-1], l[-1]) if l[-1] in ".?" else (l, "")
        d.text((TX, int(size * .92)), body, font=f, fill=fg, anchor="ls")
        if last: d.text((TX + f.getlength(body), int(size * .92)), last, font=f, fill=acc, anchor="ls")
        imgs.append(im)
    s_im = None
    if sub:
        s_im = Image.new("RGBA", (W, 50), (0, 0, 0, 0))
        ImageDraw.Draw(s_im).text((TX + 2, 38), sub, font=font(32, 500), fill=(*fg, 190), anchor="ls")
    return dict(lines=imgs, lh=lh, sub=s_im, fg=fg)

def draw_type(fr, T, age, leave):
    y = TY
    for i, im in enumerate(T["lines"]):
        h = im.height; u = back((age - .07 * i) / .55, 1.2); v = ease(leave)
        dy = int((1 - u) * h * 1.05 - v * h * 1.1)
        box = Image.new("RGBA", (W, h), (0, 0, 0, 0)); box.alpha_composite(im, (0, 0)) if dy == 0 else box.paste(im, (0, dy), im)
        fr.alpha_composite(box, (0, y)); y += T["lh"]
    if T["sub"] is not None:
        o = ease((age - .3) / .35) * (1 - ease(leave * 2))
        if o > 0:
            s = T["sub"].copy(); s.putalpha(s.getchannel("A").point(lambda a: int(a * o)))
            fr.alpha_composite(s, (0, y + 6 + int(14 * (1 - o))))

# ---------------- phone ----------------
def build_phone(sw, sh):
    B, PAD = 14, 90
    pw, ph = sw + 2 * B, sh + 2 * B
    base = Image.new("RGBA", (pw + 2 * PAD, ph + 2 * PAD), (0, 0, 0, 0))
    shd = Image.new("L", base.size, 0); ImageDraw.Draw(shd).rounded_rectangle([PAD + 10, PAD + 40, PAD + pw - 10, PAD + ph + 20], radius=100, fill=120)
    base.paste((8, 12, 26, 255), (0, 0), shd.filter(ImageFilter.GaussianBlur(38)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([PAD, PAD, PAD + pw, PAD + ph], radius=96, fill=(14, 16, 22, 255))
    d.rounded_rectangle([PAD + 1, PAD + 1, PAD + pw - 1, PAD + ph - 1], radius=95, outline=(74, 78, 96, 255), width=2)
    return base, PAD + B, rmask(sw, sh, 82), ph

def touches(scr, taps, ts):
    d = ImageDraw.Draw(scr); k = scr.width / PT_W
    for t, px, py in taps:
        u = ts - t
        if -.12 <= u <= .5:
            a = ease((u + .12) / .12) * (1 - ease((u - .18) / .3)); r = 25 * k * (1 - .12 * (0 <= u <= .12))
            x, y = px * k, py * k
            d.ellipse([x - r, y - r, x + r, y + r], fill=(120, 120, 128, int(120 * a)), outline=(255, 255, 255, int(190 * a)), width=3)

# ---------------- render ----------------
def frames_from(path):
    w, h = map(int, re.search(r", (\d{3,4})x(\d{3,4})", subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr).groups())
    p = subprocess.Popen([FF, "-loglevel", "quiet", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = 0
    while True:
        buf = p.stdout.read(w * h * 3)
        if len(buf) < w * h * 3: break
        yield n / FPS, Image.frombytes("RGB", (w, h), buf); n += 1
    p.stdout.close(); p.wait()

def render(name):
    C = CLIPS[name]; cuts = C["cuts"]; L = out_len(cuts); TAIL = 1.4; total = int((L + TAIL) * FPS)
    n = len(C["beats"]); cols = [LIGHT if i % 2 == 0 else NAVY for i in range(n)]
    cols[-1] = NAVY
    if n > 1 and cols[-2] == NAVY: cols[-2] = LIGHT
    beats = [dict(t=out_at(cuts, ts) if i else 0, bg=cols[i], T=beat_type(lines, sub, cols[i])) for i, (ts, lines, sub) in enumerate(C["beats"])]
    src = frames_from(os.path.join(SRC, name + ".mp4")); cur_t, cur = next(src); nxt = next(src, None)
    PH_IMG, OFF, SMASK, ph_h = build_phone(*cur.size)
    s0 = 900 / ph_h
    out = os.path.join(ROOT, "guida", "clip", name + ".mp4")
    enc = subprocess.Popen([FF, "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "slow", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for k in range(total):
        t = k / FPS; ts = src_at(cuts, min(t, L))
        while nxt is not None and nxt[0] <= ts: cur_t, cur = nxt; nxt = next(src, None)
        i = max(j for j, b in enumerate(beats) if b["t"] <= t + 1e-6); b = beats[i]
        # background: the new colour wipes up from the bottom
        fr = Image.new("RGBA", (W, H), (*(beats[i - 1]["bg"] if i else b["bg"]), 255))
        wu = ease((t - b["t"]) / .42) if i else 1
        if wu > 0: ImageDraw.Draw(fr).rectangle([0, int(H * (1 - wu)), W, H], fill=b["bg"])
        # phone with the real recording + touches
        scr = cur.convert("RGBA"); touches(scr, C["taps"], ts)
        ph = PH_IMG.copy(); ph.paste(scr, (OFF, OFF), SMASK)
        z, fx, fy = cam_at(C["cam"], ts)
        pt = t - b["t"]; punch = .035 * math.sin(math.pi * clamp(pt / .4)) if i else 0
        s = s0 * z * (1 + punch)
        intro = back(t / .8, 1.1)
        rot = math.radians(1.1 * math.sin(t * .8) + 8 * (1 - ease(t / .8)))
        Fx, Fy = OFF + fx * cur.width, OFF + fy * cur.height
        Tx = W / 2 + 6 * math.sin(t * .5)
        Ty = max(845 - (z - 1) * 170, 430 + (Fy - (OFF - 14)) * s)  # the top of the phone never covers the text
        Ty += 7 * math.sin(t * 1.1) + (1 - intro) * 760
        a, bb = math.cos(rot) / s, math.sin(rot) / s; d_, e = -math.sin(rot) / s, math.cos(rot) / s
        coef = (a, bb, Fx - (a * Tx + bb * Ty), d_, e, Fy - (d_ * Tx + e * Ty))
        fr.alpha_composite(ph.transform((W, H), Image.AFFINE, coef, resample=Image.BICUBIC))
        # wordmark + type
        fg = b["T"]["fg"] if wu > .5 else (INK if (beats[i - 1]["bg"] if i else b["bg"]) == LIGHT else WHITE)
        ImageDraw.Draw(fr).text((W - 44, 62), "Keepo", font=font(26, 700), fill=fg, anchor="rs")
        nxt_t = beats[i + 1]["t"] if i + 1 < n else 1e9
        if i and t - b["t"] < .12 and i > 0:  # the previous text is leaving
            pass
        leave = clamp((t - (nxt_t - .24)) / .24)
        draw_type(fr, b["T"], t - b["t"] - (.14 if i else .25), leave)
        enc.stdin.write(fr.convert("RGB").tobytes())
    enc.stdin.close(); enc.wait()
    print(name, f"{L + TAIL:.1f}s", os.path.getsize(out) // 1024, "KB")


# ======================= video completo della guida =======================
# Usa la registrazione dell'app fatta da design/record_video.mjs (design/rec): fotogrammi + tocchi + capitoli.
GUIDE_BEATS = [(["Il tuo saldo."], "Sempre davanti, con l'andamento dei mesi."), (["Una spesa?", "Due tocchi."], None),
               (["Anche", "le entrate."], None), (["Ogni conto,", "il suo totale."], "Hype, Revolut, contanti…"),
               (["Dove vanno", "i soldi?"], "Categorie e budget del mese."), (["Tutti i", "movimenti."], None),
               (["Cosa vuoi", "comprarti?"], "Tutto il saldo fa avanzare gli obiettivi."), (["Il prezzo,", "giorno per giorno."], "Keepo ti dice quando conviene."),
               (["Nuovo", "obiettivo."], "Nome, prezzo e foto del prodotto."), (["Keepo", "ti parla."], "Tocca la monetina per un consiglio."),
               (["Siri, widget,", "Apple Pay."], "Segna senza aprire l'app.")]

def status_bar(w, bg=LIGHT):
    h = int(w * 54 / 402); im = Image.new("RGB", (w, h), bg); d = ImageDraw.Draw(im); k = w / 402
    d.text((int(70 * k), h // 2 + int(4 * k)), "9:41", font=font(int(17 * k), 650), fill=INK, anchor="mm")
    d.rounded_rectangle([w // 2 - int(62 * k), int(11 * k), w // 2 + int(62 * k), int(47 * k)], radius=int(18 * k), fill=(0, 0, 0))
    x = w - int(34 * k); y = h // 2 + int(4 * k)
    d.rounded_rectangle([x - int(24 * k), y - int(6 * k), x, y + int(6 * k)], radius=int(4 * k), outline=INK, width=max(1, int(1.5 * k))); d.rectangle([x - int(21 * k), y - int(3 * k), x - int(4 * k), y + int(3 * k)], fill=INK)
    for i in range(4): bh = int((4 + i * 3) * k); d.rectangle([x - int(62 * k) + i * int(6 * k), y + int(5 * k) - bh, x - int(58 * k) + i * int(6 * k), y + int(5 * k)], fill=INK)
    return im

def render_guide():
    import json, bisect
    REC = os.path.join(ROOT, "design", "rec"); TL = json.load(open(os.path.join(REC, "timeline.json")))
    log = TL["log"]; T0 = next(e["t"] for e in log if e["type"] == "start"); T1 = next(e["t"] for e in log if e["type"] == "end")
    FR = sorted(TL["frames"], key=lambda f: f["t"]); FT = [f["t"] - T0 for f in FR]
    chaps = [e["t"] - T0 for e in log if e["type"] == "chap"]
    L = T1 - T0; TAIL = 3.0; total = int((L + TAIL) * FPS)
    first = Image.open(os.path.join(REC, "f", f"{FR[0]['n']}.jpg")); fw, fh = first.size
    SB = status_bar(fw); sbh = SB.height; sw, sh = fw, fh + sbh
    taps = [(e["t"] - T0, e["x"] * fw, e["y"] * fh + sbh) for e in log if e["type"] == "tap"]
    moves = [(e["t"] - T0, e["t"] - T0 + e["dur"]) for e in log if e["type"] in ("swipe", "drag")]
    beats_src = [(t, *GUIDE_BEATS[i]) for i, t in enumerate(chaps)] + [(L, ["Prova Keepo."], "vers3tt.github.io/salvadanaio")]
    n = len(beats_src); cols = [LIGHT if i % 2 == 0 else NAVY for i in range(n)]; cols[-1] = NAVY
    if cols[-2] == NAVY: cols[-2] = LIGHT
    beats = [dict(t=t, bg=cols[i], T=beat_type(lines, sub, cols[i])) for i, (t, lines, sub) in enumerate(beats_src)]
    PH_IMG, OFF, SMASK, ph_h = build_phone(sw, sh); s0 = 900 / ph_h
    out = os.path.join(ROOT, "guida", "keepo-guida.mp4")
    enc = subprocess.Popen([FF, "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "slow", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    cache = {}; z, fy = 1.0, .5
    for k in range(total):
        t = k / FPS; ts = min(t, L)
        j = max(0, bisect.bisect_right(FT, ts) - 1); nfr = FR[j]["n"]
        if nfr not in cache:
            cache.clear(); im = Image.new("RGB", (sw, sh), LIGHT); im.paste(SB, (0, 0)); im.paste(Image.open(os.path.join(REC, "f", f"{nfr}.jpg")).convert("RGB"), (0, sbh)); cache[nfr] = im
        scr = cache[nfr].convert("RGBA"); d = ImageDraw.Draw(scr)
        for tt, x, y in taps:
            u = ts - tt
            if -.12 <= u <= .5:
                a = ease((u + .12) / .12) * (1 - ease((u - .18) / .3)); r = 25 * sw / 402 * (1 - .12 * (0 <= u <= .12))
                d.ellipse([x - r, y - r, x + r, y + r], fill=(120, 120, 128, int(120 * a)), outline=(255, 255, 255, int(190 * a)), width=3)
        # the camera follows the finger: closer while you tap, back out while scrolling or waiting
        near = [(y, abs(ts - tt)) for tt, x, y in taps if abs(ts - tt) < 1.3]
        moving = any(a - .2 <= ts <= b + .3 for a, b in moves)
        tz = 1.0 if (moving or not near or t >= L) else 1.22
        tfy = (sum(y / (dd + .3) for y, dd in near) / sum(1 / (dd + .3) for y, dd in near)) / sh if near and not moving else .5
        z += (tz - z) * .05; fy += (min(.82, max(.18, tfy)) - fy) * .05
        i = max(jj for jj, b in enumerate(beats) if b["t"] <= t + 1e-6); b = beats[i]
        fr = Image.new("RGBA", (W, H), (*(beats[i - 1]["bg"] if i else b["bg"]), 255))
        wu = ease((t - b["t"]) / .42) if i else 1
        if wu > 0: ImageDraw.Draw(fr).rectangle([0, int(H * (1 - wu)), W, H], fill=b["bg"])
        ph = PH_IMG.copy(); ph.paste(scr, (OFF, OFF), SMASK)
        pt = t - b["t"]; punch = .035 * math.sin(math.pi * clamp(pt / .4)) if i else 0
        outro = ease((t - L) / 1.2)
        s = s0 * z * (1 + punch) * (1 - .12 * outro)
        intro = back(t / .8, 1.1); rot = math.radians(1.1 * math.sin(t * .8) + 8 * (1 - ease(t / .8)) - 4 * outro)
        Fx, Fy = OFF + .5 * sw, OFF + fy * sh
        Tx = W / 2 + 6 * math.sin(t * .5)
        Ty = max(845 - (z - 1) * 170, 430 + (Fy - (OFF - 14)) * s) + 7 * math.sin(t * 1.1) + (1 - intro) * 760 + 140 * outro
        a_, bb = math.cos(rot) / s, math.sin(rot) / s; d_, e = -math.sin(rot) / s, math.cos(rot) / s
        fr.alpha_composite(ph.transform((W, H), Image.AFFINE, (a_, bb, Fx - (a_ * Tx + bb * Ty), d_, e, Fy - (d_ * Tx + e * Ty)), resample=Image.BICUBIC))
        fg = b["T"]["fg"] if wu > .5 else (INK if (beats[i - 1]["bg"] if i else b["bg"]) == LIGHT else WHITE)
        ImageDraw.Draw(fr).text((W - 44, 62), "Keepo", font=font(26, 700), fill=fg, anchor="rs")
        nxt_t = beats[i + 1]["t"] if i + 1 < n else 1e9
        draw_type(fr, b["T"], t - b["t"] - (.14 if i else .25), clamp((t - (nxt_t - .24)) / .24))
        enc.stdin.write(fr.convert("RGB").tobytes())
    enc.stdin.close(); enc.wait()
    print("keepo-guida", f"{L + TAIL:.1f}s", os.path.getsize(out) // 1024, "KB")

if __name__ == "__main__":
    for nm in (sys.argv[1:] or [*CLIPS, "guida"]):
        render_guide() if nm == "guida" else render(nm)
