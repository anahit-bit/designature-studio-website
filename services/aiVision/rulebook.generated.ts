/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source of truth: _Plan\Website\AI-Vision-Rulebook.xlsx
 * Regenerate with:  python scripts/aivision/compile-rulebook.py
 *
 * Edit the workbook, re-run the compiler, commit both. Hand-editing this file
 * makes the rulebook and the prompt disagree, which is how a rule quietly stops
 * being a rule.
 *
 * This build: 18 gemini rules · 0 staging · 6 not sent to any model
 *             15 style briefs · 15 palettes (66 accents) · 10 room programs · 3 paint modifiers.
 */

export interface CompiledRule {
  id: string;
  level: string;
  text: string;
}

/** One colour on a style's palette card. `accent` is the pool a generation draws from. */
export interface PaletteColour {
  name: string;
  hex: string;
  role: "field" | "neutral" | "accent";
}

/** A Colour-of-the-Year modifier — overrides the accent, never the style. */
export interface PaintModifier {
  id: string;
  name: string;
  brand: string;
  hex: string;
  role: string;
  instruction: string;
}

/** Full constraint set for the regenerative (Gemini) path. */
export const GEMINI_RULES: CompiledRule[] = [
  { id: "RD1", level: "ABSOLUTE", text: `Keep every window exactly as photographed — same wall, same position, same size, same shape, and the same number of panes and glazing bars. An arched window keeps its arch at the same height. Never add a window the photo does not show.` },
  { id: "RD2", level: "ABSOLUTE", text: `Keep every door and doorway exactly where it is, at the same width. A door you can see only part of — at the edge of the frame, or half hidden — is still a door and must still be there. Never add a doorway the photo does not show.` },
  { id: "RD3", level: "ABSOLUTE", text: `Keep every wall in its exact position and at its exact length, including short return walls, reveals and pier walls beside an entrance. If a wall is not visible in the photo, leave it out of frame — never invent one.` },
  { id: "RD4", level: "ABSOLUTE", text: `Photograph the room from the same spot with the same lens: identical proportions, ceiling height, camera angle and framing. Do not widen or deepen the room, and do not reveal more of it than the original frame shows.` },
  { id: "RD5", level: "ABSOLUTE", text: `Leave the ceiling as the single flat plane it already is, at its original height. Repaint it if the style calls for it and change the light fittings on it — but add nothing to it: no beams, soffits, bulkheads, coffers, dropped or tray sections, perimeter coves, shadow gaps, LED channels, floating panels, or plank, slat or timber cladding.` },
  { id: "RD6", level: "ABSOLUTE", text: `Mount a television, screen or shelf ON the flat surface of the existing wall, and stand cabinets and shelving flush against it as freestanding pieces. Never sink anything into the wall or build the wall out around it: no new recesses, niches, insets, feature-wall build-outs, columns, arches, platforms or partitions.` },
  { id: "RD7", level: "ABSOLUTE", text: `Restyle only what the photograph actually shows. If a wall, corner or room boundary is out of frame, leave it out of frame — never invent extra rooms, hallways, openings or enclosures.` },
  { id: "RD8", level: "HARD", text: `Empty the room of everything movable that is in it now — furniture, rugs, curtains, cushions, lamps, plants, pictures, clutter — then furnish it from scratch with new pieces in the target style and a new arrangement. Do not recolour or re-cover an existing piece and keep it, and do not reuse the original layout.` },
  { id: "RD9", level: "HARD", text: `Joinery genuinely built into the room — a fitted kitchen run, fitted wardrobe, built-in banquette, reception or bar counter, fitted media wall — stays exactly where it is at exactly its current size. Refinish its surfaces in the target style, but never move, resize, extend, shorten or duplicate it.` },
  { id: "RD10", level: "HARD", text: `Finish the room completely, so it reads as lived in rather than as a showroom with a few pieces in it.` },
  { id: "RD11", level: "HARD", text: `If you cannot tell whether something is loose furniture or built into the room, treat it as loose and remove it.` },
  { id: "RD12", level: "HARD", text: `Keep every window completely clear. Place nothing tall in front of the glazing — no headboard, sofa back, cabinet, shelving or large plant — and let daylight through. Partly covering a window counts as covering it.` },
  { id: "RD13", level: "HARD", text: `Keep doorways and the floor in front of them clear. Where a wall carries a door, choose a piece sized to the wall that is actually left over rather than one that covers the opening.` },
  { id: "RD14", level: "HARD", text: `For clothes storage, first look for a recess, alcove or nook already built into a wall and fit the storage into it at that recess's existing width and depth. If the room has none, stand a freestanding armoire or wardrobe flat against a wall instead. Never carve a new recess into a flat wall.` },
  { id: "RD15", level: "HARD", text: `Place the bed so it never covers a window or balcony door. If the only large wall in view carries the glazing, offset the bed to one side or stand it against a side wall, and never build a solid headboard wall across a window.` },
  { id: "RD16", level: "ADVISORY", text: `Decorative cladding laid flat onto an existing wall — stone, tile, timber slats, panelling, wallpaper — is a finish and is welcome, as long as the wall stays in the same plane and nothing is cut into it.` },
  { id: "RD17", level: "WARN", text: `Render any screen, slatted panel or room divider as a freestanding piece of furniture, never as built-in architecture — and place it so it does not hide a door or window the photo shows.` },
  { id: "RD18", level: "HARD", text: `Choose the light fittings deliberately and layer them — ambient, task and accent — in the target style. Fittings are yours to replace; the ceiling they hang from is not.` },
];

/**
 * Deliberately minimal set for the staging (img2img) path — see RD23. A staging
 * model edits the photo it is handed, and a long prompt makes it ignore that
 * photo entirely. Do not pad this list.
 */
export const STAGING_RULES: CompiledRule[] = [

];

/** Render a rule set as prompt bullets, each tagged with its rulebook id. */
export function renderRules(rules: CompiledRule[]): string {
  return rules.map((r) => `- [${r.id}] ${r.text}`).join("\n");
}

/** Pre-rendered blocks, so the common path costs nothing at request time. */
export const GEMINI_RULES_BLOCK = `- [RD1] Keep every window exactly as photographed — same wall, same position, same size, same shape, and the same number of panes and glazing bars. An arched window keeps its arch at the same height. Never add a window the photo does not show.
- [RD2] Keep every door and doorway exactly where it is, at the same width. A door you can see only part of — at the edge of the frame, or half hidden — is still a door and must still be there. Never add a doorway the photo does not show.
- [RD3] Keep every wall in its exact position and at its exact length, including short return walls, reveals and pier walls beside an entrance. If a wall is not visible in the photo, leave it out of frame — never invent one.
- [RD4] Photograph the room from the same spot with the same lens: identical proportions, ceiling height, camera angle and framing. Do not widen or deepen the room, and do not reveal more of it than the original frame shows.
- [RD5] Leave the ceiling as the single flat plane it already is, at its original height. Repaint it if the style calls for it and change the light fittings on it — but add nothing to it: no beams, soffits, bulkheads, coffers, dropped or tray sections, perimeter coves, shadow gaps, LED channels, floating panels, or plank, slat or timber cladding.
- [RD6] Mount a television, screen or shelf ON the flat surface of the existing wall, and stand cabinets and shelving flush against it as freestanding pieces. Never sink anything into the wall or build the wall out around it: no new recesses, niches, insets, feature-wall build-outs, columns, arches, platforms or partitions.
- [RD7] Restyle only what the photograph actually shows. If a wall, corner or room boundary is out of frame, leave it out of frame — never invent extra rooms, hallways, openings or enclosures.
- [RD8] Empty the room of everything movable that is in it now — furniture, rugs, curtains, cushions, lamps, plants, pictures, clutter — then furnish it from scratch with new pieces in the target style and a new arrangement. Do not recolour or re-cover an existing piece and keep it, and do not reuse the original layout.
- [RD9] Joinery genuinely built into the room — a fitted kitchen run, fitted wardrobe, built-in banquette, reception or bar counter, fitted media wall — stays exactly where it is at exactly its current size. Refinish its surfaces in the target style, but never move, resize, extend, shorten or duplicate it.
- [RD10] Finish the room completely, so it reads as lived in rather than as a showroom with a few pieces in it.
- [RD11] If you cannot tell whether something is loose furniture or built into the room, treat it as loose and remove it.
- [RD12] Keep every window completely clear. Place nothing tall in front of the glazing — no headboard, sofa back, cabinet, shelving or large plant — and let daylight through. Partly covering a window counts as covering it.
- [RD13] Keep doorways and the floor in front of them clear. Where a wall carries a door, choose a piece sized to the wall that is actually left over rather than one that covers the opening.
- [RD14] For clothes storage, first look for a recess, alcove or nook already built into a wall and fit the storage into it at that recess's existing width and depth. If the room has none, stand a freestanding armoire or wardrobe flat against a wall instead. Never carve a new recess into a flat wall.
- [RD15] Place the bed so it never covers a window or balcony door. If the only large wall in view carries the glazing, offset the bed to one side or stand it against a side wall, and never build a solid headboard wall across a window.
- [RD16] Decorative cladding laid flat onto an existing wall — stone, tile, timber slats, panelling, wallpaper — is a finish and is welcome, as long as the wall stays in the same plane and nothing is cut into it.
- [RD17] Render any screen, slatted panel or room divider as a freestanding piece of furniture, never as built-in architecture — and place it so it does not hide a door or window the photo shows.
- [RD18] Choose the light fittings deliberately and layer them — ambient, task and accent — in the target style. Fittings are yours to replace; the ceiling they hang from is not.`;

export const STAGING_RULES_BLOCK = ``;

/** The seven-section description behind every style chip. */
export const STYLE_BRIEFS: Record<string, string> = {
  art_deco: `1. COLOR PALETTE: restrained jewel tones balanced with warm neutrals — Deep Forest #2E4E3D, Warm Terracotta #B87A5E, Brushed Brass #B8935E, Cream Ivory #F2E9D8, Muted Burgundy #7A3A42, Warm Charcoal #3A3A3A, Warm Off-White #F5EFE0. Jewel tones appear as accents on one wall or key furniture, not saturating every surface.
2. MATERIALS & FINISHES: matte and satin-finished woods (warm walnut, white oak) with subtle grain, matte brass hardware with a brushed finish, honed marble (not polished) with subtle veining, velvet upholstery in warm jewel tones used on one or two pieces, linen and boucle for balance, ceramic accents.
3. FURNITURE CHARACTER: contemporary silhouettes with Art Deco-influenced proportion — clean geometric lines, gentle curves balanced with straight edges, refined tapered or fluted legs, rounded backs on lounge chairs, low-slung profiles lifted off the floor. Restrained and modern first; Art Deco felt through proportion and geometric rhythm, not literal period silhouettes.
4. LIGHTING: contemporary fixtures with geometric detail — slim brass linear pendants with frosted glass, fluted globe pendants, understated wall sconces with rounded shades, floor lamps with matte brass bases. Warm ambient lighting, layered but calm.
5. WALL & CEILING TREATMENT: matte painted walls in warm neutrals with one accent wall in a jewel tone or a subtle fluted-wood treatment, contemporary geometric wallpaper on a single feature wall (thin scale, calm rhythm), simple flat ceilings with a restrained painted or plaster finish. Slim brass reveal trim used sparingly at wall-to-ceiling junctions.
6. DECOR & STYLING: framed abstract or graphic art with geometric composition, one sculptural ceramic vessel in a matte finish, curated design books, one architectural plant in a matte brass or ceramic planter, considered objects placed with generous negative space between them. Surfaces feel edited, not layered.
7. OVERALL MOOD: warm, considered, design-forward, contemporary. Art Deco warmth and geometric rhythm without the period furniture — a modern interior that references the era through proportion, material warmth, and restrained detail, feeling both quiet and confident.`,
  bohemian: `1. COLOR PALETTE: Warm Terracotta #C66B3D, Cream #F4ECD8, Rust Red #A14D2A, Mustard #C99836, Forest Green #4A6B47, Deep Plum #5D3A4A, Warm White #EFE7D6.
2. MATERIALS & FINISHES: rattan, wicker, jute, raw and reclaimed wood with visible grain, hand-loomed textiles, macrame, kilim and Persian rugs, terracotta and unglazed ceramics, brass and copper accents, woven leather.
3. FURNITURE CHARACTER: low-slung, soft, lived-in forms. Mix-and-match pieces from different eras and origins. Curved rattan chairs, deep modular sofas with layered cushions, carved wood tables, floor cushions and poufs.
4. LIGHTING: rattan pendant lights, paper lanterns, brass and macrame fixtures, layered floor and table lamps with woven shades. Warm ambient lighting, often layered with candles and fairy lights.
5. WALL & CEILING TREATMENT: matte cream or warm white walls, occasional accent walls with tapestries or hand-painted murals, exposed wood beams where applicable, no formal moldings.
6. DECOR & STYLING: abundant houseplants and trailing greenery, layered textiles and throws, vintage rugs over rugs, framed botanical or tribal art, woven baskets, candles, dried pampas grass and palm leaves, collected ceramics, vintage books.
7. OVERALL MOOD: relaxed, eclectic, soulful. Layered textures and global influences create a warm, lived-in atmosphere that feels personal and unhurried.`,
  coastal: `1. COLOR PALETTE: Soft White #F7F4EE, Sand Beige #DCCFB4, Driftwood Grey #B5AFA1, Ocean Blue #5B7E9C, Pale Aqua #C5DDD8, Weathered Navy #2E4357, Warm Cream #EDE5D3.
2. MATERIALS & FINISHES: whitewashed and weathered oak, bleached pine, natural linen and cotton, jute and sisal rugs, rope detailing, distressed white-painted wood, sea glass, brushed nickel and aged brass.
3. FURNITURE CHARACTER: relaxed slipcovered sofas and armchairs, light wooden frames, woven natural fiber chairs, simple farmhouse-style tables, breezy and informal proportions with rounded edges.
4. LIGHTING: woven rope or rattan pendants, glass jar lanterns, white linen drum shades, brushed nickel sconces. Bright, airy daylight is the primary source — fixtures supplement rather than dominate.
5. WALL & CEILING TREATMENT: matte white or pale sand walls, horizontal shiplap or beadboard accents, white-painted ceiling beams where present, simple white trim.
6. DECOR & STYLING: linen throw pillows, woven baskets, framed botanical prints or seascape art, pottery in muted blues and whites, driftwood objects, simple greenery in glass vases, sheer linen curtains.
7. OVERALL MOOD: light, airy, restorative. Soft natural materials and a breezy palette evoke a calm seaside cottage atmosphere.`,
  industrial: `1. COLOR PALETTE: Charcoal Grey #3A3A3A, Rust Brown #7A4A2A, Concrete Grey #8C8680, Aged Black #1F1F1F, Warm Tan #B08862, Brushed Steel #A8A8A8, Cream White #EFEAE0.
2. MATERIALS & FINISHES: one wall of exposed brick or raw concrete at most, the rest smooth plaster; blackened steel used as slim frames rather than bulk; warm reclaimed oak and walnut with visible grain; soft full-grain leather in tan and oxblood, aged not distressed; heavy linen and wool boucle; wool rugs; matte ceramics; antique brass alongside the steel. No riveted plate, no cast iron, no visible wiring runs.
3. FURNITURE CHARACTER: contemporary silhouettes with an industrial memory rather than factory salvage — a deep comfortable sofa in tan or oxblood leather, slim steel-framed tables with warm timber tops, a soft upholstered armchair, open shelving in thin black steel. Comfortable first. No factory carts, no mechanic's stools, no riveted furniture, nothing that looks like reclaimed machinery.
4. LIGHTING: exposed Edison bulbs, black metal cage pendants, articulated factory floor lamps, gooseneck wall lights. Warm filament glow against darker backdrops, with strong directional task lighting.
5. WALL & CEILING TREATMENT: ONE feature wall in exposed brick or raw concrete, with the remaining walls in smooth warm plaster or matte paint. Keep the ceiling clean and flat: no exposed ductwork, no pipe runs, no visible conduit, no cable trays. Industrial character comes from that single honest surface, not from stripping the whole room back.
6. DECOR & STYLING: framed abstract or architectural prints in thin black frames, a few well-chosen ceramics, stacked books, a large leafy plant in a concrete or terracotta planter, a wool throw, a woven rug that softens the floor. No vintage signage, no gears or tools as ornament, no oversized exposed-mechanism clocks.
7. OVERALL MOOD: warm, relaxed, contemporary. A loft someone actually lives in — the brick and steel are background, and leather, timber, wool and plants carry the room. Grounded and easy rather than raw or hard-edged.`,
  japandi: `1. COLOR PALETTE: Warm Off-White #F0EBE2, Soft Oatmeal #D9CFBE, Pale Oak #C9B594, Charcoal Black #2E2A26, Muted Sage #9CA88D, Soft Clay #B8927A, Warm Grey #8A8478.
2. MATERIALS & FINISHES: pale oak and ash with visible straight grain, paper (washi) lampshades, raw linen and undyed cotton, smooth matte ceramics, blackened steel accents, woven rush or tatami, light bamboo.
3. FURNITURE CHARACTER: low, grounded, restrained silhouettes with clean straight lines softened by gentle curves. Solid wood with exposed joinery, minimal upholstery, thoughtful negative space around each piece.
4. LIGHTING: paper pendant lanterns, simple linen drum shades, slim black floor lamps, hidden warm LED accents. Soft diffused natural light is prioritized; fixtures are quiet and sculptural.
5. WALL & CEILING TREATMENT: smooth matte off-white plaster walls, occasional natural wood paneling or shoji-style screens, simple flat ceilings, no heavy moldings or decorative trim.
6. DECOR & STYLING: a single ceramic vessel, a branch arrangement (cherry blossom or olive), one or two framed minimalist prints, neatly stacked design books, woven baskets, one statement plant. Surfaces are mostly empty.
7. OVERALL MOOD: calm, intentional, breathable. The fusion of Scandinavian warmth and Japanese restraint creates a meditative atmosphere where every object earns its place.`,
  mid_century: `1. COLOR PALETTE: Walnut Brown #6B4226, Warm Cream #F0E9D8, Soft Sage #97A48B, Muted Rust #B3663D, Warm Off-White #F5EFE0, Deep Teal #2E5C6E, Warm Grey #8A8478.
2. MATERIALS & FINISHES: warm walnut and white-oak veneers with clean straight or gently curved edges, matte-finished woods (no glossy lacquer), brushed brass hardware used sparingly, subtle leather in caramel or cognac, matte ceramics, natural wool boucle, and linen. Avoid fiberglass, chrome, and any retro period hardware.
3. FURNITURE CHARACTER: contemporary silhouettes influenced by mid-century — clean tapered legs, low-slung profiles, refined proportions lifted off the floor for visual lightness. These are modern pieces, not literal period reproductions: no iconic novelty chairs, no pedestal-base reproductions, no turned or dowel-style chair backs. Restrained, refined, modern first — the mid-century reference is felt in the proportion and rhythm, not in a recognizable retro silhouette.
4. LIGHTING: slim brass or matte-black pendant lamps, arc floor lamps with restrained bases, understated brass sconces. Sculptural but calm — no radiating spoke or spike chandeliers, no space-age or retro-era pendants.
5. WALL & CEILING TREATMENT: matte painted walls in warm neutrals across the whole room. Slatted or fluted timber is RARE — at most ONE wall, only in a generously sized living or dining room, and only when the room has enough width to carry it. Never slat a hallway, a bathroom, a kitchen or a small room, and never slat more than one surface. Most rooms in this style have no slatted wall at all. Simple flat ceilings, no retro-era trim.
6. DECOR & STYLING: abstract art in muted tones, one sculptural ceramic vessel, curated design books, one architectural plant (fiddle leaf, rubber plant, monstera) in a matte planter. No retro novelty clocks, no record collections, no obviously period-kitsch objects. Surfaces are calm and considered.
7. OVERALL MOOD: warm, design-forward, contemporary. Mid-century warmth and rhythm without the period furniture — a modern interior that references the era through proportion and material, feeling both quiet and confident.`,
  modern: `1. COLOR PALETTE: warm and contemporary rather than cold — Warm White #F4F0E9, Soft Oat #E3D9C9, Warm Taupe #A89F92, Walnut #6B5544, Charcoal #333333, Muted Olive #7C7F5E, Terracotta #B87A5E. Warm neutrals carry the room and one deeper tone anchors it. Avoid a pure-white, cool-grey scheme; there should be visible warmth in every image.
2. MATERIALS & FINISHES: warm oak and walnut with visible grain, honed travertine or limestone, matte lacquer (never high-gloss), brushed brass and blackened steel in small doses, wool and heavy linen upholstery, boucle, leather in tan, matte ceramics, clear and reeded glass. Texture matters as much as line.
3. FURNITURE CHARACTER: clean rectilinear silhouettes, low profiles, blocky proportions, hidden joinery, integrated handles. Sofas with crisp tailored cushions, slim metal frames, modular configurations.
4. LIGHTING: linear LED fixtures, recessed downlights, slim track lighting, sculptural pendants in matte white or black. Cool-leaning neutral light with strong layering between ambient, task, and accent.
5. WALL & CEILING TREATMENT: smooth matte-painted walls in white or neutral tones, no moldings or trim, flat ceilings with hidden cove lighting, occasional accent walls in concrete or large-format stone.
6. DECOR & STYLING: generously styled, not bare — a large artwork plus a smaller framed pair, stacked design books, three or four ceramic vessels of different heights, a woven bowl, a throw over the sofa arm, cushions in mixed textures, two or three real plants in matte planters, a tray on the coffee table. Surfaces are curated and lived-in. Clean lines do NOT mean empty surfaces — this is not minimalism.
7. OVERALL MOOD: calm, warm, contemporary and clearly lived in. Clean architecture softened by warm timber, texture and real objects. Composed rather than stark, and never gallery-cold or showroom-empty.`,
  rustic: `1. COLOR PALETTE: Warm Cream #EAE0CC, Aged Wood Brown #6E4F30, Stone Grey #968C7E, Forest Green #3E5238, Rust Orange #A85A2A, Deep Charcoal #2F2A24, Soft Wheat #C9B98E.
2. MATERIALS & FINISHES: rough-hewn reclaimed wood with visible knots, natural stone, wrought iron, hand-forged metal, raw linen, wool throws, distressed leather, terracotta, hand-thrown ceramics.
3. FURNITURE CHARACTER: substantial, heavy, handcrafted forms. Trestle tables, ladder-back chairs, deep upholstered sofas in linen or leather, log-frame benches, slab wood tables with natural live edges.
4. LIGHTING: wrought iron chandeliers, lantern pendants, candle sconces, table lamps with linen or burlap shades. Warm amber lighting with a soft glow, layered with firelight where present.
5. WALL & CEILING TREATMENT: exposed timber beams, stone or brick accent walls, rough plaster or whitewashed wood paneling, wide plank wood ceilings, no machined trim.
6. DECOR & STYLING: vintage farmhouse tools, woven blankets, ceramic crockery, dried herbs and wildflowers in earthenware jugs, framed pastoral art, hand-thrown pottery, antlers or animal motifs, woven baskets.
7. OVERALL MOOD: warm, grounded, handmade. Natural imperfections and weathered textures create an honest, comforting atmosphere that feels rooted in tradition.`,
  transitional: `1. COLOR PALETTE: Warm White #F2EEE6, Soft Greige #C9C0B0, Taupe #A89684, Charcoal Grey #4A4541, Soft Cream #E8DFCB, Warm Brown #6B5544, Muted Sage #9DA68F.
2. MATERIALS & FINISHES: rift-sawn oak, polished marble with subtle veining, brushed brass and matte black metal, linen and velvet upholstery, smooth ceramics, frosted glass, leather in neutral tones.
3. FURNITURE CHARACTER: a balance of classic and contemporary — tailored sofas with clean lines but soft curves, upholstered dining chairs, wood pieces with simple traditional silhouettes, refined proportions without ornamentation.
4. LIGHTING: drum-shade chandeliers, simple brass or matte black pendants, ceramic table lamps with linen shades, recessed accent lighting. Warm and even, neither dramatic nor flat.
5. WALL & CEILING TREATMENT: smooth painted walls in warm neutrals, simple flat or subtly profiled trim, occasional shiplap or paneled accent walls, clean ceilings with restrained crown molding.
6. DECOR & STYLING: framed neutral art, ceramic vases with simple branches, stacks of design books, woven trays, soft throws, one or two architectural plants in matte planters.
7. OVERALL MOOD: balanced, timeless, comfortable. Neither overtly modern nor traditional — a refined middle ground that feels welcoming, polished, and quietly sophisticated.`,
  warm_contemporary: `1. COLOR PALETTE: Warm White #F3EFE8, Soft Cream #EDE4D6, Oat Beige #D8CDBA, Warm Greige #BFB4A2, Pale Oak #C9A876, Brushed Brass #B08D57, Soft Charcoal #4A4744, with occasional muted blue-grey #8A94A0 cushion accents.
2. MATERIALS & FINISHES: light rift-oak herringbone flooring, oak millwork with reeded/fluted glass fronts and integrated warm LED, honed white marble with soft grey veining, brushed brass and champagne-gold metal, ivory boucle and linen upholstery, sheer linen drapery, smooth matte plaster walls.
3. FURNITURE CHARACTER: soft rounded contemporary — curved boucle armchairs and low plush sofas with gentle curves, slim brass-based marble tables, tailored yet cozy and inviting; nothing sharp, boxy, industrial, or cold.
4. LIGHTING: a sculptural circular LED ring pendant in black-and-brass, a slim linear marble or alabaster pendant, recessed warm downlights in a clean tray ceiling, concealed cove strips. Warm, layered, glare-free.
5. WALL & CEILING TREATMENT: smooth painted warm-white walls; a clean, freshly finished flat ceiling with a subtle recessed tray; no exposed concrete, beams, pipes, or wiring; restrained shadow-gap detailing.
6. DECOR & STYLING: gold-framed botanical or abstract art in pairs, styled open shelving with ceramics and glassware, a marble bowl with fruit, soft throws and textured cushions, one architectural plant in a matte planter.
7. OVERALL MOOD: warm, elevated, quietly luxurious — a soft contemporary calm that feels layered and inviting, not stark. Comfortable sophistication filled with natural light.`,
  minimalist: `1. COLOR PALETTE: Warm White #F5F3EE, Off-White #FFFFFF, Soft Warm Grey #E0DBD5, Sage Mist #C3CBBD, Light Concrete #C8C4BE, Olive Leaf #6E7A5A, Warm Charcoal #4A4542, Raw Oak #C4AE8C. Predominantly warm neutral, with a quiet green carrying the one note of life in the room.
2. MATERIALS & FINISHES: seamless smooth matte plaster, honed concrete, Japanese white oak with minimal grain, raw-edge linen and undyed cotton, matte black stainless, tempered glass, monolithic stone slabs with no visible veining.
3. FURNITURE CHARACTER: strictly reduced silhouettes with zero ornamentation, very low profiles, single-material construction, hidden fasteners and frames, floating appearances. Every piece has maximum negative space around it.
4. LIGHTING: fully recessed LED strips in ceiling coves, a single sculptural pendant as the sole visible fixture, concealed wall-washing sources, flush matte switches. No decorative fixtures.
5. WALL & CEILING TREATMENT: seamless plaster walls without visible joints, monolithic matte white or warm off-white, no trim, no moldings whatsoever, floor-to-ceiling continuity, smooth flat ceiling.
6. DECOR & STYLING: few things, chosen carefully — not an empty room. One large artwork, one ceramic vessel, a small stack of books, a single real plant or branch arrangement in a simple pot, one folded textile. Roughly three or four deliberate objects in view, each with clear space around it. Surfaces stay largely open, but the room must read as inhabited and calm rather than unfinished or abandoned.
7. OVERALL MOOD: serene, warm and quietly alive. Restraint, not absence — the eye rests, but something green is growing and the room feels like somebody's, not a showroom awaiting delivery.`,
  maximalist: `1. COLOR PALETTE: deep, rich and saturated rather than bright — Ink Green #1F3D33, Emerald #2A6B4A, Oxblood #6E2A2A, Peacock Teal #147A80, Ochre Gold #C08A2E, Aubergine #4A2A45, Walnut #5A3E2B, Warm Chalk #F4EFE6. Jewel and heritage tones layered together, every hue deepened and slightly greyed so the room feels enveloping. Keep the whole palette in that deep register.
2. MATERIALS & FINISHES: layered and tactile — velvet and mohair in jewel tones, patterned wool rugs stacked over one another, printed linen and cotton in large-scale florals, stripes and geometrics, lacquered and burled wood, antique brass, marble, glazed and patterned tile, fringed and tasselled trims. Pattern meeting pattern is the point.
3. FURNITURE CHARACTER: collected rather than bought as a set — a deep velvet sofa in a jewel tone, two armchairs that do not match each other, an antique or vintage cabinet with real age beside a contemporary table, a patterned ottoman, a bar cart. Silhouettes are generous and comfortable. The room should look assembled over years by someone with strong taste, not styled in an afternoon.
4. LIGHTING: many small warm sources rather than one bright ceiling light — table lamps with pleated or patterned shades on several surfaces, antique-brass picture lights over the art, a floor lamp beside each seat, candles. The room is lit in warm pools that let the deep wall colours hold their depth, so corners glow rather than glare. Fittings are characterful and collected, never matching as a set.
5. WALL & CEILING TREATMENT: deep saturated paint on every wall, or a large-scale patterned wallpaper — botanical, oversized florals, painterly landscape murals or bold geometrics. A dense floor-to-ceiling gallery wall in mixed antique brass and dark timber frames. Colour may continue onto the ceiling. Ceilings stay flat.
6. DECOR & STYLING: abundance, carefully arranged — a dense gallery wall, books stacked everywhere, collected ceramics and glassware grouped by colour, table lamps with patterned or pleated shades, layered rugs, cushions in four or five different prints, tall plants, objects with provenance. Every surface holds something and nothing looks accidental.
7. OVERALL MOOD: rich, layered, personal and confident. Depth and pattern rather than brightness — a room that rewards a second look because there is always something else in it. Warm and enveloping, never loud or childlike.`,
  biophilic: `1. COLOR PALETTE: Natural White #F0EBE2, Stone Cream #E4DED5, Sage Green #8FA383, Leaf Green #6B8C5A, Deep Fern #3F5A3A, Bark Brown #7A5C3A, Warm Teak #A8794C, Terracotta #B86E4A. Green runs right through the room — in the planting first, and in soft painted or upholstered greens second. Warm neutrals hold the background so the greens read as living rather than decorative.
2. MATERIALS & FINISHES: raw teak and warm oak with visible grain, vertical timber battens and slats, bamboo, cork or honed concrete flooring, natural stone with real texture — river pebble, basalt, travertine — woven rattan, cane and seagrass, jute with natural dye, unglazed clay and terracotta, heavy linen. Greenery enters the room as REAL PLANTS growing in soil, never as a material applied to a wall.
3. FURNITURE CHARACTER: organic and grounded — softly curved, pebble-contoured seating, solid timber benches with visible grain, low round tables, rattan and cane chairs. Sinuous rather than geometric, sitting low and close to the floor so the eye goes to the daylight and the planting.
4. LIGHTING: daylight is the primary material: skylights, clerestories and full-height glazing wherever the room already has them, and where a window looks out, let real greenery be visible through it so the planting continues outside. Supplement with warm LED at golden-hour temperature and fixtures in rattan, paper, stone or wood. No cold-white sources.
5. WALL & CEILING TREATMENT: warm vertical timber battens or slats across one wall, raw lime plaster in earthy tones, exposed natural stone, timber-slat ceilings. One wall MAY be painted a soft sage or deep fern green where it sits behind planting. MOSS IS NOT PART OF THIS STYLE — never clad a wall, panel or ceiling in moss. A living vertical garden of real potted plants is permitted on at most ONE wall of a large, well-daylit room.
6. DECOR & STYLING: bring the outside in across the WHOLE room, evenly. Not one hero plant standing alone, and not wall-to-wall foliage. Distribute greenery at THREE scales: one or two floor-standing plants or a small indoor tree (Japanese maple, olive, fiddle leaf, rubber plant) in a stone, concrete or terracotta planter; three or four mid-height plants on furniture, shelves and window sills; and one or two trailing or climbing plants softening a high edge or the top of a shelf. Roughly eight to twelve plants in a normal room, varied in leaf shape and in shade of green, each with enough space to be read individually. Around them: a bed of river pebbles where the floor allows, stone and unglazed bowls, a branch or dried arrangement, botanical art, seed pods and natural specimens. The room should feel as though nature runs through it — balanced and lived-with, never a single plant placed for the photograph and never a garden centre.
7. OVERALL MOOD: restorative, green and alive. Nature is not a motif here, it is the subject — daylight, timber, stone and real growing plants at every level of the room, with the greenery outside answering the greenery inside.`,
  dopamine: `1. COLOR PALETTE: unapologetically joyful and saturated — Sunflower Yellow #F5C842, Bubblegum Pink #F58BB0, Sky Blue #6BB6E8, Fresh Mint #6ED9A8, Coral #F97C6E, Lilac #C8A6E8, Tangerine #F58A3B, Cream #FBF3E8. Multiple bright hues coexist on the same wall, upholstery, or object cluster.
2. MATERIALS & FINISHES: mix of soft-touch and playful — velvet in saturated colors, matte lacquered wood, glossy ceramic, rattan and cane, bouclé fabric in bright hues, terrazzo, playful printed cottons, powder-coated metal. Surfaces feel tactile and inviting.
3. FURNITURE CHARACTER: curved, rounded, playful silhouettes — marshmallow sofas, pill-shaped ottomans, kidney-shaped coffee tables, curvy accent chairs, mushroom lamps, oversized poufs. Contemporary shapes with a soft, huggable quality — every piece invites you to sit down.
4. LIGHTING: playful sculptural fixtures — mushroom-shaped table lamps, colorful glass pendants, rainbow neon accents (used sparingly), rattan sunbursts, oversized paper globes. Warm, ambient, and cheerful — the room feels sunny even in winter.
5. WALL & CEILING TREATMENT: bold paint colors including painted ceilings in coordinating bright tones, curved arch details on walls, color-blocked wall sections, playful murals or large-scale contemporary wallpaper (checkerboard, wavy stripes, retro-inspired florals). Ceilings stay flat but painted in a joyful color.
6. DECOR & STYLING: curated contemporary art in bright colors, posters and prints with graphic shapes, sculptural ceramic vases in saturated colors, oversized houseplants (monstera, banana plant, fiddle leaf), curved shelves with playful objects, throw pillows in mixed prints, patterned rugs with rounded edges.
7. OVERALL MOOD: joyful, mood-boosting, playful, saturated. The room is designed to lift the spirit the moment you walk in — every color and shape chosen for how it makes you feel. Curved edges, bright hues, and soft materials create a space that feels like a hug.`,
  trend_2026: `1. COLOR PALETTE: warm, grounded, tonal — Universal Khaki #C0B49A, Soft Clay #C08A6E, Warm Sand #E2D6C2, Olive #7C7F5E, Chocolate Brown #4A3A30, Cloud Dancer off-white #F0EEE9, Burnt Umber #6B4F3F. Greys are deliberately absent. Colors sit close together in tone — depth comes from layering related warm neutrals, not from contrast.
2. MATERIALS & FINISHES: solid and reclaimed wood with visible grain, architectural millwork and fluted or slatted panelling, boucle and chenille, heavy linen and cotton with woven texture, rough honed stone, unlacquered brass ageing naturally, rattan and natural fibre, marble used as an accent rather than a field. Everything matte or satin; nothing high-gloss.
3. FURNITURE CHARACTER: sculptural but comfortable — curved and rounded silhouettes, deep supportive cushioning, a substantial low sofa in warm neutral upholstery, one vintage or vintage-feeling piece with real age, modular and multifunctional storage that hides clutter. Pieces look built to keep rather than bought for a season. Nothing spindly, nothing obviously trend-chasing.
4. LIGHTING: layered and warm — a sculptural pendant in plaster, alabaster or unlacquered brass, wall sconces washing a textured wall, table lamps with linen or paper shades, concealed warm LED under joinery. No cool-white sources, no single central downlight grid.
5. WALL & CEILING TREATMENT: warm limewash or matte mineral paint in a tonal neutral, one wall in slatted or fluted timber applied flat to the existing surface, plain flat ceilings kept clean, restrained shadow-gap trim. In a small room the wall colour may continue onto the ceiling in the same tone.
6. DECOR & STYLING: fewer, better objects — one hand-thrown ceramic, stacked art or design books, a large textured artwork, an antique or vintage object with patina, one architectural plant in a matte planter, a heavy woven throw. Surfaces are styled but never crowded.
7. OVERALL MOOD: warm, tactile, collected, quietly current. The 2026 direction — comfort over minimalism, warm neutrals over grey, craft and longevity over fast furniture. A room that looks assembled over years rather than delivered in a week.`,
};

/** Nine paint colours per style — the card the owner reviews. */
export const STYLE_PALETTES: Record<string, PaletteColour[]> = {
  art_deco: [
    { name: "Cream Ivory", hex: "#F2E9D8", role: "field" },
    { name: "Warm Off-White", hex: "#F5EFE0", role: "field" },
    { name: "Warm Charcoal", hex: "#3A3A3A", role: "neutral" },
    { name: "Honed Marble Grey", hex: "#CFC9BF", role: "neutral" },
    { name: "Deep Forest", hex: "#2E4E3D", role: "accent" },
    { name: "Brushed Brass", hex: "#B8935E", role: "accent" },
    { name: "Warm Terracotta", hex: "#B87A5E", role: "accent" },
    { name: "Muted Burgundy", hex: "#7A3A42", role: "accent" },
    { name: "Ink Navy", hex: "#2B3A4A", role: "accent" },
  ],
  bohemian: [
    { name: "Cream", hex: "#F4ECD8", role: "field" },
    { name: "Warm White", hex: "#EFE7D6", role: "field" },
    { name: "Sand Jute", hex: "#D4C3A5", role: "neutral" },
    { name: "Aged Brass", hex: "#B08D57", role: "neutral" },
    { name: "Warm Terracotta", hex: "#C66B3D", role: "accent" },
    { name: "Rust Red", hex: "#A14D2A", role: "accent" },
    { name: "Mustard", hex: "#C99836", role: "accent" },
    { name: "Forest Green", hex: "#4A6B47", role: "accent" },
    { name: "Deep Plum", hex: "#5D3A4A", role: "accent" },
  ],
  coastal: [
    { name: "Soft White", hex: "#F7F4EE", role: "field" },
    { name: "Warm Cream", hex: "#EDE5D3", role: "field" },
    { name: "Sand Beige", hex: "#DCCFB4", role: "neutral" },
    { name: "Driftwood Grey", hex: "#B5AFA1", role: "neutral" },
    { name: "Bleached Rope", hex: "#E3D9C6", role: "neutral" },
    { name: "Ocean Blue", hex: "#5B7E9C", role: "accent" },
    { name: "Pale Aqua", hex: "#C5DDD8", role: "accent" },
    { name: "Weathered Navy", hex: "#2E4357", role: "accent" },
    { name: "Sea Glass Green", hex: "#9CBFB2", role: "accent" },
  ],
  industrial: [
    { name: "Concrete Grey", hex: "#8C8680", role: "field" },
    { name: "Cream White", hex: "#EFEAE0", role: "field" },
    { name: "Charcoal Grey", hex: "#3A3A3A", role: "neutral" },
    { name: "Aged Black", hex: "#1F1F1F", role: "neutral" },
    { name: "Brushed Steel", hex: "#A8A8A8", role: "neutral" },
    { name: "Rust Brown", hex: "#7A4A2A", role: "accent" },
    { name: "Warm Tan", hex: "#B08862", role: "accent" },
    { name: "Oxblood Leather", hex: "#6E3B32", role: "accent" },
    { name: "Weathered Copper", hex: "#7A9A8B", role: "accent" },
  ],
  japandi: [
    { name: "Warm Off-White", hex: "#F0EBE2", role: "field" },
    { name: "Soft Oatmeal", hex: "#D9CFBE", role: "field" },
    { name: "Pale Oak", hex: "#C9B594", role: "neutral" },
    { name: "Warm Grey", hex: "#8A8478", role: "neutral" },
    { name: "Rice Paper", hex: "#F3EFE6", role: "neutral" },
    { name: "Charcoal Black", hex: "#2E2A26", role: "accent" },
    { name: "Muted Sage", hex: "#9CA88D", role: "accent" },
    { name: "Soft Clay", hex: "#B8927A", role: "accent" },
    { name: "Indigo Ink", hex: "#3C4551", role: "accent" },
  ],
  mid_century: [
    { name: "Warm Cream", hex: "#F0E9D8", role: "field" },
    { name: "Warm Off-White", hex: "#F5EFE0", role: "field" },
    { name: "Warm Grey", hex: "#8A8478", role: "neutral" },
    { name: "Walnut Brown", hex: "#6B4226", role: "neutral" },
    { name: "Brushed Brass", hex: "#B08D57", role: "neutral" },
    { name: "Soft Sage", hex: "#97A48B", role: "accent" },
    { name: "Muted Rust", hex: "#B3663D", role: "accent" },
    { name: "Deep Teal", hex: "#2E5C6E", role: "accent" },
    { name: "Ochre Gold", hex: "#C79A4B", role: "accent" },
  ],
  modern: [
    { name: "Pure White", hex: "#FFFFFF", role: "field" },
    { name: "Cool White", hex: "#F5F7F9", role: "field" },
    { name: "Soft Grey", hex: "#DDDDDD", role: "neutral" },
    { name: "Muted Taupe", hex: "#A89F92", role: "neutral" },
    { name: "Warm Beige", hex: "#C9BCA8", role: "neutral" },
    { name: "Charcoal", hex: "#333333", role: "accent" },
    { name: "Black", hex: "#0A0A0A", role: "accent" },
    { name: "Graphite Blue", hex: "#46505C", role: "accent" },
    { name: "Warm Oak", hex: "#B99B72", role: "accent" },
  ],
  rustic: [
    { name: "Warm Cream", hex: "#EAE0CC", role: "field" },
    { name: "Soft Wheat", hex: "#C9B98E", role: "field" },
    { name: "Stone Grey", hex: "#968C7E", role: "neutral" },
    { name: "Aged Wood Brown", hex: "#6E4F30", role: "neutral" },
    { name: "Deep Charcoal", hex: "#2F2A24", role: "neutral" },
    { name: "Forest Green", hex: "#3E5238", role: "accent" },
    { name: "Rust Orange", hex: "#A85A2A", role: "accent" },
    { name: "Ox Blood", hex: "#7A3B2E", role: "accent" },
    { name: "Antique Gold", hex: "#B08A4A", role: "accent" },
  ],
  transitional: [
    { name: "Warm White", hex: "#F2EEE6", role: "field" },
    { name: "Soft Cream", hex: "#E8DFCB", role: "field" },
    { name: "Soft Greige", hex: "#C9C0B0", role: "neutral" },
    { name: "Taupe", hex: "#A89684", role: "neutral" },
    { name: "Warm Brown", hex: "#6B5544", role: "neutral" },
    { name: "Charcoal Grey", hex: "#4A4541", role: "accent" },
    { name: "Muted Sage", hex: "#9DA68F", role: "accent" },
    { name: "Soft Slate Blue", hex: "#7E8B99", role: "accent" },
    { name: "Aged Brass", hex: "#B0925E", role: "accent" },
  ],
  warm_contemporary: [
    { name: "Warm White", hex: "#F3EFE8", role: "field" },
    { name: "Soft Cream", hex: "#EDE4D6", role: "field" },
    { name: "Oat Beige", hex: "#D8CDBA", role: "neutral" },
    { name: "Warm Greige", hex: "#BFB4A2", role: "neutral" },
    { name: "Pale Oak", hex: "#C9A876", role: "neutral" },
    { name: "Brushed Brass", hex: "#B08D57", role: "accent" },
    { name: "Soft Charcoal", hex: "#4A4744", role: "accent" },
    { name: "Muted Blue-Grey", hex: "#8A94A0", role: "accent" },
    { name: "Soft Terracotta", hex: "#C08A6E", role: "accent" },
  ],
  minimalist: [
    { name: "Off-White", hex: "#FFFFFF", role: "field" },
    { name: "Warm White", hex: "#F5F3EE", role: "field" },
    { name: "Soft Warm Grey", hex: "#E0DBD5", role: "neutral" },
    { name: "Sage Mist", hex: "#C3CBBD", role: "neutral" },
    { name: "Light Concrete", hex: "#C8C4BE", role: "neutral" },
    { name: "Olive Leaf", hex: "#6E7A5A", role: "accent" },
    { name: "Warm Charcoal", hex: "#4A4542", role: "accent" },
    { name: "Raw Oak", hex: "#C4AE8C", role: "accent" },
    { name: "Black", hex: "#1A1A1A", role: "accent" },
  ],
  maximalist: [
    { name: "Warm Chalk", hex: "#F4EFE6", role: "field" },
    { name: "Ink Green", hex: "#1F3D33", role: "field" },
    { name: "Antique Brass", hex: "#A8823C", role: "neutral" },
    { name: "Walnut", hex: "#5A3E2B", role: "neutral" },
    { name: "Emerald", hex: "#2A6B4A", role: "accent" },
    { name: "Oxblood", hex: "#6E2A2A", role: "accent" },
    { name: "Peacock Teal", hex: "#147A80", role: "accent" },
    { name: "Ochre Gold", hex: "#C08A2E", role: "accent" },
    { name: "Aubergine", hex: "#4A2A45", role: "accent" },
  ],
  biophilic: [
    { name: "Natural White", hex: "#F0EBE2", role: "field" },
    { name: "Stone Cream", hex: "#E4DED5", role: "field" },
    { name: "Bark Brown", hex: "#7A5C3A", role: "neutral" },
    { name: "Sage Green", hex: "#8FA383", role: "neutral" },
    { name: "Riverstone Grey", hex: "#8C8880", role: "neutral" },
    { name: "Warm Teak", hex: "#A8794C", role: "accent" },
    { name: "Terracotta", hex: "#B86E4A", role: "accent" },
    { name: "Leaf Green", hex: "#6B8C5A", role: "accent" },
    { name: "Deep Fern", hex: "#3F5A3A", role: "accent" },
  ],
  dopamine: [
    { name: "Cream", hex: "#FBF3E8", role: "field" },
    { name: "Soft Shell", hex: "#F7E7DA", role: "field" },
    { name: "Sunflower Yellow", hex: "#F5C842", role: "accent" },
    { name: "Bubblegum Pink", hex: "#F58BB0", role: "accent" },
    { name: "Sky Blue", hex: "#6BB6E8", role: "accent" },
    { name: "Fresh Mint", hex: "#6ED9A8", role: "accent" },
    { name: "Coral", hex: "#F97C6E", role: "accent" },
    { name: "Lilac", hex: "#C8A6E8", role: "accent" },
    { name: "Tangerine", hex: "#F58A3B", role: "accent" },
  ],
  trend_2026: [
    { name: "Cloud Dancer Off-White", hex: "#F0EEE9", role: "field" },
    { name: "Warm Sand", hex: "#E2D6C2", role: "field" },
    { name: "Universal Khaki", hex: "#C0B49A", role: "neutral" },
    { name: "Chocolate Brown", hex: "#4A3A30", role: "neutral" },
    { name: "Unlacquered Brass", hex: "#B08D57", role: "neutral" },
    { name: "Soft Clay", hex: "#C08A6E", role: "accent" },
    { name: "Olive", hex: "#7C7F5E", role: "accent" },
    { name: "Burnt Umber", hex: "#6B4F3F", role: "accent" },
    { name: "Ink Charcoal", hex: "#3A3733", role: "accent" },
  ],
};

/** What furniture each room type must contain. */
export const ROOM_PROGRAM_RULES: Record<string, string> = {
  living_room: `The room MUST be a fully realized LIVING ROOM. Include ONLY furniture appropriate to a living room — a sofa, one or two armchairs, a coffee table, side tables, floor or table lamps, a rug, wall art, plants, and appropriate styling. Do NOT include dining tables, beds, kitchen cabinetry, desks, or bathroom fixtures.`,
  dining_room: `The room MUST be a fully realized DINING ROOM. The visual anchor is a dining table with 4–8 matching dining chairs, positioned as the centerpiece under a hanging pendant or chandelier. Add a sideboard or credenza against one wall, wall art, and appropriate styling. Do NOT include lounge or living-room seating groups, lounge armchairs arranged around a low central table, media consoles, or televisions, even if the target style is often shown in a living room. Any style furniture examples below should be REINTERPRETED as dining-room equivalents — a dining chair in that style, a dining table in that style, a sideboard in that style.`,
  bedroom: `The room MUST be a fully realized BEDROOM. The visual anchor is a fully-made bed with nightstands on both sides and bedside lamps. Add a bench at the foot, dresser or wardrobe, a rug under the bed, art on the wall, and appropriate styling. Do NOT include living-room furniture (sofa as primary piece, TV area), dining tables, or kitchen cabinetry. A reading chair in the corner is fine if the room is large. BED PLACEMENT (critical): every existing window or balcony door must stay fully visible, unobstructed, and exactly where it is — never cover it with the headboard, and never remove, shrink, move, or replace a window to make room for the bed. If the only large wall in view holds a window or balcony door, place the bed against a side wall or offset to one side of the window so the glazing stays completely clear; do not build a new solid headboard wall over a window, and do not hang art over a window.`,
  kitchen: `The room MUST be a fully realized KITCHEN. Include base and wall cabinetry, a countertop with backsplash, a range or cooktop, a sink with faucet, a range hood, appropriate appliances (fridge, oven), open shelving or a hutch, and a kitchen island with counter stools if the space allows. Do NOT include living-room furniture (sofa, armchair, coffee table), bedroom furniture, or dining tables (unless a small breakfast nook is clearly the intent).`,
  bathroom: `The room MUST be a fully realized BATHROOM. It MUST be properly TILED: real wall tile behind the vanity and through the shower or bath area, and tiled or stone flooring, with visible grout lines and a tile format, colour and laying pattern chosen to suit the target style. Include a vanity with sink(s) and mirror, a toilet, a shower or bathtub (or both), a glazed shower screen where there is a shower, towel bars or rings with real towels, sconces or vanity lighting, a bath mat, and appropriate styling. Do NOT leave the walls as bare plaster or paint alone, and do NOT include living-room furniture, bedroom furniture, or dining tables. Every fixture must be a real bathroom fixture.`,
  home_office: `The room MUST be a fully realized HOME OFFICE. The visual anchor is a desk with a task chair. Add a task lamp, bookshelves or storage, monitor(s) or a laptop, wall art, and appropriate styling. Do NOT include living-room furniture as the primary piece, beds, or dining tables. A small accent chair for a reading corner is fine.`,
  kids_room: `The room MUST be a fully realized KIDS' BEDROOM or PLAYROOM. Include a child-scale bed (or bunk beds), a small desk, storage bins or cubbies, a rug for floor play, playful wall art, and age-appropriate styling. Do NOT include adult living-room furniture, formal dining, or kitchen fixtures. BED PLACEMENT (critical): every existing window or balcony door must stay fully visible, unobstructed, and exactly where it is — never cover it with the headboard, and never remove, shrink, move, or replace a window to make room for the bed. If the only large wall in view holds a window or balcony door, place the bed against a side wall or offset to one side of the window so the glazing stays completely clear.`,
  outdoor: `The room MUST be a fully realized OUTDOOR SPACE (patio, terrace, or balcony as appropriate to the original photo). Include outdoor-rated seating (sofa, chairs, or dining set as fits the space), an outdoor rug, planters with real outdoor plants, string lights or outdoor sconces, and appropriate styling. All materials must be weather-appropriate. Do NOT include indoor furniture that would not survive weather.`,
  hallway: `The room MUST be a fully realized HALLWAY, and it MUST READ AS LEADING SOMEWHERE — never a sealed dead-end box. The view should carry through to a doorway, a wider opening, a turn, a staircase or a window at the far end, so the eye travels past the foreground and the space clearly connects two parts of a home. Where a source photograph already shows such an opening, keep it clear and unobstructed; never invent an opening the source does not show. Furnish it as a hallway: a narrow console or hall table against one wall, wall art or a gallery arrangement, a runner rug following the length of the space, wall sconces or pendants, and appropriate styling. Do NOT include living-room seating groups, beds, or dining tables.`,
  living_dining: `The room MUST be a fully realized OPEN-PLAN LIVING + DINING ROOM containing BOTH zones, readable as two zones within one single space. LOUNGE ZONE: a sofa, one or two armchairs, a coffee table, a floor or table lamp, and a rug whose edges define the zone's footprint. DINING ZONE: a dining table with 4-6 dining chairs beneath its own pendant or chandelier, plus a sideboard or credenza against a wall where the space allows. Separate the two zones ONLY with the rug edge, the lighting, the furniture backs, or a low console — NEVER with a new wall, partition, screen, glazed divider, step or level change, and never by splitting the ceiling. Leave a clear walking route of at least 900mm between the two zones and to every door. Both zones must share ONE material and colour vocabulary — the same woods, metals and textiles — so the space reads as a single room rather than two rooms photographed together. Do NOT include beds, kitchen cabinetry, desks, or bathroom fixtures.`,
};

/** 2026 Colours of the Year. A modifier, not a style. */
export const PAINT_MODIFIERS: PaintModifier[] = [
  { id: "cloud_dancer", name: "Cloud Dancer", brand: "Pantone 11-4201", hex: "#F0EEE9", role: "field", instruction: `Use it as the DOMINANT wall colour across the room, so the whole space reads in this off-white.` },
  { id: "silhouette", name: "Silhouette", brand: "Benjamin Moore AF-655", hex: "#6B4F3F", role: "accent", instruction: `Use it as the anchor colour on ONE feature wall, the joinery, or the largest upholstered piece.` },
  { id: "universal_khaki", name: "Universal Khaki", brand: "Sherwin-Williams SW 6150", hex: "#C0B49A", role: "field", instruction: `Use it across the walls, or on the main upholstered pieces if the walls must stay pale.` },
];
