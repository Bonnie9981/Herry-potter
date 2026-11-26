#!/usr/bin/env python3
"""Generate a seamless 4x4 warm Hogwarts library stone-floor albedo tile."""
from PIL import Image, ImageDraw, ImageEnhance
import random
from pathlib import Path

SIZE = 2048
random.seed(6191)
out = Path("docs/assets/art/textures/stone-floor-warm.png")
out.parent.mkdir(parents=True, exist_ok=True)
img = Image.new("RGB", (SIZE, SIZE), (103, 102, 96))
cell, gap = SIZE // 4, 12
palette = [(151,149,139),(145,145,137),(157,154,144),(149,149,141),
(143,143,135),(154,152,142),(147,147,139),(160,156,145),
(150,149,140),(144,143,135),(156,153,143),(147,146,138),
(153,151,141),(146,145,137),(159,155,144),(149,148,139)]
for row in range(4):
    for col in range(4):
        x0,y0=col*cell,row*cell
        base=palette[row*4+col]; inset=gap//2
        pts=[(inset+random.randint(0,4),inset+random.randint(0,3)),
        (cell//3,inset+random.randint(-2,2)),(2*cell//3,inset+random.randint(-2,2)),
        (cell-inset-random.randint(0,4),inset+random.randint(0,3)),
        (cell-inset+random.randint(-2,2),cell//3),(cell-inset+random.randint(-2,2),2*cell//3),
        (cell-inset-random.randint(0,4),cell-inset-random.randint(0,4)),
        (2*cell//3,cell-inset+random.randint(-2,2)),(cell//3,cell-inset+random.randint(-2,2)),
        (inset+random.randint(0,4),cell-inset-random.randint(0,4)),
        (inset+random.randint(-2,2),2*cell//3),(inset+random.randint(-2,2),cell//3)]
        patch=Image.new("RGB",(cell,cell),(68,57,49)); pd=ImageDraw.Draw(patch)
        pd.polygon(pts,fill=base)
        noise=Image.effect_noise((cell,cell),34).convert("L")
        noise=ImageEnhance.Contrast(noise).enhance(0.55)
        tint=Image.new("RGB",(cell,cell),tuple(min(255,c+10) for c in base))
        varied=Image.composite(tint,patch,noise)
        mask=Image.new("L",(cell,cell),0); ImageDraw.Draw(mask).polygon(pts,fill=255)
        img.paste(varied,(x0,y0),mask)
        d=ImageDraw.Draw(img)
        for _ in range(240):
            cx=x0+random.randint(18,cell-18); cy=y0+random.randint(18,cell-18)
            rad=random.choice((1,1,2,3)); delta=random.choice((-8,-5,-3,3,4))
            color=tuple(max(0,min(255,c+delta)) for c in base)
            d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),fill=color)
# Subtle nondirectional mineral grain, no baked shadows or highlights.
grain=Image.effect_noise((SIZE,SIZE),18).convert("L")
grain=ImageEnhance.Contrast(grain).enhance(0.18)
overlay=Image.merge("RGB",(grain,grain,grain))
img=Image.blend(img,overlay,0.025)
img.save(out,"PNG",optimize=True)
print(f"Wrote {out} ({SIZE}x{SIZE})")
