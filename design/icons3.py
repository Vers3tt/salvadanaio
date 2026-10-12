"""Proposte in stile icone di sistema Apple: sfondo a sfumatura verticale + glifo bianco.
Uso: python3 design/icons3.py            -> foglio di confronto
     python3 design/icons3.py J          -> installa l'opzione J in icons/"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S=2048
def bg(top, bottom):
    im=Image.new("RGBA",(S,S)); d=ImageDraw.Draw(im)
    for y in range(S):
        t=y/(S-1); d.line([(0,y),(S,y)],fill=tuple(round(top[i]*(1-t)+bottom[i]*t) for i in range(3))+(255,))
    return im
def place(im, glyph, shadow=True):
    """glyph: L mask (white = shape). Adds the soft Apple-style drop shadow."""
    if shadow:
        sh=Image.new("RGBA",(S,S),(0,0,0,0)); sh.putalpha(glyph.point(lambda v: v*0.22))
        sh=sh.filter(ImageFilter.GaussianBlur(22)); im.alpha_composite(sh,(0,14))
    white=Image.new("RGBA",(S,S),(255,255,255,255)); white.putalpha(glyph); im.alpha_composite(white)
    return im
def mask(): return Image.new("L",(S,S),0)
def soften(m, r=18):
    """Round every corner and joint: blur, re-threshold, then a light blur for clean anti-aliasing."""
    m=m.filter(ImageFilter.GaussianBlur(r)).point(lambda v: 255 if v>=128 else 0)
    return m.filter(ImageFilter.GaussianBlur(2.5))

def pig_glyph(cx=S*.5, cy=S*.56, k=1.0, coin=True):
    m=mask(); d=ImageDraw.Draw(m)
    bw,bh=S*.50*k,S*.36*k
    d.ellipse([cx-bw/2,cy-bh/2,cx+bw/2,cy+bh/2],fill=255)                                   # corpo
    d.ellipse([cx+bw*.38,cy-bh*.20,cx+bw*.62,cy+bh*.16],fill=255)                          # muso
    d.polygon([(cx+bw*.12,cy-bh*.40),(cx+bw*.25,cy-bh*.66),(cx+bw*.36,cy-bh*.30)],fill=255) # orecchio
    for lx in (cx-bw*.30,cx+bw*.12):                                                         # zampe
        d.rounded_rectangle([lx,cy+bh*.26,lx+bw*.17,cy+bh*.72],radius=bw*.085,fill=255)
    d.arc([cx-bw*.64,cy-bh*.24,cx-bw*.42,cy+bh*.02],start=130,end=410,fill=255,width=int(S*.036*k))  # coda
    m=soften(m); d=ImageDraw.Draw(m)
    # tagli: fessura e occhio
    d.rounded_rectangle([cx-bw*.18,cy-bh*.33,cx+bw*.10,cy-bh*.23],radius=S*.02*k,fill=0)
    r=S*.022*k; d.ellipse([cx+bw*.26-r,cy-bh*.12-r,cx+bw*.26+r,cy-bh*.12+r],fill=0)
    if coin:
        r=S*.075*k; ccx,ccy=cx-bw*.04,cy-bh*.33-S*.115*k
        d.ellipse([ccx-r,ccy-r,ccx+r,ccy+r],fill=255)
        d.ellipse([ccx-r*.62,ccy-r*.62,ccx+r*.62,ccy+r*.62],outline=0,width=int(S*.014*k))
    return m.filter(ImageFilter.GaussianBlur(1.5))

def euro_glyph():
    m=mask(); d=ImageDraw.Draw(m); r=S*.29
    d.ellipse([S/2-r,S/2-r,S/2+r,S/2+r],fill=255)
    f=ImageFont.truetype("/System/Library/Fonts/SFNS.ttf",int(S*.36)); f.set_variation_by_axes([100,28,400,700])
    d.text((S/2-S*.01,S/2+S*.01),"€",font=f,fill=0,anchor="mm")
    return m

def coins_glyph():
    m=mask(); d=ImageDraw.Draw(m)
    w,h,step=S*.46,S*.12,S*.115; cx=S/2
    for k in range(4):
        y=S*.70-k*step
        d.rounded_rectangle([cx-w/2,y-h/2,cx+w/2,y+h/2],radius=h/2,fill=255)
        if k: d.rounded_rectangle([cx-w/2,y+h/2-S*.012,cx+w/2,y+h/2+S*.012],radius=S*.01,fill=0)
    # moneta che cade
    r=S*.07; d.ellipse([cx+S*.06-r,S*.20-r,cx+S*.06+r,S*.20+r],fill=255)
    return soften(m, 20)

OPTS={
  "I":("Salvadanaio verde", lambda: place(bg((112,228,152),(38,170,92)), pig_glyph())),
  "J":("Salvadanaio rosa",  lambda: place(bg((255,150,176),(240,86,128)), pig_glyph())),
  "K":("Euro",              lambda: place(bg((70,214,170),(18,140,110)), euro_glyph())),
  "L":("Monete",            lambda: place(bg((255,204,64),(255,149,0)), coins_glyph())),
}

def rounded(im,size):
    im=im.resize((size,size),Image.LANCZOS)
    m=Image.new("L",(size,size),0); ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1],radius=int(size*.225),fill=255)
    out=Image.new("RGBA",(size,size)); out.paste(im,(0,0),m); return out

if len(sys.argv)>1:
    im=OPTS[sys.argv[1]][1]().convert("RGB")
    for n,s in (("icon-192",192),("icon-512",512)): im.resize((s,s),Image.LANCZOS).save(f"icons/{n}.png")
    im.resize((180,180),Image.LANCZOS).save("icons/apple-touch-icon.png")
    mk=im.copy(); g=im.resize((int(S*.8),int(S*.8)),Image.LANCZOS); mk.paste(g,(int(S*.1),int(S*.1)))
    # maskable: keep the gradient full-bleed, shrink only the artwork into the safe zone
    base=im.resize((S,S)); base.paste(g,(int(S*.1),int(S*.1))); base.resize((512,512),Image.LANCZOS).save("icons/icon-maskable-512.png")
else:
    f=ImageFont.truetype("/System/Library/Fonts/SFNS.ttf",30); f.set_variation_by_axes([100,28,400,600])
    W=4*300+5*40; sheet=Image.new("RGB",(W,420),(250,250,248)); d=ImageDraw.Draw(sheet)
    for i,(k,(name,fn)) in enumerate(OPTS.items()):
        x=40+i*340; ic=rounded(fn(),300); sheet.paste(ic,(x,30),ic)
        d.text((x+150,370),f"{k} · {name}",font=f,fill=(20,20,19),anchor="mm")
    sheet.save("design/proposte-icona-apple.png")
