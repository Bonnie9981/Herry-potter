#!/usr/bin/env python3
"""Generate a seamless 4x4 warm Hogwarts library stone-floor albedo tile."""
from PIL import Image, ImageDraw, ImageFilter
import random, math
from pathlib import Path

SIZE = 2048
random.seed(6191)
out = Path("docs/assets/art/textures/stone-floor-warm.png")
out.parent.mkdir(parents=True, exist_ok=True)

# Four-by-four square slabs. The pattern repeats exactly at all four edges.
img = Image.new("RGB", (SIZE, SIZE), (69, 57, 49))
draw = ImageDraw.Draw(img)
cell = SIZE // 4
palette = [
    (117, 101, 85), (109, 94, 80), (123, 106, 88), (113, 97, 82),
    (105, 91, 78), (119, 103, 86), (111, 96, 82), (126, 108, 89),
    (114, 99, 84), (106, 91, 77), (121, 104, 87), (110, 95, 81),
    (118, 101, 84), (108, 94, 81), (124, 107, 89), (112, 97, 83),
]
# Mortar gaps are part of the albedo, not cast shadows.
gap = 12
for row in range(4):
    for col in range(4):
        idx = row * 4 + col
        x0, y0 = col * cell, row * cell
        inset = gap // 2
        # Irregular chipped slab edges, with a fixed outer grid for seamless repetition.
        pts = [
            (x0+inset+random.randint(0,5), y0+inset+random.randint(0,4)),
            (x0+cell//3, y0+inset+random.randint(-2,3)),
            (x0+2*cell//3, y0+inset+random.randint(-2,3)),
            (x0+cell-inset-random.randint(0,5), y0+inset+random.randint(0,4)),
            (x0+cell-inset+random.randint(-3,2), y0+cell//3),
            (x0+cell-inset+random.randint(-3,2), y0+2*cell//3),
            (x0+cell-inset-random.randint(0,4), y0+cell-inset-random.randint(0,4)),
            (x0+2*cell//3, y0+cell-inset+random.randint(-3,2)),
            (x0+cell//3, y0+cell-inset+random.randint(-3,2)),
            (x0+inset+random.randint(0,4), y0+cell-inset-random.randint(0,4)),
            (x0+inset+random.randint(-2,3), y0+2*cell//3),
            (x0+inset+random.randint(-2,3), y0+cell//3),
        ]
        base = palette[idx]
        draw.polygon(pts, fill=base)
        # Fine mineral mottling and restrained age variation; no directional light.
        mask = Image.new("L", (SIZE, SIZE), 0)
        ImageDraw.Draw(mask).polygon(pts, fill=255)
        noise = Image.new("RGB", (SIZE, SIZE))
        px = noise.load()
        for yy in range(y0, min(y0+cell, SIZE)):
            for xx in range(x0, min(x0+cell, SIZE)):
                n = random.gauss(0, 5.0)
                px[xx, yy] = tuple(max(0, min(255, int(c+n))) for c in base)
        img.paste(noise, (0,0), mask)
        d = ImageDraw.Draw(img)
        # Small natural pits and mineral flecks, evenly distributed without bright glints.
        for _ in range(260):
            cx = x0 + random.randint(20, cell-20)
            cy = y0 + random.randint(20, cell-20)
            rad = random.choice([1,1,2,3])
            v = random.choice([-17,-12,-8,7,10])
            colr = tuple(max(0,min(255,c+v)) for c in base)
            d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad), fill=colr)

# Add low-amplitude, seamless fine grain. Wrap-aware coordinates avoid edge seams.
grain = Image.new("RGB", (SIZE, SIZE))
gp = grain.load()
for y in range(SIZE):
    for x in range(SIZE):
        n = random.gauss(0, 2.0)
        gp[x,y] = (max(0,min(255,int(112+n))),)*3
# Blend subtle grain into stone without changing the tile's silhouette.
img = Image.blend(img, grain, 0.035)
img.save(out, "PNG", optimize=True)
print(f"Wrote {out} ({SIZE}x{SIZE})")
