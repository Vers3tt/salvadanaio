"""Monta guida/keepo-guida.mp4 dalla registrazione dell'app vera fatta da design/record_video.mjs.
Uso: node design/record_video.mjs && python3 design/build_video.py   (richiede: pip install --user imageio-ffmpeg pillow)"""
import os, json, bisect, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1920, 1080, 30
INTRO_S, OUTRO_S = 3.2, 3.6
BG, CARD, INK, INK2, INK3, NAVY, GREEN, FILL = (243, 245, 249), (255, 255, 255), (17, 28, 56), (94, 105, 132), (164, 172, 191), (22, 36, 72), (24, 121, 92), (233, 237, 244)
SF = "/System/Library/Fonts/SFNS.ttf"

def font(px, w=400):
    f = ImageFont.truetype(SF, px); f.set_variation_by_axes([100, min(96, max(17, px * .75)), 400, w]); return f

# ---- registrazione ----
REC = os.path.join(ROOT, "design", "rec")
TL = json.load(open(os.path.join(REC, "timeline.json")))
LOG = TL["log"]; T0 = next(e["t"] for e in LOG if e["type"] == "start"); T1 = next(e["t"] for e in LOG if e["type"] == "end")
FR = sorted(TL["frames"], key=lambda f: f["t"]); FT = [f["t"] for f in FR]
CHAPS = [e for e in LOG if e["type"] == "chap"]; TOUCH = [e for e in LOG if e["type"] in ("tap", "swipe", "drag")]
REC_S = T1 - T0
print(len(FR), "fotogrammi,", len(CHAPS), "capitoli,", round(REC_S, 1), "s")

# ---- static pieces ----
PH_H = 900; PH_W = int(PH_H * 390 / 844); BEZ = 14
SCR_W, SCR_H = PH_W - 2 * BEZ, PH_H - 2 * BEZ
PH_X, PH_Y = 300, (H - PH_H) // 2 - 10
def rounded_mask(w, h, r):
    m = Image.new("L", (w * 2, h * 2), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255); return m.resize((w, h), Image.LANCZOS)
SCR_MASK = rounded_mask(SCR_W, SCR_H, 44)

base = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(base)
d.rounded_rectangle([140, 70, W - 140, H - 70], radius=44, fill=CARD)
# phone body + soft shadow
sh = Image.new("L", (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([PH_X + 10, PH_Y + 30, PH_X + PH_W - 10, PH_Y + PH_H + 20], radius=60, fill=120)
base.paste((20, 30, 60), (0, 0), sh.filter(ImageFilter.GaussianBlur(30)).point(lambda v: v * .5))
d = ImageDraw.Draw(base)
d.rounded_rectangle([PH_X, PH_Y, PH_X + PH_W, PH_Y + PH_H], radius=58, fill=(11, 15, 26))
d.rounded_rectangle([PH_X + 2, PH_Y + 2, PH_X + PH_W - 2, PH_Y + PH_H - 2], radius=56, outline=(42, 48, 69), width=3)
logo = Image.open(os.path.join(ROOT, "icons", "icon-192.png")).convert("RGB").resize((64, 64), Image.LANCZOS)
base.paste(logo, (W - 140 - 60 - 64, 110), rounded_mask(64, 64, 16))
d.text((W - 140 - 60 - 64 - 16, 142), "Keepo", font=font(30, 700), fill=INK, anchor="rm")

TX = 960; TW = W - 140 - 80 - TX
def wrap(text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if f.getlength(t) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def caption_layer(i):
    c = CHAPS[i]; im = Image.new("RGBA", (TW + 40, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0
    d.text((0, y), f"{i + 1} di {len(CHAPS)}", font=font(28, 600), fill=INK2); y += 58
    ft = font(64, 750)
    for ln in wrap(c["title"], ft, TW): d.text((0, y), ln, font=ft, fill=INK); y += 74
    y += 22; fd = font(34)
    for ln in wrap(c["text"], fd, TW): d.text((0, y), ln, font=fd, fill=INK2); y += 48
    return im, y
CAPS = [caption_layer(i) for i in range(len(CHAPS))]

def progress(d, t):
    n = len(CHAPS); x0, x1, y = TX, W - 140 - 80, H - 150; gap = 8; w = (x1 - x0 - gap * (n - 1)) / n
    for k in range(n):
        a = x0 + k * (w + gap); d.rounded_rectangle([a, y, a + w, y + 6], radius=3, fill=FILL)
        s0 = CHAPS[k]["t"]; s1 = CHAPS[k + 1]["t"] if k + 1 < n else T1
        f = max(0, min(1, (t - s0) / (s1 - s0)))
        if f > 0: d.rounded_rectangle([a, y, a + w * f, y + 6], radius=3, fill=INK)

SB = int(SCR_H * .058)  # iPhone status bar above the app content
def status_bar():
    sb = Image.new("RGB", (SCR_W, SB), BG); d = ImageDraw.Draw(sb)
    d.text((int(SCR_W * .17), SB // 2 + 3), "9:41", font=font(17, 650), fill=INK, anchor="mm")
    x = SCR_W - 30; d.rounded_rectangle([x - 22, SB // 2 - 3, x, SB // 2 + 8], radius=3, outline=INK, width=2); d.rectangle([x - 19, SB // 2, x - 5, SB // 2 + 5], fill=INK)
    for k in range(4): h = 4 + k * 3; d.rectangle([x - 58 + k * 6, SB // 2 + 8 - h, x - 54 + k * 6, SB // 2 + 8], fill=INK)
    return sb
SBAR = status_bar()
SC_H = int(TL["H"] * SCR_W / TL["W"])   # altezza del fotogramma registrato dentro lo schermo
_cache = {}
def screen_at(t):
    k = max(0, bisect.bisect_right(FT, t) - 1); n = FR[k]["n"]
    if n not in _cache:
        _cache.clear()
        im = Image.open(os.path.join(REC, "f", f"{n}.jpg")).convert("RGB").resize((SCR_W, SC_H), Image.LANCZOS)
        out = Image.new("RGB", (SCR_W, SCR_H), BG); out.paste(SBAR, (0, 0)); out.paste(im.crop((0, 0, SCR_W, SCR_H - SB)), (0, SB)); _cache[n] = out
    return _cache[n]

def ease(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)
def to_px(x, y): return PH_X + BEZ + x * SCR_W, PH_Y + BEZ + SB + y * SC_H

def finger(ov, cx, cy, a, press):
    od = ImageDraw.Draw(ov); r = 22 * (1 - .18 * press)
    od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, int(150 * a)), outline=(17, 28, 56, int(150 * a)), width=3)

def touches(fr, t):
    ov = None
    for e in TOUCH:
        if e["type"] == "tap":
            u = t - e["t"]
            if -.35 <= u <= .55:
                ov = ov or Image.new("RGBA", (W, H), (0, 0, 0, 0)); cx, cy = to_px(e["x"], e["y"])
                a = ease((u + .35) / .2) * (1 - ease((u - .25) / .3)); press = ease(1 - abs(u) / .12) if abs(u) < .12 else 0
                finger(ov, cx, cy, a, press)
                if u >= 0:   # onda del tocco
                    rr = 22 + 30 * ease(u / .45); ImageDraw.Draw(ov).ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(17, 28, 56, int(130 * (1 - u / .55))), width=3)
        else:
            u = (t - e["t"]) / e["dur"]
            if -.15 <= u <= 1.15:
                ov = ov or Image.new("RGBA", (W, H), (0, 0, 0, 0)); k = ease(u)
                if e["type"] == "swipe": cx, cy = to_px(e["x"], e["y0"] + (e["y1"] - e["y0"]) * k)
                else: cx, cy = to_px(e["x0"] + (e["x1"] - e["x0"]) * k, e["y"])
                a = ease((u + .15) / .15) * (1 - ease((u - 1) / .15)); finger(ov, cx, cy, a, .5)
    if ov: fr.paste(ov, (0, 0), ov)

def rec_frame(t):
    fr = base.copy(); d = ImageDraw.Draw(fr)
    fr.paste(screen_at(t), (PH_X + BEZ, PH_Y + BEZ), SCR_MASK)
    d.rounded_rectangle([PH_X + PH_W // 2 - 62, PH_Y + 24, PH_X + PH_W // 2 + 62, PH_Y + 56], radius=16, fill=(11, 15, 26))
    touches(fr, t)
    i = max(0, bisect.bisect_right([c["t"] for c in CHAPS], t) - 1)
    cap, ch = CAPS[i]; a = ease((t - CHAPS[i]["t"]) / .6); dy = int(18 * (1 - a))
    if a < 1: cap = cap.copy(); cap.putalpha(cap.getchannel("A").point(lambda v: int(v * a)))
    fr.paste(cap, (TX, (H - ch) // 2 - 40 + dy), cap)
    progress(d, t)
    return fr

def title_frame(t, intro):
    fr = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(fr)
    a = ease(t / .7) if intro else 1
    big = Image.open(os.path.join(ROOT, "icons", "icon-512.png")).convert("RGB").resize((220, 220), Image.LANCZOS)
    y0 = int(250 + 20 * (1 - a))
    fr.paste(big, ((W - 220) // 2, y0), rounded_mask(220, 220, 50))
    if intro:
        d.text((W // 2, y0 + 300), "Keepo in due minuti", font=font(84, 800), fill=INK, anchor="mm")
        d.text((W // 2, y0 + 390), "Entrate, uscite, conti e obiettivi: come si usa", font=font(38), fill=INK2, anchor="mm")
    else:
        d.text((W // 2, y0 + 300), "Prova Keepo", font=font(84, 800), fill=INK, anchor="mm")
        d.text((W // 2, y0 + 390), "vers3tt.github.io/salvadanaio", font=font(44, 600), fill=NAVY, anchor="mm")
        d.text((W // 2, y0 + 460), "Safari → Condividi → Aggiungi alla schermata Home", font=font(32), fill=INK2, anchor="mm")
    if intro and a < 1: fr = Image.blend(Image.new("RGB", (W, H), BG), fr, a)
    return fr

out = os.path.join(ROOT, "guida", "keepo-guida.mp4")
cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", out]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
def emit(img): p.stdin.write(img.tobytes())
for k in range(int(INTRO_S * FPS)): emit(title_frame(k / FPS, True))
for k in range(int(REC_S * FPS)): emit(rec_frame(T0 + k / FPS))
for k in range(int(OUTRO_S * FPS)): emit(title_frame(k / FPS, False))
p.stdin.close(); p.wait()
print(out, os.path.getsize(out) // 1024, "KB")
