import React from 'react';
import {
  Maximize,
  Palette,
  ShoppingBag,
  Compass,
  Layers,
  View,
  PenTool,
  FileText
} from 'lucide-react';
import { HeroSlide, Service, Project } from './types';
import { Language } from './LanguageContext';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         HOW TO ADD A PROJECT                               ║
// ║                                                                             ║
// ║  1. Copy one project block below (from { id: '...' to the closing },)      ║
// ║  2. Paste it at the end of PROJECTS_LIST (before the closing ] )           ║
// ║  3. Give it the next id number                                              ║
// ║  4. Replace every URL with your Cloudinary links                           ║
// ║  5. Fill in titles, descriptions, area, date, location                     ║
// ║                                                                             ║
// ║  IMPORTANT: The 'imageUrl' is the COVER image for the main grid.           ║
// ║  It MUST be a unique image that is NOT included in the 'gallery' array.     ║
// ║                                                                             ║
// ║  GALLERY LAYOUT — images display in this specific sequence:                 ║
// ║    Slot 1  →  WIDE   16:9  full width across page                          ║
// ║    Slot 2  →  TALL   4:5   left side of a portrait pair                    ║
// ║    Slot 3  →  TALL   4:5   right side of portrait pair                     ║
// ║    Slot 4  →  WIDE   16:9  full width across page                          ║
// ║    Slot 5  →  MID    4:3   left side of landscape pair                     ║
// ║    Slot 6  →  MID    4:3   right side of landscape pair                    ║
// ║    Slot 7  →  SQUARE 1:1   left side of trio                               ║
// ║    Slot 8  →  SQUARE 1:1   center of trio                                  ║
// ║    Slot 9  →  SQUARE 1:1   right side of trio                              ║
// ║    Slot 10 →  TALL   4:5   left side of final portrait pair                ║
// ║    Slot 11 →  TALL   4:5   right side of final portrait pair               ║
// ║    Slot 12+ → REPEATING PATTERN: Pair (4:5) then Trio (Square)             ║
// ║                                                                             ║
// ║  MINIMUM: 1 gallery image. MAXIMUM: unlimited.                             ║
// ║  To add more pairs: just add more URLs in the same order above.            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface ProjectData {
  id: string;
  titleEN: string;
  titleAM: string;
  categoryEN: 'Residential' | 'Commercial';
  categoryAM: 'Բնակելի' | 'Կոմերցիոն';
  imageUrl: string;
  descriptionEN: string;
  descriptionAM: string;
  area: string;
  date: string;
  locationEN: string;
  locationAM: string;
  gallery: string[];
}

export const PROJECTS_LIST: ProjectData[] = [
  // ════════════════════════════════════════════════
  // Cover 1200 x 1500
  // 16:9  1600 x 900
  // 4:5   1000 x 1250
  // 4:3   1400 x 1050
  // ════════════════════════════════════════════════

  // ════════════════════════════════════════════════
  // PROJECT 1
  // ════════════════════════════════════════════════
  {
    id: '32',
    titleEN:  'Two Story Living Room',
    titleAM:  'Երկհարկանի Հյուրասենյակ',

    categoryEN: 'Residential',   // 'Residential' or 'Commercial'
    categoryAM: 'Բնակելի',      // 'Բնակելի' or 'Կոմերցիոն'

    // ── Cover photo shown on portfolio grid card (ratio 4:5, e.g. 1200×1500px)
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532381/1_h9ofqr.jpg',

    descriptionEN: 'A clean, open-plan living space with high ceilings.',
    descriptionAM: 'Բաց պլանավորմամբ հյուրասենյակ, ճաշասենյակ կրկնակի բարձր առաստաղներով:',

    area:       '70 m²',
    date:       '2022',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // gallery[0]  → Main Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[1]  → Portrait pair — LEFT               | recommended: 1000 × 1250 (4:5)
      // gallery[2]  → Portrait pair — RIGHT              | recommended: 1000 × 1250 (4:5)
      // gallery[3]  → Wide Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[4]  → Landscape pair — LEFT              | recommended: 1400 × 1050 (4:3)
      // gallery[5]  → Landscape pair — RIGHT             | recommended: 1400 × 1050 (4:3)
      // gallery[6]  → Trio — LEFT (Square)               | recommended: 1200 × 1200 (1:1)
      // gallery[7]  → Trio — CENTER (Square)             | recommended: 1200 × 1200 (1:1)
      // gallery[8]  → Trio — RIGHT (Square)              | recommended: 1200 × 1200 (1:1)
      // gallery[9]  → Final pair — LEFT                  | recommended: 1000 × 1250 (4:5)
      // gallery[10] → Final pair — RIGHT                 | recommended: 1000 × 1250 (4:5)
      // — any additional images will show in a 2-column grid at the bottom —
      // SLOT 1 — WIDE 16:9 — Hero render, shown full width at top of project page
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532379/2_ycoks4.jpg',

      // SLOT 2 — TALL 4:5 — Left portrait (pair with slot 3)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532378/3_dxwphl.jpg',

      // SLOT 3 — TALL 4:5 — Right portrait (pair with slot 2)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532378/4_t86xn0.jpg',

      // SLOT 4 — WIDE 16:9 — Full width, second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772551143/5a_exwazc.jpg',

      // ── Want more images? Keep adding below following the same pattern: ──
      // SLOT 5 — MID 4:3 — Left landscape (pair with slot 6)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532378/6_hh0bqd.jpg',

      // SLOT 6 — MID 4:3 — Right landscape (pair with slot 5)
       'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532379/9_irpuy9.jpg',

      // SLOT 7 — WIDE 16:9 — pattern repeats
       'https://res.cloudinary.com/dys2k5muv/image/upload/v1772551953/10_klaiop.jpg',
       
       // 4:5
       'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532378/8_g5njuw.jpg',
       'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532378/7_a719sj.jpg',
    ],
  },

 // ════════════════════════════════════════════════
  // PROJECT 2
  // ════════════════════════════════════════════════
  {
    id: '25',
    titleEN:  'Glass House',
    titleAM:  'Հայելի Տունը',

    categoryEN: 'Residential',   // 'Residential' or 'Commercial'
    categoryAM: 'Բնակելի',      // 'Բնակելի' or 'Կոմերցիոն'

    // ── Cover photo shown on portfolio grid card (ratio 4:5, e.g. 1200×1500px)
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054125/1_ecqvsk.jpg',

    descriptionEN: 'A glass mirror open space area with gorgeous columns',
    descriptionAM: 'Բաց տարածք՝ ապակե հայելային մակերեսներով և շքեղ սյուներով',

    area:       '80 m²',
    date:       '2025',
    locationEN: 'Hamburg, Germany',
    locationAM: 'Համբուրգ, Գերմանիա',

    gallery: [
      // gallery[0]  → Main Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[1]  → Portrait pair — LEFT               | recommended: 1000 × 1250 (4:5)
      // gallery[2]  → Portrait pair — RIGHT              | recommended: 1000 × 1250 (4:5)
      // gallery[3]  → Wide Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[4]  → Landscape pair — LEFT              | recommended: 1400 × 1050 (4:3)
      // gallery[5]  → Landscape pair — RIGHT             | recommended: 1400 × 1050 (4:3)
      // gallery[6]  → Trio — LEFT (Square)               | recommended: 1200 × 1200 (1:1)
      // gallery[7]  → Trio — CENTER (Square)             | recommended: 1200 × 1200 (1:1)
      // gallery[8]  → Trio — RIGHT (Square)              | recommended: 1200 × 1200 (1:1)
      // gallery[9]  → Final pair — LEFT                  | recommended: 1000 × 1250 (4:5)
      // gallery[10] → Final pair — RIGHT                 | recommended: 1000 × 1250 (4:5)
      // — any additional images will show in a 2-column grid at the bottom —
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054124/2_nuun18.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054124/3_khfrj9.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054125/4_vgxilp.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054125/5_rq8dzx.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054125/6_u75tdl.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054125/7_ox86mb.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773054125/8_ishm6v.jpg',
    ],
  },


    // ════════════════════════════════════════════════
  // PROJECT 3
  // ════════════════════════════════════════════════
  {
    id: '31',
    titleEN:  'Memphis House',
    titleAM:  'Մեմֆիս Տունը',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    // ── Cover photo shown on portfolio grid card (ratio 4:5, e.g. 1200×1500px)
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055155/1_fbuajl.jpg',

    descriptionEN: 'Colorful Modern Kitchen & Dining Interior Design with Arched Open Space',
    descriptionAM: 'Գունեղ ժամանակակից խոհանոց և ճաշասենյակ՝ կամարաձև բաց տարածքով ինտերիերի դիզայն',

    area:       '50 m²',
    date:       '2024',
    locationEN: 'Switzerland',
    locationAM: 'Շվեյցարիա',

    gallery: [
      // gallery[0]  → Main Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[1]  → Portrait pair — LEFT               | recommended: 1000 × 1250 (4:5)
      // gallery[2]  → Portrait pair — RIGHT              | recommended: 1000 × 1250 (4:5)
      // gallery[3]  → Wide Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[4]  → Landscape pair — LEFT              | recommended: 1400 × 1050 (4:3)
      // gallery[5]  → Landscape pair — RIGHT             | recommended: 1400 × 1050 (4:3)
      // gallery[6]  → Trio — LEFT (Square)               | recommended: 1200 × 1200 (1:1)
      // gallery[7]  → Trio — CENTER (Square)             | recommended: 1200 × 1200 (1:1)
      // gallery[8]  → Trio — RIGHT (Square)              | recommended: 1200 × 1200 (1:1)
      // gallery[9]  → Final pair — LEFT                  | recommended: 1000 × 1250 (4:5)
      // gallery[10] → Final pair — RIGHT                 | recommended: 1000 × 1250 (4:5)
      // — any additional images will show in a 2-column grid at the bottom —
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055153/2_fmejx8.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055151/3_o4wgtx.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055153/4_vx7t49.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055153/5_cel0ij.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055152/6_wlhio6.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773055155/7_gvph0k.jpg',
    ],
  },



   // ════════════════════════════════════════════════
  // PROJECT 4
  // ════════════════════════════════════════════════
  {
    id: '28',
    titleEN:  'Boutique Hotel Lobby',
    titleAM:  'Բուտիկ հյուրանոցի լոբբի',

    categoryEN: 'Commercial',
    categoryAM: 'Կոմերցիոն',

    // ── Cover photo shown on portfolio grid card (ratio 4:5, e.g. 1200×1500px)
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056804/1_obyrnh.jpg',

    descriptionEN: 'Elegant Modern Hotel Reception & Lobby Lounge Interior Design with Fireplace',
    descriptionAM: 'Էլեգանտ ժամանակակից հյուրանոցի ընդունարան և լոբբի լաունջ՝ բուխարիով ինտերիերի դիզայն',

    area:       '48 m²',
    date:       '2023',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // gallery[0]  → Main Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[1]  → Portrait pair — LEFT               | recommended: 1000 × 1250 (4:5)
      // gallery[2]  → Portrait pair — RIGHT              | recommended: 1000 × 1250 (4:5)
      // gallery[3]  → Wide Perspective (Full width)      | recommended: 1600 × 900  (16:9)
      // gallery[4]  → Landscape pair — LEFT              | recommended: 1400 × 1050 (4:3)
      // gallery[5]  → Landscape pair — RIGHT             | recommended: 1400 × 1050 (4:3)
      // gallery[6]  → Trio — LEFT (Square)               | recommended: 1200 × 1200 (1:1)
      // gallery[7]  → Trio — CENTER (Square)             | recommended: 1200 × 1200 (1:1)
      // gallery[8]  → Trio — RIGHT (Square)              | recommended: 1200 × 1200 (1:1)
      // gallery[9]  → Final pair — LEFT                  | recommended: 1000 × 1250 (4:5)
      // gallery[10] → Final pair — RIGHT                 | recommended: 1000 × 1250 (4:5)
      // — any additional images will show in a 2-column grid at the bottom —
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056797/2a_rerrok.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056797/3_jm8cdz.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056799/4_qajkqi.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056798/5_d8nfqx.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056799/6_fosiqs.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773056801/7_nnwszq.jpg',

    ],
  },
  // ════════════════════════════════════════════════
  // PROJECT — A Living Room Refreshed (#17)
  // ════════════════════════════════════════════════
  {
    id: '17',
    titleEN: 'A Living Room Refreshed',
    titleAM: 'A Living Room Refreshed',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    // ── Cover photo (4:5)
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750295/Portfolio/17/17-cover.jpg',

    descriptionEN: 'A gentle refresh of an everyday living room — lighter surfaces, a brighter palette, and more air through every corner.',
    descriptionAM: 'A gentle refresh of an everyday living room — lighter surfaces, a brighter palette, and more air through every corner.',

    area:       '45 m²',
    date:       '2024',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750296/Portfolio/17/17-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750297/Portfolio/17/17-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750298/Portfolio/17/17-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750298/Portfolio/17/17-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750299/Portfolio/17/17-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750300/Portfolio/17/17-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750301/Portfolio/17/17-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750302/Portfolio/17/17-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776750302/Portfolio/17/17-g8.jpg',
      // Slots 10+11 (final portrait pair) intentionally omitted — ProjectDetail skips the block when both are missing.
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Tacconelli (#21)
  // ════════════════════════════════════════════════
  {
    id: '21',
    titleEN: 'Tacconelli',
    titleAM: 'Tacconelli',

    categoryEN: 'Commercial',
    categoryAM: 'Կոմերցիոն',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760986/Portfolio/21/21-cover.jpg',

    descriptionEN: 'A cocktail lounge tuned for dim evenings and live music — wallpaper, tile, bar architecture, lighting, and seating specified end-to-end.',
    descriptionAM: 'A cocktail lounge tuned for dim evenings and live music — wallpaper, tile, bar architecture, lighting, and seating specified end-to-end.',

    area:       '115 m²',
    date:       '2025',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760987/Portfolio/21/21-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760988/Portfolio/21/21-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760989/Portfolio/21/21-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760990/Portfolio/21/21-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760991/Portfolio/21/21-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760992/Portfolio/21/21-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760993/Portfolio/21/21-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760994/Portfolio/21/21-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776760994/Portfolio/21/21-g8.jpg',
      // Slots 10+11 (final pair) intentionally omitted — 9 gallery images on this item.
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — It Girl (#33)
  // ════════════════════════════════════════════════
  {
    id: '33',
    titleEN: 'It Girl',
    titleAM: 'It Girl',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764389/Portfolio/33/33-cover.jpg',

    descriptionEN: 'A 58 m² abode for an it girl — unafraid of color, texture, or the occasional risk.',
    descriptionAM: 'A 58 m² abode for an it girl — unafraid of color, texture, or the occasional risk.',

    area:       '58 m²',
    date:       '2026',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764389/Portfolio/33/33-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764390/Portfolio/33/33-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764392/Portfolio/33/33-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764392/Portfolio/33/33-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764393/Portfolio/33/33-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764394/Portfolio/33/33-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764395/Portfolio/33/33-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764396/Portfolio/33/33-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764397/Portfolio/33/33-g8.jpg',
      // SLOT 10 — TALL 4:5 — final pair LEFT (source is 4:3, slight center-crop)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764397/Portfolio/33/33-g9.jpg',
      // SLOT 11 — TALL 4:5 — final pair RIGHT (source is 4:3, slight center-crop)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776764398/Portfolio/33/33-g10.jpg',
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Where It Starts (#27)
  // ════════════════════════════════════════════════
  {
    id: '27',
    titleEN: 'Where It Starts',
    titleAM: 'Where It Starts',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768539/Portfolio/27/27-cover.jpg',

    descriptionEN: 'A small apartment that earned its layout — thirteen floorplans in, every client detail in its place.',
    descriptionAM: 'A small apartment that earned its layout — thirteen floorplans in, every client detail in its place.',

    area:       '61 m²',
    date:       '2025',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768540/Portfolio/27/27-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768541/Portfolio/27/27-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768542/Portfolio/27/27-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768542/Portfolio/27/27-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768543/Portfolio/27/27-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776768544/Portfolio/27/27-g5.jpg',
      // Slots 7–11 (trio + final pair) intentionally omitted — gallery of 6 images on this item.
      // ProjectDetail now skips both the trio and final-pair blocks when their slots are empty.
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Favorite Color is Orange (#26)
  // ════════════════════════════════════════════════
  {
    id: '26',
    titleEN: 'Favorite Color is Orange',
    titleAM: 'Favorite Color is Orange',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778981/Portfolio/26/26-cover.jpg',

    descriptionEN: "A bedroom built around the client's favorite orange — warm and saturated without ever going loud.",
    descriptionAM: "A bedroom built around the client's favorite orange — warm and saturated without ever going loud.",

    area:       '27 m²',
    date:       '2025',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778982/Portfolio/26/26-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778983/Portfolio/26/26-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778984/Portfolio/26/26-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778985/Portfolio/26/26-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778986/Portfolio/26/26-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778988/Portfolio/26/26-g5.jpg',
      // Slots 7–11 (trio + final pair) intentionally omitted.
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Green Stripes (#30)
  // ════════════════════════════════════════════════
  {
    id: '30',
    titleEN: 'Green Stripes',
    titleAM: 'Green Stripes',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778989/Portfolio/30/30-cover.jpg',

    descriptionEN: 'The green-striped wallpaper set the tone — color, texture, and line followed where it led.',
    descriptionAM: 'The green-striped wallpaper set the tone — color, texture, and line followed where it led.',

    area:       '45 m²',
    date:       '2025',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778990/Portfolio/30/30-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778991/Portfolio/30/30-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778992/Portfolio/30/30-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778993/Portfolio/30/30-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778994/Portfolio/30/30-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778995/Portfolio/30/30-g5.jpg',
      // Slots 7–11 (trio + final pair) intentionally omitted.
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — The Calm Abode (#34)
  // ════════════════════════════════════════════════
  {
    id: '34',
    titleEN: 'The Calm Abode',
    titleAM: 'The Calm Abode',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778997/Portfolio/34/34-cover.jpg',

    descriptionEN: 'A small house for a mother and daughter — soft, warm, and unapologetically theirs.',
    descriptionAM: 'A small house for a mother and daughter — soft, warm, and unapologetically theirs.',

    area:       '58 m²',
    date:       '2026',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render (source ratio 1.62, slight top/bottom crop)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778998/Portfolio/34/34-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776778999/Portfolio/34/34-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779000/Portfolio/34/34-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779001/Portfolio/34/34-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779001/Portfolio/34/34-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779003/Portfolio/34/34-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779004/Portfolio/34/34-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779006/Portfolio/34/34-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779007/Portfolio/34/34-g8.jpg',
      // SLOT 10 — TALL 4:5 — final pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779008/Portfolio/34/34-g9.jpg',
      // SLOT 11 — TALL 4:5 — final pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779009/Portfolio/34/34-g10.jpg',
      // overflow — 2-col grid at bottom
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779010/Portfolio/34/34-g11.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776779011/Portfolio/34/34-g12.jpg',
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Two Floors, One Mood (#36)
  // ════════════════════════════════════════════════
  {
    id: '36',
    titleEN: 'Two Floors, One Mood',
    titleAM: 'Two Floors, One Mood',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781095/Portfolio/36/36-cover.jpg',

    descriptionEN: 'A two-story house for a family of four — a calm, relaxed atmosphere carried cohesively from floor to floor.',
    descriptionAM: 'A two-story house for a family of four — a calm, relaxed atmosphere carried cohesively from floor to floor.',

    area:       '140 m²',
    date:       '2026',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781096/Portfolio/36/36-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781097/Portfolio/36/36-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781098/Portfolio/36/36-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781099/Portfolio/36/36-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781100/Portfolio/36/36-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT (kitchen with figure, 6.2)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781101/Portfolio/36/36-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781102/Portfolio/36/36-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781103/Portfolio/36/36-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT (source is 4:5, slight top/bottom crop)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781104/Portfolio/36/36-g8.jpg',
      // SLOT 10 — TALL 4:5 — final pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781105/Portfolio/36/36-g9.jpg',
      // SLOT 11 — TALL 4:5 — final pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781106/Portfolio/36/36-g10.jpg',
      // overflow — 2-col grid at bottom
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781107/Portfolio/36/36-g11.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781108/Portfolio/36/36-g12.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781109/Portfolio/36/36-g13.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776781110/Portfolio/36/36-g14.jpg',
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Arc Coworking (#29)
  // ════════════════════════════════════════════════
  {
    id: '29',
    titleEN: 'Arc Coworking',
    titleAM: 'Arc Coworking',

    categoryEN: 'Commercial',
    categoryAM: 'Կոմերցիոն',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917882/Portfolio/29/29-cover.jpg',

    descriptionEN: 'A coworking space all about shapes — arched entrances, rounded walls, and curved lights.',
    descriptionAM: 'A coworking space all about shapes — arched entrances, rounded walls, and curved lights.',

    area:       '200 m²',
    date:       '2025',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render (AI-enhanced photoreal)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917883/Portfolio/29/29-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917884/Portfolio/29/29-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917885/Portfolio/29/29-g2.jpg',
      // SLOT 4 — WIDE 16:9 — intentionally skipped (panoramic 4.1.jpeg was 3.4:1)
      '',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917885/Portfolio/29/29-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917887/Portfolio/29/29-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917888/Portfolio/29/29-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917889/Portfolio/29/29-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917890/Portfolio/29/29-g8.jpg',
      // SLOT 10 — TALL 4:5 — final pair LEFT (source is 4:3, slight center-crop)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917891/Portfolio/29/29-g9.jpg',
      // SLOT 11 — TALL 4:5 — final pair RIGHT (source is 4:3, slight center-crop)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776917892/Portfolio/29/29-g10.jpg',
    ],
  },

  // ════════════════════════════════════════════════
  // PROJECT — Compass (#37)
  // ════════════════════════════════════════════════
  {
    id: '37',
    titleEN: 'Compass',
    titleAM: 'Compass',

    categoryEN: 'Residential',
    categoryAM: 'Բնակելի',

    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960836/Portfolio/37/37-cover.jpg',

    descriptionEN: 'An apartment ordered by Vaastu — each room placed by direction, every choice in alignment.',
    descriptionAM: 'An apartment ordered by Vaastu — each room placed by direction, every choice in alignment.',

    area:       '70 m²',
    date:       '2026',
    locationEN: 'Yerevan, Armenia',
    locationAM: 'Երևան, Հայաստան',

    gallery: [
      // SLOT 1 — WIDE 16:9 — hero render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960837/Portfolio/37/37-g0.jpg',
      // SLOT 2 — TALL 4:5 — portrait pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960838/Portfolio/37/37-g1.jpg',
      // SLOT 3 — TALL 4:5 — portrait pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960839/Portfolio/37/37-g2.jpg',
      // SLOT 4 — WIDE 16:9 — second wide render
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960840/Portfolio/37/37-g3.jpg',
      // SLOT 5 — MID 4:3 — landscape pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960841/Portfolio/37/37-g4.jpg',
      // SLOT 6 — MID 4:3 — landscape pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960842/Portfolio/37/37-g5.jpg',
      // SLOT 7 — SQUARE 1:1 — trio LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960843/Portfolio/37/37-g6.jpg',
      // SLOT 8 — SQUARE 1:1 — trio CENTER
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960844/Portfolio/37/37-g7.jpg',
      // SLOT 9 — SQUARE 1:1 — trio RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960845/Portfolio/37/37-g8.jpg',
      // SLOT 10 — TALL 4:5 — final pair LEFT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960846/Portfolio/37/37-g9.jpg',
      // SLOT 11 — TALL 4:5 — final pair RIGHT
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960847/Portfolio/37/37-g10.jpg',
      // overflow — 2-col grid at bottom (3 squares)
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960848/Portfolio/37/37-g11.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960849/Portfolio/37/37-g12.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1776960850/Portfolio/37/37-g13.jpg',
    ],
  },

  // ════════════════════════════════════════════════
  // ADD YOUR NEXT PROJECT HERE
  // Copy the block below, paste it above this comment,
  // increment the id, and fill in your details.
  // ════════════════════════════════════════════════
  //
  // {
  //   id: '6',
  //   titleEN:  '',
  //   titleAM:  '',
  //
  //   categoryEN: 'Residential',   // or 'Commercial'
  //   categoryAM: 'Բնակելի',      // or 'Կոմերցիոն'
  //
  //   // ── Cover photo (4:5 ratio, e.g. 1200×1500px)
  //   imageUrl: '',
  //
  //   descriptionEN: '',
  //   descriptionAM: '',
  //
  //   area:       '000 m²',
  //   date:       '2024',
  //   locationEN: 'Yerevan, Armenia',
  //   locationAM: 'Երևան, Հայաստան',
  //
  //   gallery: [
  //     // SLOT 1 — WIDE 16:9 — full width hero render
  //     '',
  //
  //     // SLOT 2 — TALL 4:5 — left portrait
  //     '',
  //
  //     // SLOT 3 — TALL 4:5 — right portrait
  //     '',
  //
  //     // SLOT 4 — WIDE 16:9 — second full width render
  //     '',
  //
  //     // SLOT 5 — MID 4:3 — left landscape
  //     '',
  //
  //     // SLOT 6 — MID 4:3 — right landscape
  //     '',
  //
  //     // Add more by repeating the pattern above...
  //   ],
  // },

];

// ─── HERO SLIDES ─────────────────────────────────────────────────────────────

export const getHeroSlides = (lang: Language): HeroSlide[] => [
  {
    id: 1,
    title: lang === 'en' ? 'Spaces You Want to Be In' : 'Տարածքներ, որտեղ ցանկանում եք լինել',
    subtitle:
      lang === 'en'
        ? "With clear guidance, smart planning, and attention to detail, we'll turn your ideas into a space that feels right — and functions beautifully."
        : 'Հստակ ուղղորդմամբ և ուշադրությամբ մանրուքների նկատմամբ՝ մենք Ձեր գաղափարները կվերածենք գեղեցիկ և հարմարավետ տարածքի:',
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1770985128/1_wsuf6e.jpg',
  },
  {
    id: 2,
    title: lang === 'en' ? 'A Home that Reflects You' : 'Տուն, որը արտացոլում է Ձեզ',
    subtitle:
      lang === 'en'
        ? "Whether you're just getting the keys or looking to give your home a fresh start, we help turn your space into something that fits — your rhythm, your needs, and your style."
        : 'Անկախ նրանից, թե Դուք նոր եք ստացել բանալիները, թե ցանկանում եք թարմացնել Ձեր տունը, մենք կօգնենք ստեղծել Ձեր ոճին համապատասխան տարածք:',
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1770985128/2_qy6vfg.jpg',
  },
  {
    id: 3,
    title: lang === 'en' ? 'Design that Connects' : 'Դիզայն, որը միավորում է',
    subtitle:
      lang === 'en'
        ? "Whether it's a café, store, office, or a coworking space — we design environments that reflect your brand and support the way you work, serve, and connect."
        : 'Լինի դա սրճարան, գրասենյակ թե խանութ՝ մենք նախագծում ենք միջավայրեր, որոնք արտացոլում են Ձեր բրենդը և ոգեշնչում աշխատանքին:',
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1770984801/3_eigbly.jpg',
  },
];

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export const getServices = (lang: Language): Service[] => [
  {
    id: 'floorplans',
    title: lang === 'en' ? 'Floor Plans' : 'Հատակագծում',
    description: lang === 'en' ? 'Optimized layouts that maximize your space.' : 'Տարածքի օպտիմալ պլանավորում',
    renderIcon: () => <Maximize className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'moodboards',
    title: lang === 'en' ? 'Style Boards' : 'Ոճային կոնցեպտի մշակում',
    description: lang === 'en' ? 'Visual guides with shoppable product links.' : 'Հասանելի ապրանքատեսականու վիզուալ ուղեցույց',
    renderIcon: () => <Palette className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'shopping',
    title: lang === 'en' ? 'Shopping List' : 'Գնումների ցուցակ',
    description: lang === 'en' ? 'Complete item lists with exact specifications.' : 'Ամբողջական ապրանքների ցանկ՝ տեխնիկական բնութագրերով:',
    renderIcon: () => <ShoppingBag className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'setup',
    title: lang === 'en' ? 'Instructions' : 'Հրահանգներ',
    description: lang === 'en' ? 'Step-by-step installation instructions.' : 'Կահույքի տեղադրման քայլ առ քայլ ուղեցույց',
    renderIcon: () => <Compass className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'rendering',
    title: lang === 'en' ? '3D Rendering' : '3D Վիզուալիզացիա',
    description: lang === 'en' ? 'Photorealistic previews of your finished space.' : 'Տարածքի ֆոտո-ռեալիստիկ եռաչափ վիզուալիզացիաներ',
    renderIcon: () => <Layers className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'tour',
    title: lang === 'en' ? 'Virtual Tour' : 'Վիրտուալ շրջայց',
    description: lang === 'en' ? 'Interactive walkthroughs before construction.' : 'Ինտերակտիվ շրջայց ամբողջական նախագծով՝ նախքան իրականացումը',
    renderIcon: () => <View className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'custom',
    title: lang === 'en' ? 'Custom Designs' : 'Անհատական գծագրեր',
    description: lang === 'en' ? 'Bespoke furniture drawings and exclusive designs.' : 'Պատվիրվող կահույքի էսքիզներ և բացառիկ կահույքի նախագծում',
    renderIcon: () => <PenTool className="w-16 h-16" strokeWidth={1.5} />,
  },
  {
    id: 'technical',
    title: lang === 'en' ? 'Technical Plans' : 'Ինժեներական գծագրեր',
    description: lang === 'en' ? 'Electrical, lighting, and plumbing specifications.' : 'Հոսանքի, թաց կետերի, հատակի և առաստաղի աշխատանքային գծագրեր',
    renderIcon: () => <FileText className="w-16 h-16" strokeWidth={1.5} />,
  },
];

// ─── PROJECTS (localized view) ────────────────────────────────────────────────

export const getProjects = (lang: Language): Project[] =>
  PROJECTS_LIST.map((p) => ({
    id: p.id,
    title: lang === 'en' ? p.titleEN : p.titleAM,
    category: lang === 'en' ? p.categoryEN : p.categoryAM,
    imageUrl: p.imageUrl,
    description: lang === 'en' ? p.descriptionEN : p.descriptionAM,
    area: p.area,
    date: p.date,
    location: lang === 'en' ? p.locationEN : p.locationAM,
    gallery: p.gallery,
  }));

// ─── BLOG POSTS ───────────────────────────────────────────────────────────────
// The Journal (Phase 2) reads real posts from Sanity via src/lib/sanity.ts
// (fetchPosts / fetchPost / fetchCategories). The former hard-coded getBlogPosts()
// sample was removed when the live blog landed.
