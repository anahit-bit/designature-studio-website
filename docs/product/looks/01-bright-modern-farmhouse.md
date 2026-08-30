# Look 01 — Bright Modern Farmhouse

*Signature Look brief · draft 1 for owner review · reference: Studio McGee*

**Status:** written, not yet render-tested. Nothing ships until the render test below passes.

**Reference handling:** "Studio McGee" appears in this document (internal research), in the look's
detail panel, on its `/looks/` page and in its Journal article — never on the card in the picker,
never in the generation prompt, never on our images. See the naming section of
`../signature-styles-spec.md`.

---

## Card copy (what the client sees)

| | |
|---|---|
| **Label** | Bright Modern Farmhouse |
| **Signature moves** (tags) | black window frames · white oak · oversized art |
| **Detail panel line** | The bright, calm farmhouse look Studio McGee made everywhere — matte black frames against warm white, pale oak, and one big piece of art. |
| **Disclaimer** (with the line, always) | Independent interpretation. Not affiliated with or endorsed by Studio McGee. |
| **Search terms that resolve here** | studio mcgee, shea mcgee, mcgee and co, modern farmhouse, utah farmhouse, warm minimal farmhouse |

**Where this copy appears:** mockup of the four surfaces —
<https://claude.ai/code/artifact/d2b5dae6-e127-4294-b737-61196ce21713>

---

## The brief

Sections 1–7 are the existing format (they slot straight into `buildGenerationPrompt`). Sections 8–9
are new and are what make this a *signature* look rather than another neutral style.

```
1. COLOR PALETTE: Warm White #F4F1EC, Soft Greige #DCD5C9, Pale Oak #C8B393, Warm Taupe #A99B87,
   Matte Black #1E1D1B, Antique Brass #A98A5C, Sage Drift #9FA694, with a single muted Denim
   Blue-Grey #7C8896 permitted only in a cushion, a vintage rug, or one artwork. Every white and
   neutral is WARM — no cool grey undertones anywhere.

2. MATERIALS & FINISHES: rift-sawn white oak in a pale honey tone with matte finish and straight
   grain; matte black powder-coated steel on window and door frames; honed (never polished) white
   marble with soft grey veining; antique and unlacquered brass; ivory bouclé; heavyweight natural
   linen; wool-and-jute blend rugs; one vintage flatweave with faded rust and blue; natural wicker
   and rattan; matte plaster-look wall paint; cream and oatmeal ceramics. No chrome, no gloss.

3. FURNITURE CHARACTER: relaxed but tailored. Deep sofas with low, soft arms in ivory or oatmeal
   with a slipcovered look; English roll-arm silhouettes softened and simplified; curved bouclé
   accent chairs; round pedestal or chunky rift-oak tables; cane-back or slipcovered dining chairs;
   solid oak consoles with visible grain. Legs are visible and simple — square, turned, or spindle,
   used at most once per room. Nothing ornate, nothing glossy, nothing retro-tapered.

4. LIGHTING: layered and warm (2700K), daylight first. Slim matte-black or aged-brass fixtures;
   plaster or alabaster dome pendants; one oversized woven rattan pendant over a dining table or
   island; black picture lights over art; ceramic table lamps with linen drum shades placed in
   matched pairs. Light is soft and even — never dramatic, never cool.

5. WALL & CEILING TREATMENT: warm white matte walls throughout. At most ONE treated plane per room:
   white oak vertical slats, or simple shaker panelling / board-and-batten with square edges. Flat
   ceilings; a single simple beam or a plain shiplap ceiling is permitted in a small room only.
   Trim is slim and square-edged. Matte black interior glazing only where a doorway already exists.

6. DECOR & STYLING: ONE oversized abstract canvas in cream, black and sand — hung alone or leaning
   on a console. Open shelving styled sparsely with cream ceramics, a short stack of design books,
   one brass object and one trailing plant. An olive tree or fiddle-leaf fig in a woven basket. A
   bowl of citrus or artichokes on the island. One chunky throw folded over an arm. Objects grouped
   in threes with generous empty space between groupings — at least 60% of every surface stays
   clear.

7. OVERALL MOOD: bright, calm, sunlit, quietly expensive. A new-build farmhouse that reads modern:
   high contrast between matte black and warm white, softened everywhere by pale oak and layered
   ivory textiles. The room feels edited and unhurried, like it was styled for a photograph and
   then lived in.

8. SIGNATURE MOVES (these must be visible in the render):
   - Matte black window and door frames against warm white walls — the highest-contrast element in
     the room, present wherever glazing or a door exists.
   - ONE oversized artwork, alone on a wall or leaning — it carries the whole wall by itself.
   - Pale white oak paired directly with ivory bouclé — the material handshake that dates this look
     to now.
   - Floor-length natural linen drapery, hung high and wide, breaking softly at the floor.
   - Styling in threes with real breathing room between groups; surfaces stay mostly clear.
   - Exactly one woven element per room — a rattan pendant, a basket, or a tray — to keep the
     neutral palette from reading cold.

9. NEVER:
   - Never shiplap on every wall, never a sliding barn door, never galvanised metal, mason jars,
     or word-art signs. This is the farmhouse look ten years after those.
   - Never cool builder greige — every neutral leans warm.
   - Never polished chrome, glossy lacquer, or high-shine marble.
   - Never a gallery wall, never clusters of small frames, never small paired artworks.
   - Never heavy ornate traditional furniture, tufted Chesterfields, or skirted sofas.
   - Never saturated colour as a main event — colour appears only as muted sage or dusty blue in a
     cushion, a vintage rug, or one artwork.
   - Never mid-century tapered legs or retro silhouettes.
   - Never dark or moody walls.
```

---

## Render test (the release gate for this look)

Run before this look goes anywhere near the shelf. Anahit grades; the model does not get a vote.

**1 · Presence.** Render on three fixed rooms — living, bedroom, kitchen. In each, all six signature
moves from section 8 should be visible, and nothing from section 9 present. Score 6/6 twice out of
three rooms to pass.

**2 · Nearest-neighbour separation (the risk specific to this look).** Its closest neighbours are two
presets we already ship — **Transitional** and **Warm Contemporary**. Render all three on the same
living room, unlabelled, and identify them blind. If Bright Modern Farmhouse is not obviously the one
with black frames, one big artwork and oak-plus-bouclé, the brief is not distinct enough yet — push
sections 8 and 9 harder rather than adding more adjectives to 1–7.

**3 · Reference fidelity.** Side by side against the research set: does a designer's eye read it as
that look? This is the judgment no test can automate.

**4 · Room safety.** Render across all nine room types. The furniture examples must never drag a
living-room programme into a kitchen or bathroom — `ROOM_PROGRAM_RULES` should already prevent it,
but this look's section 3 is furniture-heavy, so confirm it.

---

## Notes for the next brief

- The nearest-neighbour test is the one that will kill or save looks. Do it second, not last —
  before investing three hours in a look that lands on top of one we already have.
- Sections 8 and 9 did the differentiating work here, exactly as the format predicted. Sections 1–7
  alone read like three of our existing presets.
- Section 9 needs at least one clause that pushes away from a *neighbouring look on our own shelf*
  ("never dark or moody walls" pushes away from Dark Romantic London). Make that a habit.
