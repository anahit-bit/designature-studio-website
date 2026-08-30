#!/usr/bin/env python
"""
Builds a review page for the style x room library.

Writes index.html next to the images with relative <img> paths, so it opens
straight from the filesystem with no server and no fetch (a JSON-fetching page
is blocked on file://). Re-run after every generate.ts run.

    python scripts/style-library/contact-sheet.py
"""
import json, os, sys

ROOT = r"E:\Business\Claude\_Plan\Website\style-room-library"
OUT = os.path.join(ROOT, "index.html")

manifest_path = os.path.join(ROOT, "manifest.json")
if not os.path.exists(manifest_path):
    sys.exit("No manifest.json — run scripts/style-library/generate.ts first.")

data = json.load(open(manifest_path, encoding="utf-8"))
images = data["images"]

styles, rooms = [], []
for i in images:
    if i["style"] not in styles: styles.append(i["style"])
    if i["room"] not in rooms: rooms.append(i["room"])

by_pair = {(i["style"], i["room"]): i["file"] for i in images}
missing = [(s, r) for s in styles for r in rooms if (s, r) not in by_pair]

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

cells = []
for s in styles:
    cells.append(f'<h2 class="style" id="{esc(s).replace(" ", "-").lower()}">{esc(s)}</h2>')
    cells.append('<div class="row">')
    for r in rooms:
        f = by_pair.get((s, r))
        if f:
            cells.append(
                f'<figure><a href="{f}" target="_blank"><img loading="lazy" src="{f}" alt="{esc(s)} {esc(r)}"></a>'
                f'<figcaption>{esc(r)}</figcaption></figure>')
        else:
            cells.append(f'<figure class="gap"><div class="ph">missing</div><figcaption>{esc(r)}</figcaption></figure>')
    cells.append("</div>")

nav = " · ".join(f'<a href="#{esc(s).replace(" ", "-").lower()}">{esc(s)}</a>' for s in styles)

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Style x Room library — {len(images)} images</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Montserrat:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  :root{{--navy:#0B2240;--terra:#9E5E41;--mute:#6B6B6B;--line:rgba(0,0,0,.12)}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:#fff;font-family:Montserrat,system-ui,sans-serif;color:#111}}
  header{{padding:34px 28px 18px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:5}}
  h1{{font-family:"Cormorant Garamond",Georgia,serif;font-size:34px;margin:0 0 6px;color:var(--navy)}}
  .sub{{font-size:12px;color:var(--mute);line-height:1.6}}
  .sub b{{color:var(--terra)}}
  nav{{margin-top:12px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;line-height:2.1}}
  nav a{{color:var(--navy);text-decoration:none;border-bottom:1px solid transparent}}
  nav a:hover{{border-color:var(--navy)}}
  main{{padding:8px 28px 70px}}
  h2.style{{font-family:"Cormorant Garamond",Georgia,serif;font-size:27px;color:var(--navy);
            margin:38px 0 12px;padding-bottom:7px;border-bottom:1px solid var(--line);scroll-margin-top:150px}}
  .row{{display:grid;grid-template-columns:repeat({len(rooms)},minmax(190px,1fr));gap:12px;overflow-x:auto;padding-bottom:6px}}
  figure{{margin:0}}
  img{{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#F2F2F2;border:1px solid var(--line)}}
  figcaption{{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-top:6px;text-align:center}}
  .ph{{width:100%;aspect-ratio:4/3;display:grid;place-items:center;background:#FFF4E0;border:1px dashed rgba(180,83,9,.4);
       font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#B45309}}
</style></head><body>
<header>
  <h1>Style &times; Room library</h1>
  <div class="sub"><b>{len(images)}</b> images &middot; {len(styles)} styles &times; {len(rooms)} rooms &middot;
    generated with <code>{esc(data.get("model",""))}</code> at {esc(data.get("aspect",""))}
    {'&middot; <b>' + str(len(missing)) + ' missing</b>' if missing else '&middot; complete'}.
    Click any image to open it full size. Rendered from the same style briefs and room programmes the live tool uses.</div>
  <nav>{nav}</nav>
</header>
<main>
{chr(10).join(cells)}
</main></body></html>"""

open(OUT, "w", encoding="utf-8").write(html)
print(f"wrote {OUT}")
print(f"{len(images)} images · {len(styles)} styles x {len(rooms)} rooms · {len(missing)} missing")
for s, r in missing[:20]:
    print("  missing:", s, "/", r)
