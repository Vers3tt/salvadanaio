"""Genera guida/keepo-guida.mp4 dalle schermate della guida (guida/img) e dai testi di guida/index.html.
Uso: python3 design/build_video.py   (richiede: pip install --user imageio-ffmpeg pillow)"""
import os, re, subprocess, html
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1920, 1080, 30
STEP_S, INTRO_S, OUTRO_S, FADE_S = 5.4, 3.2, 3.6, .5
BG, CARD, INK, INK2, INK3, NAVY, GREEN, FILL = (243, 245, 249), (255, 255, 255), (17, 28, 56), (94, 105, 132), (164, 172, 191), (22, 36, 72), (24, 121, 92), (233, 237, 244)
SF = "/System/Library/Fonts/SFNS.ttf"

def font(px, w=400):
    f = ImageFont.truetype(SF, px); f.set_variation_by_axes([100, min(96, max(17, px * .75)), 400, w]); return f

# ---- steps from the guide page ----
src = open(os.path.join(ROOT, "guida", "index.html"), encoding="utf-8").read()
STEPS = []
for m in re.finditer(r'\{ img: "(\w+)", ch: "([^"]+)", t: "([^"]+)", d: "((?:[^"\\]|\\.)+)", how: "((?:[^"\\]|\\.)+)", x: (null|[\d.]+)(?:, y: ([\d.]+))?', src):
    clean = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s.replace('\\"', '"')))
    STEPS.append(dict(img=m[1], ch=m[2], t=clean(m[3]), d=clean(m[4]), how=clean(m[5]), x=None if m[6] == "null" else float(m[6]), y=float(m[7]) if m[7] else None))
print(len(STEPS), "passi")

# ---- static pieces ----
PH_H = 820; PH_W = int(PH_H * 390 / 844); BEZ = 14
SCR_W, SCR_H = PH_W - 2 * BEZ, PH_H - 2 * BEZ
PH_X, PH_Y = 300, (H - PH_H) // 2 - 10
def rounded_mask(w, h, r):
    m = Image.new("L", (w * 2, h * 2), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255); return m.resize((w, h), Image.LANCZOS)
SCR_MASK = rounded_mask(SCR_W, SCR_H, 44)
screens = {s["img"]: Image.open(os.path.join(ROOT, "guida", "img", s["img"] + ".jpg")).convert("RGB") for s in STEPS}

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
    s = STEPS[i]; im = Image.new("RGBA", (TW + 40, 760), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0
    d.text((0, y), f"{i + 1} di {len(STEPS)}  ·  {s['ch']}", font=font(28, 600), fill=INK2); y += 58
    ft = font(62, 750)
    for ln in wrap(s["t"], ft, TW): d.text((0, y), ln, font=ft, fill=INK); y += 72
    y += 18; fd = font(33)
    for ln in wrap(s["d"], fd, TW): d.text((0, y), ln, font=fd, fill=INK2); y += 47
    y += 26; fh = font(30, 500); lines = wrap(s["how"], fh, TW - 44)
    d.rounded_rectangle([0, y, TW, y + 30 + len(lines) * 42], radius=20, fill=FILL)
    for k, ln in enumerate(lines): d.text((22, y + 15 + k * 42), ln, font=fh, fill=INK)
    return im, y + 30 + len(lines) * 42
CAPS = [caption_layer(i) for i in range(len(STEPS))]

def progress(d, i, f):
    n = len(STEPS); x0, x1, y = TX, W - 140 - 80, H - 150; gap = 8; w = (x1 - x0 - gap * (n - 1)) / n
    for k in range(n):
        a = x0 + k * (w + gap); d.rounded_rectangle([a, y, a + w, y + 6], radius=3, fill=FILL)
        fill = 1 if k < i else (f if k == i else 0)
        if fill > 0: d.rounded_rectangle([a, y, a + w * fill, y + 6], radius=3, fill=INK)

SB = int(SCR_H * .058)  # iPhone status bar above the app content
def status_bar():
    sb = Image.new("RGB", (SCR_W, SB), BG); d = ImageDraw.Draw(sb)
    d.text((int(SCR_W * .17), SB // 2 + 3), "9:41", font=font(17, 650), fill=INK, anchor="mm")
    x = SCR_W - 30; d.rounded_rectangle([x - 22, SB // 2 - 3, x, SB // 2 + 8], radius=3, outline=INK, width=2); d.rectangle([x - 19, SB // 2, x - 5, SB // 2 + 5], fill=INK)
    for k in range(4): h = 4 + k * 3; d.rectangle([x - 58 + k * 6, SB // 2 + 8 - h, x - 54 + k * 6, SB // 2 + 8], fill=INK)
    return sb
SBAR = status_bar()
def screen_img(name, zoom):
    im = screens[name]; ch = SCR_H - SB; sw = int(SCR_W * zoom); sh = int(im.height * sw / im.width)
    r = im.resize((sw, sh), Image.BILINEAR); ox = (sw - SCR_W) // 2
    body = r.crop((ox, 0, ox + SCR_W, ch))
    out = Image.new("RGB", (SCR_W, SCR_H), BG); out.paste(SBAR, (0, 0)); out.paste(body, (0, SB)); return out

def ease(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)

def step_frame(i, t):
    s = STEPS[i]; fr = base.copy(); d = ImageDraw.Draw(fr)
    cur = screen_img(s["img"], 1.035 - .035 * ease(t / STEP_S))
    if i > 0 and t < FADE_S:
        prev = screen_img(STEPS[i - 1]["img"], 1.0); cur = Image.blend(prev, cur, ease(t / FADE_S))
    fr.paste(cur, (PH_X + BEZ, PH_Y + BEZ), SCR_MASK)
    d.rounded_rectangle([PH_X + PH_W // 2 - 62, PH_Y + 24, PH_X + PH_W // 2 + 62, PH_Y + 56], radius=16, fill=(11, 15, 26))
    # tap ring
    if s["x"] is not None:
        cx, cy = PH_X + BEZ + s["x"] / 100 * SCR_W, PH_Y + BEZ + s["y"] / 100 * SCR_H
        for start in (1.2, 2.9):
            u = (t - start) / 1.3
            if 0 <= u <= 1:
                ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
                r = 26 * (1.25 - .25 * ease(min(1, u * 4))); a = int(255 * (1 - ease(max(0, u - .55) / .45)))
                od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, int(a * .55)), outline=(17, 28, 56, int(a * .7)), width=3)
                rr = 26 + 34 * ease(u); od.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(17, 28, 56, int(160 * (1 - u))), width=3)
                fr.paste(ov, (0, 0), ov)
    cap, ch = CAPS[i]; a = ease(t / .6); dy = int(18 * (1 - a))
    cy0 = (H - ch) // 2 - 30 + dy
    if a < 1: cap = cap.copy(); cap.putalpha(cap.getchannel("A").point(lambda v: int(v * a)))
    fr.paste(cap, (TX, cy0), cap)
    progress(d, i, t / STEP_S)
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
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "medium", "-movflags", "+faststart", out]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
def emit(img): p.stdin.write(img.tobytes())
for k in range(int(INTRO_S * FPS)): emit(title_frame(k / FPS, True))
for i in range(len(STEPS)):
    for k in range(int(STEP_S * FPS)): emit(step_frame(i, k / FPS))
for k in range(int(OUTRO_S * FPS)): emit(title_frame(k / FPS, False))
p.stdin.close(); p.wait()
print(out, os.path.getsize(out) // 1024, "KB")
