"""Proposte di icona più illustrate. Uso: python3 design/icons2.py [E|F|G|H]"""
import sys, math
from PIL import Image, ImageDraw, ImageFilter

S=2048
GOLD=(246,193,74); GOLD_D=(214,150,36); GOLD_L=(255,224,140)
INK=(20,20,19); GREEN=(31,107,78); MINT=(108,199,158); PAPER=(246,246,243)

def grad(c1,c2):
    im=Image.new("RGBA",(S,S)); d=ImageDraw.Draw(im)
    for y in range(S):
        t=y/S; d.line([(0,y),(S,y)],fill=tuple(int(c1[i]*(1-t)+c2[i]*t) for i in range(3))+(255,))
    return im
def shadow(im, box, r=60, alpha=70, dy=40):
    sh=Image.new("RGBA",(S,S),(0,0,0,0)); ImageDraw.Draw(sh).ellipse(box,fill=(0,0,0,alpha))
    sh=sh.filter(ImageFilter.GaussianBlur(r)); im.alpha_composite(sh,(0,dy))
def coin(d, cx, cy, r, face=True):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=GOLD_D+(255,))
    d.ellipse([cx-r*.9,cy-r*.9-r*.02,cx+r*.9,cy+r*.9-r*.02],fill=GOLD+(255,))
    if face: d.ellipse([cx-r*.62,cy-r*.62,cx+r*.62,cy+r*.62],outline=GOLD_D+(255,),width=int(r*.07))

def E():  # moneta-maialino
    im=grad((214,240,227),(178,224,201)); d=ImageDraw.Draw(im)
    cx,cy,r=S/2,S*.55,S*.30
    shadow(im,[cx-r*.9,cy+r*.75,cx+r*.9,cy+r*1.05],r=50,alpha=60,dy=0)
    d=ImageDraw.Draw(im)
    for sx in (-1,1):  # orecchie
        ex=cx+sx*r*.55
        d.polygon([(ex-r*.28,cy-r*.72),(ex+sx*r*.18,cy-r*1.22),(ex+r*.28,cy-r*.72)],fill=GOLD_D+(255,))
        d.polygon([(ex-r*.15,cy-r*.78),(ex+sx*r*.12,cy-r*1.08),(ex+r*.15,cy-r*.78)],fill=(236,140,120,255))
    coin(d,cx,cy,r,face=False)
    d.ellipse([cx-r*.38,cy-r*.02,cx+r*.38,cy+r*.42],fill=(236,150,128,255))  # muso
    for sx in (-1,1):
        d.ellipse([cx+sx*r*.15-r*.07,cy+r*.13,cx+sx*r*.15+r*.07,cy+r*.29],fill=(150,70,55,255))
        d.ellipse([cx+sx*r*.42-r*.075,cy-r*.32,cx+sx*r*.42+r*.075,cy-r*.17],fill=INK+(255,))
        d.ellipse([cx+sx*r*.42-r*.02,cy-r*.30,cx+sx*r*.42+r*.035,cy-r*.25],fill=(255,255,255,255))
    d.rounded_rectangle([cx-r*.32,cy-r*.66,cx+r*.32,cy-r*.56],radius=r*.05,fill=GOLD_D+(255,))
    d.ellipse([cx-r*.62,cy-r*.75,cx-r*.38,cy-r*.55],fill=GOLD_L+(200,))
    return im

def F():  # barattolo di monete
    im=grad((36,120,88),(22,82,60)); d=ImageDraw.Draw(im)
    x0,x1,y0,y1=S*.27,S*.73,S*.36,S*.84
    jar=Image.new("RGBA",(S,S),(0,0,0,0)); jd=ImageDraw.Draw(jar)
    jd.rounded_rectangle([x0,y0,x1,y1],radius=S*.09,fill=(255,255,255,46))
    for k in range(6):  # monete impilate dentro
        y=y1-S*.075-k*S*.052; w=(x1-x0)*.78
        jd.ellipse([S/2-w/2,y-S*.035,S/2+w/2,y+S*.035],fill=GOLD_D+(255,))
        jd.ellipse([S/2-w/2,y-S*.045,S/2+w/2,y+S*.025],fill=GOLD+(255,))
    mask=Image.new("L",(S,S),0); ImageDraw.Draw(mask).rounded_rectangle([x0,y0,x1,y1],radius=S*.09,fill=255)
    im.paste(jar,(0,0),Image.composite(jar.getchannel("A"),Image.new("L",(S,S),0),mask))
    d=ImageDraw.Draw(im)
    d.rounded_rectangle([x0,y0,x1,y1],radius=S*.09,outline=(255,255,255,170),width=int(S*.016))
    d.rounded_rectangle([x0+S*.03,y0-S*.06,x1-S*.03,y0+S*.01],radius=S*.025,fill=PAPER+(255,))
    d.rounded_rectangle([x0+S*.05,y0+S*.06,x0+S*.085,y0+S*.25],radius=S*.02,fill=(255,255,255,90))
    coin(d,S*.6,S*.19,S*.075)
    for k,(a,b) in enumerate(((S*.47,S*.10),(S*.44,S*.17),(S*.47,S*.24))):
        d.line([(a,b),(a+S*.04,b)],fill=(255,255,255,140),width=int(S*.014))
    return im

def G():  # germoglio dalla moneta
    im=grad((232,240,248),(206,222,238)); d=ImageDraw.Draw(im)
    cx=S/2
    shadow(im,[S*.24,S*.78,S*.76,S*.88],r=40,alpha=50,dy=0); d=ImageDraw.Draw(im)
    for k in range(3):  # pila di monete in prospettiva
        y=S*.78-k*S*.07; w=S*.46
        d.rounded_rectangle([cx-w/2,y-S*.03,cx+w/2,y+S*.045],radius=S*.04,fill=GOLD_D+(255,))
        d.ellipse([cx-w/2,y-S*.07,cx+w/2,y+S*.01],fill=GOLD+(255,))
    d.ellipse([cx-S*.16,S*.555,cx+S*.16,S*.595],outline=GOLD_D+(255,),width=int(S*.01))
    d.line([(cx,S*.575),(cx,S*.33)],fill=GREEN+(255,),width=int(S*.03))
    def leaf(px,py,ang,ln,wd,col):
        L=Image.new("RGBA",(S,S),(0,0,0,0)); ImageDraw.Draw(L).ellipse([S/2-ln/2,S/2-wd/2,S/2+ln/2,S/2+wd/2],fill=col+(255,))
        L=L.rotate(ang,center=(S/2,S/2),resample=Image.BICUBIC); im.alpha_composite(L,(int(px-S/2),int(py-S/2)))
    leaf(cx-S*.115,S*.42,28,S*.25,S*.12,GREEN)
    leaf(cx+S*.12,S*.34,-28,S*.27,S*.13,MINT)
    return im

def H():  # moneta che entra nella fessura
    im=grad((30,30,29),(12,12,11)); d=ImageDraw.Draw(im)
    cx=S/2; sy=S*.62
    coinL=Image.new("RGBA",(S,S),(0,0,0,0)); cd=ImageDraw.Draw(coinL)
    r=S*.22; coin(cd,cx,sy-r*.35,r)
    cd.rounded_rectangle([cx-r*.5,sy-r*.35-r*.08,cx+r*.5,sy-r*.35+r*.08],radius=r*.06,fill=GOLD_D+(255,))
    clip=Image.new("L",(S,S),0); ImageDraw.Draw(clip).rectangle([0,0,S,sy],fill=255)
    im.paste(coinL,(0,0),Image.composite(coinL.getchannel("A"),Image.new("L",(S,S),0),clip))
    d=ImageDraw.Draw(im)
    d.rounded_rectangle([S*.18,sy-S*.035,S*.82,sy+S*.035],radius=S*.035,fill=(0,0,0,255))
    d.rounded_rectangle([S*.18,sy-S*.035,S*.82,sy+S*.035],radius=S*.035,outline=(60,60,58,255),width=int(S*.008))
    def star(x,y,s,col):
        d.polygon([(x,y-s),(x+s*.25,y-s*.25),(x+s,y),(x+s*.25,y+s*.25),(x,y+s),(x-s*.25,y+s*.25),(x-s,y),(x-s*.25,y-s*.25)],fill=col+(255,))
    star(S*.76,S*.22,S*.06,MINT); star(S*.25,S*.30,S*.035,GOLD_L); star(S*.70,S*.42,S*.025,(255,255,255))
    d.text((cx,S*.80),"",fill=(0,0,0))
    return im

OPTS={"E":("Moneta-maialino",E),"F":("Barattolo",F),"G":("Germoglio",G),"H":("Fessura",H)}

def masked(im,size):
    im=im.resize((size,size),Image.LANCZOS)
    m=Image.new("L",(size,size),0); ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1],radius=int(size*.225),fill=255)
    out=Image.new("RGBA",(size,size)); out.paste(im,(0,0),m); return out

if len(sys.argv)>1:
    im=OPTS[sys.argv[1]][1]().convert("RGB")
    for n,sz in (("icon-192",192),("icon-512",512)): im.resize((sz,sz),Image.LANCZOS).save(f"icons/{n}.png")
    im.resize((180,180),Image.LANCZOS).save("icons/apple-touch-icon.png")
    bg=im.getpixel((S//2,4)); m=Image.new("RGB",(S,S),bg); m.paste(im.resize((1640,1640),Image.LANCZOS),(204,204)); m.resize((512,512),Image.LANCZOS).save("icons/icon-maskable-512.png")
else:
    from PIL import ImageFont
    f=ImageFont.truetype("/System/Library/Fonts/SFNS.ttf",30); f.set_variation_by_axes([100,28,400,600])
    W=4*300+5*40; sheet=Image.new("RGB",(W,420),(250,250,248)); d=ImageDraw.Draw(sheet)
    for i,(k,(name,fn)) in enumerate(OPTS.items()):
        x=40+i*340; ic=masked(fn(),300); sheet.paste(ic,(x,30),ic)
        d.text((x+150,370),f"{k} · {name}",font=f,fill=INK,anchor="mm")
    sheet.save("design/proposte-icona-2.png")
