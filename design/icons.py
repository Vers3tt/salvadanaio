"""Genera le proposte di icona e il foglio di confronto. Uso: python3 design/icons.py [A|B|C|D]"""
import sys
from PIL import Image, ImageDraw, ImageFont

INK=(20,20,19); PAPER=(242,242,240); GREEN=(31,107,78); MINT=(108,199,158)
SF="/System/Library/Fonts/SFNS.ttf"

def font(px, weight=700):
    f=ImageFont.truetype(SF, int(px))
    f.set_variation_by_axes([100, 28, 400, weight])
    return f

def canvas(bg): S=2048; return Image.new("RGBA",(S,S),bg+(255,)), S

def A():  # cartellino del prezzo
    im,S=canvas(GREEN); d=ImageDraw.Draw(im)
    w,h=S*.50,S*.62; x0,y0=(S-w)/2,(S-h)/2+S*.04
    cut=w*.32
    poly=[(x0+cut,y0),(x0+w-cut,y0),(x0+w,y0+cut),(x0+w,y0+h),(x0,y0+h),(x0,y0+cut)]
    d.polygon(poly,fill=PAPER+(255,))
    r=S*.045; cx=S/2; cy=y0+cut*.85
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=GREEN+(255,))
    d.line([(cx,cy-r),(cx-S*.06,y0-S*.17)],fill=PAPER+(255,),width=int(S*.018))
    d.text((cx,y0+h*.66),"€",font=font(S*.30,800),fill=GREEN+(255,),anchor="mm")
    return im

def B():  # numero a cartellino: euro con centesimi in alto
    im,S=canvas(INK); d=ImageDraw.Draw(im)
    d.text((S*.40,S*.54),"€",font=font(S*.60,760),fill=PAPER+(255,),anchor="mm")
    d.text((S*.735,S*.355),"00",font=font(S*.20,760),fill=MINT+(255,),anchor="mm")
    return im

def C():  # salvadanaio geometrico
    im,S=canvas(PAPER); d=ImageDraw.Draw(im)
    bx0,by0,bx1,by1=S*.20,S*.34,S*.78,S*.74
    d.ellipse([bx0,by0,bx1,by1],fill=INK+(255,))
    d.rounded_rectangle([bx1-S*.06,S*.48,bx1+S*.08,S*.62],radius=S*.04,fill=INK+(255,))
    d.polygon([(S*.56,by0+S*.03),(S*.66,S*.24),(S*.70,by0+S*.08)],fill=INK+(255,))
    for lx in (S*.30,S*.58):
        d.rounded_rectangle([lx,by1-S*.06,lx+S*.09,S*.83],radius=S*.025,fill=INK+(255,))
    d.rounded_rectangle([S*.40,by0+S*.05,S*.56,by0+S*.085],radius=S*.02,fill=PAPER+(255,))
    d.ellipse([S*.645,S*.45,S*.675,S*.48],fill=PAPER+(255,))
    r=S*.075; d.ellipse([S*.48-r,S*.20-r,S*.48+r,S*.20+r],fill=GREEN+(255,))
    return im

def D():  # pila di monete con barra di avanzamento
    im,S=canvas(GREEN); d=ImageDraw.Draw(im)
    cx=S/2; w=S*.46; h=S*.11; step=S*.105
    for k in range(4):
        y=S*.68-k*step
        d.rounded_rectangle([cx-w/2,y-h/2,cx+w/2,y+h/2],radius=h/2,fill=PAPER+(255,))
        d.rounded_rectangle([cx-w/2,y-h/2,cx+w/2,y+h/2],radius=h/2,outline=GREEN+(255,),width=int(S*.012))
    y=S*.68-4*step
    d.rounded_rectangle([cx-w/2,y-h/2,cx+w/2,y+h/2],radius=h/2,outline=PAPER+(255,),width=int(S*.014))
    return im

OPTS={"A":("Cartellino",A),"B":("Centesimi",B),"C":("Salvadanaio",C),"D":("Pila",D)}

def masked(im,size):
    im=im.resize((size,size),Image.LANCZOS)
    m=Image.new("L",(size,size),0); ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1],radius=int(size*.225),fill=255)
    out=Image.new("RGBA",(size,size)); out.paste(im,(0,0),m); return out

if len(sys.argv)>1:
    im=OPTS[sys.argv[1]][1]()
    for n,sz in (("icon-192",192),("icon-512",512)): im.resize((sz,sz),Image.LANCZOS).save(f"icons/{n}.png")
    im.resize((180,180),Image.LANCZOS).convert("RGB").save("icons/apple-touch-icon.png")
    # maskable: shrink artwork into the safe zone
    bg=im.getpixel((5,5)); m=Image.new("RGBA",(2048,2048),bg); m.paste(im.resize((1640,1640),Image.LANCZOS),(204,204)); m.resize((512,512),Image.LANCZOS).save("icons/icon-maskable-512.png")
else:
    W=4*300+5*40; sheet=Image.new("RGB",(W,420),(250,250,248)); d=ImageDraw.Draw(sheet)
    for i,(k,(name,fn)) in enumerate(OPTS.items()):
        x=40+i*340; sheet.paste(masked(fn(),300),(x,30),masked(fn(),300))
        d.text((x+150,370),f"{k} · {name}",font=font(30,600),fill=INK,anchor="mm")
    sheet.save("design/proposte-icona.png")
