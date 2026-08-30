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

## Naming: how to use the real designers without breaking a rule

The instinct to solve this by inventing vague style words is wrong — "Farmhouse" tells nobody
anything, and it throws away the entire reason the feature works. The real solution is a **split**:

> **The designer's name is a reference, not a brand.** Use it everywhere we are *talking about* them —
> pages, articles, search, answers, comparisons. Never use it as the name of the thing we sell.

That split is not a workaround; it is exactly the line the law draws.

### Why the split is legally sound

- **Nominative fair use** (US) lets anyone use a trademark to refer to the trademark owner, on a
  three-part test: (1) the thing can't reasonably be identified without the name, (2) you use no more
  of the mark than needed — the words only, never the logo, wordmark font, brand colours, or their
  photography, and (3) nothing suggests sponsorship or endorsement. *New Kids on the Block v. News
  America* (9th Cir. 1992); *Toyota v. Tabari* (9th Cir. 2010). An article titled "How to get the
  Studio McGee look" sits squarely inside this. A paid button labelled "Studio McGee" does not — on a
  button the name stops describing and starts identifying the source of what we sell.
- **Right of publicity** (US, state law — CA Civ. Code §3344 and equivalents) bites on using a
  person's *name to sell goods*, and is weaker against editorial and descriptive reference. Same line,
  drawn in the same place.
- **UK/EU is stricter and matters here** because five of our references are British. *L'Oréal v
  Bellure* (CJEU, 2009) held that comparison lists naming premium brands took **unfair advantage of
  their reputation** even with zero consumer confusion. The UK "honest practices" defence
  (Trade Marks Act 1994 s.11) is narrower than US nominative fair use. **Consequence:** for the UK
  looks, keep references factual and educational ("what defines her work"), and avoid dupe framing
  ("get the Abigail Ahern look for less") — that framing is the specific thing Bellure punished.
- **Styles themselves are free.** No one owns warm minimalism, black window frames, or plaster walls.
  The DNA we write is ours; only names and images are owned.

### The three rules that come out of it

1. **The button never carries a person's name** — not the style card, not the render label, not the
   filename, not the tier name. Ever, unless licensed.
2. **The name lives in the reference layer** — the look's own page, Journal articles, FAQ answers,
   search, meta descriptions, and the honest "reference points" credit line. All of it factual,
   all of it disclaimered.
3. **The name never goes into the generation prompt.** The brief describes the look longhand; it does
   not say "in the style of ___". Two reasons: it removes any evidence trail of intentionally
   producing a named designer's clone (the live question in the AI-style litigation, e.g. *Andersen v.
   Stability AI*), and — separately — concrete attribute descriptions simply render better than a name
   the model half-remembers. **This is an enforceable engineering rule: a test asserts no reference
   name string appears in any brief or prompt builder.**

### Making the names understandable (the actual craft problem)

The concern is right: "Farmhouse" is useless. Recognition has to come from three things working
together, and the label is only one of them.

**a) Name looks the way the design press does — anchor them in a place, era, or material.**
This is how the industry already names looks that everybody understands: *California organic*,
*English country*, *Hollywood regency*. Geography and material are specific, instantly legible, and
nobody owns them.

> **Formula:** `[place / material / mood anchor] + [familiar style noun]`, three words maximum,
> said the way a magazine would say it — never an invented brand word.

**b) The card carries a "you know this look from" line.** Under the name, one plain sentence that
names the reference honestly: *"You know it from Studio McGee's projects — white oak, black window
frames, calm layered neutrals."* This is descriptive reference, not branding, and it does the
comprehension work the label alone cannot.

**c) Three signature-move tags plus a real render.** `black window frames · white oak · oversized art`
next to a thumbnail of that look on a real room. A client recognises a look from the picture in about
a second — faster than from any word we could put on it. **The picture is the label.**

### The search bridge (this is what captures the intent)

Put a search field above the shelf: *"Search a style, a designer, or a look you've saved."* A client
types **"Studio McGee"** and we answer:

> **Bright Modern Farmhouse** — the look people usually mean by Studio McGee.
> *Independent interpretation. Not affiliated with or endorsed by Studio McGee.*

This is the highest-value mechanic in the whole feature, and it is the safest use of the name in the
product: we are answering a factual question the client asked in their own words, not labelling
merchandise. It also gives us the intent data — which designers people actually type — that tells us
which looks to build next and who to approach for licensing.

**Mockup of all four surfaces** (shelf · about-this-look panel · search bridge · result):
<https://claude.ai/code/artifact/d2b5dae6-e127-4294-b737-61196ce21713>

### The reference layer, in order of strength

| Where the name appears | Risk | Do it? |
|---|---|---|
| Journal article: "How to get the Studio McGee look — what actually makes it" | Lowest — pure editorial | **Yes**, this is also the SEO play |
| `/looks/<slug>` page: "reference points" credit + disclaimer | Low — descriptive reference | **Yes** |
| Search answer: typed name → our look | Low — answering the user's own query | **Yes** |
| Meta title/description, FAQ schema, alt text | Low–moderate — keep it descriptive, never keyword-stuffed | **Yes**, sparingly |
| The style card / button / product tier name | **High** — source identification | **No**, unless licensed |
| Any use of their logo, brand fonts, or their project photography | **Highest** — separate copyright claim on the photos | **Never** |

### Guardrails to build in

- **Screen every ship label** against USPTO TESS and the UKIPO register (class 42 / interior design)
  before it goes live — some perfectly natural-sounding names are already registered by someone.
- **One disclaimer component**, used on every `/looks/` page and in the search answer: *"Independent
  studio. Names are referenced descriptively to describe an aesthetic. Not affiliated with, endorsed
  by, or connected to any designer named."*
- **Never their photos.** Reference images are research inputs, kept internal — every image we publish
  is one we generated or shot. This matters more than the trademark question: photographs are
  copyrighted and photo claims are the easy, common ones to lose.
- **A rename policy.** Because the name is decoupled from the DNA, if any designer or their counsel
  objects we drop the reference line and rename that look the same day, at zero cost to the product.
  Write that response plan down now; it converts a scary letter into a fifteen-minute task.
- **One IP lawyer review before launch.** The above substantially reduces the risk; it does not zero
  it, and none of this is legal advice. An hour of a US IP attorney's time — plus a UK view on the
  five British looks — is cheap next to the feature.

### And the version with no risk at all

Two of these need no analysis, and should ship alongside:

- **Licensed looks.** Sign a designer to a revenue share and their name goes on the button legitimately
  ("Signature Look by ___"). Start with strong mid-tier US/UK designers with 20–200k followers who
  want distribution, not the household names. One signature legitimises the entire shelf and is a
  press story on its own.
- **House looks.** Anahit's own signatures, and each published Designature project as a selectable
  look — Featherlight, Still Waters, Blue Haven already have real photography. Free, fully ownable,
  and it markets the studio.

## The roster (15 looks — reference, ship label, and the line that makes it understood)

Ship labels follow the formula above. The "you know it from" line is what appears under the name on
the card and page — it is the honest, descriptive use of the reference, and every one carries the
disclaimer.

**United States**

| # | Reference (research + reference line only) | Ship label | You know it from | Signature-move tags |
|---|---|---|---|---|
| 1 | Studio McGee | **Bright Modern Farmhouse** | The bright, calm farmhouse look Studio McGee made everywhere | black window frames · white oak · oversized art |
| 2 | Joanna Gaines | **Texas Farmhouse** | The warm Waco farmhouse Joanna Gaines built a network on | black + cream · beams · vintage runners |
| 3 | Amber Lewis | **California Organic** | The sun-bleached LA look of Amber Interiors | plaster walls · vintage Turkish rugs · bouclé |
| 4 | Nate Berkus & Jeremiah Brent | **Collected Vintage Modern** | Berkus & Brent's layered, symmetrical warmth | vintage brass · travel objects · matched pairs |
| 5 | Kelly Wearstler | **Hollywood Sculptural** | Kelly Wearstler's sculptural, high-contrast glamour | stone + brass · jewel accents · bold forms |
| 6 | Athena Calderone | **Brooklyn Plaster** | Athena Calderone's tonal, sculptural calm | travertine · curves · monochrome warmth |
| 7 | Justina Blakeney | **Plant-Filled Bohemian** | The plant-dense, pattern-rich bohemian of Justina Blakeney | plants as architecture · saturated pattern · global craft |
| 8 | Leanne Ford | **Raw White Cottage** | Leanne Ford's white-on-white with rough texture | lime plaster · vintage industrial · quiet white |
| 9 | Marie Flanigan | **Quiet Luxury Modern** | Marie Flanigan's restrained architectural warmth | custom millwork · natural light · no noise |
| 10 | Jean Stoffer | **Classic Kitchen Revival** | Jean Stoffer's timeless kitchens | colored cabinetry · unlacquered brass · marble |

**United Kingdom** — a real search market nobody serves. Keep every reference here factual and
educational, never dupe framing (see *L'Oréal v Bellure* above).

| # | Reference (research + reference line only) | Ship label | You know it from | Signature-move tags |
|---|---|---|---|---|
| 11 | Kelly Hoppen | **London Neutral Luxe** | Kelly Hoppen's taupe-and-symmetry discipline | taupe + oatmeal · strict symmetry · dark timber |
| 12 | Abigail Ahern | **Dark Romantic London** | Abigail Ahern's inky, dramatic rooms | inky walls · faux botanicals · deep texture |
| 13 | Beata Heuman | **Playful London Colour** | Beata Heuman's witty, colourful joinery | custom joinery · playful colour · quirky detail |
| 14 | Rita Konig | **English Country Comfort** | Rita Konig's unfussy modern English country | chintz done modern · layered · lived-in |
| 15 | Ilse Crawford | **Warm Nordic Calm** | Ilse Crawford's human-centred materials | cork + leather + wool · low warm light · nothing precious |

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
1. **6 looks** — the highest-demand spread, one per visual family: Bright Modern Farmhouse,
   Texas Farmhouse, California Organic, Dark Romantic London, Hollywood Sculptural, plus **one house
   signature by Anahit**.
2. **Second-shelf picker** in AI Vision: the existing 13 chips stay as "Styles"; a new
   **"Signature Looks"** row sits above them as *cards* (room thumbnail + name + one editorial line),
   not chips — 28 flat chips is unusable.
3. **Sections 8–9 wired** into the generation prompt.
4. **The comprehension layer on every card** — "you know it from" line + three signature-move tags +
   a real render of that look. This is what makes the shelf legible, not the label.
5. **The search bridge** — type a designer's name, get the matching look, the reference line and the
   disclaimer. Log every query.
6. **Paid positioning**: Signature Looks are a paid-tier feature (Design+ / Studio). Free users see
   the shelf and get **one** signature render, then an upgrade prompt — this is the conversion lever.
7. **Blind distinctiveness test** before launch (see Validation), plus the trademark screen and the
   one lawyer review.

### V2 — depth + discovery
8. **All 15 looks live**, including the 5 UK looks (UK is a real search market and nobody serves it).
9. **Quiz → Signature Look outcome**: the Style Quiz ends on a look, not just a taxonomy word.
10. **`/looks/<slug>` SEO pages** — one per look: what defines it, a real before/after rendered in it,
   the shopping list, FAQ (feeds FAQPage schema), CTA into AI Vision pre-set to that look.
11. **House looks**: Anahit's own signatures, and every published Designature project as a selectable
   look — free, fully ownable, and it markets the studio.
12. **One Journal article per look** — "How to get the ___ look, and what actually makes it." This is
     both the reference layer and the highest-intent SEO we can write.

### V3 — the moat
13. **Licensed Signature Looks** — outreach kit, revenue-share terms, one signed designer, a
    "Signature Look by ___" badge + bio panel, and their own `/looks/` page. Target the designers the
    search bridge shows people actually typing.
14. **Look + human checkpoint bundle** — "rendered in [look], reviewed by a real designer" as the
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
- [ ] Legal: one disclaimer component ("Independent studio. Names are referenced descriptively to
      describe an aesthetic. Not affiliated with, endorsed by, or connected to any designer named.")
      on `/looks/` pages, in the search answer, and in Terms.
- [ ] **Name-hygiene test**: assert no reference designer name appears in `SIGNATURE_BRIEFS`, in the
      prompt builders, or in any shipped label — only in `/looks/` copy and Journal content.
- [ ] Search bridge above the shelf: typed designer name → the matching look + reference line +
      disclaimer; log the query (this is the licensing-target and roadmap signal).
- [ ] "You know it from" line + three signature-move tags on every look card and `/looks/` page.
- [ ] Trademark screen (USPTO TESS + UKIPO, class 42) on every ship label before launch.

## Risks / watch-outs

- **Legal (highest).** A designer's name on a paid button without a signed deal. The naming split
  above — name in the reference layer, never on the button, never in the prompt, never their photos —
  is what keeps this clean. Do not skip the disclaimer, the TM screen, or the one lawyer review.
- **Photography, not trademarks, is the easy claim to lose.** Reference images stay internal research
  inputs; everything we publish is generated or shot by us.
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
