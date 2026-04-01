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
import { HeroSlide, Service, Project, BlogPost } from './types';
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
    titleAM:  'Hajeli Twuny',

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
  // PROJECT 5
  // ════════════════════════════════════════════════
  {
    id: '5',
    titleEN:  'Ark Coworking',
    titleAM:  'Արկ Քոուորքինգ',

    categoryEN: 'Commercial',
    categoryAM: 'Կոմերցիոն',

    // ── Cover photo shown on portfolio grid card (ratio 4:5, e.g. 1200×1500px)
    imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255682/0_sp0nvi.jpg',

    descriptionEN: 'Atmospheric coworking space with curated lighting',
    descriptionAM: 'Մթնոլորտային քոուորքինգ՝ խնամքով ընտրված լուսավորությամբ',

    area:       '120 m²',
    date:       '2025',
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
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255687/1_prbhmr.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255683/2_bfqfio.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255684/3_qwjnbt.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255682/4_y1ynfa.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255684/5_h5avzu.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255688/6_hrvguc.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255685/7_q97ojv.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255684/8_whgrij.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255684/9_ldwqar.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255686/10_yq6mpn.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1773255685/11_gbh5ds.jpg',
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

export const getBlogPosts = (lang: Language): BlogPost[] => [
  {
    id: '1',
    title: lang === 'en' ? 'The Future of Brutalist Minimalism' : 'Բրուտալիստական մինիմալիզմի ապագան',
    date: 'MAR 24, 2024',
    category: 'Trends',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    title: lang === 'en' ? 'Sustainable High-End Materials' : 'Կայուն բարձրակարգ նյութեր',
    date: 'FEB 12, 2024',
    category: 'Innovation',
    imageUrl: 'https://images.unsplash.com/photo-1518005020470-588a3a307a00?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '3',
    title: lang === 'en' ? 'Sculpting Light in Empty Spaces' : 'Լույսի քանդակումը դատարկ տարածություններում',
    date: 'JAN 05, 2024',
    category: 'Art',
    imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bdb7489feef?auto=format&fit=crop&q=80&w=800',
  },
];
