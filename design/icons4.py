"""Moneta-muso: varianti di colore. Uso: python3 design/icons4.py [M|N|O|P] (senza argomenti: foglio)"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
S=2048
def grad(top,bot):
    im=Image.new("RGBA",(S,S)); d=ImageDraw.Draw(im)
    for y in range(S):
        t=y/(S-1); d.line([(0,y),(S,y)],fill=tuple(round(top[i]*(1-t)+bot[i]*t) for i in range(3))+(255,))
    return im
def coin_icon(top, bot, face, rim, hole=None, snout=None):
    im=grad(top,bot); cx=cy=S/2; R=S*.35
    sh=Image.new("RGBA",(S,S),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([cx-R,cy-R+S*.03,cx+R,cy+R+S*.03],fill=(0,0,0,90))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(40)))
    d=ImageDraw.Draw(im)
    d.ellipse([cx-R,cy-R,cx+R,cy+R],fill=face+(255,))
    r2=R*.86; d.ellipse([cx-r2,cy-r2,cx+r2,cy+r2],outline=rim+(255,),width=int(S*.016))
    if snout:  # piatto del muso, appena più chiaro: fa leggere i fori come narici
        sw,shh=R*.62,R*.44; d.ellipse([cx-sw,cy-shh+R*.08,cx+sw,cy+shh+R*.08],fill=snout+(255,))
    hw,hh,gap=R*.13,R*.25,R*.22
    for sx in (-1,1):
        x=cx+sx*gap; d.ellipse([x-hw,cy+R*.08-hh,x+hw,cy+R*.08+hh],fill=(hole or bot)+(255,))
    return im

GOLD=(246,193,74); GOLD_RIM=(214,150,42); GOLD_SNOUT=(250,208,110)
OPTS={
  "M":("Blu notte e oro",   lambda: coin_icon((34,52,94),(14,24,52),GOLD,GOLD_RIM,snout=GOLD_SNOUT)),
  "N":("Grafite e oro",     lambda: coin_icon((58,58,62),(22,22,24),GOLD,GOLD_RIM,snout=GOLD_SNOUT)),
  "O":("Blu Apple e oro",   lambda: coin_icon((52,120,246),(16,64,180),GOLD,GOLD_RIM,snout=GOLD_SNOUT)),
  "P":("Bianco e blu notte",lambda: coin_icon((255,255,255),(232,235,242),(22,36,72),(60,84,140),hole=(255,255,255),snout=(38,56,102))),
}
def rounded(im,size):
    im=im.resize((size,size),Image.LANCZOS); m=Image.new("L",(size,size),0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1],radius=int(size*.225),fill=255)
    out=Image.new("RGBA",(size,size)); out.paste(im,(0,0),m); return out
if len(sys.argv)>1:
    im=OPTS[sys.argv[1]][1]().convert("RGB")
    im.resize((1024,1024),Image.LANCZOS).save("icons/source-1024.png")
    for n,s in (("icon-192",192),("icon-512",512)): im.resize((s,s),Image.LANCZOS).save(f"icons/{n}.png")
    im.resize((180,180),Image.LANCZOS).save("icons/apple-touch-icon.png")
    base=im.copy(); base.paste(im.resize((int(S*.8),)*2,Image.LANCZOS),(int(S*.1),)*2); base.resize((512,512),Image.LANCZOS).save("icons/icon-maskable-512.png")
else:
    f=ImageFont.truetype("/System/Library/Fonts/SFNS.ttf",28); f.set_variation_by_axes([100,28,400,600])
    W=4*300+5*40; sheet=Image.new("RGB",(W,420),(250,250,248)); d=ImageDraw.Draw(sheet)
    for i,(k,(name,fn)) in enumerate(OPTS.items()):
        x=40+i*340; ic=rounded(fn(),300); sheet.paste(ic,(x,30),ic)
        d.text((x+150,370),f"{k} · {name}",font=f,fill=(20,20,19),anchor="mm")
    sheet.save("design/proposte-moneta-colori.png")
