/**
 * Style preset definitions for AI Vision.
 * 9 supported presets from the brief + 3 additional styles present in the UI
 * (Minimalist, Maximalist, Biophilic).  Each brief follows the same 7-section
 * structure that the style-extraction model produces, so they slot directly
 * into the generation prompt template.
 */

export type StylePreset =
  | "art_deco"
  | "bohemian"
  | "coastal"
  | "industrial"
  | "japandi"
  | "mid_century"
  | "modern"
  | "rustic"
  | "transitional"
  | "minimalist"
  | "maximalist"
  | "biophilic";

export type RoomType =
  | "living_room"
  | "dining_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "home_office"
  | "kids_room"
  | "outdoor"
  | "hallway";

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded style briefs (skips the Gemini text-extraction call for presets)
// ─────────────────────────────────────────────────────────────────────────────
export const STYLE_BRIEFS: Record<StylePreset, string> = {

  art_deco: `
1. COLOR PALETTE: restrained jewel tones balanced with warm neutrals — Deep Forest #2E4E3D, Warm Terracotta #B87A5E, Brushed Brass #B8935E, Cream Ivory #F2E9D8, Muted Burgundy #7A3A42, Warm Charcoal #3A3A3A, Warm Off-White #F5EFE0. Jewel tones appear as accents on one wall or key furniture, not saturating every surface.
2. MATERIALS & FINISHES: matte and satin-finished woods (warm walnut, white oak) with subtle grain, matte brass hardware with a brushed finish, honed marble (not polished) with subtle veining, velvet upholstery in warm jewel tones used on one or two pieces, linen and boucle for balance, ceramic accents.
3. FURNITURE CHARACTER: contemporary silhouettes with Art Deco-influenced proportion — clean geometric lines, gentle curves balanced with straight edges, refined tapered or fluted legs, rounded backs on lounge chairs, low-slung profiles lifted off the floor. Restrained and modern first; Art Deco felt through proportion and geometric rhythm, not literal period silhouettes.
4. LIGHTING: contemporary fixtures with geometric detail — slim brass linear pendants with frosted glass, fluted globe pendants, understated wall sconces with rounded shades, floor lamps with matte brass bases. Warm ambient lighting, layered but calm.
5. WALL & CEILING TREATMENT: matte painted walls in warm neutrals with one accent wall in a jewel tone or a subtle fluted-wood treatment, contemporary geometric wallpaper on a single feature wall (thin scale, calm rhythm), simple flat ceilings with a restrained painted or plaster finish. Slim brass reveal trim used sparingly at wall-to-ceiling junctions.
6. DECOR & STYLING: framed abstract or graphic art with geometric composition, one sculptural ceramic vessel in a matte finish, curated design books, one architectural plant in a matte brass or ceramic planter, considered objects placed with generous negative space between them. Surfaces feel edited, not layered.
7. OVERALL MOOD: warm, considered, design-forward, contemporary. Art Deco warmth and geometric rhythm without the period furniture — a modern interior that references the era through proportion, material warmth, and restrained detail, feeling both quiet and confident.
`.trim(),

  bohemian: `
1. COLOR PALETTE: Warm Terracotta #C66B3D, Cream #F4ECD8, Rust Red #A14D2A, Mustard #C99836, Forest Green #4A6B47, Deep Plum #5D3A4A, Warm White #EFE7D6.
2. MATERIALS & FINISHES: rattan, wicker, jute, raw and reclaimed wood with visible grain, hand-loomed textiles, macrame, kilim and Persian rugs, terracotta and unglazed ceramics, brass and copper accents, woven leather.
3. FURNITURE CHARACTER: low-slung, soft, lived-in forms. Mix-and-match pieces from different eras and origins. Curved rattan chairs, deep modular sofas with layered cushions, carved wood tables, floor cushions and poufs.
4. LIGHTING: rattan pendant lights, paper lanterns, brass and macrame fixtures, layered floor and table lamps with woven shades. Warm ambient lighting, often layered with candles and fairy lights.
5. WALL & CEILING TREATMENT: matte cream or warm white walls, occasional accent walls with tapestries or hand-painted murals, exposed wood beams where applicable, no formal moldings.
6. DECOR & STYLING: abundant houseplants and trailing greenery, layered textiles and throws, vintage rugs over rugs, framed botanical or tribal art, woven baskets, candles, dried pampas grass and palm leaves, collected ceramics, vintage books.
7. OVERALL MOOD: relaxed, eclectic, soulful. Layered textures and global influences create a warm, lived-in atmosphere that feels personal and unhurried.
`.trim(),

  coastal: `
1. COLOR PALETTE: Soft White #F7F4EE, Sand Beige #DCCFB4, Driftwood Grey #B5AFA1, Ocean Blue #5B7E9C, Pale Aqua #C5DDD8, Weathered Navy #2E4357, Warm Cream #EDE5D3.
2. MATERIALS & FINISHES: whitewashed and weathered oak, bleached pine, natural linen and cotton, jute and sisal rugs, rope detailing, distressed white-painted wood, sea glass, brushed nickel and aged brass.
3. FURNITURE CHARACTER: relaxed slipcovered sofas and armchairs, light wooden frames, woven natural fiber chairs, simple farmhouse-style tables, breezy and informal proportions with rounded edges.
4. LIGHTING: woven rope or rattan pendants, glass jar lanterns, white linen drum shades, brushed nickel sconces. Bright, airy daylight is the primary source — fixtures supplement rather than dominate.
5. WALL & CEILING TREATMENT: matte white or pale sand walls, horizontal shiplap or beadboard accents, white-painted ceiling beams where present, simple white trim.
6. DECOR & STYLING: linen throw pillows, woven baskets, framed botanical prints or seascape art, pottery in muted blues and whites, driftwood objects, simple greenery in glass vases, sheer linen curtains.
7. OVERALL MOOD: light, airy, restorative. Soft natural materials and a breezy palette evoke a calm seaside cottage atmosphere.
`.trim(),

  industrial: `
1. COLOR PALETTE: Charcoal Grey #3A3A3A, Rust Brown #7A4A2A, Concrete Grey #8C8680, Aged Black #1F1F1F, Warm Tan #B08862, Brushed Steel #A8A8A8, Cream White #EFEAE0.
2. MATERIALS & FINISHES: exposed brick, raw concrete, blackened steel, reclaimed timber with visible saw marks, distressed leather, riveted metal, Edison bulb wiring, cast iron, weathered copper.
3. FURNITURE CHARACTER: heavy, utilitarian, functional forms with visible construction. Steel-framed tables with reclaimed wood tops, riveted leather sofas, factory cart coffee tables, metal shelving, mechanic's stools.
4. LIGHTING: exposed Edison bulbs, black metal cage pendants, articulated factory floor lamps, gooseneck wall lights. Warm filament glow against darker backdrops, with strong directional task lighting.
5. WALL & CEILING TREATMENT: exposed brick walls, raw concrete or polished cement, exposed ductwork and pipes on ceilings where appropriate, metal beams left visible, no decorative moldings.
6. DECOR & STYLING: vintage signage, framed blueprints or maps, industrial gears and tools as objects, leather-bound books, metal storage crates, succulents in concrete planters, large clocks with exposed mechanisms.
7. OVERALL MOOD: raw, honest, masculine. Structural elements are celebrated rather than hidden, creating a grounded warehouse-loft atmosphere with warmth from leather and wood.
`.trim(),

  japandi: `
1. COLOR PALETTE: Warm Off-White #F0EBE2, Soft Oatmeal #D9CFBE, Pale Oak #C9B594, Charcoal Black #2E2A26, Muted Sage #9CA88D, Soft Clay #B8927A, Warm Grey #8A8478.
2. MATERIALS & FINISHES: pale oak and ash with visible straight grain, paper (washi) lampshades, raw linen and undyed cotton, smooth matte ceramics, blackened steel accents, woven rush or tatami, light bamboo.
3. FURNITURE CHARACTER: low, grounded, restrained silhouettes with clean straight lines softened by gentle curves. Solid wood with exposed joinery, minimal upholstery, thoughtful negative space around each piece.
4. LIGHTING: paper pendant lanterns, simple linen drum shades, slim black floor lamps, hidden warm LED accents. Soft diffused natural light is prioritized; fixtures are quiet and sculptural.
5. WALL & CEILING TREATMENT: smooth matte off-white plaster walls, occasional natural wood paneling or shoji-style screens, simple flat ceilings, no heavy moldings or decorative trim.
6. DECOR & STYLING: a single ceramic vessel, a branch arrangement (cherry blossom or olive), one or two framed minimalist prints, neatly stacked design books, woven baskets, one statement plant. Surfaces are mostly empty.
7. OVERALL MOOD: calm, intentional, breathable. The fusion of Scandinavian warmth and Japanese restraint creates a meditative atmosphere where every object earns its place.
`.trim(),

  mid_century: `
1. COLOR PALETTE: Walnut Brown #6B4226, Warm Cream #F0E9D8, Soft Sage #97A48B, Muted Rust #B3663D, Warm Off-White #F5EFE0, Deep Teal #2E5C6E, Warm Grey #8A8478.
2. MATERIALS & FINISHES: warm walnut and white-oak veneers with clean straight or gently curved edges, matte-finished woods (no glossy lacquer), brushed brass hardware used sparingly, subtle leather in caramel or cognac, matte ceramics, natural wool boucle, and linen. Avoid fiberglass, chrome, and any retro period hardware.
3. FURNITURE CHARACTER: contemporary silhouettes influenced by mid-century — clean tapered legs, low-slung profiles, refined proportions lifted off the floor for visual lightness. These are modern pieces, not literal period reproductions: no iconic novelty chairs, no pedestal-base reproductions, no turned or dowel-style chair backs. Restrained, refined, modern first — the mid-century reference is felt in the proportion and rhythm, not in a recognizable retro silhouette.
4. LIGHTING: slim brass or matte-black pendant lamps, arc floor lamps with restrained bases, understated brass sconces. Sculptural but calm — no radiating spoke or spike chandeliers, no space-age or retro-era pendants.
5. WALL & CEILING TREATMENT: matte painted walls in warm neutrals, one optional feature wall in walnut or oak vertical slats (thin, tight rhythm — not thick period panels), simple flat ceilings, no retro-era trim.
6. DECOR & STYLING: abstract art in muted tones, one sculptural ceramic vessel, curated design books, one architectural plant (fiddle leaf, rubber plant, monstera) in a matte planter. No retro novelty clocks, no record collections, no obviously period-kitsch objects. Surfaces are calm and considered.
7. OVERALL MOOD: warm, design-forward, contemporary. Mid-century warmth and rhythm without the period furniture — a modern interior that references the era through proportion and material, feeling both quiet and confident.
`.trim(),

  modern: `
1. COLOR PALETTE: Pure White #FFFFFF, Soft Grey #DDDDDD, Charcoal #333333, Warm Beige #C9BCA8, Black #0A0A0A, Cool White #F5F7F9, Muted Taupe #A89F92.
2. MATERIALS & FINISHES: smooth matte and high-gloss lacquer, polished concrete, large-format porcelain, stainless steel, tempered and frosted glass, high-grade engineered wood, leather in neutral tones.
3. FURNITURE CHARACTER: clean rectilinear silhouettes, low profiles, blocky proportions, hidden joinery, integrated handles. Sofas with crisp tailored cushions, slim metal frames, modular configurations.
4. LIGHTING: linear LED fixtures, recessed downlights, slim track lighting, sculptural pendants in matte white or black. Cool-leaning neutral light with strong layering between ambient, task, and accent.
5. WALL & CEILING TREATMENT: smooth matte-painted walls in white or neutral tones, no moldings or trim, flat ceilings with hidden cove lighting, occasional accent walls in concrete or large-format stone.
6. DECOR & STYLING: minimal — a single sculpture, one large abstract artwork, neatly arranged design books, one architectural plant (fiddle leaf, snake plant). Surfaces are deliberately clear.
7. OVERALL MOOD: clean, deliberate, uncluttered. Form follows function in a calm contemporary atmosphere that feels gallery-like and effortlessly composed.
`.trim(),

  rustic: `
1. COLOR PALETTE: Warm Cream #EAE0CC, Aged Wood Brown #6E4F30, Stone Grey #968C7E, Forest Green #3E5238, Rust Orange #A85A2A, Deep Charcoal #2F2A24, Soft Wheat #C9B98E.
2. MATERIALS & FINISHES: rough-hewn reclaimed wood with visible knots, natural stone, wrought iron, hand-forged metal, raw linen, wool throws, distressed leather, terracotta, hand-thrown ceramics.
3. FURNITURE CHARACTER: substantial, heavy, handcrafted forms. Trestle tables, ladder-back chairs, deep upholstered sofas in linen or leather, log-frame benches, slab wood tables with natural live edges.
4. LIGHTING: wrought iron chandeliers, lantern pendants, candle sconces, table lamps with linen or burlap shades. Warm amber lighting with a soft glow, layered with firelight where present.
5. WALL & CEILING TREATMENT: exposed timber beams, stone or brick accent walls, rough plaster or whitewashed wood paneling, wide plank wood ceilings, no machined trim.
6. DECOR & STYLING: vintage farmhouse tools, woven blankets, ceramic crockery, dried herbs and wildflowers in earthenware jugs, framed pastoral art, hand-thrown pottery, antlers or animal motifs, woven baskets.
7. OVERALL MOOD: warm, grounded, handmade. Natural imperfections and weathered textures create an honest, comforting atmosphere that feels rooted in tradition.
`.trim(),

  transitional: `
1. COLOR PALETTE: Warm White #F2EEE6, Soft Greige #C9C0B0, Taupe #A89684, Charcoal Grey #4A4541, Soft Cream #E8DFCB, Warm Brown #6B5544, Muted Sage #9DA68F.
2. MATERIALS & FINISHES: rift-sawn oak, polished marble with subtle veining, brushed brass and matte black metal, linen and velvet upholstery, smooth ceramics, frosted glass, leather in neutral tones.
3. FURNITURE CHARACTER: a balance of classic and contemporary — tailored sofas with clean lines but soft curves, upholstered dining chairs, wood pieces with simple traditional silhouettes, refined proportions without ornamentation.
4. LIGHTING: drum-shade chandeliers, simple brass or matte black pendants, ceramic table lamps with linen shades, recessed accent lighting. Warm and even, neither dramatic nor flat.
5. WALL & CEILING TREATMENT: smooth painted walls in warm neutrals, simple flat or subtly profiled trim, occasional shiplap or paneled accent walls, clean ceilings with restrained crown molding.
6. DECOR & STYLING: framed neutral art, ceramic vases with simple branches, stacks of design books, woven trays, soft throws, one or two architectural plants in matte planters.
7. OVERALL MOOD: balanced, timeless, comfortable. Neither overtly modern nor traditional — a refined middle ground that feels welcoming, polished, and quietly sophisticated.
`.trim(),

  minimalist: `
1. COLOR PALETTE: Pure White #FFFFFF, Off-White #F5F3EE, Soft Warm Grey #E0DBD5, Light Concrete #C8C4BE, Warm Charcoal #4A4542, Black #1A1A1A, Pale Linen #EAE6E0.
2. MATERIALS & FINISHES: seamless smooth matte plaster, honed concrete, Japanese white oak with minimal grain, raw-edge linen and undyed cotton, matte black stainless, tempered glass, monolithic stone slabs with no visible veining.
3. FURNITURE CHARACTER: strictly reduced silhouettes with zero ornamentation, very low profiles, single-material construction, hidden fasteners and frames, floating appearances. Every piece has maximum negative space around it.
4. LIGHTING: fully recessed LED strips in ceiling coves, a single sculptural pendant as the sole visible fixture, concealed wall-washing sources, flush matte switches. No decorative fixtures.
5. WALL & CEILING TREATMENT: seamless plaster walls without visible joints, monolithic matte white or warm off-white, no trim, no moldings whatsoever, floor-to-ceiling continuity, smooth flat ceiling.
6. DECOR & STYLING: one ceramic vessel, one branch. Every surface has at minimum 80% open space. No pattern, no collections, no clusters. Art is a single large piece, never grouped.
7. OVERALL MOOD: serene, silent, absolute. The absence of elements creates presence — the room breathes and the eye rests completely.
`.trim(),

  maximalist: `
1. COLOR PALETTE: high-saturation, joyful, contemporary — Marigold #E8952C, Hot Pink #E24885, Cobalt #2A6BB0, Emerald #2A6B4A, Turmeric Yellow #F0B429, Coral #E85E4A, Peacock Teal #147A80. Multiple saturated colors coexist on the same wall or upholstery.
2. MATERIALS & FINISHES: mix of matte and glossy — velvet upholstery in solid saturated colors, lacquered wood in bold colors, rattan and cane, ceramic tile in playful patterns, contemporary printed cottons and linens in large-scale florals, geometric, and animal prints. Brass hardware in matte finish.
3. FURNITURE CHARACTER: contemporary and eclectic silhouettes chosen for character — a curved modular sofa in cobalt velvet, mid-century lounge chairs in playful colors, a lacquered coffee table, a rattan accent chair, an oversized floor cushion. Pieces are BOLD and STATEMENT but CURRENT — clean straight or gently curved lines, off-the-floor tapered legs, refined proportions.
4. LIGHTING: sculptural contemporary pendants (contemporary rattan or paper lanterns, playful architectural pendants), colorful table lamps with printed shades, arc floor lamps. Playful, sculptural, current.
5. WALL & CEILING TREATMENT: bold saturated paint colors, one feature wall in a contemporary patterned wallpaper (large-scale florals, murals, geometric, checkerboard), a dense gallery wall using mixed modern frames (thin black, thin brass, colored), painted color on the ceiling optional. Ceilings stay flat and modern.
6. DECOR & STYLING: dense gallery wall with modern art (posters, abstract prints, contemporary photography, colorful paintings), stacked art books, curated ceramics in saturated colors, many houseplants (monstera, palms, trailing pothos, rubber plants), layered patterned rugs, playful objects (contemporary sculpture, colorful vases, collected ceramics).
7. OVERALL MOOD: joyful, personal, current, saturated. Maximum color and pattern from a modern vocabulary. The room reads like a curated contemporary home whose owner loves color and character.
`.trim(),

  biophilic: `
1. COLOR PALETTE: Leaf Green #6B8C5A, Bark Brown #7A5C3A, Stone Cream #E4DED5, Sky Blue #A8C4CE, Moss #4F6B47, Terracotta #B86E4A, Natural White #F0EBE2.
2. MATERIALS & FINISHES: raw teak and bamboo, cork flooring, natural stone with visible texture, pressed botanicals under glass, woven rattan and seagrass, vertical moss panels on feature walls, jute rugs with natural dye, unglazed clay ceramics.
3. FURNITURE CHARACTER: organic shapes inspired by natural forms — pebble-contoured sofas, branch-like shelving, leaf-shaped tables. Low, grounded, sinuous lines referencing geological and botanical shapes rather than geometric ones.
4. LIGHTING: full-spectrum daylight maximized through all openings, supplemented by warm LED mimicking golden-hour light. Fixtures in natural materials (rattan, stone, wood). No cold-white light sources.
5. WALL & CEILING TREATMENT: vertical plant panels or moss walls on one feature surface, raw plaster in earthy tones, exposed natural stone, timber slat ceiling panels, no synthetic-looking finishes.
6. DECOR & STYLING: cascading pothos and philodendron, large leafy indoor trees (fiddle leaf, rubber plant, monstera), terracotta planters of all sizes, stone pebble bowls, pressed leaf art, water features where applicable, seed pods and natural specimens.
7. OVERALL MOOD: restorative, alive, deeply connected to nature. The room breathes through its plants and materials, reducing stress and inviting quiet contemplation.
`.trim(),

};

// ─────────────────────────────────────────────────────────────────────────────
// Room type display labels used in the generation prompt
// ─────────────────────────────────────────────────────────────────────────────
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living_room: "LIVING ROOM",
  dining_room:  "DINING ROOM",
  bedroom:      "BEDROOM",
  kitchen:      "KITCHEN",
  bathroom:     "BATHROOM",
  home_office:  "HOME OFFICE",
  kids_room:    "KIDS ROOM",
  outdoor:      "OUTDOOR SPACE",
  hallway:      "HALLWAY",
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers (frontend display names -> canonical keys)
// ─────────────────────────────────────────────────────────────────────────────

export const STYLE_NAME_TO_PRESET: Record<string, StylePreset> = {
  "Japandi":      "japandi",
  "Modern":       "modern",
  "Mid-Century":  "mid_century",
  "Bohemian":     "bohemian",
  "Rustic":       "rustic",
  "Art Deco":     "art_deco",
  "Industrial":   "industrial",
  "Coastal":      "coastal",
  "Minimalist":   "minimalist",
  "Maximalist":   "maximalist",
  "Biophilic":    "biophilic",
};

// Maps every room-picker label the frontend can send to a canonical RoomType.
// Two label conventions exist and BOTH must resolve, or the server silently
// falls back to `living_room` (wrong-room bug):
//   • VisionExperience.tsx `ROOM_TYPES_FULL` — the LIVE chips — uses the short
//     forms "Living" and "Dining" (the rest already match the full forms).
//   • AIConceptsPage `ROOM_TYPES` (legacy) uses the full forms "Living Room" /
//     "Dining Room".
// Keep this in sync with ROOM_TYPES_FULL — the promptTemplates test asserts it.
export const ROOM_NAME_TO_TYPE: Record<string, RoomType> = {
  // Full forms (legacy AIConceptsPage chips)
  "Living Room": "living_room",
  "Dining Room": "dining_room",
  // Short forms (live VisionExperience chips)
  "Living":      "living_room",
  "Dining":      "dining_room",
  // Identical in both conventions
  "Bedroom":     "bedroom",
  "Kitchen":     "kitchen",
  "Bathroom":    "bathroom",
  "Home Office": "home_office",
  "Kids Room":   "kids_room",
  "Outdoor":     "outdoor",
  "Hallway":     "hallway",
};
