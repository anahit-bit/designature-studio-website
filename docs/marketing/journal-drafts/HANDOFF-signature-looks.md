# Handoff — Signature Looks article series

**From:** the Signature Looks product session · **To:** the Journal session
**Ask:** review this plan, pull real keyword data, come back with the priority order and final
titles/slugs. **Do not draft or publish anything yet** — see the publishing gate at the bottom.

Source specs (read these first, they hold the rules):
- `docs/product/signature-styles-spec.md` — especially **"Naming: how to use the real designers
  without breaking a rule"** and **"Writing the Journal articles"**.
- `docs/product/looks/01-bright-modern-farmhouse.md` — the first look, written in full.
- Screens: <https://claude.ai/code/artifact/d2b5dae6-e127-4294-b737-61196ce21713>

---

## 1 · What Signature Looks is (one paragraph)

Alongside the 13 generic styles in AI Vision, a second shelf of ~15 **designer-grade signature
looks** — each a deeply researched style DNA, rendered on the client's own room. They ship under
descriptive labels (*Bright Modern Farmhouse*, *California Organic*), and the designer whose work
each references is named only in editorial content, in a credit line, and in search results. The
Journal is where the names legitimately live, which is why this series matters more than usual: it
is both the reference layer and the highest-intent SEO we can write.

**Status: specced, not built.** V1 is six looks. That constrains the publishing schedule (§6).

---

## 2 · What we need back from the Journal session

1. **Real keyword data** for the candidates in §4 — US and UK separately (five of the fifteen
   references are British, and the UK market is the one nobody serves). Use the admin **Insights**
   tab / `server/analytics/keywordVolume.ts` for volume, and Search Console for what we already rank
   on.
2. **A priority order** — which six looks get an article first, based on volume × competition ×
   how well it matches our render quality. This *also* decides which six looks get built first, so
   it is a real product input, not just a content decision.
3. **Final titles + slugs** for those six, plus the pillar.
4. **A cannibalisation call** — see §5. Batch C of the content calendar already plans per-style
   guides ("how to get the [style] look"), and *Farmhouse* is on that list. Decide whether the style
   guide and the look guide are one article or two, before either is written.
5. **Anything you'd cut.** If a look has no search demand in either market, say so — we would rather
   drop it from the roster now than research a brief nobody is looking for.

---

## 3 · The rules (non-negotiable — every article, every time)

These come from the naming section of the spec. They are what makes naming real designers safe.

- **Teach, don't dupe.** "What actually defines the Studio McGee look" is editorial reference and is
  fine. "Get the Studio McGee look for less" is dupe framing — the exact thing UK/EU law punished in
  *L'Oréal v Bellure*, and five of these designers are British. **Never price-compare against a named
  designer**, never "cheaper alternative to ___", never "___ on a budget".
- **Never their photographs.** Not embedded, not hotlinked, not "credit: ___". Every image is our own
  render or our own shot. Photo copyright is where style articles actually get into trouble — far
  more common and easier to lose than a trademark claim.
- **Link out to them.** One outbound link to the designer's own site, in the body. It reinforces that
  we are referring to them rather than borrowing from them.
- **No logos, no brand fonts, no "x" framing.** "Designature x Studio McGee" implies a collaboration
  that does not exist.
- **Never imply endorsement or use.** No "official", no "partner", no suggestion that any designer
  uses, likes or has seen our tool.
- **Disclaimer block on every article in this series**, verbatim:

  > *Designature Studio is an independent studio. Designers named in this article are referenced
  > descriptively, to describe an aesthetic. We are not affiliated with, endorsed by, or connected to
  > any designer named here.*

- **Names in the title and slug are fine** when descriptive (`studio-mcgee-style-guide`). A name in a
  product, a plan, a page that sells something, or the site's own branding is not.

---

## 4 · The article set

### 4a · The pillar (write and rank this one first)

| | |
|---|---|
| **Working title** | The Designer Looks Everyone Wants — and What Actually Makes Them |
| **Angle** | A guide to ~10 recognisable contemporary designer looks: what defines each one, the 3–5 moves that make it identifiable, and what it costs to get. Genuinely useful whether or not the reader ever uses our tool. |
| **Why it works** | Captures the head term, links down to every per-look article, and is the natural GEO citation ("what defines the Studio McGee look" is exactly the kind of question an AI answer engine wants a source for). |
| **Keyword hypotheses** (validate) | designer interior design styles · famous interior designers style guide · how to get a designer look at home · interior designers to follow 2026 |
| **Internal links** | each per-look article · `/ai-concepts#vision` · `/deliverables` · `/pricing` |
| **CTA** | Try any of these looks on your own room, free |

### 4b · Per-look articles — the six V1 candidates

Same template each: what defines it · the 3–5 signature moves · palette and materials · how to get it
in a real room · a before/after we rendered · what it costs · FAQ.

| # | Look (ship label) | Reference (named in body) | Keyword hypotheses — **validate, these are guesses, not data** |
|---|---|---|---|
| 1 | Bright Modern Farmhouse | Studio McGee | studio mcgee style · modern farmhouse living room · white oak black windows · shea mcgee style |
| 2 | Texas Farmhouse | Joanna Gaines | joanna gaines style · magnolia farmhouse look · fixer upper style living room |
| 3 | California Organic | Amber Lewis | california organic modern · amber interiors style · organic modern living room |
| 4 | Dark Romantic London | Abigail Ahern | dark interior design · moody living room · abigail ahern style *(UK-weighted)* |
| 5 | Hollywood Sculptural | Kelly Wearstler | kelly wearstler style · sculptural interior design · maximalist glamour |
| 6 | Designature Warm *(house look)* | — none — | warm contemporary interior · quiet luxury living room *(no designer named; this is our own)* |

### 4c · The nine that follow in V2

Collected Vintage Modern (Berkus & Brent) · Brooklyn Plaster (Athena Calderone) · Plant-Filled
Bohemian (Justina Blakeney) · Raw White Cottage (Leanne Ford) · Quiet Luxury Modern (Marie Flanigan) ·
Classic Kitchen Revival (Jean Stoffer) · London Neutral Luxe (Kelly Hoppen) · Playful London Colour
(Beata Heuman) · English Country Comfort (Rita Konig) · Warm Nordic Calm (Ilse Crawford).

*(That is ten — the roster is 15 looks total; V1 takes five references plus the house look.)*

---

## 5 · Cannibalisation — resolve before drafting

- **Batch C of the content calendar** plans per-style guides including **Farmhouse**, Coastal,
  Japandi, Mid-Century. Two of the six V1 looks are farmhouse-family. Options: (a) one article per
  style that covers both variants, (b) a broad style guide plus narrower look guides that link up to
  it, (c) drop the Batch C entry where a look guide supersedes it. **Your call — make it explicitly.**
- **`best-ai-interior-design-tools-2026`** and the per-room batch already carry AI Vision CTAs; keep
  this series' CTAs consistent with those rather than inventing new ones.
- Check Search Console for anything we already rank on before we write a competing page.

---

## 6 · Publishing gate (this is the part that needs care)

The feature is **not built yet**. An article that promises a look the client cannot try is worse than
no article.

- **Safe to publish before launch:** the pillar and any per-look guide written purely as *design
  education* — what defines the look, how to get it — with our existing AI Vision CTA ("try your room
  in any of our 13 styles free"). No promise of a Signature Look shelf.
- **Hold until V1 ships:** anything that names the Signature Looks feature, the shelf, the search
  box, or says "pick this look in AI Vision".
- Ship order: pillar first (it works either way), then per-look articles as their looks go live, so
  each article lands with a working CTA and a real before/after in that look.
- **Images:** every article needs a render *in that look*, which does not exist until the brief
  passes its render test. Do not publish a look guide illustrated with a generic render — the
  article's whole credibility is that the picture matches the words.

---

## 7 · Sanity mapping (same as every other post)

`title` · `slug` · `excerpt` · `seo.metaTitle` · `seo.metaDescription` · `seo.faq[]` as
`{question, answer}` · `body` as portable text · `status` · `coverImage`. FAQ feeds FAQPage schema;
5–6 questions each. Cut a **vertical 2:3 Pinterest pin** per article — this series is the strongest
Pinterest content we will ever have, since "designer look" boards are what that platform is made of.

---

## 8 · Owner sign-off

Anahit approves the final titles, the six-look priority order, and every reference line naming a
designer, before drafting starts.
