"""Variante bianco e blu notte con indizi da moneta. Uso: python3 design/icons5.py [P1|P2|P3|P4]"""
import sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
S=2048
NAVY=(22,36,72); NAVY_EDGE=(12,22,48); RIM=(70,96,156); PLATE=(38,56,102); WHITE=(255,255,255)
def bg():
    im=Image.new("RGBA",(S,S)); d=ImageDraw.Draw(im)
    for y in range(S):
        t=y/(S-1); c=tuple(round(255*(1-t)+v*t) for v in (230,234,242)); d.line([(0,y),(S,y)],fill=c+(255,))
    return im
def shadow(im,box,blur=40,a=70):
    sh=Image.new("RGBA",(S,S),(0,0,0,0)); ImageDraw.Draw(sh).ellipse(box,fill=(10,20,50,a)); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
def face(d,cx,cy,R,reeded=False,shine=True):
    d.ellipse([cx-R,cy-R,cx+R,cy+R],fill=NAVY+(255,))
    if reeded:  # zigrinatura del bordo, come una moneta vera
        n=72
        for k in range(n):
            a=2*math.pi*k/n; r1,r2=R*.90,R*.985
            d.line([(cx+r1*math.cos(a),cy+r1*math.sin(a)),(cx+r2*math.cos(a),cy+r2*math.sin(a))],fill=RIM+(255,),width=int(S*.006))
    r2=R*.84; d.ellipse([cx-r2,cy-r2,cx+r2,cy+r2],outline=RIM+(255,),width=int(S*.014))
    sw,sh_=R*.56,R*.40; d.ellipse([cx-sw,cy-sh_+R*.06,cx+sw,cy+sh_+R*.06],fill=PLATE+(255,))
    hw,hh,gap=R*.12,R*.22,R*.2
    for sx in (-1,1):
        x=cx+sx*gap; d.ellipse([x-hw,cy+R*.06-hh,x+hw,cy+R*.06+hh],fill=WHITE+(255,))
    if shine:
        d.arc([cx-R*.74,cy-R*.74,cx+R*.74,cy+R*.74],start=200,end=250,fill=(255,255,255,90),width=int(S*.014))
def thick(d,cx,cy,R,t):  # spessore visibile sotto la faccia
    d.rectangle([cx-R,cy,cx+R,cy+t],fill=NAVY_EDGE+(255,))
    d.ellipse([cx-R,cy-R+t,cx+R,cy+R+t],fill=NAVY_EDGE+(255,))
    for k in range(1,9):  # tacche della zigrinatura sul bordo
        x=cx-R+2*R*k/9; dy=R*(1-math.sqrt(max(0,1-((x-cx)/R)**2)))
        d.line([(x,cy+R-dy+t*.15),(x,cy+R-dy+t*.85)],fill=NAVY+(255,),width=int(S*.008))

def P1():
    im=bg(); cx=cy=S/2; R=S*.35; shadow(im,[cx-R,cy-R+S*.03,cx+R,cy+R+S*.03]); d=ImageDraw.Draw(im); face(d,cx,cy,R,reeded=True); return im
def P2():
    im=bg(); cx,cy=S/2,S*.47; R=S*.34; t=S*.07; shadow(im,[cx-R,cy-R+t+S*.03,cx+R,cy+R+t+S*.03]); d=ImageDraw.Draw(im); thick(d,cx,cy,R,t); face(d,cx,cy,R); return im
def P3():
    im=bg(); d=ImageDraw.Draw(im); R=S*.30
    for (cx,cy,a) in ((S*.60,S*.40,.35),(S*.55,S*.45,.6)):
        d.ellipse([cx-R,cy-R,cx+R,cy+R],fill=NAVY+(int(255*a),))
    cx,cy=S*.47,S*.53; shadow(im,[cx-R,cy-R+S*.03,cx+R,cy+R+S*.03]); d=ImageDraw.Draw(im); face(d,cx,cy,R,reeded=True); return im
def P4():
    im=bg(); cx,cy=S/2,S*.47; R=S*.34; t=S*.07; shadow(im,[cx-R,cy-R+t+S*.03,cx+R,cy+R+t+S*.03]); d=ImageDraw.Draw(im); thick(d,cx,cy,R,t); face(d,cx,cy,R,reeded=True); return im
OPTS={"P1":("Bordo zigrinato",P1),"P2":("Spessore",P2),"P3":("Pila",P3),"P4":("Zigrinato + spessore",P4)}
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
    W=4*300+5*40; sheet=Image.new("RGB",(W,420),(214,218,226)); d=ImageDraw.Draw(sheet)
    for i,(k,(name,fn)) in enumerate(OPTS.items()):
        x=40+i*340; ic=rounded(fn(),300); sheet.paste(ic,(x,30),ic)
        d.text((x+150,370),f"{k} · {name}",font=f,fill=(20,20,19),anchor="mm")
    sheet.save("design/proposte-moneta-blu.png")
