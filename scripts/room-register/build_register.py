# -*- coding: utf-8 -*-
"""Builds the room-photo measurability register as one self-contained HTML page.

Merges three things:
  1. the hand audit in `audit_data.py` (what each photo IS)
  2. EXIF + thumbnails read straight from the photos
  3. `room-measurements.json`, written by `scripts/export-room-measurements.ts`,
     which is what the measurement pipeline actually produced

The page declares the `db` capability so the owner can type the REAL dimensions
next to each photo. Those are the ground truth the whole study is missing — with
them the register stops being a judgement and becomes a score.

  npx tsx scripts/export-room-measurements.ts
  python scripts/room-register/build_register.py
"""
import base64
import io
import json
import os
import sys
import collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageOps, ExifTags
from audit_data import ROWS, LADDER  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = r"E:\Business\Claude\_Inputs\source-rooms"
MEAS_PATH = os.path.join(REPO, "room-measurements.json")
OUT = os.path.join(HERE, "room-register.html")

DUPES = {61: 51, 62: 53, 63: 52, 64: 54}
TAGS = {v: k for k, v in ExifTags.TAGS.items()}


def esc(s):
    return (
        str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    )


def walk(root):
    out = []
    for dirpath, _dirs, names in os.walk(root):
        for n in sorted(names):
            if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                out.append(os.path.join(dirpath, n))
    return sorted(out, key=lambda p: os.path.relpath(p, root).lower())


files = walk(SRC)
by_index = {i: f for i, f in enumerate(files, start=1)}

meas_by_file = {}
if os.path.exists(MEAS_PATH):
    for m in json.load(open(MEAS_PATH, encoding="utf-8")):
        meas_by_file[m["file"]] = m
else:
    print(f"!! {MEAS_PATH} missing — the measured column will be empty")


def thumb_uri(path, box=300):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((box, box), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=60, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def exif_of(path):
    out = {}
    try:
        ex = Image.open(path)._getexif() or {}
        for name in ("Make", "Model", "FocalLengthIn35mmFilm", "Orientation"):
            tid = TAGS.get(name)
            if tid in ex:
                out[name] = ex[tid]
    except Exception:
        pass
    return out


STATE_LABEL = {
    "shell": "shell", "construction": "site", "empty": "empty", "light": "lightly used",
    "furnished": "furnished", "cluttered": "cluttered", "detail": "detail shot",
}
SRC_LABEL = {
    "phone": "phone", "dslr": "DSLR", "listing": "listing", "render3d": "3D render",
    "ai-gen": "AI image", "screenshot": "screenshot", "whatsapp": "WhatsApp",
}
METHOD_NAME = {
    "H-FLOOR": "floor grid", "H-CEIL": "ceiling grid", "C-VP": "calibrated camera",
    "VERT": "known vertical", None: "—",
}

uniq = [r for r in ROWS if r["n"] not in DUPES]

# ── build the rows ───────────────────────────────────────────────────────────
rows_html = []
n_measured = n_refused = n_none = n_ask = 0

for r in uniq:
    path = by_index[r["n"]]
    rel = os.path.relpath(path, SRC).replace("\\", "/")
    m = meas_by_file.get(rel)
    ex = exif_of(path)
    sha = m["sha"] if m else f"n{r['n']:02d}"

    # ── measured column ──
    if not m:
        meas_html = '<span class="none">not run</span>'
        cls = "m-none"
    elif m["refusal"]:
        n_refused += 1
        cls = "m-refused"
        meas_html = (
            f'<b class="refused">refused</b>'
            f'<em>{esc(m["imageKind"].replace("_", " "))}</em>'
        )
    elif m["lengthMm"] or m["longestRunMm"]:
        n_measured += 1
        if m["confirmRequired"]:
            n_ask += 1
        cls = "m-ok"
        if m["lengthMm"]:
            head = f'<b>{m["lengthMm"]/1000:.2f} × {m["widthMm"]/1000:.2f} m</b>'
        else:
            head = '<b class="partial">walls only</b>'
        runs = " / ".join(f"{x/1000:.2f}" for x in m["wallRunsMm"][:4])
        bits = []
        if m["ceilingMm"]:
            bits.append(f'h {m["ceilingMm"]/1000:.2f}')
        if m["bandPct"] is not None:
            bits.append(f'±{m["bandPct"]}%')
        bits.append(METHOD_NAME.get(m["method"], m["method"] or "—"))
        meas_html = (
            head
            + f'<em>{esc(" · ".join(bits))}</em>'
            + (f'<em class="runs">walls {esc(runs)} m</em>' if runs else "")
            + ('<span class="ask">confirm</span>' if m["confirmRequired"] else "")
        )
    else:
        n_none += 1
        cls = "m-none"
        meas_html = f'<b class="none">no number</b><em>{esc(m["confirmReason"][:60])}</em>'

    # ── the tool's own rulers ──
    if m and m["rulers"]:
        rl = " ".join(
            f'<span class="rul">{esc(x["label"])}'
            + (f' <i>{esc(x["modules"])}</i>' if x.get("modules") else "")
            + "</span>"
            for x in m["rulers"][:5]
        )
    else:
        rl = '<span class="rul rul-none">none found</span>'

    flags = "".join(f"<li>{esc(f)}</li>" for f in r["flags"])
    rungs = ""
    if m:
        for g in m["rungs"]:
            if g["failed"]:
                rungs += (
                    f'<tr><td class="mono">{esc(g["method"])}</td><td colspan="3" class="fail">'
                    f'{esc(g["failed"])}</td></tr>'
                )
            else:
                dims = (
                    f'{g["lengthMm"]/1000:.2f} × {g["widthMm"]/1000:.2f}'
                    if g["lengthMm"]
                    else "—"
                )
                ceil = f'{g["ceilingMm"]/1000:.2f}' if g["ceilingMm"] else "—"
                rungs += (
                    f'<tr><td class="mono">{esc(g["method"])}</td>'
                    f'<td class="mono">{dims}{"" if not g["extentPartial"] else " <i>partial</i>"}</td>'
                    f'<td class="mono">{ceil}</td>'
                    f'<td>±{g["bandPct"]}% · {esc(g["via"])}</td></tr>'
                )
    est = m["modelEstimate"] if m else None
    est_txt = (
        f'{est["lengthMm"]/1000:.2f} × {est["widthMm"]/1000:.2f} m'
        if est and est.get("lengthMm") and est.get("widthMm")
        else "—"
    )

    cam = " ".join(str(ex.get(k, "")) for k in ("Make", "Model")).strip() or "no camera EXIF"
    f35 = f'{ex["FocalLengthIn35mmFilm"]} mm eq' if ex.get("FocalLengthIn35mmFilm") else "no focal"

    rows_html.append(f"""
<details class="plate" data-sha="{esc(sha)}" data-cls="{cls}" data-state="{r['state']}">
<summary>
  <img class="th" src="{thumb_uri(path)}" alt="{esc(r['room'])}" loading="lazy">
  <span class="idx">{r['n']:02d}</span>
  <span class="who"><b>{esc(r['room'])}</b><em>{esc(rel)}</em>
    <span class="chips"><span class="chip chip-{r['state']}">{STATE_LABEL[r['state']]}</span><span class="chip chip-src">{SRC_LABEL[r['src']]}</span></span>
  </span>
  <span class="ruls">{rl}</span>
  <span class="meas {cls}">{meas_html}</span>
  <span class="truth" data-sha="{esc(sha)}">
    <span class="tin"><i>L</i><input type="text" inputmode="decimal" data-f="lengthM" placeholder="—"><s>m</s></span>
    <span class="tin"><i>W</i><input type="text" inputmode="decimal" data-f="widthM" placeholder="—"><s>m</s></span>
    <span class="tin"><i>H</i><input type="text" inputmode="decimal" data-f="ceilingM" placeholder="—"><s>m</s></span>
    <span class="err" data-err></span>
  </span>
</summary>
<div class="body">
  <div class="col">
    <h4>What it is</h4>
    <p><b>Walls</b> {r['walls']} · <b>ceiling</b> {r['ceil']} · <b>floor</b> {r['floor']} · <b>view</b> {r['view'].replace('wall',' walls').replace('1 walls','1 wall')}</p>
    <h4>Strip before restyling</h4><p>{esc(r['clean'])}</p>
    <h4>Capture</h4><p class="mono">{esc(cam)} · {esc(f35)}</p>
  </div>
  <div class="col">
    <h4>Every rung the ladder tried</h4>
    <table class="rungs"><tr><th>rung</th><th>plan</th><th>ceiling</th><th>note</th></tr>{rungs or '<tr><td colspan="4" class="fail">not run</td></tr>'}</table>
    <p class="mono small">Model's own holistic guess: {esc(est_txt)} — recorded, never used.</p>
    {f'<p class="mono small">Confirm: {esc(m["confirmReason"])}</p>' if m else ''}
    {f'<p class="mono small">Tap prompt: {esc(m["tapPrompt"])}</p>' if m and m.get("tapPrompt") else ''}
  </div>
  <div class="col"><h4>Notes from the read-through</h4><ul>{flags}</ul></div>
</div>
</details>""")

ladder_html = "".join(
    f'<div class="lad"><b>{esc(k)}</b><p>{esc(v)}</p></div>' for k, v in LADDER.items()
)

tiles = [
    (str(len(uniq)), "unique scenes", "67 files, 4 duplicate pairs collapsed"),
    (str(n_measured), "produced a number", f"{n_ask} of them ask you to confirm"),
    (str(n_refused), "refused outright", "AI images, renders and non-rooms"),
    (str(n_none), "found no ruler", "these are the honest blanks"),
]
tiles_html = "".join(f'<div class="tile"><b>{a}</b><span>{b}</span><em>{c}</em></div>' for a, b, c in tiles)

TPL = r"""<title>Room Measurement Register</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;500;600&family=Montserrat:wght@400;500;600;700&display=swap">
<style>
:root{
  --paper:#ffffff; --ground:#f2f1ee; --ink:#12151a; --ink-2:#4a5058; --ink-3:#7c8189;
  --rule:#d9d6cf; --rule-2:#e9e6e0;
  --cobalt:#0047AB; --cobalt-soft:#e7edf8;
  --dim:#B90000; --salmon:#FFE0CA; --poche:#878787;
  --ok:#15803d; --warn:#9E5E41; --field:#fbfaf8;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --paper:#15181d; --ground:#0e1114; --ink:#eceef1; --ink-2:#a8aeb6; --ink-3:#767d86;
  --rule:#2a2f36; --rule-2:#20252b;
  --cobalt:#7aa5ee; --cobalt-soft:#1b2635;
  --dim:#ff7b6e; --salmon:#4a3327; --poche:#6d737a;
  --ok:#5fbe86; --warn:#d59a77; --field:#1b1f25;
}}
:root[data-theme="dark"]{
  --paper:#15181d; --ground:#0e1114; --ink:#eceef1; --ink-2:#a8aeb6; --ink-3:#767d86;
  --rule:#2a2f36; --rule-2:#20252b;
  --cobalt:#7aa5ee; --cobalt-soft:#1b2635;
  --dim:#ff7b6e; --salmon:#4a3327; --poche:#6d737a;
  --ok:#5fbe86; --warn:#d59a77; --field:#1b1f25;
}
*{box-sizing:border-box}
body{background:var(--ground);color:var(--ink);
  font-family:Montserrat,-apple-system,"Segoe UI",sans-serif;font-size:13px;line-height:1.5;margin:0;padding:0 0 64px}
.wrap{max-width:1360px;margin:0 auto;padding:0 20px}
.kick{font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--cobalt)}
h1{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:clamp(28px,4vw,46px);
  line-height:1.05;margin:.24em 0 .18em;text-wrap:balance;letter-spacing:-.01em}
h1 em{font-style:italic;color:var(--dim)}
h4{font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:12px 0 5px}
.col h4:first-child{margin-top:0}
p{margin:0 0 10px;max-width:66ch;color:var(--ink-2)}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace}
.small{font-size:11px}
.dimline{display:flex;align-items:center;margin:26px 0 16px}
.dimline i{display:block;width:1px;height:11px;background:var(--dim);flex:none}
.dimline s{flex:1;height:1px;background:var(--dim);opacity:.5;text-decoration:none}
.dimline b{font-family:"IBM Plex Mono",monospace;font-size:9.5px;font-weight:600;letter-spacing:.16em;
  color:var(--dim);padding:0 10px;text-transform:uppercase;white-space:nowrap}
header{background:var(--paper);border-bottom:1px solid var(--rule);padding:32px 0 24px}
.lead{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:40px;align-items:end}
@media(max-width:900px){.lead{grid-template-columns:1fr;gap:20px}}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);border:1px solid var(--rule);margin-top:22px}
@media(max-width:700px){.tiles{grid-template-columns:repeat(2,1fr)}}
.tile{background:var(--paper);padding:13px 14px;display:flex;flex-direction:column;gap:2px}
.tile b{font-family:"Cormorant Garamond",serif;font-size:36px;line-height:.95;color:var(--dim);font-variant-numeric:tabular-nums}
.tile span{font-size:11px;font-weight:600}
.tile em{font-style:normal;font-size:10.5px;color:var(--ink-3);line-height:1.35}
.scoreboard{background:var(--cobalt-soft);border:1px solid var(--rule);padding:12px 14px;display:flex;
  gap:26px;flex-wrap:wrap;align-items:baseline;margin-top:1px}
.scoreboard b{font-family:"IBM Plex Mono",monospace;font-size:19px;font-weight:600;font-variant-numeric:tabular-nums}
.scoreboard span{font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.sync{font-size:10.5px;color:var(--ink-3);margin-left:auto}
.lads{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1px;background:var(--rule);border:1px solid var(--rule)}
.lad{background:var(--paper);padding:12px 13px}
.lad b{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--cobalt);display:block;margin-bottom:3px}
.lad p{font-size:11px;margin:0}
.reg{border:1px solid var(--rule);background:var(--rule);display:flex;flex-direction:column;gap:1px}
.plate{background:var(--paper)}
.plate>summary{display:grid;
  grid-template-columns:66px 24px minmax(140px,1.25fr) minmax(120px,1fr) minmax(150px,1.05fr) 268px;
  gap:14px;align-items:center;padding:8px 12px;cursor:pointer;list-style:none}
.plate>summary::-webkit-details-marker{display:none}
.plate>summary:hover{background:var(--cobalt-soft)}
@media(max-width:1120px){
  .plate>summary{grid-template-columns:66px 24px minmax(0,1fr);row-gap:9px}
  .ruls,.meas,.truth{grid-column:3/4}
}
.th{width:66px;height:50px;object-fit:cover;display:block;background:var(--ground);border:1px solid var(--rule-2)}
.idx{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--poche);font-variant-numeric:tabular-nums}
.who{display:flex;flex-direction:column;gap:3px;min-width:0}
.who b{font-size:12.5px;font-weight:600}
.who em{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:9.5px;color:var(--ink-3);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.chip{font-size:8.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:2px 5px;
  border:1px solid var(--rule);color:var(--ink-2);white-space:nowrap}
.chip-src{border-style:dashed}
.chip-empty,.chip-light{background:var(--cobalt-soft);border-color:transparent;color:var(--cobalt)}
.chip-furnished,.chip-cluttered{background:var(--salmon);border-color:transparent;color:var(--warn)}
.chip-shell,.chip-construction,.chip-detail{border-color:var(--dim);color:var(--dim)}
.ruls{display:flex;flex-wrap:wrap;gap:3px 6px}
.rul{font-family:"IBM Plex Mono",monospace;font-size:9.5px;color:var(--cobalt);border-bottom:1px solid var(--cobalt);white-space:nowrap}
.rul i{font-style:normal;color:var(--ink-3)}
.rul-none{color:var(--ink-3);border-color:var(--ink-3)}
.meas{display:flex;flex-direction:column;gap:1px;min-width:0}
.meas b{font-family:"IBM Plex Mono",monospace;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.meas em{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-2)}
.meas .runs{color:var(--ink-3)}
.meas .refused,.meas .none{color:var(--ink-3);font-size:12px}
.meas .partial{color:var(--warn)}
.ask{align-self:flex-start;margin-top:3px;font-size:8.5px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--warn);border:1px solid var(--warn);padding:1px 5px}
.truth{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;align-items:center}
.tin{display:flex;align-items:center;gap:3px;background:var(--field);border:1px solid var(--rule);padding:2px 4px}
.tin i{font-style:normal;font-size:9px;font-weight:700;color:var(--ink-3)}
.tin s{text-decoration:none;font-size:9px;color:var(--ink-3)}
.tin input{width:100%;min-width:0;border:0;background:transparent;color:var(--ink);font:600 12px "IBM Plex Mono",monospace;
  text-align:right;font-variant-numeric:tabular-nums}
.tin input:focus{outline:none}
.tin:focus-within{border-color:var(--cobalt)}
.err{grid-column:1/4;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-3);min-height:14px}
.err b{font-weight:600}
.e-good{color:var(--ok)}.e-mid{color:var(--warn)}.e-bad{color:var(--dim)}
.body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr);gap:24px;
  padding:4px 12px 16px 92px;border-top:1px dashed var(--rule)}
@media(max-width:900px){.body{grid-template-columns:1fr;padding-left:12px}}
.body p{font-size:11.5px;margin:0 0 4px}
.body ul{margin:0;padding-left:15px}
.body li{font-size:11.5px;color:var(--ink-2);margin-bottom:3px}
table.rungs{border-collapse:collapse;width:100%;font-size:11px}
table.rungs th{text-align:left;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);
  font-weight:700;padding:0 8px 3px 0}
table.rungs td{padding:2px 8px 2px 0;border-top:1px solid var(--rule-2);color:var(--ink-2);vertical-align:top}
table.rungs .fail{color:var(--ink-3);font-style:italic}
table.rungs i{font-style:normal;color:var(--warn);font-size:9.5px}
footer{margin-top:26px;font-size:10.5px;color:var(--ink-3)}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>

<header><div class="wrap">
  <div class="lead">
    <div>
      <div class="kick">Designature Studio · measurement bench</div>
      <h1>What the tool measured,<br>and <em>how wrong it was</em></h1>
      <p>Every photograph in the archive run through the real pipeline: a vision pass locates
      rulers and wall lines, and our own projective geometry turns those points into millimetres.
      No dimension is ever asked of the model. Type your real numbers on the right and the error
      appears — that is the only thing that turns this from a judgement into a score.</p>
    </div>
    <div>
      <div class="tiles">__TILES__</div>
      <div class="scoreboard">
        <span>Scored</span><b id="s-count">0</b>
        <span>Median error</span><b id="s-median">—</b>
        <span>Within ±5%</span><b id="s-good">—</b>
        <span class="sync" id="s-sync">checking storage…</span>
      </div>
    </div>
  </div>
</div></header>

<div class="wrap">
  <div class="dimline"><i></i><s></s><b>The ladder — first rung that applies, wins</b><s></s><i></i></div>
  <div class="lads">__LADDER__</div>

  <div class="dimline"><i></i><s></s><b>The register</b><s></s><i></i></div>
  <p style="margin-bottom:12px">Open a row for every rung the ladder tried, including the ones that failed
  and why. <b>L</b> and <b>W</b> are the room's two plan dimensions, <b>H</b> the ceiling — in metres.</p>
  <div class="reg" id="reg">__ROWS__</div>

  <footer>Photos: <span class="mono">E:\Business\Claude\_Inputs\source-rooms</span> ·
  pipeline: <span class="mono">services/measure/</span> on branch <span class="mono">claude/room-measurement</span> ·
  bands are expected error, not measured error — that is what your numbers are for.</footer>
</div>

<script>
(function(){
  var FIELDS=["lengthM","widthM","ceilingM"];
  var truth={}, dbRef=null, sync=document.getElementById("s-sync");

  function num(v){ var n=parseFloat(String(v).replace(",",".")); return isFinite(n)&&n>0?n:null; }

  function measuredOf(plate){
    var m=plate.querySelector(".meas b");
    if(!m||!/×/.test(m.textContent)) return null;
    var parts=m.textContent.replace(/\s*m\s*$/,"").split("×").map(function(s){return parseFloat(s);});
    var h=null, em=plate.querySelector(".meas em");
    if(em){ var hm=em.textContent.match(/h\s([\d.]+)/); if(hm) h=parseFloat(hm[1]); }
    return {L:parts[0], W:parts[1], H:h};
  }

  function pct(a,b){ return Math.abs(a-b)/b*100; }

  function renderRow(plate){
    var sha=plate.dataset.sha, t=truth[sha]||{}, box=plate.querySelector("[data-err]");
    plate.querySelectorAll(".truth input").forEach(function(inp){
      if(document.activeElement!==inp) inp.value = t[inp.dataset.f]==null ? "" : t[inp.dataset.f];
    });
    var mm=measuredOf(plate), out=[], worst=0;
    if(mm){
      // The tool does not know which of its two plan numbers is your L; compare
      // the pair both ways round and report the better pairing.
      var tl=num(t.lengthM), tw=num(t.widthM), th=num(t.ceilingM);
      if(tl&&tw&&mm.L&&mm.W){
        var direct=(pct(mm.L,tl)+pct(mm.W,tw))/2, swapped=(pct(mm.L,tw)+pct(mm.W,tl))/2;
        var e=Math.min(direct,swapped); worst=Math.max(worst,e);
        out.push("plan "+e.toFixed(0)+"%");
      } else if(tl&&mm.L){ var e1=pct(mm.L,tl); worst=Math.max(worst,e1); out.push("L "+e1.toFixed(0)+"%"); }
      if(th&&mm.H){ var e2=pct(mm.H,th); worst=Math.max(worst,e2); out.push("h "+e2.toFixed(0)+"%"); }
    }
    box.className="err "+(out.length? (worst<=5?"e-good":worst<=15?"e-mid":"e-bad") : "");
    box.innerHTML = out.length ? "off by <b>"+out.join(" · ")+"</b>" : "";
  }

  function scoreboard(){
    var errs=[];
    document.querySelectorAll(".plate").forEach(function(plate){
      var b=plate.querySelector("[data-err] b");
      if(!b) return;
      var m=b.textContent.match(/([\d.]+)%/g);
      if(m) errs.push(Math.max.apply(null,m.map(parseFloat)));
    });
    document.getElementById("s-count").textContent=errs.length;
    if(!errs.length){ document.getElementById("s-median").textContent="—";
      document.getElementById("s-good").textContent="—"; return; }
    errs.sort(function(a,b){return a-b;});
    var mid=errs.length%2?errs[(errs.length-1)/2]:(errs[errs.length/2-1]+errs[errs.length/2])/2;
    document.getElementById("s-median").textContent=mid.toFixed(0)+"%";
    document.getElementById("s-good").textContent=errs.filter(function(e){return e<=5;}).length+"/"+errs.length;
  }

  function renderAll(){ document.querySelectorAll(".plate").forEach(renderRow); scoreboard(); }

  document.querySelectorAll(".truth").forEach(function(cell){
    cell.addEventListener("click", function(e){ e.stopPropagation(); });
    cell.querySelectorAll("input").forEach(function(inp){
      inp.addEventListener("keydown", function(e){ if(e.key==="Enter") inp.blur(); });
      inp.addEventListener("input", function(){
        var sha=cell.dataset.sha;
        truth[sha]=truth[sha]||{};
        truth[sha][inp.dataset.f]=inp.value.trim();
        renderRow(cell.closest(".plate")); scoreboard(); save(sha);
      });
    });
  });

  var timers={};
  function save(sha){
    if(!dbRef) return;
    clearTimeout(timers[sha]);
    timers[sha]=setTimeout(function(){
      var body={updatedAt:new Date().toISOString()};
      FIELDS.forEach(function(f){ body[f]=(truth[sha]||{})[f]||""; });
      dbRef.doc("truth/"+sha).set(body).then(function(){
        sync.textContent="saved "+new Date().toLocaleTimeString();
      }).catch(function(err){ sync.textContent="not saved ("+(err&&err.code||"error")+")"; });
    }, 600);
  }

  renderAll();

  if(window.claude&&claude.use){
    claude.use("db").then(function(db){
      if(!db){ sync.textContent="storage unavailable — numbers stay in this tab only"; return; }
      dbRef=db;
      db.collection("truth").onSnapshot(function(snap){
        snap.docs.forEach(function(d){
          var v=d.data()||{}, cur=truth[d.id]||{};
          FIELDS.forEach(function(f){ if(v[f]!=null&&!cur[f]) cur[f]=v[f]; });
          truth[d.id]=cur;
        });
        renderAll();
        sync.textContent="synced";
      }, function(err){ sync.textContent="sync stopped ("+(err&&err.code||"error")+")"; });
    });
  } else { sync.textContent="storage unavailable — numbers stay in this tab only"; }
})();
</script>
"""

out = (
    TPL.replace("__TILES__", tiles_html)
    .replace("__LADDER__", ladder_html)
    .replace("__ROWS__", "\n".join(rows_html))
)
with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(out)
print(
    f"wrote {OUT}  {round(len(out.encode())/1024)} KB — "
    f"{n_measured} measured, {n_refused} refused, {n_none} no ruler, {n_ask} ask"
)
