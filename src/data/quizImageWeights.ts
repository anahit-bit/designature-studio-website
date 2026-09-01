/**
 * Designature Studio — AI Style Quiz image weights
 *
 * Each image is tagged with a PRIMARY style (3 points), 0–3 STRONG styles (1 point each),
 * and 0–3 HINT styles (0.3 points each). When a user "Loves" an image, points distribute
 * proportionally across all listed styles.
 *
 * Style names are case-sensitive and must match the 15 AI Vision styles exactly:
 *   Japandi, Modern, Mid-Century, Bohemian, Rustic, Art Deco, Industrial, Coastal,
 *   Transitional, Biophilic, Minimalist, Maximalist, Dopamine, Trend 2026, Warm Contemporary
 *
 * 136 curated photographs across the original 9 folders, plus 150 studio renders
 * (15 styles x 10 rooms) added 2026-08-31 and 2026-09-01. The renders come from the
 * same style briefs AI Vision generates from, so a quiz verdict points at a style
 * that renders the way the quiz promised. Photographs and renders sit together in
 * each folder by the owner's decision.
 */

export type QuizStyle =
  | 'Japandi'
  | 'Modern'
  | 'Mid-Century'
  | 'Bohemian'
  | 'Rustic'
  | 'Art Deco'
  | 'Industrial'
  | 'Coastal'
  | 'Transitional'
  | 'Biophilic'
  | 'Minimalist'
  | 'Maximalist'
  | 'Dopamine'
  | 'Trend 2026'
  | 'Warm Contemporary';

export interface QuizImageWeight {
  primary: QuizStyle;
  strong: QuizStyle[];
  hint: QuizStyle[];
}

export const QUIZ_IMAGE_WEIGHTS: Record<string, QuizImageWeight> = {
  // ─────────────────────────────────────────────────────────────
  // ART DECO (17 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Art-Deco/14_uwyjdr.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Mid-Century'],
  },
  'Quiz/Art-Deco/19_eify7o.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: [],
  },
  'Quiz/Art-Deco/17_gmhspd.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Mid-Century'],
  },
  'Quiz/Art-Deco/18_e1hgg2.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: [],
  },
  'Quiz/Art-Deco/16_udhqsu.png': {
    primary: 'Art Deco',
    strong: ['Modern'],
    hint: ['Transitional'],
  },
  'Quiz/Art-Deco/15_udxfac.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Coastal'],
  },
  'Quiz/Art-Deco/13_v9ewcf.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Coastal'],
  },
  'Quiz/Art-Deco/12_jvapje.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // BOHEMIAN (17 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Bohemian/3_cx1pmd.jpg': {
    primary: 'Bohemian',
    strong: ['Coastal', 'Rustic'],
    hint: [],
  },
  'Quiz/Bohemian/8_r7zpqa.jpg': {
    primary: 'Bohemian',
    strong: ['Mid-Century'],
    hint: ['Rustic'],
  },
  'Quiz/Bohemian/10_u56vvx.jpg': {
    primary: 'Bohemian',
    strong: ['Rustic', 'Coastal'],
    hint: [],
  },
  'Quiz/Bohemian/11_nmiukp.jpg': {
    primary: 'Bohemian',
    strong: ['Coastal', 'Rustic'],
    hint: ['Japandi'],
  },
  'Quiz/Bohemian/8_zlqizk.jpg': {
    primary: 'Bohemian',
    strong: ['Coastal'],
    hint: ['Rustic'],
  },
  'Quiz/Bohemian/9_zppiat.jpg': {
    primary: 'Bohemian',
    strong: ['Coastal', 'Rustic'],
    hint: ['Industrial'],
  },
  'Quiz/Bohemian/6_iaacnq.png': {
    primary: 'Bohemian',
    strong: ['Rustic'],
    hint: ['Mid-Century'],
  },
  'Quiz/Bohemian/8_idxggx.png': {
    primary: 'Bohemian',
    strong: ['Rustic', 'Industrial'],
    hint: ['Mid-Century'],
  },
  'Quiz/Bohemian/9_x7chne.png': {
    primary: 'Bohemian',
    strong: ['Coastal'],
    hint: ['Industrial', 'Rustic'],
  },
  'Quiz/Bohemian/7_simdl2.png': {
    primary: 'Bohemian',
    strong: ['Mid-Century', 'Rustic'],
    hint: [],
  },
  'Quiz/Bohemian/3_ljbjoe.png': {
    primary: 'Bohemian',
    strong: ['Rustic'],
    hint: ['Industrial'],
  },
  'Quiz/Bohemian/5_luq9rd.png': {
    primary: 'Bohemian',
    strong: ['Rustic'],
    hint: ['Mid-Century', 'Transitional'],
  },
  'Quiz/Bohemian/4_xfn3sh.png': {
    primary: 'Bohemian',
    strong: ['Coastal', 'Rustic'],
    hint: [],
  },
  'Quiz/Bohemian/2_mrxc9z.png': {
    primary: 'Bohemian',
    strong: ['Coastal', 'Rustic'],
    hint: [],
  },
  'Quiz/Bohemian/1_piprtp.png': {
    primary: 'Bohemian',
    strong: ['Mid-Century', 'Rustic'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // COASTAL (12 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Coastal/11_vyzuiy.jpg': {
    primary: 'Coastal',
    strong: ['Rustic', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Coastal/11_yfryd9.jpg': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // INDUSTRIAL (12 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Industrial/5_an8tny.jpg': {
    primary: 'Industrial',
    strong: ['Modern', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Industrial/4_mihws1.jpg': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Industrial/7_sbp5pc.png': {
    primary: 'Industrial',
    strong: ['Mid-Century'],
    hint: ['Bohemian'],
  },
  'Quiz/Industrial/6_xibejv.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Industrial/5_rmcho6.png': {
    primary: 'Industrial',
    strong: ['Rustic'],
    hint: ['Bohemian'],
  },
  'Quiz/Industrial/4_zzbp3n.png': {
    primary: 'Industrial',
    strong: ['Modern', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Industrial/1_rnka7n.png': {
    primary: 'Industrial',
    strong: ['Modern', 'Mid-Century'],
    hint: ['Bohemian'],
  },
  'Quiz/Industrial/2_tsbxx2.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // JAPANDI (17 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Japandi/9_ti0qtx.png': {
    primary: 'Japandi',
    strong: ['Mid-Century'],
    hint: ['Modern'],
  },
  'Quiz/Japandi/8_owqlmt.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/17_becbvz.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Japandi/16_ukufep.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/15_nvboc4.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Japandi/13_logbtm.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/12_x6grrv.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/7_kbo8v1.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Japandi/6_ymmkyd.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/5_fvimlt.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/4_auhnju.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/3_to5j9q.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/2_ktrshs.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Japandi/1_rd3oyx.jpg': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // MID-CENTURY (13 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Mid-Century/12_iwshvs.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional'],
  },
  'Quiz/Mid-Century/5_nkuudl.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern', 'Bohemian'],
    hint: [],
  },
  'Quiz/Mid-Century/8_rfjouv.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Bohemian'],
  },
  'Quiz/Mid-Century/6_diegbi.jpg': {
    primary: 'Mid-Century',
    strong: ['Industrial'],
    hint: ['Bohemian'],
  },
  'Quiz/Mid-Century/6_2_mtair9.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Bohemian'],
  },
  'Quiz/Mid-Century/8_gclcpl.jpg': {
    primary: 'Mid-Century',
    strong: ['Industrial'],
    hint: ['Bohemian'],
  },
  'Quiz/Mid-Century/5_sqgqmb.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Rustic'],
  },
  'Quiz/Mid-Century/1_oxqle4.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Bohemian'],
  },
  'Quiz/Mid-Century/14_zulrwj.jpg': {
    primary: 'Mid-Century',
    strong: ['Modern', 'Japandi'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // MODERN (26 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Modern/6_wx5fmy.jpg': {
    primary: 'Modern',
    strong: ['Art Deco'],
    hint: ['Mid-Century'],
  },
  'Quiz/Modern/5_bcvep0.jpg': {
    primary: 'Modern',
    strong: ['Art Deco'],
    hint: ['Mid-Century'],
  },
  'Quiz/Modern/3_1_vpngnt.jpg': {
    primary: 'Modern',
    strong: ['Industrial', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Modern/2_migzxd.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: ['Coastal'],
  },
  'Quiz/Modern/6_osgjgd.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: [],
  },
  'Quiz/Modern/12_huqew7.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: [],
  },
  'Quiz/Modern/4_2_ltlsjx.jpg': {
    primary: 'Modern',
    strong: ['Transitional', 'Industrial'],
    hint: [],
  },
  'Quiz/Modern/11_2_o8cxz7.jpg': {
    primary: 'Modern',
    strong: ['Japandi', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Modern/3_2_be2ubi.jpg': {
    primary: 'Modern',
    strong: ['Japandi', 'Bohemian'],
    hint: [],
  },
  'Quiz/Modern/6_1_bdlwcl.jpg': {
    primary: 'Modern',
    strong: ['Bohemian'],
    hint: [],
  },
  'Quiz/Modern/9_yushkk.jpg': {
    primary: 'Modern',
    strong: ['Transitional', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Modern/5_ffa6z6.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: ['Mid-Century'],
  },
  'Quiz/Modern/11_vurrkl.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: ['Mid-Century'],
  },
  'Quiz/Modern/3_3_zxgulv.jpg': {
    primary: 'Modern',
    strong: ['Japandi', 'Industrial'],
    hint: [],
  },
  'Quiz/Modern/3_fqpec6.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: [],
  },
  'Quiz/Modern/2_2_tf3zss.jpg': {
    primary: 'Modern',
    strong: ['Industrial'],
    hint: ['Japandi'],
  },
  'Quiz/Modern/4_ruuo99.jpg': {
    primary: 'Modern',
    strong: ['Industrial'],
    hint: ['Mid-Century'],
  },

  // ─────────────────────────────────────────────────────────────
  // RUSTIC (11 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Rustic/10_ihohiz.png': {
    primary: 'Rustic',
    strong: ['Bohemian'],
    hint: ['Industrial'],
  },
  'Quiz/Rustic/6_wyobu1.png': {
    primary: 'Japandi',
    strong: ['Rustic', 'Modern'],
    hint: [],
  },
  'Quiz/Rustic/11_pa7qji.png': {
    primary: 'Rustic',
    strong: ['Bohemian'],
    hint: ['Industrial'],
  },
  'Quiz/Rustic/7_npozre.png': {
    primary: 'Rustic',
    strong: ['Bohemian'],
    hint: [],
  },
  'Quiz/Rustic/4_qj7ywn.png': {
    primary: 'Rustic',
    strong: ['Japandi', 'Modern'],
    hint: ['Bohemian'],
  },
  'Quiz/Rustic/5_yttv7z.png': {
    primary: 'Rustic',
    strong: ['Modern', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Rustic/3_vhnnz5.png': {
    primary: 'Japandi',
    strong: ['Rustic', 'Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Rustic/2_tunzxu.png': {
    primary: 'Rustic',
    strong: ['Modern', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Rustic/11_hjofyz.png': {
    primary: 'Rustic',
    strong: ['Transitional', 'Modern'],
    hint: ['Bohemian'],
  },

  // ─────────────────────────────────────────────────────────────
  // TRANSITIONAL (11 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Transitional/10_tuag7j.jpg': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Art Deco'],
  },
  'Quiz/Transitional/9_jad8jv.png': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Transitional/5_qdrpo2.png': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Transitional/8_k1yvsw.png': {
    primary: 'Transitional',
    strong: ['Industrial', 'Modern'],
    hint: [],
  },
  'Quiz/Transitional/7_ymzvd2.png': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Bohemian'],
  },
  'Quiz/Transitional/6_pieo5y.png': {
    primary: 'Transitional',
    strong: ['Modern', 'Art Deco'],
    hint: [],
  },
  'Quiz/Transitional/4_cpzxfn.png': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Transitional/3_h0vafs.png': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Transitional/1_jxbeef.png': {
    primary: 'Transitional',
    strong: ['Modern', 'Rustic'],
    hint: [],
  },
  'Quiz/Transitional/2_qoojzc.png': {
    primary: 'Transitional',
    strong: ['Modern'],
    hint: ['Rustic'],
  },
  'Quiz/Transitional/2_2_kdupyu.jpg': {
    primary: 'Transitional',
    strong: ['Modern', 'Industrial'],
    hint: [],
  },

  // ─────────────────────────────────────────────────────────────
  // BIOPHILIC (10 studio renders, added 2026-08-31)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Biophilic/bathroom.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/bedroom.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/dining.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/hallway.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/home-office.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/kids-room.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/kitchen.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/living.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/living-and-dining.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/outdoor.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },

  // ─────────────────────────────────────────────────────────────
  // MINIMALIST (10 studio renders, added 2026-08-31)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Minimalist/bathroom.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/bedroom.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/dining.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/hallway.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/home-office.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/kids-room.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/kitchen.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/living.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/living-and-dining.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/outdoor.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },

  // ─────────────────────────────────────────────────────────────
  // MAXIMALIST (10 studio renders, added 2026-08-31)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Maximalist/bathroom.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/bedroom.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/dining.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/hallway.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/home-office.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/kids-room.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/kitchen.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/living.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/living-and-dining.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/outdoor.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },

  // ─────────────────────────────────────────────────────────────
  // DOPAMINE (10 studio renders, added 2026-08-31)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Dopamine/bathroom.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/bedroom.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/dining.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/hallway.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/home-office.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/kids-room.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/kitchen.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/living.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/living-and-dining.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/outdoor.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },

  // ─────────────────────────────────────────────────────────────
  // TREND 2026 (10 studio renders, added 2026-08-31)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Trend-2026/bathroom.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/bedroom.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/dining.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/hallway.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/home-office.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/kids-room.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/kitchen.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/living.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/living-and-dining.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Trend-2026/outdoor.png': {
    primary: 'Trend 2026',
    strong: ['Warm Contemporary', 'Transitional'],
    hint: ['Japandi'],
  },

  // ─────────────────────────────────────────────────────────────
  // WARM CONTEMPORARY (10 studio renders, added 2026-08-31)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Warm-Contemporary/bathroom.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/bedroom.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/dining.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/hallway.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/home-office.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/kids-room.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/kitchen.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/living.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/living-and-dining.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/outdoor.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },

  // ─────────────────────────────────────────────────────────────
  // JAPANDI — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Japandi/bathroom.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/bedroom.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/dining.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/hallway.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/home-office.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/kids-room.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/kitchen.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/living.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/living-and-dining.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },
  'Quiz/Japandi/outdoor.png': {
    primary: 'Japandi',
    strong: ['Minimalist'],
    hint: ['Modern', 'Biophilic'],
  },

  // ─────────────────────────────────────────────────────────────
  // MODERN — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Modern/bathroom.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/bedroom.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/dining.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/hallway.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/home-office.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/kids-room.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/kitchen.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/living.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/living-and-dining.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },
  'Quiz/Modern/outdoor.png': {
    primary: 'Modern',
    strong: ['Minimalist'],
    hint: ['Transitional', 'Mid-Century'],
  },

  // ─────────────────────────────────────────────────────────────
  // MID-CENTURY — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Mid-Century/bathroom.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/bedroom.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/dining.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/hallway.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/home-office.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/kids-room.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/kitchen.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/living.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/living-and-dining.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },
  'Quiz/Mid-Century/outdoor.png': {
    primary: 'Mid-Century',
    strong: ['Modern'],
    hint: ['Transitional', 'Warm Contemporary'],
  },

  // ─────────────────────────────────────────────────────────────
  // BOHEMIAN — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Bohemian/bathroom.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/bedroom.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/dining.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/hallway.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/home-office.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/kids-room.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/kitchen.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/living.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/living-and-dining.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },
  'Quiz/Bohemian/outdoor.png': {
    primary: 'Bohemian',
    strong: ['Maximalist'],
    hint: ['Rustic', 'Biophilic'],
  },

  // ─────────────────────────────────────────────────────────────
  // RUSTIC — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Rustic/bathroom.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/bedroom.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/dining.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/hallway.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/home-office.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/kids-room.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/kitchen.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/living.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/living-and-dining.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Rustic/outdoor.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },

  // ─────────────────────────────────────────────────────────────
  // ART DECO — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Art-Deco/bathroom.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/bedroom.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/dining.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/hallway.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/home-office.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/kids-room.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/kitchen.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/living.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/living-and-dining.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/outdoor.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },

  // ─────────────────────────────────────────────────────────────
  // INDUSTRIAL — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Industrial/bathroom.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/bedroom.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/dining.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/hallway.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/home-office.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/kids-room.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/kitchen.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/living.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/living-and-dining.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Industrial/outdoor.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },

  // ─────────────────────────────────────────────────────────────
  // COASTAL — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Coastal/bathroom.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/bedroom.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/dining.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/hallway.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/home-office.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/kids-room.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/kitchen.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/living.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/living-and-dining.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/outdoor.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },

  // ─────────────────────────────────────────────────────────────
  // TRANSITIONAL — 10 studio renders added 2026-09-01,
  // alongside the existing photographs in this folder
  // ─────────────────────────────────────────────────────────────
  'Quiz/Transitional/bathroom.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/bedroom.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/dining.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/hallway.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/home-office.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/kids-room.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/kitchen.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/living.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/living-and-dining.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },
  'Quiz/Transitional/outdoor.png': {
    primary: 'Transitional',
    strong: ['Warm Contemporary'],
    hint: ['Modern', 'Art Deco'],
  },

  // ─────────────────────────────────────────────────────────────
  // SECOND TAKES (<room>-v2), added 2026-09-01 to bring every quiz
  // folder to 20 images. Same neighbours as each style's first take.
  // ─────────────────────────────────────────────────────────────
  'Quiz/Art-Deco/dining-v2.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Art-Deco/living-v2.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Maximalist', 'Mid-Century'],
  },
  'Quiz/Biophilic/bathroom-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/bedroom-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/dining-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/hallway-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/home-office-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/kids-room-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/kitchen-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/living-and-dining-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/living-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Biophilic/outdoor-v2.png': {
    primary: 'Biophilic',
    strong: ['Japandi'],
    hint: ['Rustic', 'Coastal'],
  },
  'Quiz/Coastal/bedroom-v2.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/dining-v2.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/living-and-dining-v2.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Coastal/living-v2.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi', 'Minimalist'],
  },
  'Quiz/Dopamine/bathroom-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/bedroom-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/dining-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/hallway-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/home-office-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/kids-room-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/kitchen-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/living-and-dining-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/living-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Dopamine/outdoor-v2.png': {
    primary: 'Dopamine',
    strong: ['Maximalist'],
    hint: ['Mid-Century', 'Bohemian'],
  },
  'Quiz/Industrial/living-v2.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Rustic', 'Minimalist'],
  },
  'Quiz/Maximalist/bathroom-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/bedroom-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/dining-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/hallway-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/home-office-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/kids-room-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/kitchen-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/living-and-dining-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/living-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Maximalist/outdoor-v2.png': {
    primary: 'Maximalist',
    strong: ['Bohemian'],
    hint: ['Art Deco', 'Dopamine'],
  },
  'Quiz/Minimalist/bathroom-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/bedroom-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/dining-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/hallway-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/home-office-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/kids-room-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/kitchen-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/living-and-dining-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/living-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Minimalist/outdoor-v2.png': {
    primary: 'Minimalist',
    strong: ['Modern', 'Japandi'],
    hint: ['Transitional'],
  },
  'Quiz/Rustic/living-v2.png': {
    primary: 'Rustic',
    strong: ['Industrial'],
    hint: ['Bohemian', 'Biophilic'],
  },
  'Quiz/Warm-Contemporary/bathroom-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/bedroom-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/dining-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/hallway-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/home-office-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/kids-room-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/kitchen-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/living-and-dining-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/living-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
  'Quiz/Warm-Contemporary/outdoor-v2.png': {
    primary: 'Warm Contemporary',
    strong: ['Transitional'],
    hint: ['Modern', 'Japandi'],
  },
};

/**
 * Point values for the discrete tier system.
 * Use these when computing quiz scores.
 */
export const TIER_POINTS = {
  primary: 3,
  strong: 1,
  hint: 0.3,
} as const;

/**
 * Resolve an image URL to its weights.
 *
 * Two URL shapes reach this. Assets uploaded with a folder carry the path in the
 * public_id, so the delivery URL contains "Quiz/<Style>/<room>.png". The original
 * corpus predates that: this Cloudinary account ran in dynamic-folders mode, its
 * public_ids sit at the ACCOUNT ROOT, and the URL is just "/upload/v123/8_o9nuyt.jpg"
 * with no "Quiz/" anywhere in it.
 *
 * The caller used to match /Quiz\/[^?]+/ and nothing else, so every one of the 136
 * hand-authored entries for the original nine styles silently missed and the quiz
 * fell back to awarding primary-only points by folder of origin. The strong/hint
 * tiers — the entire reason the table distinguishes a near-miss from a wrong
 * answer — had never once fired for a real vote.
 *
 * So: try the full path, then fall back to the bare filename.
 */
const BY_BASENAME: Record<string, QuizImageWeight> = (() => {
  const index: Record<string, QuizImageWeight> = {};
  for (const [key, weight] of Object.entries(QUIZ_IMAGE_WEIGHTS)) {
    const base = key.split('/').pop();
    if (base && !(base in index)) index[base] = weight;
  }
  return index;
})();

export function weightsForUrl(url: string): QuizImageWeight | undefined {
  const path = url.match(/Quiz\/[^?]+/)?.[0];
  if (path && QUIZ_IMAGE_WEIGHTS[path]) return QUIZ_IMAGE_WEIGHTS[path];
  const file = url.split('?')[0].split('/').pop();
  return file ? BY_BASENAME[file] : undefined;
}
