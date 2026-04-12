/**
 * Designature Studio — AI Style Quiz image weights
 *
 * Each image is tagged with a PRIMARY style (3 points), 0–3 STRONG styles (1 point each),
 * and 0–3 HINT styles (0.3 points each). When a user "Loves" an image, points distribute
 * proportionally across all listed styles.
 *
 * Style names are case-sensitive and must match the 9 styles exactly:
 *   Japandi, Modern, Mid-Century, Bohemian, Rustic, Art Deco, Industrial, Coastal, Transitional
 *
 * Total: 136 images across 9 folders.
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
  | 'Transitional';

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
  'Quiz/Art-Deco/10_ng0u6i.png': {
    primary: 'Art Deco',
    strong: [],
    hint: ['Mid-Century'],
  },
  'Quiz/Art-Deco/9_byfcww.png': {
    primary: 'Art Deco',
    strong: [],
    hint: ['Modern'],
  },
  'Quiz/Art-Deco/7_pgjj4k.png': {
    primary: 'Art Deco',
    strong: [],
    hint: ['Mid-Century', 'Industrial'],
  },
  'Quiz/Art-Deco/11_ibhacx.png': {
    primary: 'Art Deco',
    strong: ['Industrial'],
    hint: ['Modern'],
  },
  'Quiz/Art-Deco/8_ky76uo.png': {
    primary: 'Art Deco',
    strong: ['Transitional'],
    hint: ['Coastal'],
  },
  'Quiz/Art-Deco/6_slhnwf.png': {
    primary: 'Art Deco',
    strong: [],
    hint: [],
  },
  'Quiz/Art-Deco/4_nx2j48.png': {
    primary: 'Art Deco',
    strong: [],
    hint: [],
  },
  'Quiz/Art-Deco/5_uwjq3d.png': {
    primary: 'Art Deco',
    strong: ['Industrial'],
    hint: ['Modern'],
  },
  'Quiz/Art-Deco/3_ozxssy.png': {
    primary: 'Art Deco',
    strong: [],
    hint: ['Mid-Century', 'Industrial'],
  },

  // ─────────────────────────────────────────────────────────────
  // BOHEMIAN (17 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Bohemian/3_cx1pmd.jpg': {
    primary: 'Bohemian',
    strong: ['Coastal', 'Rustic'],
    hint: [],
  },
  'Quiz/Bohemian/15.png': {
    primary: 'Bohemian',
    strong: ['Rustic', 'Industrial'],
    hint: ['Mid-Century'],
  },
  'Quiz/Bohemian/16.png': {
    primary: 'Bohemian',
    strong: ['Coastal'],
    hint: ['Rustic'],
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
  'Quiz/Coastal/1_fhcew.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Rustic'],
  },
  'Quiz/Coastal/3_plpqea.png': {
    primary: 'Coastal',
    strong: ['Rustic', 'Transitional'],
    hint: [],
  },
  'Quiz/Coastal/2_wtzdsm.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Coastal/5fh_efe33o.png': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Coastal/5fh_1_d1hmni.png': {
    primary: 'Coastal',
    strong: ['Rustic', 'Transitional'],
    hint: [],
  },
  'Quiz/Coastal/14_mwuyw1.jpg': {
    primary: 'Coastal',
    strong: ['Transitional', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Coastal/11_apahvb.jpg': {
    primary: 'Coastal',
    strong: ['Bohemian'],
    hint: [],
  },
  'Quiz/Coastal/11_vyzuiy.jpg': {
    primary: 'Coastal',
    strong: ['Rustic', 'Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Coastal/9_cbgmet.jpg': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: ['Japandi'],
  },
  'Quiz/Coastal/6_hzsje7.jpg': {
    primary: 'Coastal',
    strong: ['Bohemian'],
    hint: ['Rustic'],
  },
  'Quiz/Coastal/10_ezelfi.jpg': {
    primary: 'Coastal',
    strong: ['Transitional'],
    hint: [],
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
  'Quiz/Industrial/4_epdhym.jpg': {
    primary: 'Industrial',
    strong: ['Modern', 'Mid-Century'],
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
  'Quiz/Industrial/3_lfjbhw.png': {
    primary: 'Industrial',
    strong: ['Mid-Century'],
    hint: ['Rustic'],
  },
  'Quiz/Industrial/1_rnka7n.png': {
    primary: 'Industrial',
    strong: ['Modern', 'Mid-Century'],
    hint: ['Bohemian'],
  },
  'Quiz/Industrial/8_sida3r.png': {
    primary: 'Industrial',
    strong: ['Modern', 'Mid-Century'],
    hint: [],
  },
  'Quiz/Industrial/2_tsbxx2.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: [],
  },
  'Quiz/Industrial/8_o9nuyt.png': {
    primary: 'Industrial',
    strong: ['Modern'],
    hint: ['Bohemian'],
  },

  // ─────────────────────────────────────────────────────────────
  // JAPANDI (17 images)
  // ─────────────────────────────────────────────────────────────
  'Quiz/Japandi/14_valixc.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: ['Rustic'],
  },
  'Quiz/Japandi/11_k5sz1q.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: ['Mid-Century'],
  },
  'Quiz/Japandi/10_ckvfbb.png': {
    primary: 'Japandi',
    strong: ['Modern'],
    hint: [],
  },
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
  'Quiz/Mid-Century/Gemini_image2.png': {
    primary: 'Mid-Century',
    strong: ['Bohemian'],
    hint: ['Rustic'],
  },
  'Quiz/Mid-Century/Gemini_image1.png': {
    primary: 'Mid-Century',
    strong: ['Bohemian'],
    hint: ['Rustic'],
  },
  'Quiz/Mid-Century/2_ogcvop.jpg': {
    primary: 'Mid-Century',
    strong: ['Rustic'],
    hint: ['Transitional'],
  },
  'Quiz/Mid-Century/1_jfs2a7.jpg': {
    primary: 'Mid-Century',
    strong: ['Rustic'],
    hint: [],
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
  'Quiz/Modern/8_qclh6h.jpg': {
    primary: 'Modern',
    strong: ['Bohemian'],
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
  'Quiz/Modern/5_1_zrnyds.jpg': {
    primary: 'Modern',
    strong: ['Mid-Century', 'Industrial'],
    hint: [],
  },
  'Quiz/Modern/12_huqew7.jpg': {
    primary: 'Modern',
    strong: ['Japandi'],
    hint: [],
  },
  'Quiz/Modern/7_kon4yg.jpg': {
    primary: 'Modern',
    strong: ['Bohemian'],
    hint: [],
  },
  'Quiz/Modern/4_2_ltlsjx.jpg': {
    primary: 'Modern',
    strong: ['Transitional', 'Industrial'],
    hint: [],
  },
  'Quiz/Modern/2_1_gkkng2.jpg': {
    primary: 'Modern',
    strong: ['Bohemian'],
    hint: [],
  },
  'Quiz/Modern/4_3_saxtc0.jpg': {
    primary: 'Modern',
    strong: ['Art Deco'],
    hint: [],
  },
  'Quiz/Modern/4_1_kwkvid.jpg': {
    primary: 'Modern',
    strong: ['Industrial', 'Japandi'],
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
  'Quiz/Modern/11_1_ebcyvz.jpg': {
    primary: 'Modern',
    strong: ['Bohemian', 'Japandi'],
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
  'Quiz/Modern/12_1_egand7.jpg': {
    primary: 'Modern',
    strong: ['Transitional'],
    hint: ['Mid-Century'],
  },
  'Quiz/Modern/10_y7bds9.jpg': {
    primary: 'Modern',
    strong: ['Industrial'],
    hint: [],
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
  'Quiz/Rustic/8_aree19.png': {
    primary: 'Rustic',
    strong: ['Bohemian'],
    hint: [],
  },
  'Quiz/Rustic/9_bydnws.png': {
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
