# -*- coding: utf-8 -*-
"""Render a photo with a labelled pixel grid, so points can be read off it.

  python scripts/room-register/grid.py <photo> [out.png] [--step 50]

The frame is normalised to a 1280 long edge — the same frame `measure-manual.ts`
expects — so a coordinate read here can be pasted straight into a --quad.
"""
import sys
from PIL import Image, ImageDraw, ImageOps

photo = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "grid.png"
step = 50
if "--step" in sys.argv:
    step = int(sys.argv[sys.argv.index("--step") + 1])

im = ImageOps.exif_transpose(Image.open(photo)).convert("RGB")
w, h = im.size
s = 1280 / max(w, h)
im = im.resize((round(w * s), round(h * s)))
W, H = im.size
dr = ImageDraw.Draw(im, "RGBA")
for x in range(0, W, step):
    major = x % (step * 2) == 0
    dr.line([x, 0, x, H], fill=(255, 0, 0, 190 if major else 70), width=2 if major else 1)
    if major:
        dr.text((x + 2, 2), str(x), fill=(255, 0, 0))
for y in range(0, H, step):
    major = y % (step * 2) == 0
    dr.line([0, y, W, y], fill=(0, 90, 255, 190 if major else 70), width=2 if major else 1)
    if major:
        dr.text((2, y + 2), str(y), fill=(0, 90, 255))
im.save(out)
print(f"{out}  frame {W}x{H}  step {step}")
