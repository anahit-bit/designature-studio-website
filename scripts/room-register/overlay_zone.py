# -*- coding: utf-8 -*-
"""Draw a cached zone observation ON the photograph.

This is the script that settled the whole question. The numbers coming out of
the pipeline looked merely wrong; drawn on the picture they were obviously
wrong — every point was on the wrong object. A coordinate you cannot see is a
coordinate you cannot debug.

  python scripts/room-register/overlay_zone.py <zone-obs-*.json> <photo> [out.png]
"""
import json
import sys
from PIL import Image, ImageDraw, ImageOps

obs_path, photo = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else "zone-overlay.png"

d = json.load(open(obs_path, encoding="utf-8"))
o, W, H = d["obs"], d["size"]["w"], d["size"]["h"]
im = ImageOps.exif_transpose(Image.open(photo)).convert("RGB").resize((W, H))
dr = ImageDraw.Draw(im)

def line(a, b, col, wd=4):
    dr.line([a[0] * W, a[1] * H, b[0] * W, b[1] * H], fill=col, width=wd)

zf = o["zoneFoot"]
line(zf["a"], zf["b"], (255, 0, 0), 6)
dr.text((zf["a"][0] * W + 4, zf["a"][1] * H - 22), "zoneFoot (the calibration span)", fill=(255, 0, 0))

COLS = {
    "television": (0, 200, 255), "media console": (0, 255, 120),
    "floating shelf": (255, 220, 0), "ceiling height": (255, 0, 255),
    "wall socket": (255, 140, 0),
}
for f in o["features"]:
    c = COLS.get(f["name"], (255, 255, 255))
    line(f["a"], f["b"], c, 4)
    dr.text((f["a"][0] * W + 4, f["a"][1] * H - 16), f["name"], fill=c)

im.save(out)
print(f"wrote {out}")
