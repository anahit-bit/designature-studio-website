import json
DATA = json.load(open("/tmp/claude-0/-home-user-designature-studio-website/ff431010-9c81-55a6-96d3-cb1a73eff886/scratchpad/competitors_short.json"))
OUT = "/home/user/designature-studio-website/docs/competitor-intel/competitor-report.html"

# group display order (strategic priority)
GORDER = [
 "Hybrid AI + Human e-design",
 "AI redesign + shoppable (the wedge)",
 "Pure AI redesign tool",
 "Mobile app",
 "Retailer / shop-the-look commerce",
 "Retailer free design service",
 "AI virtual staging",
 "Pro / design software",
 "Regional / emerging",
 "Horizontal generative AI",
 "Adjacent",
 "Defunct / precedent",
]
total=len(DATA)
direct=sum(1 for r in DATA if r["close"]>=4)
wedge=sum(1 for r in DATA if r["group"]=="AI redesign + shoppable (the wedge)")
defunct=sum(1 for r in DATA if r["close"]==0)

payload=json.dumps(DATA,ensure_ascii=False)
gorder=json.dumps(GORDER,ensure_ascii=False)

HTML = r"""<title>Designature Studio — AI Interior Design Competitor Map (Q3 2026)</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{
  --paper:#F3F1EB; --surface:#FBFAF6; --surface-2:#EFECE4;
  --ink:#1C1A16; --ink-2:#4B473F; --muted:#78736A; --line:#DED9CE; --line-2:#CBC5B7;
  --accent:#0A3A82; --accent-soft:#0a3a8214;
  --h5:#A8422A; --h4:#C57A4A; --h3:#C6A24A; --h2:#7F9A82; --h1:#A7A499; --h0:#3C3833;
  --h5-ink:#fff; --h4-ink:#fff; --h3-ink:#3a2f10; --h2-ink:#17301c; --h1-ink:#2b291f; --h0-ink:#eee;
  --shadow:0 1px 2px rgba(28,26,22,.05), 0 8px 24px -12px rgba(28,26,22,.18);
  --radius:3px;
  --serif:"Cormorant Garamond","Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  --sans:"Montserrat",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#141310; --surface:#1D1B16; --surface-2:#242118;
  --ink:#EDE9DF; --ink-2:#C4BEB1; --muted:#928C7F; --line:#302C24; --line-2:#3C382E;
  --accent:#8BB0EE; --accent-soft:#8bb0ee1f;
  --h5:#C25A3E; --h4:#D08A57; --h3:#CDAA57; --h2:#89A78C; --h1:#9a978c; --h0:#57524a;
  --h5-ink:#160c08; --h4-ink:#1a0f06; --h3-ink:#1c1607; --h2-ink:#0e1c11; --h1-ink:#16150f; --h0-ink:#d9d5cc;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 10px 30px -14px rgba(0,0,0,.6);
}}
:root[data-theme="dark"]{
  --paper:#141310; --surface:#1D1B16; --surface-2:#242118;
  --ink:#EDE9DF; --ink-2:#C4BEB1; --muted:#928C7F; --line:#302C24; --line-2:#3C382E;
  --accent:#8BB0EE; --accent-soft:#8bb0ee1f;
  --h5:#C25A3E; --h4:#D08A57; --h3:#CDAA57; --h2:#89A78C; --h1:#9a978c; --h0:#57524a;
  --h5-ink:#160c08; --h4-ink:#1a0f06; --h3-ink:#1c1607; --h2-ink:#0e1c11; --h1-ink:#16150f; --h0-ink:#d9d5cc;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 10px 30px -14px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wrap{max-width:1180px;margin:0 auto;padding:0 22px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
h1,h2,h3{margin:0;font-weight:600}
.eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:600}
.tnum{font-variant-numeric:tabular-nums}

/* masthead */
header.top{border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--surface),var(--paper))}
.mast{padding:38px 0 30px;display:flex;flex-direction:column;gap:16px}
.mast-row{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap}
h1.title{font-family:var(--serif);font-weight:600;font-size:clamp(30px,5vw,52px);line-height:1.02;
  letter-spacing:-.02em;text-wrap:balance;max-width:16ch}
.title em{font-style:italic;color:var(--accent)}
.lede{max-width:56ch;color:var(--ink-2);font-size:15.5px}
.themetoggle{border:1px solid var(--line-2);background:var(--surface);color:var(--ink-2);
  font-family:var(--sans);font-size:11px;letter-spacing:.12em;text-transform:uppercase;
  padding:8px 12px;border-radius:100px;cursor:pointer;white-space:nowrap}
.themetoggle:hover{border-color:var(--accent);color:var(--accent)}

/* stat band */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;margin-top:4px}
.stat{background:var(--surface);padding:16px 18px}
.stat .n{font-family:var(--serif);font-size:38px;line-height:1;font-weight:600;letter-spacing:-.01em}
.stat .l{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:7px}
.stat.hot .n{color:var(--h5)}

/* benchmark + thesis */
.band{display:grid;grid-template-columns:1.05fr 1fr;gap:20px;margin:26px 0 6px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px}
.card.you{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.card h3{font-family:var(--serif);font-size:23px;font-weight:600;letter-spacing:-.01em;margin-bottom:4px}
.card .k{font-size:12.5px;color:var(--muted);margin-bottom:14px}
.tiers{display:flex;gap:8px;flex-wrap:wrap}
.tier{border:1px solid var(--line-2);border-radius:2px;padding:8px 11px;min-width:70px}
.tier .p{font-family:var(--serif);font-size:20px;font-weight:600}
.tier .t{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:2px}
.card.thesis{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))}
.card.thesis p{margin:0 0 10px;font-size:14px;color:var(--ink-2)}
.card.thesis p:last-child{margin-bottom:0}
.card.thesis strong{color:var(--ink)}
.card.thesis .lab{font-family:var(--serif);font-size:23px;color:var(--ink);margin-bottom:8px}

/* controls */
.controls{position:sticky;top:0;z-index:20;background:var(--paper);
  border-bottom:1px solid var(--line);padding:14px 0;margin-top:22px}
.controls .wrap{display:flex;flex-direction:column;gap:12px}
.searchrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#q{flex:1;min-width:200px;font-family:var(--sans);font-size:14px;color:var(--ink);
  background:var(--surface);border:1px solid var(--line-2);border-radius:100px;padding:11px 16px}
#q:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
select{font-family:var(--sans);font-size:13px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line-2);border-radius:100px;padding:10px 14px;cursor:pointer}
.chips{display:flex;gap:7px;flex-wrap:wrap}
.chip{font-size:12px;letter-spacing:.02em;border:1px solid var(--line-2);background:var(--surface);
  color:var(--ink-2);padding:6px 12px;border-radius:100px;cursor:pointer;white-space:nowrap;
  display:inline-flex;gap:7px;align-items:center;transition:background .12s,border-color .12s}
.chip:hover{border-color:var(--accent)}
.chip .c{font-variant-numeric:tabular-nums;color:var(--muted);font-size:11px}
.chip[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.chip[aria-pressed="true"] .c{color:var(--surface);opacity:.7}
.countline{font-size:12.5px;color:var(--muted)}
.countline b{color:var(--ink);font-variant-numeric:tabular-nums}

/* list */
main{padding:20px 0 40px}
.grouphead{display:flex;align-items:baseline;gap:12px;margin:26px 0 12px;padding-bottom:8px;
  border-bottom:1px solid var(--line-2)}
.grouphead h2{font-family:var(--serif);font-size:26px;font-weight:600;letter-spacing:-.01em}
.grouphead .gc{font-size:12px;color:var(--muted);letter-spacing:.04em}
.grouphead .gd{margin-left:auto;font-size:12px;color:var(--muted);max-width:44ch;text-align:right}

.row{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--hc,var(--line-2));
  border-radius:var(--radius);margin-bottom:8px;overflow:hidden}
.row.dead{opacity:.72}
.rhead{display:grid;grid-template-columns:26px 1.7fr 1.5fr 1fr auto;gap:14px;align-items:center;
  padding:13px 16px;cursor:pointer;width:100%;text-align:left;background:none;border:0;font:inherit;color:inherit}
.rhead:hover{background:var(--surface-2)}
.rhead:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.heat{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;
  font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;background:var(--hc);color:var(--hci)}
.rname{font-weight:600;font-size:14.5px}
.rname .hq{display:block;font-weight:500;font-size:11.5px;color:var(--muted);letter-spacing:.01em;margin-top:1px}
.rwhat{font-size:13px;color:var(--ink-2)}
.rprice{font-size:12.5px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.rstatus{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.chev{width:16px;height:16px;color:var(--muted);transition:transform .2s;flex-shrink:0}
.row[open] .chev{transform:rotate(90deg)}
.rbody{display:none;padding:2px 16px 18px 16px;border-top:1px solid var(--line)}
.row[open] .rbody{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.rbody .box .bh{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.rbody .box p{margin:0;font-size:13px;color:var(--ink-2);line-height:1.5}
.rbody .full{grid-column:1/-1;display:flex;gap:16px;flex-wrap:wrap;align-items:center;
  padding-top:12px;border-top:1px dashed var(--line-2);font-size:12px;color:var(--muted)}
.rbody .full a{font-weight:600}
.gaps .bh{color:var(--h5)}
.empty{text-align:center;color:var(--muted);padding:50px 0;font-size:14px}

footer{border-top:1px solid var(--line);background:var(--surface);padding:28px 0 40px;margin-top:20px}
footer .cols{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:24px}
footer h4{font-family:var(--serif);font-size:18px;font-weight:600;margin:0 0 8px}
footer p,footer li{font-size:12.5px;color:var(--ink-2);line-height:1.6}
footer ul{margin:0;padding-left:16px}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}
.legend span{display:inline-flex;gap:6px;align-items:center;font-size:11.5px;color:var(--muted)}
.legend i{width:12px;height:12px;border-radius:3px;display:inline-block}
.fine{font-size:11px;color:var(--muted);margin-top:22px;padding-top:14px;border-top:1px solid var(--line)}

@media (max-width:860px){
  .band{grid-template-columns:1fr}
  .rhead{grid-template-columns:24px 1fr auto}
  .rhead .rwhat,.rhead .rprice{display:none}
  .row[open] .rbody{grid-template-columns:1fr}
  footer .cols{grid-template-columns:1fr}
  .grouphead .gd{display:none}
}
@media (max-width:520px){ .stats{grid-template-columns:repeat(2,1fr)} }
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<header class="top"><div class="wrap mast">
  <div class="mast-row">
    <div>
      <div class="eyebrow">Designature Studio · Competitive Intelligence · Q3 2026</div>
      <h1 class="title">The AI interior&nbsp;design field, <em>mapped.</em></h1>
    </div>
    <button class="themetoggle" id="themeBtn" type="button" aria-label="Toggle color theme">◐ Theme</button>
  </div>
  <p class="lede">Every player circling what you do — from one-click AI redesign toys to human-designer
    services and retailer shopping tools. Sorted by how directly they compete with the Designature model:
    <strong>free AI concepts → a shoppable list → a human designer.</strong> Data as of August 2026.</p>
  <div class="stats">
    <div class="stat"><div class="n tnum">__TOTAL__</div><div class="l">Competitors tracked</div></div>
    <div class="stat hot"><div class="n tnum">__DIRECT__</div><div class="l">Direct threats (score 4–5)</div></div>
    <div class="stat"><div class="n tnum">__WEDGE__</div><div class="l">Head-to-head on shoppable AI</div></div>
    <div class="stat"><div class="n tnum">__DEFUNCT__</div><div class="l">Cautionary shutdowns</div></div>
  </div>
</div></header>

<div class="wrap">
  <div class="band">
    <div class="card you">
      <h3>You — Designature Studio</h3>
      <div class="k">Yerevan + worldwide remote · AI Vision · Style Quiz · Shopping List · human design</div>
      <div class="tiers">
        <div class="tier"><div class="p">$0</div><div class="t">Explore</div></div>
        <div class="tier"><div class="p">$19</div><div class="t">Design</div></div>
        <div class="tier"><div class="p">$49</div><div class="t">Studio</div></div>
        <div class="tier"><div class="p">$99</div><div class="t">Consult</div></div>
      </div>
    </div>
    <div class="card thesis">
      <div class="lab">Where the white space is</div>
      <p><strong>Shoppable + human, at AI prices.</strong> Rivals that nail shoppable&nbsp;+&nbsp;human
        (Spacejoy, Havenly, Decorilla) start at $199–$999. Rivals that nail shoppable&nbsp;+&nbsp;cheap
        (REimagine, MeltFlex, MyRoomDesigner) are AI-only. Your $0/$19/$49 + $99 consult sits in an
        under-occupied middle.</p>
      <p><strong>Bilingual CIS + remote.</strong> No verified competitor owns Armenian/Russian/English,
        productized, remote-worldwide, AI + human. The Style Quiz is nearly unique as an onboarding moat.</p>
    </div>
  </div>
</div>

<div class="controls"><div class="wrap">
  <div class="searchrow">
    <input id="q" type="search" placeholder="Search 96 competitors — name, pricing, feature, country…" aria-label="Search competitors">
    <select id="sort" aria-label="Sort order">
      <option value="close">Sort: Closest threat first</option>
      <option value="name">Sort: A–Z</option>
      <option value="price">Sort: by group</option>
    </select>
  </div>
  <div class="chips" id="chips"></div>
  <div class="countline">Showing <b id="shown">96</b> of <b>96</b> · <span id="dirshown">14</span> direct threats in view</div>
</div></div>

<main><div class="wrap" id="list"></div></main>

<footer><div class="wrap">
  <div class="cols">
    <div>
      <h4>How to read this</h4>
      <p>Closeness scores how directly each competitor overlaps the full Designature model
      (AI concept + shoppable list + human designer), not how big or good they are. A powerful
      pro CAD tool can score low; a tiny shoppable-AI app scores high.</p>
      <div class="legend">
        <span><i style="background:var(--h5)"></i>5 direct</span>
        <span><i style="background:var(--h4)"></i>4 strong</span>
        <span><i style="background:var(--h3)"></i>3 partial</span>
        <span><i style="background:var(--h2)"></i>2 adjacent</span>
        <span><i style="background:var(--h1)"></i>1 distant</span>
        <span><i style="background:var(--h0)"></i>0 defunct</span>
      </div>
    </div>
    <div>
      <h4>The five to watch</h4>
      <ul>
        <li><strong>REimagine Home</strong> — AI concept → one-click buy, $14–$99</li>
        <li><strong>MeltFlex AI</strong> — real priced furniture in the render</li>
        <li><strong>MyRoomDesigner.ai</strong> — closest feature clone (no human)</li>
        <li><strong>Havenly</strong> — the hybrid consolidator, $199+</li>
        <li><strong>Decorilla</strong> — your exact model, now in Europe</li>
      </ul>
    </div>
    <div>
      <h4>Refresh cadence</h4>
      <p>Re-run every quarter across the same six market segments. The dataset lives in git
      (<code>docs/competitor-intel/</code>) so each quarter diffs against the last — new entrants,
      price moves, and shutdowns show up as changes.</p>
    </div>
  </div>
  <p class="fine">Prices and features are accurate-as-of mid-2026 snapshots; standalone AI-tool
  pricing shifts frequently (credit-model changes, weekly-sub funnels). Verify before quoting in
  sales or marketing. Full detail + machine-readable CSV/XLSX alongside this file.</p>
</div></footer>

<script>
const DATA=__PAYLOAD__;
const GORDER=__GORDER__;
const GDESC={
 "Hybrid AI + Human e-design":"Your model: AI + a real designer. The closest and most dangerous.",
 "AI redesign + shoppable (the wedge)":"They also turn a concept into a buy-list — head-to-head on your edge.",
 "Pure AI redesign tool":"Photo in, restyle out. Commoditizing fast on price.",
 "Mobile app":"App-store-first, weekly-sub funnels, retailer AR.",
 "Retailer / shop-the-look commerce":"Free but catalog-locked to one store's SKUs.",
 "Retailer free design service":"Free human help, monetized through furniture sales.",
 "AI virtual staging":"Real-estate listing tools; converging toward shoppability.",
 "Pro / design software":"Tools designers build with — mostly not consumer services.",
 "Regional / emerging":"Non-US and newer players, incl. your geographic neighborhood.",
 "Horizontal generative AI":"General image AIs used as a DIY substitute.",
 "Adjacent":"Nearby categories, not direct competitors.",
 "Defunct / precedent":"Dead or pivoted — the graveyard is the warning.",
};
const HC={5:'--h5',4:'--h4',3:'--h3',2:'--h2',1:'--h1',0:'--h0'};
const HCI={5:'--h5-ink',4:'--h4-ink',3:'--h3-ink',2:'--h2-ink',1:'--h1-ink',0:'--h0-ink'};
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const active=new Set();
let sortMode='close';

const chipsEl=document.getElementById('chips');
const counts={}; DATA.forEach(d=>counts[d.group]=(counts[d.group]||0)+1);
GORDER.filter(g=>counts[g]).forEach(g=>{
  const b=document.createElement('button');
  b.className='chip';b.setAttribute('aria-pressed','false');b.dataset.g=g;
  b.innerHTML=esc(g)+' <span class="c">'+counts[g]+'</span>';
  b.onclick=()=>{active.has(g)?active.delete(g):active.add(g);
    b.setAttribute('aria-pressed',active.has(g));render();};
  chipsEl.appendChild(b);
});

document.getElementById('q').addEventListener('input',render);
document.getElementById('sort').addEventListener('change',e=>{sortMode=e.target.value;render();});

function url(u){if(!u||u==='(dead)')return null;let f=u.split(';')[0].trim();
  return f.startsWith('http')?f:'https://'+f;}

function render(){
  const q=document.getElementById('q').value.trim().toLowerCase();
  let rows=DATA.filter(d=>{
    if(active.size&&!active.has(d.group))return false;
    if(q){const h=(d.name+' '+d.hq+' '+d.what+' '+d.price+' '+d.covers+' '+d.gaps+' '+d.group).toLowerCase();
      if(!h.includes(q))return false;}
    return true;});
  const list=document.getElementById('list');list.innerHTML='';
  document.getElementById('shown').textContent=rows.length;
  document.getElementById('dirshown').textContent=rows.filter(r=>r.close>=4).length;
  if(!rows.length){list.innerHTML='<p class="empty">No competitors match. Try a broader search or clear filters.</p>';return;}

  if(sortMode==='name')rows.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sortMode==='close')rows.sort((a,b)=>b.close-a.close||a.name.localeCompare(b.name));

  const grouped=(sortMode!=='name');
  if(!grouped){rows.forEach(r=>list.appendChild(rowEl(r)));return;}
  const by={};rows.forEach(r=>(by[r.group]=by[r.group]||[]).push(r));
  const order=(sortMode==='close')?rankGroups(by):GORDER;
  order.filter(g=>by[g]).forEach(g=>{
    const gs=by[g].sort((a,b)=>b.close-a.close||a.name.localeCompare(b.name));
    const gh=document.createElement('div');gh.className='grouphead';
    gh.innerHTML='<h2>'+esc(g)+'</h2><span class="gc tnum">'+gs.length+'</span>'+
      '<span class="gd">'+esc(GDESC[g]||'')+'</span>';
    list.appendChild(gh);
    gs.forEach(r=>list.appendChild(rowEl(r)));
  });
}
function rankGroups(by){return Object.keys(by).sort((a,b)=>{
  const m=g=>Math.max(...by[g].map(r=>r.close));
  return m(b)-m(a)||GORDER.indexOf(a)-GORDER.indexOf(b);});}

function rowEl(d){
  const row=document.createElement('div');row.className='row'+(d.close===0?' dead':'');
  row.style.setProperty('--hc','var('+HC[d.close]+')');
  row.style.setProperty('--hci','var('+HCI[d.close]+')');
  const u=url(d.url);
  const head=document.createElement('button');head.className='rhead';head.type='button';
  head.setAttribute('aria-expanded','false');
  head.innerHTML=
    '<span class="heat" title="Closeness '+d.close+'/5">'+d.close+'</span>'+
    '<span class="rname">'+esc(d.name)+'<span class="hq">'+esc(d.hq)+'</span></span>'+
    '<span class="rwhat">'+esc(d.what)+'</span>'+
    '<span class="rprice">'+esc(d.price)+'</span>'+
    '<span style="display:flex;gap:10px;align-items:center;justify-content:flex-end">'+
      '<span class="rstatus">'+esc(d.status)+'</span>'+
      '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 4l4 4-4 4"/></svg>'+
    '</span>';
  const body=document.createElement('div');body.className='rbody';
  body.innerHTML=
    '<div class="box"><div class="bh">Covers</div><p>'+esc(d.covers)+'</p></div>'+
    '<div class="box gaps"><div class="bh">Gaps / doesn\'t cover</div><p>'+esc(d.gaps)+'</p></div>'+
    '<div class="full"><span>'+esc(d.group)+'</span><span>·</span><span>'+esc(d.what)+'</span>'+
      (u?'<span>·</span><a href="'+u+'" target="_blank" rel="noopener">Visit '+esc(d.url.split(';')[0])+' ↗</a>':'')+'</div>';
  head.onclick=()=>{const o=row.hasAttribute('open');
    if(o){row.removeAttribute('open');head.setAttribute('aria-expanded','false');}
    else{row.setAttribute('open','');head.setAttribute('aria-expanded','true');}};
  row.appendChild(head);row.appendChild(body);return row;
}

// theme toggle (cycles light/dark, overriding system)
const root=document.documentElement;
document.getElementById('themeBtn').onclick=()=>{
  const cur=root.getAttribute('data-theme');
  const sysDark=matchMedia('(prefers-color-scheme:dark)').matches;
  const now=cur||(sysDark?'dark':'light');
  root.setAttribute('data-theme',now==='dark'?'light':'dark');
};
render();
</script>
"""
HTML=(HTML.replace("__PAYLOAD__",payload).replace("__GORDER__",gorder)
      .replace("__TOTAL__",str(total)).replace("__DIRECT__",str(direct))
      .replace("__WEDGE__",str(wedge)).replace("__DEFUNCT__",str(defunct)))
open(OUT,"w").write(HTML)
print("wrote",OUT,len(HTML),"bytes; total",total,"direct",direct,"wedge",wedge,"defunct",defunct)
