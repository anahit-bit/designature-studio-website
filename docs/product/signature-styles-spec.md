# Product spec — Signature Looks (designer-style presets for AI Vision)

*Designature Studio · Aug 2026 · owner idea, captured 27 Aug. Pairs with `designer-checkpoints-spec.md`.*

## Why

Today AI Vision offers 13 **generic** styles (Japandi, Warm Contemporary, Mid-Century…). Every
competitor offers the same list — MeltFlex, REimagine, MyRoomDesigner all ship the identical
taxonomy, because they all prompt the same models with the same style words.

The thing people actually search for is not a taxonomy word. It is a **person**:
*"Studio McGee style living room"*, *"how to get the Joanna Gaines look"*, *"Amber Interiors dupe"*.
Those are millions of Pinterest saves and a whole dupe economy — people who want a specific
designer's eye but cannot pay a $20–60k project fee or wait 6–9 months for one.

**Signature Looks** is the answer: alongside the 13 generic styles, a second shelf of ~15
*designer-grade signature looks* — each one a deeply researched style DNA (US + UK designers whose
work people copy), rendered on the client's own room. Nobody in the AI-interiors category has this.
It is the strongest single differentiator we have found, and it compounds with the human layer:
**pick the look you love, then have a real designer sign off on it** (see the checkpoints spec).

## What already exists in our codebase (important)

This is mostly a **content + packaging** job, not an engine build.

- **Preset briefs already drive generation.** `services/aiVision/stylePresets.ts` holds `STYLE_BRIEFS`
  — a 7-section brief per style (palette / materials / furniture character / lighting / walls /
  decor / mood). A preset skips the Gemini extraction call entirely and goes straight into
  `buildGenerationPrompt()`. **Adding a look costs one string, and zero runtime API cost.**
- **Room-program enforcement already exists** (`ROOM_PROGRAM_RULES` in `promptTemplates.ts`), so a
  signature look never has to fight the room type — it only supplies the *look*.
- **The chip UI already exists**: `VISION_STYLES_FULL` in `VisionExperience.tsx` + display-name →
  key mapping in `STYLE_NAME_TO_PRESET`.
- **Quiz → style mapping exists** (`quizResult`, `src/data/quizImageWeights.ts`) and can point at a
  Signature Look as its outcome.
- **Paid gating exists** (`isPaid`, `generationsLeft`, tiers `design` / `studio`).

**Gap to build:** the briefs themselves (the real work), a second-shelf picker UI, the legal naming
decision below, and per-look SEO pages.

## The naming decision (read this before building)

Designer *styles* are not protectable — you cannot own "warm modern farmhouse". Designer **names and
studio names are trademarks** ("Studio McGee", "Magnolia", "Jungalow" are registered), and putting
one on a paid product button implies endorsement (US Lanham Act §43(a) false-endorsement, plus
right-of-publicity in states like California and Texas). Editorial reference in an article is far
safer than a product label; a purchase button carrying the name is the risky end.

Three routes, and we can run them in this order:

- **Route A — Archetype names (ship now, default).** The product UI ships descriptive archetype
  names ("Heritage Farmhouse", "California Collected"), each with editorial copy and a real,
  distinctive DNA. Designer names appear only in *editorial* SEO content and internal research
  notes, with a clear "independent, not affiliated with or endorsed by" line. Zero blocking risk,
  keeps 90% of the value — the *look* is what the client wants.
- **Route B — Licensed names (the moat).** Sign real designers to a named look with a revenue share
  ("Signature Look by ___"). Start with designers who need distribution, not the household names:
  strong mid-tier US/UK designers with 20–200k followers who would take reach + a cut. One signed
  name makes the whole shelf legitimate and is a PR story on its own.
- **Route C — House signatures (free, immediate).** Anahit's own signature looks, and later a look
  per Designature portfolio project ("Featherlight", "Still Waters", "Blue Haven" already exist as
  published projects with real photography). Honest, ownable, and it markets the studio.

**Recommendation: ship A + C in V1, open B conversations in parallel.** Do not ship real designer
names on product buttons before a signed agreement.

## The roster (15 looks — research targets and their archetype labels)

US, in rough order of search demand:

| # | Reference (internal) | Ship label (Route A) | The DNA in one line |
|---|---|---|---|
| 1 | Studio McGee | **Quiet Light Transitional** | Warm-white walls, white oak, black window frames, layered neutrals, brass, oversized art, styled-but-calm surfaces |
| 2 | Joanna Gaines / Magnolia | **Heritage Farmhouse** | Black + cream, natural beams, vintage runners, apron sinks, handmade ceramics, greenery, European-country warmth |
| 3 | Amber Lewis / Amber Interiors | **California Collected** | Plaster walls, vintage Turkish rugs, bouclé, ochre + rust accents, imperfect texture, "collected not decorated" |
| 4 | Nate Berkus & Jeremiah Brent | **Layered Classic** | Symmetry with soul — vintage brass, travel objects, sculptural silhouettes, warm neutral envelope |
| 5 | Kelly Wearstler | **Sculpted Glamour** | Bold sculptural forms, stone + brass, saturated jewel accents, high-contrast pattern mixing |
| 6 | Athena Calderone | **Plaster & Patina** | Tonal monochrome warmth, travertine, curves, sculptural minimalism with age |
| 7 | Justina Blakeney | **Global Botanical** | Plants as architecture, saturated pattern, global craft, joyful density |
| 8 | Leanne Ford | **Raw White** | White-on-white with raw texture, plaster, vintage industrial, moody quiet |
| 9 | Marie Flanigan | **Architectural Calm** | Custom millwork, natural light, restrained palette, quiet luxury |
| 10 | Jean Stoffer | **Heirloom Modern** | Classic kitchens done modern — colored cabinetry, unlacquered brass, marble, timeless proportion |

UK:

| # | Reference (internal) | Ship label (Route A) | The DNA in one line |
|---|---|---|---|
| 11 | Kelly Hoppen | **East–West Neutral** | Taupe/oatmeal discipline, strict symmetry, texture layering, dark timber |
| 12 | Abigail Ahern | **Dark Romantic** | Inky walls, moody drama, faux botanicals, deep layered texture |
| 13 | Beata Heuman | **Whimsy Modern** | Playful colour, custom joinery, quirky retro-referential details |
| 14 | Rita Konig | **English Comfort** | Unfussy English country — chintz done modern, layered, lived-in |
| 15 | Ilse Crawford | **Warm Human Modernism** | Human-centred materials, cork/leather/wool, low warm light, nothing precious |

Selection rule: every look must be **visually distinguishable from the other 14 and from the 13
generic styles in a blind render test** (below). A look that renders like an existing preset gets
cut — a fake shelf is worse than a short one.

## Extended brief format (the one engine change)

Generic styles use 7 sections. A signature look needs two more, because what makes a designer
recognisable is a handful of repeated moves and an equally strong list of refusals:

```
1–7. (existing sections: palette, materials, furniture character, lighting,
      walls & ceiling, decor & styling, overall mood)
8.  SIGNATURE MOVES — the 3–5 recognisable, repeatable moves that make this look
    identifiable in a photograph (e.g. "black-framed interior glazing", "one
    oversized abstract canvas leaning, never hung", "vintage rug over sisal").
9.  NEVER — what this designer does not do. The negative list is what stops every
    look from collapsing into generic "warm modern" once the model interpolates.
```

Sections 8–9 append after the brief and before the room program in `buildGenerationPrompt()`, at the
same authority level as the existing architectural constraints.

**Research method per look** (2–3 h each): 30–50 published photos across ≥5 projects → extract
palette hex values, repeated materials, furniture silhouettes, lighting fixtures, styling habits →
write sections 1–9 → render on 3 fixed test rooms → compare against the reference set → iterate once.

## Scope

### V1 — the shelf (ship first)
1. **6 looks** — the highest-demand spread, one per visual family: Quiet Light Transitional,
   Heritage Farmhouse, California Collected, Dark Romantic, Sculpted Glamour, plus **one house
   signature by Anahit** (Route C).
2. **Second-shelf picker** in AI Vision: the existing 13 chips stay as "Styles"; a new
   **"Signature Looks"** row sits above them as *cards* (room thumbnail + name + one editorial line),
   not chips — 28 flat chips is unusable.
3. **Sections 8–9 wired** into the generation prompt.
4. **Paid positioning**: Signature Looks are a paid-tier feature (Design+ / Studio). Free users see
   the shelf and get **one** signature render, then an upgrade prompt — this is the conversion lever.
5. **Blind distinctiveness test** before launch (see Validation).

### V2 — depth + discovery
6. **All 15 looks live**, including the 5 UK looks (UK is a real search market and nobody serves it).
7. **Quiz → Signature Look outcome**: the Style Quiz ends on a look, not just a taxonomy word.
8. **`/looks/<slug>` SEO pages** — one per look: what defines it, a real before/after rendered in it,
   the shopping list, FAQ (feeds FAQPage schema), CTA into AI Vision pre-set to that look.
9. **Portfolio looks** (Route C): every published Designature project becomes a selectable look.

### V3 — the moat
10. **Licensed Signature Looks (Route B)** — outreach kit, revenue-share terms, one signed designer,
    "Signature Look by ___" badge + designer bio panel, and their own `/looks/` page.
11. **Look + human checkpoint bundle** — "rendered in [look], reviewed by a real designer" as the
    flagship paid package (see `designer-checkpoints-spec.md`).

## Validation (do not skip)

- **Blind distinctiveness test**: render all looks on the same 3 rooms (living / bedroom / kitchen).
  Anahit labels them blind. **Target ≥80% correct identification**; anything she cannot tell apart
  from another look gets re-briefed or cut.
- **Reference fidelity**: side-by-side against the real reference set — does it read as that look to
  a designer's eye? Anahit is the gate, not the model.
- **Room-type safety**: each look × 9 room types — a look must not drag a living-room program into a
  kitchen (the failure mode `ROOM_PROGRAM_RULES` already guards).

## Technical build tasks

- [ ] Extend `StylePreset` with a separate `SignatureLook` key space (do not mix into the 13 — the
      picker, gating, and analytics all need to tell them apart).
- [ ] `SIGNATURE_BRIEFS` in a new `services/aiVision/signatureLooks.ts` (same shape as `STYLE_BRIEFS`
      + sections 8–9), plus display-name → key map and a test mirroring `stylePresets.test.ts`.
- [ ] Append sections 8–9 in `buildGenerationPrompt()` / `buildStagingPrompt()`.
- [ ] `SIGNATURE_LOOKS_FULL` + card row in `VisionExperience.tsx`; thumbnails via `cld()`.
- [ ] Paid gate: signature look + free tier → one render, then upsell (reuse `isPaid` path).
- [ ] Bilingual copy (EN + AM) in `src/LanguageContext.tsx` — names stay in English, descriptions translate.
- [ ] Analytics event on look selection (`src/lib/track.ts`) so we learn which looks sell.
- [ ] V2: `/looks/<slug>` route + `STATIC_META` + `classifyRoute()` + sitemap + prerender copy
      (`server/seo/`), same pattern as every other static page.
- [ ] V2: quiz outcome → look mapping.
- [ ] Legal: one-line disclaimer component ("Independent studio. Not affiliated with, endorsed by, or
      connected to any designer referenced editorially.") on `/looks/` pages and in Terms.

## Risks / watch-outs

- **Legal (highest).** Named designer buttons without a signed deal — see the naming decision. Route A
  removes the risk; do not skip the disclaimer.
- **Sameness.** If the model renders three looks the same, the feature is a lie and it will be the
  first thing a reviewer notices. The blind test is the release gate.
- **Content cost.** ~2–3 h research + iteration per look, and it is Anahit's eye that is required —
  this is the real budget line, not engineering.
- **Roster drift.** Designers evolve (Gaines moved off shiplap years ago). Re-review the roster
  quarterly alongside the competitor refresh.
- **Cost:** zero marginal API cost — presets skip the extraction call. Renders bill as today.

## Success metrics

- Share of renders using a Signature Look (target: >40% within 60 days of V1).
- Free → paid conversion where a Signature Look was the trigger event.
- `/looks/` organic entries + "designer name style" query impressions in Search Console.
- Checkpoint attach rate on signature renders vs generic renders (does the look make people want the
  human? — the whole thesis).
