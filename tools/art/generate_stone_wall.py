#!/usr/bin/env python3
"""Generate a seamless 2048px warm ashlar-stone wall albedo tile."""
from PIL import Image, ImageDraw, ImageEnhance
from pathlib import Path
import random

SIZE = 2048
COURSES = 4
random.seed(6191)
out = Path("docs/assets/art/textures/stone-wall-warm.png")
out.parent.mkdir(parents=True, exist_ok=True)

# Four repeating courses; matching top/bottom course boundaries make the tile repeat vertically.
course_h = SIZE // COURSES
mortar = (91, 82, 72)
img = Image.new("RGB", (SIZE, SIZE), mortar)
draw = ImageDraw.Draw(img)
stones = [(158,148,132),(164,153,137),(151,141,126),(169,158,141),
          (156,146,131),(162,151,135),(154,143,128),(166,155,139)]
for row in range(COURSES):
    y0 = row * course_h
    # Alternating, irregular ashlar joints. The pattern is periodic at the left/right edges.
    widths = [random.randint(390, 660) for _ in range(4)]
    scale = SIZE / sum(widths)
    widths = [round(w * scale) for w in widths]
    widths[-1] = SIZE - sum(widths[:-1])
    offset = 0
    for col, width in enumerate(widths):
        x0 = offset
        inset = 7
        base = stones[(row * 3 + col) % len(stones)]
        color = tuple(max(0, min(255, c + random.randint(-4, 4))) for c in base)
        draw.rectangle((x0 + inset, y0 + inset, x0 + width - inset,
                        y0 + course_h - inset), fill=color)
        # Fine, restrained mineral variation; keep a quiet margin at tile boundaries.
        for _ in range(180):
            x = x0 + random.randint(inset + 14, max(inset + 14, width - inset - 14))
            y = y0 + random.randint(inset + 14, course_h - inset - 14)
            d = random.choice((-8, -5, -3, 3, 5, 7))
            dot = tuple(max(0, min(255, c + d)) for c in base)
            rad = random.choice((1, 1, 2))
            draw.ellipse((x-rad, y-rad, x+rad, y+rad), fill=dot)
        offset += width

# No directional lighting, shadows, bevel highlights, or baked illumination.
img.save(out, "PNG", optimize=True)
print(f"Wrote {out} ({SIZE}x{SIZE})")
