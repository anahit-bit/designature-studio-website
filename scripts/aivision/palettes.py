"""
Per-style colour palettes — nine paint colours each, in the shape of a paint-brand
palette card.

WHY THIS EXISTS: the style briefs describe a look but every generation of a given
style reached for the same two or three colours, so fifteen styles produced rooms
that felt related. Each generation now gets exactly ONE accent drawn from its
style's palette, so the same style stays recognisable while individual concepts
differ.

Roles:
  field    a large-surface colour — walls, the dominant plane. Rarely the accent.
  neutral  supporting quiet tones — joinery, stone, metal, upholstery.
  accent   the single strongest colour note. ONE of these is chosen per generation.

Every colour marked accent must be able to carry a room on its own; a style needs
at least three or its concepts stop varying.

Seed data only. Once the workbook exists the WORKBOOK is the source of truth —
this file is what created it, not what maintains it.
"""

# style preset key -> [(name, hex, role), ...]  exactly 9 each
PALETTES = {
    "art_deco": [
        ("Cream Ivory", "#F2E9D8", "field"),
        ("Warm Off-White", "#F5EFE0", "field"),
        ("Warm Charcoal", "#3A3A3A", "neutral"),
        ("Brushed Brass", "#B8935E", "neutral"),
        ("Honed Marble Grey", "#CFC9BF", "neutral"),
        ("Deep Forest", "#2E4E3D", "accent"),
        ("Warm Terracotta", "#B87A5E", "accent"),
        ("Muted Burgundy", "#7A3A42", "accent"),
        ("Ink Navy", "#2B3A4A", "accent"),
    ],
    "bohemian": [
        ("Cream", "#F4ECD8", "field"),
        ("Warm White", "#EFE7D6", "field"),
        ("Sand Jute", "#D4C3A5", "neutral"),
        ("Aged Brass", "#B08D57", "neutral"),
        ("Warm Terracotta", "#C66B3D", "accent"),
        ("Rust Red", "#A14D2A", "accent"),
        ("Mustard", "#C99836", "accent"),
        ("Forest Green", "#4A6B47", "accent"),
        ("Deep Plum", "#5D3A4A", "accent"),
    ],
    "coastal": [
        ("Soft White", "#F7F4EE", "field"),
        ("Warm Cream", "#EDE5D3", "field"),
        ("Sand Beige", "#DCCFB4", "neutral"),
        ("Driftwood Grey", "#B5AFA1", "neutral"),
        ("Bleached Rope", "#E3D9C6", "neutral"),
        ("Ocean Blue", "#5B7E9C", "accent"),
        ("Pale Aqua", "#C5DDD8", "accent"),
        ("Weathered Navy", "#2E4357", "accent"),
        ("Sea Glass Green", "#9CBFB2", "accent"),
    ],
    "industrial": [
        ("Concrete Grey", "#8C8680", "field"),
        ("Cream White", "#EFEAE0", "field"),
        ("Charcoal Grey", "#3A3A3A", "neutral"),
        ("Aged Black", "#1F1F1F", "neutral"),
        ("Brushed Steel", "#A8A8A8", "neutral"),
        ("Rust Brown", "#7A4A2A", "accent"),
        ("Warm Tan", "#B08862", "accent"),
        ("Oxblood Leather", "#6E3B32", "accent"),
        ("Weathered Copper", "#7A9A8B", "accent"),
    ],
    "japandi": [
        ("Warm Off-White", "#F0EBE2", "field"),
        ("Soft Oatmeal", "#D9CFBE", "field"),
        ("Pale Oak", "#C9B594", "neutral"),
        ("Warm Grey", "#8A8478", "neutral"),
        ("Rice Paper", "#F3EFE6", "neutral"),
        ("Charcoal Black", "#2E2A26", "accent"),
        ("Muted Sage", "#9CA88D", "accent"),
        ("Soft Clay", "#B8927A", "accent"),
        ("Indigo Ink", "#3C4551", "accent"),
    ],
    "mid_century": [
        ("Warm Cream", "#F0E9D8", "field"),
        ("Warm Off-White", "#F5EFE0", "field"),
        ("Warm Grey", "#8A8478", "neutral"),
        ("Walnut Brown", "#6B4226", "neutral"),
        ("Brushed Brass", "#B08D57", "neutral"),
        ("Soft Sage", "#97A48B", "accent"),
        ("Muted Rust", "#B3663D", "accent"),
        ("Deep Teal", "#2E5C6E", "accent"),
        ("Ochre Gold", "#C79A4B", "accent"),
    ],
    "modern": [
        ("Pure White", "#FFFFFF", "field"),
        ("Cool White", "#F5F7F9", "field"),
        ("Soft Grey", "#DDDDDD", "neutral"),
        ("Muted Taupe", "#A89F92", "neutral"),
        ("Warm Beige", "#C9BCA8", "neutral"),
        ("Charcoal", "#333333", "accent"),
        ("Black", "#0A0A0A", "accent"),
        ("Graphite Blue", "#46505C", "accent"),
        ("Warm Oak", "#B99B72", "accent"),
    ],
    "rustic": [
        ("Warm Cream", "#EAE0CC", "field"),
        ("Soft Wheat", "#C9B98E", "field"),
        ("Stone Grey", "#968C7E", "neutral"),
        ("Aged Wood Brown", "#6E4F30", "neutral"),
        ("Deep Charcoal", "#2F2A24", "neutral"),
        ("Forest Green", "#3E5238", "accent"),
        ("Rust Orange", "#A85A2A", "accent"),
        ("Ox Blood", "#7A3B2E", "accent"),
        ("Antique Gold", "#B08A4A", "accent"),
    ],
    "transitional": [
        ("Warm White", "#F2EEE6", "field"),
        ("Soft Cream", "#E8DFCB", "field"),
        ("Soft Greige", "#C9C0B0", "neutral"),
        ("Taupe", "#A89684", "neutral"),
        ("Warm Brown", "#6B5544", "neutral"),
        ("Charcoal Grey", "#4A4541", "accent"),
        ("Muted Sage", "#9DA68F", "accent"),
        ("Soft Slate Blue", "#7E8B99", "accent"),
        ("Aged Brass", "#B0925E", "accent"),
    ],
    "warm_contemporary": [
        ("Warm White", "#F3EFE8", "field"),
        ("Soft Cream", "#EDE4D6", "field"),
        ("Oat Beige", "#D8CDBA", "neutral"),
        ("Warm Greige", "#BFB4A2", "neutral"),
        ("Pale Oak", "#C9A876", "neutral"),
        ("Brushed Brass", "#B08D57", "accent"),
        ("Soft Charcoal", "#4A4744", "accent"),
        ("Muted Blue-Grey", "#8A94A0", "accent"),
        ("Soft Terracotta", "#C08A6E", "accent"),
    ],
    "minimalist": [
        ("Pure White", "#FFFFFF", "field"),
        ("Off-White", "#F5F3EE", "field"),
        ("Soft Warm Grey", "#E0DBD5", "neutral"),
        ("Light Concrete", "#C8C4BE", "neutral"),
        ("Pale Linen", "#EAE6E0", "neutral"),
        ("Warm Charcoal", "#4A4542", "accent"),
        ("Black", "#1A1A1A", "accent"),
        ("Pale Ash", "#BDB8B0", "accent"),
        ("Raw Oak", "#C4AE8C", "accent"),
    ],
    "maximalist": [
        ("Warm Chalk", "#F4EFE6", "field"),
        ("Emerald", "#2A6B4A", "field"),
        ("Matte Brass", "#B08D57", "neutral"),
        ("Marigold", "#E8952C", "accent"),
        ("Hot Pink", "#E24885", "accent"),
        ("Cobalt", "#2A6BB0", "accent"),
        ("Turmeric Yellow", "#F0B429", "accent"),
        ("Coral", "#E85E4A", "accent"),
        ("Peacock Teal", "#147A80", "accent"),
    ],
    # Reworked 2026-08-31. Was 5 accents, THREE of them green (Leaf Green, Moss,
    # Deep Fern) — so 60% of generations put a green accent on an already-green
    # brief and every room came back as a moss wall. Now 4 accents, ONE green:
    # in this style the green belongs to the plants, not to the surfaces.
    "biophilic": [
        ("Natural White", "#F0EBE2", "field"),
        ("Stone Cream", "#E4DED5", "field"),
        ("Bark Brown", "#7A5C3A", "neutral"),
        ("Clay Sand", "#D6C6AE", "neutral"),
        ("Riverstone Grey", "#8C8880", "neutral"),
        ("Warm Teak", "#A8794C", "accent"),
        ("Terracotta", "#B86E4A", "accent"),
        ("Leaf Green", "#6B8C5A", "accent"),
        ("Charcoal Basalt", "#3A3A38", "accent"),
    ],
    "dopamine": [
        ("Cream", "#FBF3E8", "field"),
        ("Soft Shell", "#F7E7DA", "field"),
        ("Sunflower Yellow", "#F5C842", "accent"),
        ("Bubblegum Pink", "#F58BB0", "accent"),
        ("Sky Blue", "#6BB6E8", "accent"),
        ("Fresh Mint", "#6ED9A8", "accent"),
        ("Coral", "#F97C6E", "accent"),
        ("Lilac", "#C8A6E8", "accent"),
        ("Tangerine", "#F58A3B", "accent"),
    ],
    "trend_2026": [
        ("Cloud Dancer Off-White", "#F0EEE9", "field"),
        ("Warm Sand", "#E2D6C2", "field"),
        ("Universal Khaki", "#C0B49A", "neutral"),
        ("Chocolate Brown", "#4A3A30", "neutral"),
        ("Unlacquered Brass", "#B08D57", "neutral"),
        ("Soft Clay", "#C08A6E", "accent"),
        ("Olive", "#7C7F5E", "accent"),
        ("Burnt Umber", "#6B4F3F", "accent"),
        ("Ink Charcoal", "#3A3733", "accent"),
    ],
}

# The 2026 Colours of the Year. Not a style — a MODIFIER that replaces whichever
# accent the palette would have chosen, so the colour is guaranteed to appear and
# the style survives intact.
#
# Hexes are close approximations read from published swatches, not brand data
# files. Confirm against a real fan deck before printing anything.
PAINT_2026 = [
    {
        "id": "cloud_dancer",
        "name": "Cloud Dancer",
        "brand": "Pantone 11-4201",
        "hex": "#F0EEE9",
        "role": "field",
        "note": "Soft billowy off-white — the first true white Pantone has named. Light enough to take the walls.",
        "instruction": "Use it as the DOMINANT wall colour across the room, so the whole space reads in this off-white.",
    },
    {
        "id": "silhouette",
        "name": "Silhouette",
        "brand": "Benjamin Moore AF-655",
        "hex": "#6B4F3F",
        "role": "accent",
        "note": "Burnt umber with charcoal notes. Deep — it anchors rather than fills.",
        "instruction": "Use it as the anchor colour on ONE feature wall, the joinery, or the largest upholstered piece.",
    },
    {
        "id": "universal_khaki",
        "name": "Universal Khaki",
        "brand": "Sherwin-Williams SW 6150",
        "hex": "#C0B49A",
        "role": "field",
        "note": "Earthy mid-neutral between beige and taupe, faint green undertone. Works as wall or upholstery.",
        "instruction": "Use it across the walls, or on the main upholstered pieces if the walls must stay pale.",
    },
]
