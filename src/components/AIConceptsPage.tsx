import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, X, Download, AlertCircle, RefreshCw, LogOut, FileDown, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// GoogleGenAI removed — AI Vision generation is now handled server-side.
import { useLanguage } from '../LanguageContext';
import { useAuth, AuthUser } from '../AuthContext';
import Header from './Header';
import Footer from './Footer';
import RoomAudit from './RoomAudit';
import FeedbackModal from './FeedbackModal';
import AIVisionShowcase from './AIVisionShowcase';
import VisionExperience from './VisionExperience';
import FeedbackBand from './FeedbackBand';
import ShoppingListShowcase from './ShoppingListShowcase';
import ShoppingOfflineCard from './ShoppingOfflineCard';
import RetailerLogoStrip from './RetailerLogoStrip';
import { QUIZ_IMAGE_WEIGHTS, TIER_POINTS } from '../data/quizImageWeights';
import { cld, cldSrcSet, THUMB_WIDTHS } from '../lib/cld';
import { useShoppingStatus } from '../lib/shoppingStatus';
import { trackCalendly, trackQuizStart, trackQuizComplete, trackVisionStart, trackShoppingStart } from '../lib/track';
import { popSigninSource } from '../lib/signinSource';

const CALENDLY_URL = 'https://calendly.com/designature-studio-us/free_consultation';

const QUIZ_VOTE_UNLOCK_MS = process.env.NODE_ENV === 'test' ? 10 : 1500;
/** Free tier: max generated concepts in the UI row (paid tier can be raised later). */
const FREE_TIER_MAX_CONCEPT_SLOTS = 3;

const STYLES = [
  'Japandi', 'Modern', 'Mid-Century', 'Bohemian', 'Rustic', 'Art Deco',
  'Industrial', 'Coastal'
];

// Synchronously parse `?dna=Mid-Century-Coastal&pcts=62-24-8-4-2` style URLs.
// Used for INITIAL state so a shared link opens straight to the results screen
// — no flash of the logged-out hero between first paint and the on-mount effect.
function parseSharedQuizFromUrl(): { quizResult: { style: string; pct: number }[] } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const dna = params.get('dna');
  const pcts = params.get('pcts');
  if (!dna || !pcts) return null;
  const styleSlugs = dna.split('-').reduce<string[]>((acc, part) => {
    const candidate = acc.length > 0 ? `${acc[acc.length - 1]} ${part}` : part;
    const candHyphen = acc.length > 0 ? `${acc[acc.length - 1]}-${part}` : part;
    const match = STYLES.find(s => s === candidate || s === candHyphen || s === part);
    if (match && match !== acc[acc.length - 1]) {
      if (acc.length > 0 && (match === candidate || match === candHyphen)) {
        acc[acc.length - 1] = match;
      } else {
        acc.push(match);
      }
    } else {
      acc.push(part);
    }
    return acc;
  }, []);
  const validStyles = styleSlugs.filter(s => STYLES.includes(s));
  const pctVals = pcts.split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  if (validStyles.length === 0 || pctVals.length === 0) return null;
  const synthResult: { style: string; pct: number }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < pctVals.length; i++) {
    let style = validStyles[i];
    if (!style || used.has(style)) {
      style = STYLES.find(s => !used.has(s)) ?? STYLES[0];
    }
    used.add(style);
    synthResult.push({ style, pct: pctVals[i] });
  }
  return { quizResult: synthResult };
}

// All styles available in AI Vision chip selector (superset of quiz styles)
const VISION_STYLES = [
  'Japandi', 'Modern', 'Mid-Century', 'Bohemian', 'Rustic', 'Art Deco',
  'Industrial', 'Coastal', 'Minimalist', 'Maximalist', 'Biophilic'
];

// ── Sample room + inspiration gallery shown in the empty state ─────────────
const INSPIRATION_GALLERY = {
  roomPhotoUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281427/photo_t1vo5h.png',
  referenceUrls: [
    'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281424/ref1_q4mmiz.jpg',
    'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281424/ref2_xraman.jpg',
    'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281426/ref3_qg39ms.png',
  ],
  conceptUrls: [
    'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281424/Designature_Studio_Generated_Concept_1_un7zft.png',
    'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281425/Designature_Studio_Generated_Concept_2_mszdf4.png',
    'https://res.cloudinary.com/dys2k5muv/image/upload/v1776281426/Designature_Studio_Generated_Concept_4_x6v5fw.png',
  ],
  roomType: 'Dining Room',
};

const ROOM_TYPES = [
  'Living Room', 'Dining Room', 'Bedroom', 'Kitchen',
  'Bathroom', 'Home Office', 'Hallway', 'Kids Room', 'Outdoor',
];

type QuizRoom = { url: string; credit: string };
type QuizRooms = Record<string, QuizRoom[]>;

// ─── Style education descriptions ────────────────────────────────────────────
const STYLE_DESCRIPTIONS: Record<string, { summary: string; elements: string[] }> = {
  'Japandi':     { summary: 'A fusion of Japanese wabi-sabi and Scandinavian hygge. Celebrates imperfection, natural materials, and quiet beauty — everything earns its place.', elements: ['Neutral tones', 'Natural textures', 'Low furniture', 'Negative space'] },
  'Modern':      { summary: 'Clean geometry, minimal ornament, honest materials. Form follows function — every line is intentional, every surface purposeful.', elements: ['Clean lines', 'Open layout', 'Monochrome palette', 'Statement lighting'] },
  'Mid-Century': { summary: 'Born in the 1950s–60s, it balances organic forms with geometric precision. Warm woods and bold accents meet sculptural furniture.', elements: ['Tapered legs', 'Warm wood', 'Pops of colour', 'Organic shapes'] },
  'Bohemian':    { summary: 'Layered, personal, and free-spirited. A curated mix of textiles, cultures, and eras that feels lived-in and full of stories.', elements: ['Mixed textiles', 'Plants & greenery', 'Global artefacts', 'Rich colour'] },
  'Rustic':      { summary: 'Rooted in nature and craftsmanship. Raw edges, weathered surfaces, and handmade quality bring warmth and authenticity.', elements: ['Reclaimed wood', 'Stone & brick', 'Earthy tones', 'Handmade details'] },
  'Art Deco':    { summary: 'Glamour, geometry, and opulence from the 1920s. Bold symmetry, luxe materials, and rich contrast make every room feel like a statement.', elements: ['Gold accents', 'Geometric patterns', 'Velvet & marble', 'High contrast'] },
  'Industrial':  { summary: 'Celebrates the beauty of raw, unfinished spaces. Exposed structure and utilitarian materials are the decoration.', elements: ['Exposed brick', 'Raw metal', 'Concrete', 'Edison bulbs'] },
  'Coastal':     { summary: 'Light, airy, and unhurried. Inspired by shorelines — bleached woods, sandy tones, and ocean blues create effortless calm.', elements: ['Sandy neutrals', 'Ocean blues', 'Natural linen', 'Weathered wood'] },
};

const QUIZ_ROOMS_FALLBACK: QuizRooms = {
  'Art Deco': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713417/14_uwyjdr.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713416/19_eify7o.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713413/17_gmhspd.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713412/18_e1hgg2.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713411/16_udhqsu.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713411/15_udxfac.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713410/13_v9ewcf.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775711587/12_jvapje.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939182/10_ng0u6i.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939181/9_byfcww.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939181/7_pgjj4k.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939181/11_ibhacx.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939180/8_ky76uo.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939179/6_slhnwf.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939178/4_nx2j48.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939178/5_uwjq3d.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774939177/3_ozxssy.png', credit: 'Art Deco' },
  ],
  'Bohemian': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/3_cx1pmd.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/15.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/16.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/8_r7zpqa.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/10_u56vvx.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/11_nmiukp.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/8_zlqizk.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/9_zppiat.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/6_iaacnq.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/8_idxggx.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/9_x7chne.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/7_simdl2.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/3_ljbjoe.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/5_luq9rd.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/4_xfn3sh.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/2_mrxc9z.png', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Bohemian/1_piprtp.png', credit: 'Bohemian' },
  ],
  'Coastal': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/1_fhcew.png', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/3_plpqea.png', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/2_wtzdsm.png', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/5fh_efe33o.png', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/5fh_1_d1hmni.png', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/14_mwuyw1.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/11_apahvb.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/11_vyzuiy.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/9_cbgmet.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/6_hzsje7.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/10_ezelfi.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Coastal/11_yfryd9.jpg', credit: 'Coastal' },
  ],
  'Industrial': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/5_an8tny.jpg', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/4_mihws1.jpg', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/4_epdhym.jpg', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/7_sbp5pc.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/6_xibejv.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/5_rmcho6.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/4_zzbp3n.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/3_lfjbhw.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/1_rnka7n.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/8_sida3r.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/2_tsbxx2.png', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Industrial/8_o9nuyt.jpg', credit: 'Industrial' },
  ],
  'Japandi': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/14_valixc.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/11_k5sz1q.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/10_ckvfbb.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/9_ti0qtx.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/8_owqlmt.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/17_becbvz.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/16_ukufep.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/15_nvboc4.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/13_logbtm.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/12_x6grrv.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/7_kbo8v1.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/6_ymmkyd.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/5_fvirnlt.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/4_auhnju.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/3_to5j9q.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/2_ktrshs.jpg', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Japandi/1_rd3oyx.jpg', credit: 'Japandi' },
  ],
  'Mid-Century': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/12_iwshvs.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/5_nkuudl.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/8_rfjourv.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/Gemini_Generated_Image_io4kabio4kabio4k_n1tjqa.png', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/Gemini_Generated_Image_7ns4o37ns4o37ns4_gfdnte.png', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/2_ogcvop.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/1_jfs2a7.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/6_diegbi.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/6_2_mtair9.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/8_gclcpl.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/5_sqgqmb.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/1_oxqle4.png', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Mid-Century/14_zulrwj.jpg', credit: 'Mid-Century' },
  ],
  'Modern': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/8_wx5fmy.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/5_bcvep0.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/3_1_vpngnt.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/8_qclh6h.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/2_migzxd.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/6_osgjgd.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/5_1_zrmyds.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/12_huqew7.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/7_kon4yg.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/4_2_lfsljx.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/2_1_gking2.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/4_3_saxtc0.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/4_1_kwicvd.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/11_2_o8cxz7.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/3_2_be2ubl.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/6_1_bdhwcl.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/9_yushkk.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/11_1_ebcyvz.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/5_ffa6z6.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/11_yurrki.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/3_3_zxgulv.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/3_fqpec6.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/2_2_lf3zss.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/4_ruo09.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/12_1_agand7.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Modern/10_y7ods9.jpg', credit: 'Modern' },
  ],
  'Rustic': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/10_ihohiz.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/6_wyobu1.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/11_pa7qji.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/8_aree19.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/9_bydnws.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/7_npozre.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/4_qj7ywn.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/5_yttv7z.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/3_vhnnz5.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/2_tunzxu.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Rustic/11_hjofyz.jpg', credit: 'Rustic' },
  ],
  'Transitional': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/10_tuag7j.jpg', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/9_jad8jv.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/5_qdrpo2.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/8_k1yvsw.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/7_ymzvd2.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/6_pieo5y.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/4_cpzxfn.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/3_h0vafs.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/1_jxbeef.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/2_qoojzc.png', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Transitional/2_2_kdupyu.jpg', credit: 'Transitional' },
  ],
};

/** Largest-remainder rounding so displayed percentages always sum to exactly 100.0.
 *  @param values  Raw percentage values in the 0–100 range (need not sum to 100 before call).
 *  @param decimals Number of decimal places (default 1).
 */
function roundPercentages(values: number[], decimals = 1): number[] {
  const multiplier = Math.pow(10, decimals);
  const target = 100 * multiplier;
  const scaled = values.map(v => v * multiplier);
  const floored = scaled.map(Math.floor);
  const diff = target - floored.reduce((a, b) => a + b, 0);
  const remainders = scaled.map((v, i) => ({ index: i, remainder: v - floored[i] }));
  remainders.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < diff; i++) {
    floored[remainders[i % remainders.length].index]++;
  }
  return floored.map(v => v / multiplier);
}

function styleToCloudinaryFolderName(style: string): string {
  // Cloudinary folders in this project use hyphens for spaces (e.g. "Art-Deco")
  return style.trim().replace(/\s+/g, '-');
}

// ─── Google Sign-In + AI Studio integration globals ───────────────────────
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// ─── Main Component ────────────────────────────────────────────────────────
const AIConceptsPage: React.FC = () => {
  const { language, t, navigateTo } = useLanguage();

  // Auth state — lifted into AuthContext (A-001)
  const {
    user,
    isLoading: authLoading,
    googleReady,
    signIn,
    signOut,
    setUser,
    refreshQuota,
    apiFetch,
  } = useAuth();
  const prevUserRef = useRef<AuthUser | null>(null);

  // Scroll to top when session is restored on load (user goes null → authenticated)
  useEffect(() => {
    if (user && !prevUserRef.current) {
      // Delay matches the showcase unmount / layout-settle time
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, 80);
    }
    prevUserRef.current = user;
  }, [user]);

  // Generation state
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [pinterestUrl, setPinterestUrl] = useState('');
  const [pinterestLoading, setPinterestLoading] = useState(false);
  const [pinterestError, setPinterestError] = useState('');
  const [pinterestOpen, setPinterestOpen] = useState(false);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomAspectRatio, setRoomAspectRatio] = useState<string>('3/4');
  const [apiAspectRatio, setApiAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("3:4");
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState(0);
  /** 'extract' shows "Analyzing references…", 'generate' shows cycling phases. */
  const [processingStage, setProcessingStage] = useState<'extract' | 'generate'>('generate');
  /** Increments each time "Generate Variation" is clicked; sent to server for prompt diversity. */
  const variationSeedRef = useRef(0);
  const processingRef = useRef<HTMLDivElement>(null);
  /** Set to true by handleTrySampleRoom; triggers handleGenerate once state settles */
  const pendingGenerateRef = useRef(false);
  /** True while the only concept(s) in results[] came from a sample run — cleared on first real generation */
  const lastGenWasSampleRef = useRef(false);
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  /** Returns the sessionStorage key scoped to the current user (or anonymous). */
  const sampleRoomStorageKey = useCallback(
    () => (user ? `sampleRoomUsed:${user.email}` : 'sampleRoomUsed:anonymous'),
    [user]
  );
  const PROCESSING_PHASES = [
    'Analysing spatial structure…',
    'Reading light and proportion…',
    'Synthesising materials…',
    'Composing the palette…',
    'Rendering your concept…',
  ];
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  /** Index into `allSessionConcepts` (current results first, then pre-reset archive). */
  const [selectedConceptIndex, setSelectedConceptIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  /** When the quiz "More rooms in your style" gallery opens the lightbox, the
      URL of the clicked thumb lives here. Cleared when the lightbox closes. */
  const [lightboxQuizUrl, setLightboxQuizUrl] = useState<string | null>(null);
  /** Data URLs from resets — session-only (cleared on logout); not sent to server. */
  const [sessionConceptArchive, setSessionConceptArchive] = useState<string[]>([]);

  const allSessionConcepts = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
    for (const a of sessionConceptArchive) {
      if (!seen.has(a)) {
        seen.add(a);
        out.push(a);
      }
    }
    return out;
  }, [results, sessionConceptArchive]);

  const selectedConceptUrl = allSessionConcepts[selectedConceptIndex] ?? null;
  // TODO(Design tier): Design-tier slot count not yet defined in tier config — confirm with product before shipping Design tier.
  // Free: FREE_TIER_MAX_CONCEPT_SLOTS (3) | Studio (isPaid): unlimited — no fixed cap, grows as user generates.
  const maxConceptSlots = user?.isPaid ? Infinity : FREE_TIER_MAX_CONCEPT_SLOTS;

  // ── Drag-over state for upload zones ──
  const [roomDragOver, setRoomDragOver] = useState(false);
  const [inspoDragOver, setInspoDragOver] = useState(false);
  const [shopDragOver, setShopDragOver] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Style Quiz logged-out hero: LQIP backdrop on the container fills the
  // visual gap while the high-res img loads; the img renders on top once
  // bytes arrive (no JS-driven fade needed).

  // ── Shopping state ──
  const [shoppingResults, setShoppingResults] = useState<any[]>([]);
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingError, setShoppingError] = useState<string | null>(null);
  const [shoppingDone, setShoppingDone] = useState(false);
  /** AI-027: when the search endpoint 503s with an "offline" code, swap the
   *  whole shopping panel for ShoppingOfflineCard instead of the generic
   *  red-text error row. Also seeded from /api/shopping/status on mount. */
  const [shoppingOffline, setShoppingOffline] = useState<{
    code: 'disabled' | 'daily_budget_exceeded';
    resetAt?: string;
  } | null>(null);
  const shoppingStatus = useShoppingStatus();
  useEffect(() => {
    if (shoppingStatus?.disabled && shoppingStatus.code) {
      setShoppingOffline({ code: shoppingStatus.code, resetAt: shoppingStatus.resetAt });
    } else if (shoppingStatus && !shoppingStatus.disabled) {
      // Status flipped back to online (e.g. budget reset) — clear stale offline state.
      setShoppingOffline(null);
    }
  }, [shoppingStatus?.disabled, shoppingStatus?.code, shoppingStatus?.resetAt]);
  const [standaloneShoppingImage, setStandaloneShoppingImage] = useState<string | null>(null);
  const [forceStandaloneUpload, setForceStandaloneUpload] = useState(false);
  const [searchSourceImage, setSearchSourceImage] = useState<string | null>(null);
  const [searchSourceIsStandalone, setSearchSourceIsStandalone] = useState(false);
  const [standaloneShoppingAspectRatio, setStandaloneShoppingAspectRatio] = useState<string>('3/4');
  const [shoppingCountry, setShoppingCountry] = useState<string>('us');
  // Variant B layout: when an AI concept exists, the secondary "shop a different photo"
  // path is collapsed by default and revealed by clicking the link below the primary action.
  const [showAlternateUpload, setShowAlternateUpload] = useState(false);

  // ── Style Quiz state ──
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizSeed, setQuizSeed] = useState<number>(() => Math.floor(Math.random() * 100));
  const QUIZ_LENGTH = 18;
  const generateQuizSequence = () => {
    const seq: string[] = [];
    // Each style appears at least once, then fill to QUIZ_LENGTH randomly
    const shuffled = [...STYLES].sort(() => Math.random() - 0.5);
    seq.push(...shuffled);
    while (seq.length < QUIZ_LENGTH) {
      seq.push(STYLES[Math.floor(Math.random() * STYLES.length)]);
    }
    return seq.slice(0, QUIZ_LENGTH).sort(() => Math.random() - 0.5);
  };
  const [quizSequence, setQuizSequence] = useState<string[]>(() => generateQuizSequence());
  const [quizVotes, setQuizVotes] = useState<Record<string, number>>({});
  // Synchronous URL parse for shared-link arrivals — populates initial state so the
  // results screen renders on first paint instead of flashing the logged-out hero.
  const sharedInitRef = useRef<{ quizResult: { style: string; pct: number }[] } | null | undefined>(undefined);
  if (sharedInitRef.current === undefined) sharedInitRef.current = parseSharedQuizFromUrl();
  const sharedInit = sharedInitRef.current;
  const [quizDone, setQuizDone] = useState<boolean>(!!sharedInit);
  const [quizResult, setQuizResult] = useState<{ style: string; pct: number }[]>(sharedInit?.quizResult ?? []);
  const [quizImageReady, setQuizImageReady] = useState<boolean>(false);
  const [quizHistory, setQuizHistory] = useState<{ style: string; pct: number }[][]>([]);
  const [selectedPrevResult, setSelectedPrevResult] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const quizResultSavedRef = useRef(false);
  /** Tracks the last-seen user email so we can detect identity changes without firing on mount */
  const prevUserEmailRef = useRef<string | undefined>(user?.email);
  /** Per-step vote log — enables undo (back button) */
  const [voteHistory, setVoteHistory] = useState<Array<{
    step: number; vote: 'love'|'skip'|'no'; imageUrl: string;
    styleChanges: Record<string, number>; // style → points added (multi-attribute)
  }>>([]);
  /** Loved rooms moodboard — only love votes */
  const [lovedRooms, setLovedRooms] = useState<Array<{
    step: number; imageUrl: string; styleChanges: Record<string, number>;
  }>>([]);
  /** Ref for moodboard scroll container — used for auto-scroll to newest card */
  const moodboardRef = useRef<HTMLDivElement>(null);
  /** URLs shown during this quiz session — excluded from result gallery */
  const [seenQuizImages, setSeenQuizImages] = useState<Set<string>>(new Set());
  /** Unseen images of the top result style — shown in result gallery */
  const [resultGalleryImages, setResultGalleryImages] = useState<string[]>([]);
  // Initial tool can be deep-linked from the home AI section via URL hash
  // (e.g. /ai-concepts#vision). Falls back to the default 'quiz' otherwise.
  const [activeTool, setActiveTool] = useState<'quiz' | 'vision' | 'shopping' | 'audit'>(() => {
    if (typeof window === 'undefined') return 'quiz';
    // Shared-link arrivals always land on Quiz (regardless of hash).
    const params = new URLSearchParams(window.location.search);
    if (params.get('dna') && params.get('pcts')) return 'quiz';
    const h = window.location.hash.replace(/^#/, '');
    return h === 'vision' || h === 'shopping' || h === 'audit' || h === 'quiz' ? h : 'quiz';
  });
  // ── Direction B drawer + toast + share + save-modal state ──
  const [quizDrawerOpen, setQuizDrawerOpen] = useState(false);
  const [quizToast, setQuizToast] = useState<string | null>(null);
  const [quizSharedView, setQuizSharedView] = useState<boolean>(!!sharedInit);
  const [quizSaveModalOpen, setQuizSaveModalOpen] = useState(false);
  const quizToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showQuizToast = useCallback((msg: string) => {
    setQuizToast(msg);
    if (quizToastTimerRef.current) clearTimeout(quizToastTimerRef.current);
    quizToastTimerRef.current = setTimeout(() => setQuizToast(null), 3200);
  }, []);

  // ── Quiz state persistence (survives navigation away/back) ──
  const QUIZ_PERSIST_KEY = 'ds_quiz_results_v1';
  const [auditComplete, setAuditComplete] = useState(false);
  const [auditProcessing, setAuditProcessing] = useState(false);
  const [quizRooms, setQuizRooms] = useState<QuizRooms>(QUIZ_ROOMS_FALLBACK);
  const [downloadCount, setDownloadCount] = useState<number>(() => {
    const saved = localStorage.getItem('ds_download_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // ── Scroll to top before paint — defeats browser scroll-restoration ──
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  // ── Deep-link scroll — when arriving at /ai-concepts#<tool>, scroll the
  // tool grid into view. Runs post-paint after a delay so it wins the race
  // against LanguageContext's pathname-change scroll-to-top + the local
  // useLayoutEffect's scroll-to-top. We use raw scrollTo with the element's
  // measured offsetTop because smooth scrollIntoView gets clobbered by the
  // earlier scroll-to-top calls in some browsers; manual scrollTo at the
  // right time is reliable.
  useEffect(() => {
    const h = window.location.hash.replace(/^#/, '');
    const isToolHash = h === 'quiz' || h === 'vision' || h === 'shopping' || h === 'audit';
    if (!isToolHash) return;
    const t = setTimeout(() => {
      const el = document.getElementById('ai-concepts-tools');
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'instant' });
    }, 200);
    return () => clearTimeout(t);
  }, []);

  // ── Reset all ephemeral tool state on every mount (fresh start on load / navigate) ──
  useEffect(() => {
    // Style Quiz — skip the destructive resets when arriving via a shared-DNA URL,
    // otherwise the state we already initialized synchronously gets clobbered.
    if (!sharedInit) {
      setQuizStep(0);
      setQuizVotes({});
      setQuizDone(false);
      setQuizResult([]);
      setQuizImageReady(false);
      setQuizHistory([]);
      setSelectedPrevResult(null);
      setShowQuizResults(false);
      quizResultSavedRef.current = false;
      setVoteHistory([]);
      setLovedRooms([]);
      setSeenQuizImages(new Set());
      setResultGalleryImages([]);
    }
    setQuizSeed(Math.floor(Math.random() * 100));
    setQuizSequence(generateQuizSequence());

    // AI Vision
    setInspirationImages([]);
    setRoomImage(null);
    setSelectedStyle('');
    setSelectedRoom('');
    setResults([]);
    setSelectedConceptIndex(0);
    setSessionConceptArchive([]);
    setError(null);
    setValidationError(null);
    setIsProcessing(false);
    setIsLightboxOpen(false);

    // Pinterest panel
    setPinterestUrl('');
    setPinterestOpen(false);
    setPinterestError(null);

    // Shopping List
    setShoppingResults([]);
    setShoppingItems([]);
    setShoppingDone(false);
    setShoppingError(null);
    setStandaloneShoppingImage(null);
    setForceStandaloneUpload(false);
    setSearchSourceImage(null);
    setSearchSourceIsStandalone(false);

    // Room Audit
    setAuditComplete(false);
    setAuditProcessing(false);

    // NOTE: user / authLoading / session token are intentionally NOT touched here.
    // NOTE: downloadCount (ds_download_count) is intentionally NOT reset.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset quiz state when the signed-in identity changes (sign-out / sign-in / account switch) ──
  // The mount-time reset above handles initial page load. This effect covers the case where the
  // component stays mounted but the user signs out and back in without a full page reload.
  useEffect(() => {
    const email = user?.email;
    if (email === prevUserEmailRef.current) return; // no change, skip
    const isFirstResolve = prevUserEmailRef.current === undefined;
    prevUserEmailRef.current = email;
    // First time auth resolves on a shared-DNA arrival: keep the synthesized
    // results in place — don't reset quiz state from under the friend.
    if (isFirstResolve && sharedInit) return;

    setQuizStep(0);
    setQuizVotes({});
    setQuizDone(false);
    setQuizResult([]);
    setQuizImageReady(false);
    setQuizHistory([]);
    setSelectedPrevResult(null);
    setShowQuizResults(false);
    setQuizSeed(Math.floor(Math.random() * 100));
    setQuizSequence(generateQuizSequence());
    quizResultSavedRef.current = false;
    setVoteHistory([]);
    setLovedRooms([]);
    setSeenQuizImages(new Set());
    setResultGalleryImages([]);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Two-phase loading indicator ──
  // Phase 1: "Analyzing references…" for ~4.5 s (only when there are reference images).
  // Phase 2: cycle through PROCESSING_PHASES for the remainder of the generation.
  useEffect(() => {
    if (!isProcessing) {
      setProcessingPhase(0);
      setProcessingStage('generate');
      return;
    }
    if (inspirationImages.length > 0) {
      setProcessingStage('extract');
      const switchTimer = setTimeout(() => {
        setProcessingStage('generate');
      }, 4500);
      const cycleId = setInterval(
        () => setProcessingPhase(p => (p + 1) % PROCESSING_PHASES.length),
        4000
      );
      return () => { clearTimeout(switchTimer); clearInterval(cycleId); };
    } else {
      setProcessingStage('generate');
      const cycleId = setInterval(
        () => setProcessingPhase(p => (p + 1) % PROCESSING_PHASES.length),
        4000
      );
      return () => clearInterval(cycleId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // ── Load Quiz images automatically from Cloudinary ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const styles = Object.keys(QUIZ_ROOMS_FALLBACK);
        const entries = await Promise.all(
          styles.map(async (style) => {
            const folder = `Quiz/${styleToCloudinaryFolderName(style)}`;
            const res = await fetch(`/api/images?folder=${encodeURIComponent(folder)}`);
            if (!res.ok) return [style, null] as const;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) return [style, null] as const;

            // Sort deterministically so the rotation is stable between reloads
            const sorted = [...data].sort((a: any, b: any) => String(a.public_id || '').localeCompare(String(b.public_id || '')));
            const rooms: QuizRoom[] = sorted
              .map((r: any) => ({
                url: String(r.secure_url || r.url || ''),
                credit: style,
              }))
              .filter((r: QuizRoom) => !!r.url);

            return [style, rooms.length ? rooms : null] as const;
          })
        );

        if (cancelled) return;

        setQuizRooms((prev) => {
          const next: QuizRooms = { ...prev };
          for (const [style, rooms] of entries) {
            if (rooms && rooms.length) next[style] = rooms;
          }
          return next;
        });
      } catch {
        // Ignore — fallback stays in place
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pick image by style + step offset for variety across the session
  const getQuizImage = useCallback((style: string, sessionSeed: number, step: number): QuizRoom => {
    const imgs = quizRooms[style] || [];
    if (!imgs.length) return { url: '', credit: '' };
    return imgs[(sessionSeed + step * 7) % imgs.length];
  }, [quizRooms]);

  const currentQuizStyle = quizSequence[quizStep] || STYLES[0];
  const currentQuizImage = getQuizImage(currentQuizStyle, quizSeed, quizStep);

  // Lock voting until the current quiz image is fully loaded.
  useEffect(() => {
    if (quizDone) return;
    if (!currentQuizImage.url) {
      setQuizImageReady(true);
      return;
    }
    setQuizImageReady(false);

    // Safety fallback: if browser/image event is delayed, re-enable controls after a short timeout.
    const unlockTimer = setTimeout(() => setQuizImageReady(true), QUIZ_VOTE_UNLOCK_MS);
    return () => clearTimeout(unlockTimer);
  }, [quizStep, quizSeed, quizSequence, currentQuizImage.url, quizDone]);

  // ── Track seen quiz images (for result gallery exclusion) ──
  useEffect(() => {
    if (currentQuizImage.url && !quizDone) {
      setSeenQuizImages(prev => new Set(prev).add(currentQuizImage.url));
    }
  }, [currentQuizImage.url, quizDone]);

  // ── I-016: activity log — quiz_start fires once when room 1 appears in a fresh quiz ──
  const quizStartFiredRef = useRef(false);
  useEffect(() => {
    if (quizDone) {
      quizStartFiredRef.current = false; // reset so a retake fires again
      return;
    }
    if (sharedInit) return; // viewing a shared DNA result — not a real quiz session
    if (quizStep === 0 && currentQuizImage.url && !quizStartFiredRef.current) {
      quizStartFiredRef.current = true;
      trackQuizStart();
    }
  }, [quizStep, quizDone, currentQuizImage.url]); // sharedInit is a ref — intentionally omitted

  // ── I-016: activity log — quiz_complete fires when DNA screen renders ──
  const quizCompleteFiredRef = useRef(false);
  useEffect(() => {
    if (!quizDone) {
      quizCompleteFiredRef.current = false;
      return;
    }
    if (sharedInit) return; // shared DNA viewer never "completed" a quiz here
    if (!quizCompleteFiredRef.current) {
      quizCompleteFiredRef.current = true;
      trackQuizComplete();
    }
  }, [quizDone]);

  // ── I-021b: shopping_started fires once when shoppingItems is first
  // ──         populated (user uploaded a source image → items identified).
  const shoppingStartFiredRef = useRef(false);
  useEffect(() => {
    if (shoppingItems.length === 0) {
      shoppingStartFiredRef.current = false;
      return;
    }
    if (!shoppingStartFiredRef.current) {
      shoppingStartFiredRef.current = true;
      trackShoppingStart();
    }
  }, [shoppingItems.length]);

  // vision_started effect lives further down — needs isGenerateDisabled to be in scope.
  const visionStartFiredRef = useRef(false);

  // ── Fetch result gallery when quiz completes ──
  useEffect(() => {
    const topStyle = quizResult[0]?.style;
    if (!quizDone || !topStyle) return;
    const folderName = `Quiz/${styleToCloudinaryFolderName(topStyle)}`;
    fetch(`/api/images?folder=${encodeURIComponent(folderName)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const allUrls = data.map((r: any) => String(r.secure_url || r.url || '')).filter(Boolean);
        const unseen = allUrls.filter(url => !seenQuizImages.has(url));
        const pool = unseen.length >= 4 ? unseen : allUrls;
        setResultGalleryImages([...pool].sort(() => Math.random() - 0.5).slice(0, 6));
      })
      .catch(() => {});
  }, [quizDone, quizResult[0]?.style]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear page-local concept state when AuthContext clears the user ──
  // (Google script load + /api/auth/me probe + SESSION_EXPIRED handling all live in AuthContext.)
  useEffect(() => {
    if (user) return;
    setResults([]);
    setSessionConceptArchive([]);
    setRoomImage(null);
    setInspirationImages([]);
  }, [user]);

  // ── Warn before leaving if unsaved concepts ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (results.length > 0 || sessionConceptArchive.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [results, sessionConceptArchive]);

  // ── Hide visible Google button when logged in ──
  useEffect(() => {
    if (!user) return;
    ['google-signin-btn', 'google-signin-btn-shop'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
    });
  }, [user]);

  // ── Render the visible Google button into #google-signin-btn ──
  // The Google API is initialized once globally by AuthContext; this effect just
  // calls renderButton when the DOM target exists and we're logged out.
  useEffect(() => {
    if (!googleReady || authLoading || user) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tryRender = () => {
      if (user) return;
      if (!window.google?.accounts?.id) return;
      const el = document.getElementById('google-signin-btn');
      if (el) {
        el.style.display = '';
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: '320',
        });
      } else if (attempts < 10) {
        attempts++;
        timer = setTimeout(tryRender, 150);
      }
    };

    timer = setTimeout(tryRender, 100);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [googleReady, user, authLoading]);

  /**
   * Trigger the Google sign-in flow. Source attribution rules (C-followup):
   *   1) If an off-page CTA stamped a slug (header_cta / home_hero /
   *      home_ai_section / closing_band), use that — it's the "where did
   *      they come from" signal across navigation.
   *   2) Otherwise an explicit toolSourceSlug arg wins (rare; reserved for
   *      future non-tool surfaces inside this page).
   *   3) Default: derive from the currently-active tool tab
   *      → "quiz_signin" / "vision_signin" / "shopping_signin" / "audit_signin".
   *      Existing in-page sign-in buttons rely on this default — they're
   *      always rendered within the matching tool's panel.
   */
  const triggerGoogleSignIn = useCallback((toolSourceSlug?: string) => {
    const navSource = popSigninSource();
    const derivedFromTool = `${activeTool}_signin`;
    const source = navSource || toolSourceSlug || derivedFromTool;
    signIn({ toolUsed: activeTool, source });
  }, [signIn, activeTool]);

  /** Sign out and clear page-local concept state. */
  const handleLogout = useCallback(async () => {
    await signOut();
    // The user-cleared effect above also clears these, but we call here for immediacy.
    setResults([]);
    setSessionConceptArchive([]);
    setRoomImage(null);
    setInspirationImages([]);
  }, [signOut]);

  // Clear the quiz-gallery lightbox URL whenever the lightbox closes,
  // so opening it again (from any source) doesn't reuse a stale URL.
  useEffect(() => { if (!isLightboxOpen) setLightboxQuizUrl(null); }, [isLightboxOpen]);

  // ── Escape key for lightbox ──
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ── File handling ──
  const processFiles = (files: FileList | File[], type: 'inspiration' | 'room') => {
    if (!files || (files as FileList).length === 0) return;
    setValidationError(null);

    const readFile = (file: File): Promise<string> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

    if (type === 'inspiration') {
      const slots = 5 - inspirationImages.length;
      const toProcess = Array.from(files).slice(0, slots);
      Promise.all(toProcess.map(readFile)).then((images) => {
        setInspirationImages(prev => [...prev, ...images]);
      });
    } else {
      readFile(Array.from(files)[0]).then((dataUrl) => {
        setRoomImage(dataUrl);
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          setRoomAspectRatio(`${img.width}/${img.height}`);
          let supportedRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
          if (ratio > 1.5) supportedRatio = "16:9";
          else if (ratio > 1.2) supportedRatio = "4:3";
          else if (ratio > 0.8) supportedRatio = "1:1";
          else if (ratio > 0.6) supportedRatio = "3:4";
          else supportedRatio = "9:16";
          setApiAspectRatio(supportedRatio);
        };
        img.src = dataUrl;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'inspiration' | 'room') => {
    if (e.target.files) processFiles(e.target.files, type);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent, type: 'inspiration' | 'room') => {
    e.preventDefault();
    e.stopPropagation();
    setRoomDragOver(false);
    setInspoDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) processFiles(files, type);
  };

  const processShoppingFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setStandaloneShoppingImage(dataUrl);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio > 1.4) setStandaloneShoppingAspectRatio('16/9');
        else if (ratio > 1.1) setStandaloneShoppingAspectRatio('4/3');
        else if (ratio > 0.85) setStandaloneShoppingAspectRatio('1/1');
        else setStandaloneShoppingAspectRatio('3/4');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleShopDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShopDragOver(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) processShoppingFile(file);
  };

  const removeInspirationImage = (index: number) => {
    setInspirationImages(prev => prev.filter((_, i) => i !== index));
  };

  // ── Sample room trigger: fires handleGenerate once state has settled ───────
  // pendingGenerateRef is set by handleTrySampleRoom after populating roomImage
  // and inspirationImages. This effect fires on the subsequent render.
  useEffect(() => {
    if (!pendingGenerateRef.current) return;
    if (roomImage && inspirationImages.length > 0) {
      pendingGenerateRef.current = false;
      // isSampleRun=true so the backend skips the quota decrement
      const id = setTimeout(() => handleGenerate(false, true), 0);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomImage, inspirationImages.length]);

  // ── Try sample room — fetches gallery images and runs a real generation ───
  const handleTrySampleRoom = async () => {
    if (!user) { triggerGoogleSignIn(); return; }
    if (isProcessing || isSampleLoading) return;
    const storageKey = sampleRoomStorageKey();
    if (sessionStorage.getItem(storageKey)) {
      setValidationError(t('aiVision.gallery.sampleAlreadyRun'));
      return;
    }
    // Mark as used immediately so double-clicks don't slip through
    sessionStorage.setItem(storageKey, '1');

    setIsSampleLoading(true);
    setValidationError(null);

    const urlToDataUrl = async (url: string, label: string): Promise<string> => {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });
    };

    try {
      const [roomDataUrl, ...refDataUrls] = await Promise.all([
        urlToDataUrl(INSPIRATION_GALLERY.roomPhotoUrl, 'room'),
        ...INSPIRATION_GALLERY.referenceUrls.map((url, i) => urlToDataUrl(url, `ref${i + 1}`)),
      ]);

      // Detect aspect ratio for the preview UI
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          setRoomAspectRatio(`${img.width}/${img.height}`);
          let ar: '1:1'|'3:4'|'4:3'|'9:16'|'16:9' = '1:1';
          if (ratio > 1.5) ar = '16:9';
          else if (ratio > 1.2) ar = '4:3';
          else if (ratio > 0.8) ar = '1:1';
          else if (ratio > 0.6) ar = '3:4';
          else ar = '9:16';
          setApiAspectRatio(ar);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = roomDataUrl;
      });

      // Populate form visibly — user sees the sample inputs being applied
      setRoomImage(roomDataUrl);
      setInspirationImages(refDataUrls);
      setSelectedRoom(INSPIRATION_GALLERY.roomType);

      // Signal the useEffect above to fire handleGenerate once state settles
      pendingGenerateRef.current = true;
    } catch (err) {
      console.error('[Sample room] fetch error:', err);
      setValidationError('Could not load sample images. Please try again.');
      sessionStorage.removeItem(storageKey); // allow retry on network failure
    } finally {
      setIsSampleLoading(false);
    }
  };

  // ── Generate ── (two-step server-side pipeline)
  const handleGenerate = async (isVariation = false, isSampleRun = false) => {
    if (!user) return;

    // Validate: room photo required
    if (!roomImage) {
      setValidationError(t('ai.uploadRoomImage'));
      return;
    }
    // Validate: at least references OR a style preset
    if (inspirationImages.length === 0 && !selectedStyle) {
      setValidationError(t('ai.vision.noStyleNoRef'));
      return;
    }
    // Allow sample runs even if quota is 0 (server handles the bypass)
    if (!isSampleRun && (user?.generationsLeft ?? 0) <= 0) return;

    setIsProcessing(true);
    setError(null);

    if (!isVariation) {
      // Archive current results before starting fresh so thumbnails accumulate.
      // Exception: sample-run results are silently discarded on the first real generation —
      // they should never persist into the user's own concept strip.
      if (results.length > 0 && !lastGenWasSampleRef.current) {
        setSessionConceptArchive(prev => {
          const next = [...prev];
          for (const r of results) {
            if (!next.includes(r)) next.push(r);
          }
          return next;
        });
      }
      setResults([]);
      setShoppingResults([]);
      setShoppingItems([]);
      setShoppingDone(false);
      setForceStandaloneUpload(false);
      variationSeedRef.current = 0;
    } else {
      variationSeedRef.current += 1;
      // Variation: keep shoppingItems so re-search CTA appears
      setShoppingResults([]);
      setShoppingDone(false);
    }

    try {
      const res = await apiFetch('/api/ai-vision/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomPhoto: roomImage,
          referenceImages: inspirationImages,
          stylePreset: selectedStyle || undefined,
          roomType: selectedRoom || undefined,
          variationSeed: isVariation ? variationSeedRef.current : undefined,
          isSampleRun: isSampleRun || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setUser(prev => prev ? { ...prev, generationsLeft: 0 } : null);
          setError(t('ai.noGenerationsLeft'));
          return;
        }
        throw new Error(data?.error ?? 'Generation failed');
      }

      // Sync generationsLeft from server response
      if (typeof data.generationsLeft === 'number') {
        setUser(prev => prev ? { ...prev, generationsLeft: data.generationsLeft } : null);
      }

      const generatedImage: string = data.conceptUrl;

      // Track whether this result came from a sample run so the archive
      // logic above can skip it on the next real generation.
      lastGenWasSampleRef.current = isSampleRun;

      if (isVariation) {
        setResults(prev => {
          const newResults = [...prev, generatedImage];
          setSelectedConceptIndex(newResults.length - 1);
          return newResults;
        });
      } else {
        setResults([generatedImage]);
        setSelectedConceptIndex(0);
      }

    } catch (err: any) {
      console.error('[AI Vision] handleGenerate error:', err);
      let errorMessage = t('ai.generationFailed');
      const msg: string = err?.message?.toLowerCase() ?? '';
      if (msg.includes('403') || msg.includes('permission') || msg.includes('api key')) {
        errorMessage = t('ai.apiKeyError');
      } else if (msg.includes('quota') || msg.includes('rate')) {
        errorMessage = t('ai.quotaExceeded');
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Download ──
  const handleDownload = (dataUrl: string, conceptNumber?: number) => {
    const num = conceptNumber ?? ((allSessionConcepts.indexOf(dataUrl) + 1) || 1);
    const filename = `Designature_Studio_Generated_Concept_${num}.jpg`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    // Don't archive sample-run results — they shouldn't persist in the user's strip
    if (!lastGenWasSampleRef.current) {
      setSessionConceptArchive((prev) => {
        const next = [...prev];
        for (const r of results) {
          if (!next.includes(r)) next.push(r);
        }
        return next;
      });
    }
    lastGenWasSampleRef.current = false;
    setResults([]);
    setSelectedConceptIndex(0);
    setInspirationImages([]);
    setRoomImage(null);
    setError(null);
    setValidationError(null);
    setShoppingResults([]);
    setShoppingItems([]);
    setShoppingDone(false);
    setShoppingError(null);
    setStandaloneShoppingImage(null);
    variationSeedRef.current = 0;
  };

  // ── Shopping search ──
  // ── PDF Download ──
  const handleDownloadShoppingPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const conceptImage = allSessionConcepts[selectedConceptIndex];

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = margin;

    // ── Header ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(10, 10, 10);
    doc.text('DESIGNATURE', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 80);
    doc.text('ONLINE INTERIOR DESIGN STUDIO', margin, y + 5);
    doc.setTextColor(150, 150, 150);
    doc.text('designature.studio', pageW - margin, y + 2, { align: 'right' });
    y += 12;

    // ── Concept image ──
    if (conceptImage) {
      try {
        const imgH = Math.round(contentW * 0.5);
        doc.addImage(conceptImage, 'JPEG', margin, y, contentW, imgH);
        y += imgH + 4;
      } catch (e) { /* skip if image fails */ }
    }

    // ── Title ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(10, 10, 10);
    doc.text('Shopping List', margin, y);
    y += 2;
    doc.setDrawColor(196, 97, 58);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 6;

    // ── Products ──
    for (const group of shoppingResults) {
      // Normalise: paid uses byRetailer, free uses products
      const products = group.products && group.products.length > 0
        ? group.products
        : group.byRetailer
          ? group.byRetailer.filter((e: any) => e.product).map((e: any) => ({ ...e.product, source: e.retailer }))
          : [];
      if (products.length === 0) continue;

      // Category header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(10, 10, 10);
      doc.text(group.item.category.toUpperCase(), margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text('— ' + group.item.description, margin + doc.getTextWidth(group.item.category.toUpperCase()) + 3, y);
      y += 5;

      for (const product of products) {
        // Check page space
        if (y > 265) { doc.addPage(); y = margin; }

        // Product row
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(10, 10, 10);
        const titleLines = doc.splitTextToSize(product.title, contentW - 50);
        doc.text(titleLines[0], margin + 3, y);

        // Source + price on right
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(product.source || '', pageW - margin - 35, y);
        if (product.price) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(10, 10, 10);
          doc.text(product.price, pageW - margin, y, { align: 'right' });
        }
        y += 4;

        // Link
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(196, 97, 58);
        if (product.link && product.link !== '#') {
          // Show clean domain name only
          let displayLink = product.link;
          try {
            const u = new URL(product.link);
            const domain = u.hostname.replace(/^www\./, '');
            const path = u.pathname !== '/' ? u.pathname.substring(0, 30) : '';
            displayLink = domain + (path ? (path.length > 27 ? path + '...' : path) : '');
          } catch {}
          doc.textWithLink(displayLink.substring(0, 70), margin + 3, y, { url: product.link });
        }
        y += 5;

        // Divider
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, y, margin + contentW, y);
        y += 3;
      }
      y += 3;
    }

    // ── Footer ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Generated by Designature Studio AI · designature.studio · Prices and availability may vary.', pageW / 2, 290, { align: 'center' });

    doc.save('Designature_Shopping_List.pdf');
  };

  // Auto-scroll moodboard to top (newest card) whenever a room is loved
  useEffect(() => {
    const el = moodboardRef.current;
    if (!el || lovedRooms.length === 0) return;
    // scrollTo not available in jsdom — fall back to direct assignment
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      el.scrollTop = 0;
    }
  }, [lovedRooms.length]);

  // ── Style Quiz helpers ──

  /** Strip Cloudinary host + transform params, return the Quiz/… path key */
  const extractCloudinaryPath = (url: string): string => {
    const match = url.match(/Quiz\/[^?]+/);
    return match ? match[0] : '';
  };

  // ── Style Quiz handlers ──
  const handleQuizVote = (vote: 'love' | 'skip' | 'no') => {
    if (!quizImageReady) return;

    const newVotes = { ...quizVotes };
    const styleChanges: Record<string, number> = {};

    if (vote === 'love') {
      const imagePath = extractCloudinaryPath(currentQuizImage.url);
      const weights = QUIZ_IMAGE_WEIGHTS[imagePath];

      if (weights) {
        // Multi-attribute: distribute points across primary, strong, hint tiers
        styleChanges[weights.primary] = (styleChanges[weights.primary] || 0) + TIER_POINTS.primary;
        for (const s of weights.strong) {
          styleChanges[s] = (styleChanges[s] || 0) + TIER_POINTS.strong;
        }
        for (const s of weights.hint) {
          styleChanges[s] = (styleChanges[s] || 0) + TIER_POINTS.hint;
        }
      } else {
        // Fallback: untagged image — award primary points to the folder style
        const folderStyle = quizSequence[quizStep];
        styleChanges[folderStyle] = TIER_POINTS.primary;
        console.warn(`Quiz image not in weights file: ${imagePath}`);
      }

      // Apply all style changes to the vote tally
      for (const [s, pts] of Object.entries(styleChanges)) {
        newVotes[s] = (newVotes[s] || 0) + pts;
      }
    }

    // Record for undo — store all style changes so back can reverse them exactly
    setVoteHistory(prev => [...prev, {
      step: quizStep, vote, imageUrl: currentQuizImage.url, styleChanges,
    }]);

    // Track loved rooms for moodboard (includes styleChanges for micro-stat)
    if (vote === 'love') {
      setLovedRooms(prev => [...prev, {
        step: quizStep, imageUrl: currentQuizImage.url, styleChanges,
      }]);
    }

    if (quizStep >= QUIZ_LENGTH - 1) {
      const total = Object.values(newVotes).reduce((a, b) => a + b, 0) || 1;
      const stylesWithVotes = STYLES.filter(s => (newVotes[s] || 0) > 0);
      const rounded = roundPercentages(stylesWithVotes.map(s => ((newVotes[s] || 0) / total) * 100));
      const sorted = stylesWithVotes
        .map((s, i) => ({ style: s, pct: rounded[i] }))
        .sort((a, b) => b.pct - a.pct);
      setQuizVotes(newVotes);
      setQuizResult(sorted);
      setQuizDone(true);
    } else {
      setQuizImageReady(false);
      setQuizVotes(newVotes);
      setQuizStep(prev => prev + 1);
    }
  };

  /** Undo the last vote and go back one room */
  const handleQuizBack = () => {
    if (voteHistory.length === 0) return;
    const last = voteHistory[voteHistory.length - 1];
    const newVotes = { ...quizVotes };

    // Reverse all style changes from the last vote
    for (const [s, pts] of Object.entries(last.styleChanges)) {
      newVotes[s] = Math.max(0, (newVotes[s] || 0) - pts);
      if (newVotes[s] === 0) delete newVotes[s];
    }

    setVoteHistory(prev => prev.slice(0, -1));
    // If the undone vote was a love, pop it from the moodboard too
    if (last.vote === 'love') {
      setLovedRooms(prev => prev.slice(0, -1));
    }
    setQuizVotes(newVotes);
    setQuizStep(last.step);
    setQuizImageReady(false);
  };

  /** End quiz early (available from step 9 onward) */
  const handleQuizEarlyEnd = () => {
    const total = Object.values(quizVotes).reduce((a: number, b: number) => a + b, 0) || 1;
    const stylesWithVotes = STYLES.filter(s => (quizVotes[s] || 0) > 0);
    const rounded = roundPercentages(stylesWithVotes.map(s => ((quizVotes[s] || 0) / total) * 100));
    const sorted = stylesWithVotes
      .map((s, i) => ({ style: s, pct: rounded[i] }))
      .sort((a, b) => b.pct - a.pct);
    setQuizResult(sorted);
    setQuizDone(true);
  };

  const handleQuizReset = () => {
    if (quizDone && quizResult.length > 0 && !quizResultSavedRef.current) {
      setQuizHistory(prev => [quizResult, ...prev].slice(0, 3));
    }
    quizResultSavedRef.current = false;
    setSelectedPrevResult(null);
    setShowQuizResults(false);
    setQuizStep(0);
    setQuizVotes({});
    setQuizDone(false);
    setQuizResult([]);
    setQuizImageReady(false);
    setQuizSeed(Math.floor(Math.random() * 100));
    setQuizSequence(generateQuizSequence());
    setVoteHistory([]);
    setLovedRooms([]);
    setSeenQuizImages(new Set());
    setResultGalleryImages([]);
    // Clear persisted results on explicit Retake.
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(QUIZ_PERSIST_KEY); } catch { /* sessionStorage blocked */ }
    }
  };

  const handleApplyQuizStyle = () => {
    if (quizResult.length > 0) {
      setSelectedStyle(quizResult[0].style);
      if (!quizResultSavedRef.current) {
        setQuizHistory(prev => [quizResult, ...prev].slice(0, 3));
        quizResultSavedRef.current = true;
      }
    }
    setActiveTool('vision');
    setTimeout(() => {
      const el = document.getElementById('ai-concepts-tools');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Share URL uses window.location.origin so it works correctly in production
  // (https://www.designature.studio) AND lets us test the URL-parsing logic
  // in localhost incognito tabs on the same machine.
  //
  // Cross-device friend testing requires deployment to production first.
  /** Build a shareable URL with DNA + percentages baked in. */
  const buildShareUrl = useCallback((): string => {
    if (typeof window === 'undefined' || quizResult.length === 0) return '';
    const primary = quizResult[0]?.style ?? '';
    const secondary = quizResult[1]?.style ?? '';
    const dna = secondary
      ? `${primary.replace(/\s+/g, '-')}-${secondary.replace(/\s+/g, '-')}`
      : primary.replace(/\s+/g, '-');
    const pcts = quizResult.slice(0, 5).map(r => Math.round(r.pct)).join('-');
    const params = new URLSearchParams({ dna, pcts });
    return `${window.location.origin}/ai-concepts?${params.toString()}`;
  }, [quizResult]);

  /** Share handler — copies URL or invokes native share on mobile. */
  const handleShareDna = useCallback(async () => {
    const url = buildShareUrl();
    if (!url) return;
    const title = 'My design DNA — Designature Studio';
    const text = quizResult[0]
      ? `My design style is ${quizResult[0].style}${quizResult[1] ? ` + ${quizResult[1].style}` : ''}.`
      : 'Check out my design DNA.';
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share && /Mobi|Android/i.test(navigator.userAgent)) {
        await (navigator as any).share({ title, text, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showQuizToast(t('ai.quiz.shareToast'));
    } catch {
      // user cancelled native share or clipboard blocked — silently no-op
    }
  }, [buildShareUrl, quizResult, showQuizToast, t]);

  /** Save handler — paid users get a toast, free users get a confirmation modal. */
  const handleSaveStyle = useCallback(() => {
    if (!user?.isPaid) {
      setQuizSaveModalOpen(true);
      return;
    }
    console.log('save style', quizResult[0]?.style);
    showQuizToast(t('ai.quiz.savedToast'));
  }, [user?.isPaid, quizResult, showQuizToast, t]);

  // ── On-load handler: parse ?dna=...&pcts=... URL params and skip to results ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const dna = params.get('dna');
    const pcts = params.get('pcts');
    if (!dna || !pcts) return;
    const styleSlugs = dna.split('-').reduce<string[]>((acc, part) => {
      // Re-stitch hyphenated styles like "Mid-Century" by checking the canonical STYLES list.
      const candidate = acc.length > 0 ? `${acc[acc.length - 1]} ${part}` : part;
      const candHyphen = acc.length > 0 ? `${acc[acc.length - 1]}-${part}` : part;
      const match = STYLES.find(s => s === candidate || s === candHyphen || s === part);
      if (match && match !== acc[acc.length - 1]) {
        if (acc.length > 0 && (match === candidate || match === candHyphen)) {
          acc[acc.length - 1] = match;
        } else {
          acc.push(match);
        }
      } else {
        acc.push(part);
      }
      return acc;
    }, []);
    const validStyles = styleSlugs.filter(s => STYLES.includes(s));
    const pctVals = pcts.split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (validStyles.length === 0 || pctVals.length === 0) return;
    const synthResult: { style: string; pct: number }[] = [];
    const used = new Set<string>();
    for (let i = 0; i < pctVals.length; i++) {
      let style = validStyles[i];
      if (!style || used.has(style)) {
        style = STYLES.find(s => !used.has(s)) ?? STYLES[0];
      }
      used.add(style);
      synthResult.push({ style, pct: pctVals[i] });
    }
    setQuizResult(synthResult);
    setQuizDone(true);
    setQuizSharedView(true);
    setActiveTool('quiz');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Clear shared-view state and start a fresh quiz for the user. */
  const exitSharedView = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}#quiz`;
      window.history.replaceState({}, '', url);
      try { sessionStorage.removeItem(QUIZ_PERSIST_KEY); } catch { /* sessionStorage blocked */ }
    }
    setQuizSharedView(false);
    handleQuizReset();
  }, [handleQuizReset]);

  // ── Persist results to sessionStorage so navigation away/back keeps the DNA visible ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!quizDone || quizResult.length === 0 || quizSharedView) return;
    try {
      sessionStorage.setItem(QUIZ_PERSIST_KEY, JSON.stringify({
        quizResult,
        quizVotes,
        lovedRooms,
        ts: Date.now(),
      }));
    } catch {
      // sessionStorage blocked / quota — non-fatal
    }
  }, [quizDone, quizResult, quizVotes, lovedRooms, quizSharedView]);

  // ── Restore persisted results on mount when no shared-link params present ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('dna') && params.get('pcts')) return; // shared view takes precedence
    try {
      const raw = sessionStorage.getItem(QUIZ_PERSIST_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.quizResult) || parsed.quizResult.length === 0) return;
      setQuizResult(parsed.quizResult);
      if (parsed.quizVotes) setQuizVotes(parsed.quizVotes);
      if (Array.isArray(parsed.lovedRooms)) setLovedRooms(parsed.lovedRooms);
      setQuizDone(true);
    } catch {
      // bad JSON / blocked — ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear persisted results on logout (transition from signed-in to signed-out only,
  //     NOT on initial mount where user is null from the start) ──
  const wasSignedInRef = useRef(false);
  useEffect(() => {
    if (user) {
      wasSignedInRef.current = true;
      return;
    }
    if (!wasSignedInRef.current) return;
    wasSignedInRef.current = false;
    if (typeof window === 'undefined') return;
    try { sessionStorage.removeItem(QUIZ_PERSIST_KEY); } catch { /* blocked */ }
  }, [user]);

  // ── Escape-key closes save-style modal + drawer ──
  useEffect(() => {
    if (!quizSaveModalOpen && !quizDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuizSaveModalOpen(false);
        setQuizDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quizSaveModalOpen, quizDrawerOpen]);

  const handleShoppingSearch = async (overrideItems?: any[], forceStandalone?: boolean) => {
    const imageToAnalyse = forceStandalone
      ? standaloneShoppingImage
      : allSessionConcepts[selectedConceptIndex] || standaloneShoppingImage;
    if (!imageToAnalyse && !overrideItems) return;
    setShoppingLoading(true);
    setShoppingError(null);
    if (!overrideItems) {
      setShoppingResults([]);
      setShoppingDone(false);
    }
    try {
      let itemsToSearch: any[] = [];

      if (overrideItems) {
        itemsToSearch = overrideItems;
      } else {
        const identifyRes = await apiFetch('/api/shopping/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: imageToAnalyse }),
        });
        const identifyData = await identifyRes.json();
        if (!identifyRes.ok) throw new Error(identifyData?.error || 'Could not identify items');
        itemsToSearch = identifyData.items || [];
        setShoppingItems(itemsToSearch);
      }

      const res = await apiFetch('/api/shopping/search', {
        method: 'POST',
        body: JSON.stringify({ items: itemsToSearch, country: shoppingCountry }),
      });
      const data = await res.json();
      if (!res.ok) {
        // I-009/AI-027: server returns 503 with { code: "disabled" |
        // "daily_budget_exceeded", resetAt? } when the kill switch is on or
        // the daily Serper budget is reached. Swap to the offline card.
        if (res.status === 503 && (data?.code === 'disabled' || data?.code === 'daily_budget_exceeded')) {
          setShoppingOffline({ code: data.code, resetAt: data.resetAt });
          return;
        }
        throw new Error(data.error || 'Search failed');
      }
      setShoppingResults(data.results || []);
      setShoppingDone(true);
      if (typeof data.shoppingListsLeft === 'number') {
        setUser((prev) => (prev ? { ...prev, shoppingListsLeft: data.shoppingListsLeft } : null));
      }
    } catch (err: any) {
      console.error("Shopping search error:", err);
      setShoppingError(err.message || t('ai.searchFailed'));
    } finally {
      setShoppingLoading(false);
    }
  };

  /** Switch to Shopping tab + scroll to section (vision tab hides shopping-focused UI). */
  const focusShoppingTabAndRunSearch = () => {
    setSearchSourceImage(allSessionConcepts[selectedConceptIndex] || standaloneShoppingImage || null);
    setSearchSourceIsStandalone(false);
    setActiveTool('shopping');
    setTimeout(() => {
      void handleShoppingSearch();
      const el = document.getElementById('shop-this-look');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  /** Called from AI Vision results — resets any standalone upload and shops the current AI concept. */
  const shopCurrentConcept = () => {
    setStandaloneShoppingImage(null);
    setForceStandaloneUpload(false);
    setSearchSourceImage(allSessionConcepts[selectedConceptIndex] || null);
    setSearchSourceIsStandalone(false);
    focusShoppingTabAndRunSearch();
  };

  /** Called from Option B — forces the standalone uploaded image, ignores AI concept. */
  const focusShoppingTabAndRunStandaloneSearch = () => {
    setSearchSourceImage(standaloneShoppingImage);
    setSearchSourceIsStandalone(true);
    setActiveTool('shopping');
    setTimeout(() => {
      void handleShoppingSearch(undefined, true);
      const el = document.getElementById('shop-this-look');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handlePinterestPaste = async (url: string) => {
    if (!url.trim() || inspirationImages.length >= 5) return;
    if (!url.includes('pinterest.com') && !url.includes('pin.it')) {
      setPinterestError('Please paste a Pinterest URL');
      return;
    }
    setPinterestLoading(true);
    setPinterestError('');
    try {
      const res = await apiFetch(`/api/pinterest/pin?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setInspirationImages(prev => [...prev, data.imageUrl].slice(0, 5));
      setPinterestUrl('');
    } catch (err: any) {
      setPinterestError(err.message || 'Could not load image from that URL');
    } finally {
      setPinterestLoading(false);
    }
  };

  // Disabled when: processing, no room photo, no references AND no preset, no user, or quota exhausted
  const isGenerateDisabled =
    isProcessing ||
    !roomImage ||
    (inspirationImages.length === 0 && !selectedStyle) ||
    !user ||
    (user?.generationsLeft ?? 0) <= 0;

  // I-021b: vision_started fires when the Generate button transitions
  // disabled → enabled. One-shot per session; re-arms when results clear.
  useEffect(() => {
    if (isGenerateDisabled) {
      if (results.length === 0 && !isProcessing) visionStartFiredRef.current = false;
      return;
    }
    if (!visionStartFiredRef.current) {
      visionStartFiredRef.current = true;
      trackVisionStart();
    }
  }, [isGenerateDisabled, results.length, isProcessing]);


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />

      {/* ── PAGE HERO ── */}
      <div className="pt-24 bg-[#0a0a0a]">
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-12 flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="flex-1">
            <button
              onClick={() => navigateTo('home')}
              className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/50 hover:text-white transition-colors flex items-center gap-2 group mb-10"
            >
              <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
              {t('nav.backToHome')}
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/60 mb-4">
              {t('ai.engine')}
            </p>
            <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tight leading-[0.88] uppercase text-white mb-6">
              <span>AI {t('ai.design')}</span><br /><span className="italic font-light text-white/50">{t('ai.studio')}</span>
            </h1>
            <p className="text-[11px] text-white/60 uppercase tracking-[0.18em] leading-[2.2] max-w-md mb-8">
              {t('ai.desc')}
            </p>
            <button
              onClick={() => {
                if (!user) {
                  triggerGoogleSignIn();
                } else if (activeTool === 'quiz') {
                  document.getElementById('style-quiz-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (activeTool === 'vision') {
                  document.getElementById('ai-vision-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (activeTool === 'audit') {
                  document.getElementById('room-audit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  document.getElementById('shop-this-look')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="inline-flex items-center gap-3 bg-[#0047AB] text-white text-[10px] font-bold uppercase tracking-[0.25em] px-7 py-4 hover:bg-[#003d99] transition-colors"
            >
              {!user
                ? `${t('ai.signInToStart')} →`
                : activeTool === 'quiz'
                  ? `${t('ai.heroCtaQuiz')} →`
                  : activeTool === 'vision'
                    ? `${t('ai.heroCtaVision')} →`
                    : activeTool === 'audit'
                      ? 'Score My Room →'
                      : `${t('ai.heroCtaShopping')} →`}
            </button>
          </div>
          <div className="w-full md:w-[240px] flex-shrink-0">
            {authLoading ? (
              <div className="w-full h-[100px]" />
            ) : (
              <>
                {user && (
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                      {user.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-white truncate">{user.name}</div>
                        <div className="text-[11px] text-white/65 truncate">{user.email}</div>
                      </div>
                      <button type="button" onClick={handleLogout}>
                        <LogOut className="w-3.5 h-3.5 text-white/65 hover:text-white transition-colors" />
                      </button>
                    </div>
                    <div className="text-[11px] text-white/85 uppercase tracking-[0.15em] text-right font-bold">
                      {user.generationsLeft >= 999 ? t('ai.unlimited') : `${user.generationsLeft} ${t('ai.remaining')}`}
                    </div>
                  </div>
                )}
                <div className={user ? 'hidden' : 'block'}>
                  <p className="text-[11px] text-white/80 uppercase tracking-[0.2em] text-right mb-2">
                    {t('ai.unlockAll')}
                  </p>
                  <div id="google-signin-btn" className="w-full min-h-[42px]" />
                  <p className="text-[11px] text-white/75 uppercase tracking-[0.15em] text-right mt-2">
                    {t('ai.noCard')}
                  </p>
                </div>
              </>
            )}
            <div className="flex gap-0 mt-8 pt-6 border-t border-white/8">
              <div className="flex-1 pr-5 border-r border-white/8">
                <div className="text-3xl font-bold text-white tracking-tight">Free</div>
                <div className="text-[11px] text-white/70 uppercase tracking-[0.18em] mt-1">{t('ai.toExplore')}</div>
              </div>
              <div className="flex-1 pl-5 text-right">
                <div className="text-3xl font-bold text-white tracking-tight">3</div>
                <div className="text-[11px] text-white/70 uppercase tracking-[0.18em] mt-1">{t('ai.liveTools')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOL SELECTOR GRID (full-bleed) ── */}
      <div>
        <div>
          <div id="ai-concepts-tools" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-y-2 border-black">

            {/* Tool 1 — Style Quiz (LIVE) */}
            <div
              onClick={() => { if (!isProcessing) setActiveTool('quiz'); }}
              className={`group relative p-4 border-r border-black/10 transition-all ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${activeTool === 'quiz' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
              style={{ minHeight: '130px' }}
            >
              <div className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'quiz' ? 'text-white/75' : 'text-black/55'}`}>01</div>
              <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'quiz' ? 'text-white' : 'text-black'}`}>{t('ai.styleQuiz')}</div>
              <div className={`text-[11px] leading-relaxed uppercase tracking-wide ${activeTool === 'quiz' ? 'text-white/85' : 'text-black/70'}`}>
                {t('ai.discoverDNA')}
                {user && (
                  <span className={`block mt-1 font-bold ${activeTool === 'quiz' ? 'text-white' : 'text-black'}`}>
                    · {t('ai.unlimited')}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'quiz' ? 'text-blue-100 bg-blue-900/40' : 'text-green-700 bg-green-50'}`}>{t('ai.nowActive')}</span>
              </div>
            </div>

            {/* Tool 2 — AI Vision (LIVE) */}
            <div
              onClick={() => setActiveTool('vision')}
              className={`group relative p-4 cursor-pointer border-r border-black/10 transition-all ${activeTool === 'vision' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
              style={{ minHeight: '130px' }}
            >
              <div className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'vision' ? 'text-white/75' : 'text-black/55'}`}>02</div>
              <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'vision' ? 'text-white' : 'text-black'}`}>{t('ai.aiVision')}</div>
              <div className={`text-[11px] leading-relaxed uppercase tracking-wide ${activeTool === 'vision' ? 'text-white/85' : 'text-black/70'}`}>
                {t('ai.transformRoom')}
                {user && (
                  <span className={`block mt-1 font-bold ${activeTool === 'vision' ? 'text-white' : 'text-black'}`}>
                    · {user.generationsLeft >= 999 ? 'Unlimited' : `${user.generationsLeft} ${t('ai.remaining')}`}
                  </span>
                )}
                {!user && (
                  <span className="block mt-1">
                    · 3 {t('ai.toExplore')}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'vision' ? 'text-blue-100 bg-blue-900/40' : 'text-green-700 bg-green-50'}`}>{t('ai.nowActive')}</span>
              </div>
            </div>

            {/* Tool 3 — Shopping List (LIVE / OFFLINE) */}
            {(() => {
              const shoppingDown = !!shoppingStatus?.disabled;
              return (
            <div
              onClick={() => { if (!isProcessing) setActiveTool('shopping'); }}
              className={`group relative p-4 border-r border-black/10 transition-all ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${activeTool === 'shopping' ? 'bg-[#0047AB] text-white' : `bg-white text-black hover:bg-neutral-50${shoppingDown ? ' opacity-60' : ''}`}`}
              style={{ minHeight: '130px' }}
            >
              <div className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'shopping' ? 'text-white/75' : 'text-black/55'}`}>03</div>
              <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'shopping' ? 'text-white' : 'text-black'}`}>{t('ai.shoppingList')}</div>
              <div className={`text-[11px] leading-relaxed uppercase tracking-wide ${activeTool === 'shopping' ? 'text-white/85' : 'text-black/70'}`}>
                {t('ai.shopInterior')}
                {user && (
                  <span className={`block mt-1 font-bold ${activeTool === 'shopping' ? 'text-white' : 'text-black'}`}>
                    · {(user.shoppingListsLeft ?? 3) >= 999 ? 'Unlimited' : `${user.shoppingListsLeft ?? 3} ${t('ai.remainingShopping')}`}
                  </span>
                )}
                {!user && (
                  <span className="block mt-1">
                    · 3 {t('ai.toExplore')}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3">
                {shoppingDown ? (
                  <span
                    className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'shopping' ? 'text-white/65 bg-black/20' : 'text-black/45 bg-black/[0.06]'}`}
                    title={shoppingStatus?.code === 'daily_budget_exceeded' ? 'Daily limit reached — back tomorrow' : 'Shopping List is offline'}
                  >
                    offline
                  </span>
                ) : (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'shopping' ? 'text-blue-100 bg-blue-900/40' : 'text-green-700 bg-green-50'}`}>{t('ai.nowActive')}</span>
                )}
              </div>
            </div>
              );
            })()}

            {/* Tool 4 — Room Audit (LIVE for paid/owner only, SOON for everyone else) */}
            {user?.isPaid ? (
              <div
                onClick={() => { if (!(isProcessing || auditProcessing)) setActiveTool('audit'); }}
                className={`group relative p-4 border-r border-black/10 transition-all ${
                  (isProcessing || auditProcessing) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${activeTool === 'audit' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
                style={{ minHeight: '130px' }}
              >
                <div className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'audit' ? 'text-white/75' : 'text-black/55'}`}>04</div>
                <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'audit' ? 'text-white' : 'text-black'}`}>{t('ai.roomAudit')}</div>
                <div className={`text-[11px] leading-relaxed uppercase tracking-wide ${activeTool === 'audit' ? 'text-white/85' : 'text-black/70'}`}>
                  {t('ai.scoreSpace')}
                  <span className={`block mt-1 font-bold ${activeTool === 'audit' ? 'text-white' : 'text-black'}`}>
                    · {user.auditsLeft === 999 ? 'Unlimited' : user.auditsLeft} {t('ai.remaining')}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'audit' ? 'text-blue-100 bg-blue-900/40' : 'text-green-700 bg-green-50'}`}>
                    {t('ai.nowActive')}
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigateTo('pricing')}
                className="group relative p-4 border-r border-black/8 cursor-pointer transition-all duration-200 opacity-70 hover:opacity-100 vf-locked-tile vf-locked-design"
                style={{ minHeight: '130px' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/55 mb-3">04</div>
                <div className="font-display text-base font-bold leading-tight mb-1 text-black/80">{t('ai.roomAudit')}</div>
                <div className="text-[11px] text-black/65 leading-relaxed uppercase tracking-wide">
                  {t('ai.scoreSpace')}
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-[#0047AB] px-1.5 py-0.5">DESIGN+</span>
                </div>
              </div>
            )}

            {/* Tool 5 — Design Brief (SOON) */}
            <div
              className="group relative p-4 border-r border-black/8 cursor-not-allowed opacity-[0.62] vf-locked-tile vf-locked-soon"
              style={{ minHeight: '130px' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/55 mb-3">05</div>
              <div className="font-display text-base font-bold leading-tight mb-1 text-black/75">{t('ai.designBrief')}</div>
              <div className="text-[11px] text-black/60 leading-relaxed uppercase tracking-wide">
                {t('ai.buildBrief')}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-black/55 bg-black/5 px-1.5 py-0.5">SOON</span>
              </div>
            </div>

            {/* Tool 6 — Cultural Advisor (SOON) */}
            <div
              className="group relative p-4 cursor-not-allowed opacity-[0.62] vf-locked-tile vf-locked-soon"
              style={{ minHeight: '130px' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/55 mb-3">06</div>
              <div className="font-display text-base font-bold leading-tight mb-1 text-black/75">{t('ai.culturalAdvisor')}</div>
              <div className="text-[11px] text-black/60 leading-relaxed uppercase tracking-wide">
                {t('ai.blendStyles')}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-black/55 bg-black/5 px-1.5 py-0.5">SOON</span>
              </div>
            </div>

          </div>
        </div>

        {/* Active tool bar (full-bleed cobalt stripe) */}
        <div id="active-tool-bar">
          <div className="bg-[#0047AB] flex items-center justify-between px-8 md:px-16 py-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75 mb-0.5">
                {activeTool === 'quiz' ? '01' : activeTool === 'vision' ? '02' : activeTool === 'shopping' ? '03' : '04'} — {t('ai.nowActive')}
              </div>
              <div className="text-[13px] font-bold text-white">
                {activeTool === 'quiz' ? t('ai.styleQuiz') : activeTool === 'vision' ? t('ai.aiVision') : activeTool === 'shopping' ? t('ai.shoppingList') : t('ai.roomAudit')}
              </div>
              <div className="text-[12px] text-white/85 mt-0.5">
                {activeTool === 'quiz'
                  ? t('ai.quizDesc')
                  : activeTool === 'vision'
                  ? t('ai.visionDesc')
                  : activeTool === 'shopping'
                  ? t('ai.shopDesc')
                  : 'Get a scored report card for any room with actionable fixes'}
              </div>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/75 hidden md:block">
              {t('ai.jumpToTool')} ↑
            </div>
          </div>
        </div>
      </div>

      {/* ── AI VISION SHOWCASE (logged-out) ── */}
      {!authLoading && !user && activeTool === 'vision' && (
        <AIVisionShowcase onRequestLogin={() => triggerGoogleSignIn()} onOpenFeedback={() => setFeedbackOpen(true)} />
      )}

      {/* ── AI VISION EXPERIENCE (logged-in, AI-023 Variant D) ── */}
      {!authLoading && user && activeTool === 'vision' && (
        <VisionExperience
          roomImage={roomImage}
          inspirationImages={inspirationImages}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
          isProcessing={isProcessing}
          results={results}
          sessionConceptArchive={sessionConceptArchive}
          allSessionConcepts={allSessionConcepts}
          selectedConceptIndex={selectedConceptIndex}
          setSelectedConceptIndex={setSelectedConceptIndex}
          selectedConceptUrl={selectedConceptUrl}
          handleFileChange={handleFileChange}
          handleDrop={handleDrop}
          handleGenerate={handleGenerate}
          handleReset={handleReset}
          handleDownload={handleDownload}
          handleTrySampleRoom={handleTrySampleRoom}
          removeInspirationImage={removeInspirationImage}
          handlePinterestPaste={handlePinterestPaste}
          pinterestUrl={pinterestUrl}
          setPinterestUrl={setPinterestUrl}
          pinterestError={pinterestError}
          setPinterestError={setPinterestError}
          pinterestLoading={pinterestLoading}
          isGenerateDisabled={isGenerateDisabled}
          isSampleLoading={isSampleLoading}
          processingStage={processingStage}
          processingPhase={processingPhase}
          PROCESSING_PHASES={PROCESSING_PHASES}
          maxConceptSlots={maxConceptSlots}
          generationsLeft={user?.generationsLeft ?? 3}
          unlimitedLabel={t('ai.unlimited')}
          remainingLabel={t('ai.remaining')}
          quizResult={quizResult}
          quizDone={quizDone}
          isPaid={user?.isPaid ?? false}
          navigateTo={navigateTo}
          setFeedbackOpen={setFeedbackOpen}
          shopCurrentConcept={shopCurrentConcept}
          validationError={validationError}
          error={error}
          setError={setError}
          isLightboxOpen={isLightboxOpen}
          setIsLightboxOpen={setIsLightboxOpen}
          translateStyle={(s: string) => t(`ai.style.${s.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
        />
      )}

      {/* ── SHOPPING LIST SHOWCASE (logged-out) ── */}
      {!authLoading && !user && activeTool === 'shopping' && (
        <ShoppingListShowcase onRequestLogin={() => triggerGoogleSignIn()} />
      )}

      {/* ── MAIN TWO-COLUMN ──
           During the quiz RATING step, drop flex-grow and minHeight so the
           working area sizes to its content and the feedback CTA sits close
           below it. For ALL quiz steps (rating and result) drop the viewport
           height chain — other tools keep flex-grow + minHeight:'75vh'. */}
      <div className={`flex flex-col border-t border-black/10${(activeTool === 'vision' || (!authLoading && !user && activeTool === 'shopping')) ? ' hidden' : ''}${activeTool !== 'quiz' ? ' flex-grow' : ''}`}>
        {/* Quiz uses full-bleed sections (its own backgrounds + paddings); other tools keep the centered 1600px shell. */}
        <div className={activeTool === 'quiz' ? 'w-full' : 'max-w-[1600px] w-full mx-auto px-8 md:px-16 flex flex-col lg:flex-row flex-grow'} style={activeTool !== 'quiz' ? { minHeight: '75vh' } : undefined}>

        {/* ════ LEFT SIDEBAR ════ */}
        <div id="ai-vision-panel" className={`w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r border-black/8 flex flex-col${activeTool === 'shopping' || activeTool === 'quiz' || activeTool === 'audit' || (!user && activeTool === 'vision') ? ' hidden' : ''}`}>
          <div className="flex-grow p-8 flex flex-col gap-7 overflow-y-auto">

            {/* ── LOGGED OUT: Show placeholder ── */}
            {!authLoading && !user && (
              <div className="flex flex-col gap-6 py-12 text-center">
                <div className="w-12 h-12 bg-black/5 text-black/55 flex items-center justify-center text-2xl mx-auto rounded-full">✦</div>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight mb-2">
                    {t('ai.aiVision')}
                  </h3>
                  <p className="text-xs text-black/55 leading-relaxed uppercase tracking-widest px-4">
                    {t('ai.unlockAll')}
                  </p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {authLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
              </div>
            )}

            {/* ── LOGGED IN: Show full form ── */}
            {!authLoading && user && (
              <>
                {/* STEP 1: Room Photo */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-black text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/70">
                      {t('ai.uploadFloor')}
                    </span>
                  </div>
                  <label htmlFor="room-upload" className="block cursor-pointer">
                    <input id="room-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'room')} />
                    <div
                      className={`relative overflow-hidden border transition-colors ${roomDragOver ? 'border-black bg-black/5' : roomImage ? 'border-black' : 'border-dashed border-black/20 hover:border-black/50'}`}
                      style={{ aspectRatio: roomAspectRatio }}
                      onDragOver={(e) => { e.preventDefault(); setRoomDragOver(true); }}
                      onDragEnter={(e) => { e.preventDefault(); setRoomDragOver(true); }}
                      onDragLeave={() => setRoomDragOver(false)}
                      onDrop={(e) => handleDrop(e, 'room')}
                    >
                      {roomImage ? (
                        <>
                          <img src={roomImage} className="w-full h-full object-cover" alt="Room" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 px-3 text-[8px] font-bold uppercase tracking-widest text-white text-center">
                            {t('btn.change')}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50">
                          <div className="w-9 h-9 border border-black/15 flex items-center justify-center text-black/65 text-xl font-thin">⌂</div>
                          <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/70">
                            {roomDragOver ? 'Drop to upload' : t('ai.uploadFloor')}
                          </span>
                          <span className="text-[11px] text-black/65 uppercase tracking-widest">JPG, PNG · max 10MB</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="h-px bg-black/6" />

                {/* STEP 2: Inspiration Images */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-black text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/70">
                      {t('ai.uploadInsp')}
                    </span>
                  </div>
                  {inspirationImages.length < 5 && (
                    <div className="mb-3 flex flex-col gap-2">
                      <label htmlFor="insp-upload" className="block cursor-pointer">
                        <input id="insp-upload" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'inspiration')} />
                        <div
                          className={`border border-dashed transition-colors bg-neutral-50 flex flex-col items-center justify-center gap-2 py-5 ${inspoDragOver ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/50'}`}
                          onDragOver={(e) => { e.preventDefault(); setInspoDragOver(true); }}
                          onDragEnter={(e) => { e.preventDefault(); setInspoDragOver(true); }}
                          onDragLeave={() => setInspoDragOver(false)}
                          onDrop={(e) => handleDrop(e, 'inspiration')}
                        >
                          <div className="w-7 h-7 border border-black/15 flex items-center justify-center text-black/65 text-base font-thin">+</div>
                          <span className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-black/65">
                            {inspoDragOver ? 'Drop to upload' : t('btn.add')}
                          </span>
                          <span className="text-[11px] text-black/65 uppercase tracking-widest">
                            {inspirationImages.length}/5 {t('ai.images')}
                          </span>
                        </div>
                      </label>
                      {/* Tip note — quiet advisory, no icon, no background */}
                      <p className="text-[12px] text-black/70 leading-[1.5]">
                        {t('aiVision.inspiration.tip.body')}
                      </p>
                      {/* Fallback hint — directs to style selector if no references */}
                      <p className="text-[12px] text-black/70 leading-[1.5]">
                        {t('aiVision.inspiration.noRefsFallback')}{' '}
                        <button
                          type="button"
                          onClick={() => document.getElementById('style-quiz-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          className="underline underline-offset-2 hover:text-black transition-colors"
                        >
                          {t('aiVision.inspiration.noRefsFallback.link')}
                        </button>
                      </p>
                      {/* Pinterest paste — optional, collapsible */}
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => { setPinterestOpen(o => !o); setPinterestError(''); }}
                          className="flex items-center gap-2 group w-fit"
                        >
                          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="#E60023"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                          <span className="text-[11px] text-black/65 group-hover:text-black transition-colors">
                            {pinterestOpen ? 'Hide Pinterest import' : 'Have a Pinterest board? Add pins directly ↓'}
                          </span>
                        </button>
                        {pinterestOpen && (
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              <input
                                type="url"
                                value={pinterestUrl}
                                autoFocus
                                onChange={e => { setPinterestUrl(e.target.value); setPinterestError(''); }}
                                onPaste={e => {
                                  const pasted = e.clipboardData.getData('text');
                                  if (pasted.includes('pinterest.com') || pasted.includes('pin.it')) {
                                    e.preventDefault();
                                    void handlePinterestPaste(pasted);
                                  }
                                }}
                                onKeyDown={e => e.key === 'Enter' && void handlePinterestPaste(pinterestUrl)}
                                placeholder="https://www.pinterest.com/pin/..."
                                className="flex-1 border border-black/15 bg-white px-2 py-1.5 text-[12px] text-black/80 placeholder:text-black/55 focus:outline-none focus:border-[#E60023]/55"
                                disabled={pinterestLoading}
                              />
                              <button
                                onClick={() => void handlePinterestPaste(pinterestUrl)}
                                disabled={pinterestLoading || !pinterestUrl.trim()}
                                className="px-3 py-1.5 bg-[#E60023] text-white text-[9px] font-bold uppercase tracking-[0.1em] disabled:opacity-40 hover:bg-[#c4001e] transition-colors"
                              >
                                {pinterestLoading ? '...' : 'Add'}
                              </button>
                            </div>
                            {pinterestError && (
                              <span className="text-[9px] text-red-500">{pinterestError}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-1.5">
                    {inspirationImages.map((img, idx) => (
                      <div key={idx} className="relative group" style={{ aspectRatio: '1' }}>
                        <img src={img} className="w-full h-full object-cover border border-black/10" alt={`Insp ${idx + 1}`} />
                        <button onClick={() => removeInspirationImage(idx)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - inspirationImages.length) }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="border border-dashed border-black/10 bg-neutral-50" style={{ aspectRatio: '1' }} />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-black/6" />

                {/* STEP 3: Room Type */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-black/20 text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/70">
                      Room Type <span className="text-black/55 normal-case font-normal tracking-normal ml-1">({t('common.optional')})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedRoom('')}
                      className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                        selectedRoom === '' ? 'border-black bg-black text-white' : 'border-dashed border-black/20 text-black/45 hover:border-black/40 hover:text-black/50'
                      }`}
                    >
                      Auto-detect
                    </button>
                    {ROOM_TYPES.map((room) => (
                      <button
                        key={room}
                        onClick={() => setSelectedRoom(room)}
                        className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                          selectedRoom === room ? 'border-black bg-black text-white' : 'border-black/15 text-black/55 hover:border-black/40 hover:text-black/70'
                        }`}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-black/6" />

                {/* STEP 4: Style */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-black/20 text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">4</div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/70">
                      {t('aiVision.sidebar.sectionStyle')} <span className="text-black/55 normal-case font-normal tracking-normal ml-1">({t('common.optional')})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* None option */}
                    <button
                      onClick={() => setSelectedStyle('')}
                      className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                        selectedStyle === '' ? 'border-black bg-black text-white' : 'border-dashed border-black/20 text-black/45 hover:border-black/40 hover:text-black/50'
                      }`}
                    >
                      {language === 'en' ? 'No preference' : 'No preference'}
                    </button>
                    {VISION_STYLES.map((style) => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                          selectedStyle === style ? 'border-black bg-black text-white' : 'border-black/15 text-black/55 hover:border-black/40 hover:text-black/70'
                        }`}
                      >
                        {t(`ai.style.${style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-black/6" />

                {/* Generation counter */}
                <div className="flex items-center justify-between bg-neutral-50 border border-black/8 px-4 py-3">
                  <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/55">
                    {t('ai.remaining')}
                  </span>
                  {maxConceptSlots === Infinity ? (
                    <span className="text-sm font-bold text-black/55">{t('ai.unlimited')}</span>
                  ) : (
                    <div className="flex gap-1">
                      {Array.from({ length: FREE_TIER_MAX_CONCEPT_SLOTS }).map((_, i) => (
                        <div key={i} className={`w-5 h-1 ${i < (user?.generationsLeft ?? 0) ? 'bg-black' : 'bg-black/15'}`} />
                      ))}
                    </div>
                  )}
                </div>

                {validationError && (
                  <p className="text-[12px] font-semibold text-red-500 leading-relaxed">{validationError}</p>
                )}

                {(user?.generationsLeft ?? 0) <= 0 && (
                  <div className="border border-black/10 p-5 space-y-4 bg-neutral-50">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/55 mb-1">Free tier complete</p>
                      <p className="text-sm font-bold text-black leading-snug">{t('ai.usedAll')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigateTo('pricing')}
                        className="px-6 py-3 bg-[#0047AB] text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#003d99] transition-all flex items-center gap-2"
                      >
                        ✦ Upgrade plan
                      </button>
                      <a
                        href={CALENDLY_URL}
                        onClick={(e) => { e.preventDefault(); trackCalendly(CALENDLY_URL); }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 border border-black/15 text-[10px] font-bold uppercase tracking-[0.25em] text-black/50 hover:border-black/40 hover:text-black transition-all flex items-center gap-2"
                      >
                        {t('ai.bookConversation')} <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={() => {
                    handleGenerate();
                    setTimeout(() => processingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
                  }}
                  disabled={isGenerateDisabled}
                  className="w-full bg-black text-white py-5 text-sm md:text-base font-bold uppercase tracking-[0.4em] transition-all hover:bg-black/80 flex items-center justify-center gap-3 disabled:bg-black/20 disabled:cursor-not-allowed mt-auto"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      {t('common.processing')}
                    </>
                  ) : (
                    <>{t('ai.generateConcept')} <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
                {/* Helper text — explains why Generate is disabled */}
                {!isProcessing && !roomImage && (
                  <p className="text-[10px] text-black/55 text-center leading-[1.5]">
                    {t('aiVision.generate.helper.needPhoto')}
                  </p>
                )}
                {!isProcessing && roomImage && inspirationImages.length === 0 && !selectedStyle && (
                  <p className="text-[10px] text-black/55 text-center leading-[1.5]">
                    {t('aiVision.generate.helper.needInspiration')}
                  </p>
                )}
              </>
            )}


          </div>
        </div>

        {/* ════ RIGHT CONTENT AREA ════ */}
        <div className="flex-grow bg-white flex flex-col">

          {/* ── 04 Room Audit ── paid/owner only ── */}
          {activeTool === 'audit' && user?.isPaid && (
            <div id="room-audit-panel" className="flex-grow flex flex-col bg-white min-h-[50vh]">
              <RoomAudit
                user={user ? { email: user.email, isPaid: user.isPaid, generationsLeft: user.generationsLeft } : null}
                authLoading={authLoading}
                t={t}
                language={language}
                onProcessingChange={setAuditProcessing}
                onAuditComplete={async () => {
                  setAuditComplete(true);
                  await refreshQuota();
                }}
                onRequestLogin={() => triggerGoogleSignIn()}
              />
              {/* Persistent feedback band — bottom of Room Audit (AI-023 G) */}
              <FeedbackBand onOpenFeedback={() => setFeedbackOpen(true)} />
            </div>
          )}

          {/* Not logged in — right panel (vision only) */}
          {!authLoading && !user && activeTool === 'vision' && (
            <div className="flex-grow flex flex-col items-center justify-center gap-6 py-20 px-8 text-center bg-white">
              <div className="w-16 h-16 border border-black/15 flex items-center justify-center text-black/55 text-3xl">◎</div>
              <h3 className="font-display text-2xl font-light text-black/75 tracking-tight">
                Transform your room
              </h3>
              <p className="text-[13px] text-black/70 uppercase tracking-[0.2em] leading-[2]">
                Free · 3 concepts · No card needed
              </p>
              <button
                onClick={() => triggerGoogleSignIn()}
                className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.25em] px-6 py-3.5 hover:bg-[#003d99] transition-colors"
              >
                Transform your room →
              </button>
            </div>
          )}

          {/* Not logged in — shopping list */}
          {!authLoading && !user && activeTool === 'shopping' && (
            <div className="flex-grow flex flex-col gap-5 py-8 px-8 bg-white overflow-y-auto">

              {/* Benefits list */}
              <div>
                <p className="text-sm font-bold text-black mb-3">What you'll get:</p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    '4 key furniture pieces identified',
                    '12 real products with live pricing',
                    'Direct links to trusted retailers',
                    'No affiliate fees or sponsored results',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center bg-[#22c55e] text-white text-[9px] font-bold rounded-full">✓</span>
                      <span className="text-[13px] text-black/70 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sample product grid */}
              <div>
                <p className="text-[13px] text-black/70 mb-3 text-center">Example result from our showcase:</p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {[
                    { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353545/1_y95xdr.webp', name: 'Eddy Sofa', retailer: 'West Elm' },
                    { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/4_dwcwnu.webp', name: 'Anton Coffee Table', retailer: 'West Elm' },
                    { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353555/7_pg0ovf.webp', name: 'Fillmore Chair', retailer: 'West Elm' },
                    { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353567/10_jmhnrp.webp', name: 'Square Brown Pouf', retailer: 'CB2' },
                  ].map((p) => (
                    <div key={p.name} className="bg-white text-center" style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
                      <div className="overflow-hidden w-full" style={{ aspectRatio: '4/3', borderRadius: 4, marginBottom: 8 }}>
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[12px] font-medium text-black leading-tight truncate">{p.name}</p>
                      <p className="text-[11px] text-black/65 mt-0.5">{p.retailer}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[12px] text-black/65 text-center">Upload your room to get personalised results</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => triggerGoogleSignIn()}
                className="self-start inline-flex items-center gap-2 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.25em] px-6 py-3.5 hover:bg-[#003d99] transition-colors"
              >
                Start for free — no card needed →
              </button>

            </div>
          )}

          {/* Empty state — triangle gallery (Cases A & C: no concepts yet, not currently generating) */}
          {!authLoading && user && allSessionConcepts.length === 0 && !isProcessing && !error && activeTool === 'vision' && (
            <div className="flex-grow flex flex-col items-center justify-center py-10 px-6 overflow-y-auto">
              {/* Heading */}
              <div className="text-center mb-7">
                <h3 className="font-display text-[30px] md:text-[42px] font-light italic text-[#0047AB] tracking-tight leading-tight mb-2">
                  {t('aiVision.gallery.title')}
                </h3>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-black/65">
                  {t('aiVision.gallery.subtitle')}
                </p>
              </div>

              {/* Triangle tiers — no max-width cap; fills the result column */}
              <div className="flex flex-col items-center gap-6 w-full">

                {/* Tier 1: YOUR ROOM — centred, moderate size */}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-black/55">
                    {t('aiVision.gallery.labelRoom')}
                  </p>
                  <img
                    src={cld(INSPIRATION_GALLERY.roomPhotoUrl, 480)}
                    srcSet={cldSrcSet(INSPIRATION_GALLERY.roomPhotoUrl, [320, 480, 640])}
                    sizes="min(320px, 70vw)"
                    width={640} height={480}
                    loading="lazy" decoding="async"
                    alt="Sample room"
                    className="rounded-sm border border-black/8 object-cover"
                    style={{ width: 'min(320px, 70vw)' }}
                  />
                </div>

                {/* Tier 2: + 3 INSPIRATIONS */}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-black/55">
                    {t('aiVision.gallery.labelInspirations')}
                  </p>
                  <div className="flex gap-3">
                    {INSPIRATION_GALLERY.referenceUrls.map((url, i) => (
                      <img
                        key={i}
                        src={cld(url, 360, { crop: 'fill', aspectRatio: '1/1' })}
                        srcSet={cldSrcSet(url, [240, 360, 480], { crop: 'fill', aspectRatio: '1/1' })}
                        sizes="min(180px, 38vw)"
                        width={360} height={360}
                        loading="lazy" decoding="async"
                        alt={`Reference ${i + 1}`}
                        className="rounded-sm border border-black/8 object-cover flex-shrink-0"
                        style={{ width: 'min(180px, 38vw)', height: 'min(180px, 38vw)' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Arrow divider */}
                <p className="text-xl text-black/55 leading-none select-none">&darr;</p>

                {/* Tier 3: = 3 CONCEPTS — hero tier, fills available width */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-black/55">
                    {t('aiVision.gallery.labelConcepts')}
                  </p>
                  {/* flex-1 on each image + gap-3.5 fills the container width */}
                  <div className="flex gap-3.5 w-full">
                    {INSPIRATION_GALLERY.conceptUrls.map((url, i) => (
                      <img
                        key={i}
                        src={cld(url, 480)}
                        srcSet={cldSrcSet(url, [320, 480, 640])}
                        sizes="min(280px, 33vw)"
                        width={560} height={420}
                        loading="lazy" decoding="async"
                        alt={`Concept ${i + 1}`}
                        className="rounded-sm border border-black/8 object-cover min-w-0"
                        style={{ flex: '1 1 0', maxWidth: 280 }}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Try sample room CTA */}
              <button
                onClick={handleTrySampleRoom}
                disabled={isProcessing || isSampleLoading || (user?.generationsLeft ?? 0) <= 0}
                className="mt-8 bg-black text-white text-[9px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-black/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSampleLoading && (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                )}
                {t('aiVision.gallery.tryItButton')}
              </button>

              {/* Feedback CTA — lives here in the empty state, below the sample-room button */}
              <button
                onClick={() => setFeedbackOpen(true)}
                className="mt-3 inline-flex items-center gap-2 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-[#003d99] transition-colors duration-200"
              >
                Share your feedback
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Processing state — first-ever generation only (no prior concepts to show) */}
          {isProcessing && activeTool === 'vision' && results.length === 0 && sessionConceptArchive.length === 0 && (
            <div ref={processingRef} className="p-8 flex items-start justify-center">
              <div className="relative w-full max-w-[520px] overflow-hidden" style={{ aspectRatio: roomAspectRatio }}>
                {/* Room photo underneath */}
                {roomImage && (
                  <img src={roomImage} className="w-full h-full object-cover" alt="Your room" />
                )}
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/70" />
                {/* Centered content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-8">
                  <div className="w-10 h-10 border-2 border-white/15 border-t-white/70 rounded-full animate-spin" />
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/75">
                      {processingStage === 'extract' ? 'Step 1 / 2' : 'Generating'}
                    </p>
                    <p key={`${processingStage}-${processingPhase}`} className="text-sm font-light text-white tracking-wide animate-pulse">
                      {processingStage === 'extract'
                        ? t('ai.vision.analyzing')
                        : PROCESSING_PHASES[processingPhase]}
                    </p>
                  </div>
                  <p className="text-[11px] text-white/65 uppercase tracking-widest">
                    {t('ai.processingTime')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isProcessing && (
            <div className="flex-grow flex flex-col items-center justify-center gap-5 bg-black p-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-white/85">{error}</p>
              <button onClick={() => setError(null)} className="text-sm md:text-base font-bold uppercase tracking-widest text-white border-b border-white/45 pb-0.5 hover:border-white transition-colors">
                {t('btn.tryAgain')}
              </button>
            </div>
          )}

          {/* Results state — stays visible during subsequent generations so thumbnails are always accessible */}
          {(results.length > 0 ||
            sessionConceptArchive.length > 0 ||
            (activeTool === 'shopping' && !!user) ||
            activeTool === 'quiz') && (
            <div className="flex-grow flex flex-col">
              {(results.length > 0 || sessionConceptArchive.length > 0) && activeTool !== 'shopping' && activeTool !== 'quiz' && (<>
              {results.length > 0 && (
              <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-black/8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black/60">
                    {t('ai.designComplete')}
                  </span>
                </div>
                <div className="flex gap-2">
                  {(user?.generationsLeft ?? 0) > 0 && (
                    <button onClick={() => handleGenerate(true)} disabled={isProcessing} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white bg-black px-4 py-2 hover:bg-black/70 transition-all disabled:opacity-40 disabled:pointer-events-none">
                      <RefreshCw className="w-3 h-3" />
                      {t('ai.genVariation')}
                    </button>
                  )}
                  <button onClick={handleReset} disabled={isProcessing} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-black/55 border border-black/12 px-3 py-2 hover:border-black/40 hover:text-black transition-all disabled:opacity-40 disabled:pointer-events-none">
                    <X className="w-3 h-3" />
                    {t('btn.reset')}
                  </button>
                </div>
              </div>
              )}

              {/* Loading overlay — shown inline when generating a subsequent concept/variation */}
              {isProcessing && activeTool === 'vision' && roomImage && (
              <div ref={processingRef} className="p-8 flex items-start justify-center border-b border-black/8">
                <div className="relative w-full max-w-[520px] overflow-hidden" style={{ aspectRatio: roomAspectRatio }}>
                  <img src={roomImage} className="w-full h-full object-cover" alt="Your room" />
                  <div className="absolute inset-0 bg-black/70" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-8">
                    <div className="w-10 h-10 border-2 border-white/15 border-t-white/70 rounded-full animate-spin" />
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/55">
                        {processingStage === 'extract' ? 'Step 1 / 2' : 'Generating'}
                      </p>
                      <p key={`${processingStage}-${processingPhase}`} className="text-sm font-light text-white/80 tracking-wide animate-pulse">
                        {processingStage === 'extract'
                          ? t('ai.vision.analyzing')
                          : PROCESSING_PHASES[processingPhase]}
                      </p>
                    </div>
                    <p className="text-[8px] text-white/35 uppercase tracking-widest">
                      {t('ai.processingTime')}
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* Before / After comparison — hidden during generation */}
              {!isProcessing && results.length > 0 && roomImage && (
              <div className="grid grid-cols-2 border-b border-black/8" style={{ gap: '1px', background: 'rgba(0,0,0,0.08)' }}>
                <div className="bg-white">
                  <div className="px-5 border-b border-black/6 flex items-center justify-between" style={{ height: 38 }}>
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-black/65">{t('ai.originalRoom')}</span>
                  </div>
                  <img src={roomImage} className="w-full object-cover" style={{ aspectRatio: roomAspectRatio }} alt="Original" />
                </div>
                <div className="bg-white">
                  <div className="px-5 border-b border-black/6 flex items-center justify-between" style={{ height: 38 }}>
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-black/65">{t('ai.genConcept')}</span>
                    <span className="text-[7px] text-black/35 uppercase tracking-widest">AI{selectedStyle ? ` · ${t(`ai.style.${selectedStyle.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}` : ''}</span>
                  </div>
                  {selectedConceptUrl && (
                  <img
                    src={selectedConceptUrl}
                    className="w-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                    style={{ aspectRatio: roomAspectRatio }}
                    alt={`Design ${selectedConceptIndex + 1}`}
                    onClick={() => setIsLightboxOpen(true)}
                  />
                  )}
                </div>
              </div>
              )}

              <div className="px-8 py-5 bg-white border-b border-black/8">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/65 mb-1">{t('ai.genConcepts')}</p>
                {sessionConceptArchive.length > 0 && (
                  <p className="text-[10px] text-black/55 mb-3 leading-relaxed max-w-xl">
                    {t('ai.sessionConceptsArchiveHint')}
                  </p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.12) transparent' }}>
                  {allSessionConcepts.map((img, idx) => (
                    <button
                      key={`concept-${idx}`}
                      type="button"
                      onClick={() => { if (!isProcessing) setSelectedConceptIndex(idx); }}
                      disabled={isProcessing}
                      className={`relative overflow-hidden border-2 transition-all flex-shrink-0 ${selectedConceptIndex === idx ? 'border-black' : 'border-transparent opacity-50 hover:opacity-75'} disabled:cursor-wait`}
                      style={{ width: 72, height: 72 }}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Variant ${idx + 1}`} />
                      {selectedConceptIndex === idx && (
                        <div className="absolute bottom-1 right-1">
                          <CheckCircle2 className="w-3 h-3 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                  {/* Empty placeholder slots — only shown for Free/Design tier, not Studio (unlimited) */}
                  {maxConceptSlots !== Infinity && Array.from({ length: Math.max(0, maxConceptSlots - allSessionConcepts.length) }).map((_, idx) => (
                    <div key={`locked-${idx}`} className="border border-dashed border-black/10 bg-neutral-50 flex items-center justify-center text-black/30 text-xs flex-shrink-0" style={{ width: 72, height: 72 }}>🔒</div>
                  ))}
                </div>
              </div>

              <div className="px-8 py-5 bg-white flex gap-2">
                <button
                  type="button"
                  disabled={!selectedConceptUrl}
                  onClick={() => selectedConceptUrl && handleDownload(selectedConceptUrl, selectedConceptIndex + 1)}
                  className="flex-1 py-3.5 bg-black text-white text-sm md:text-base font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('btn.downloadFull')}
                </button>
                {allSessionConcepts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => allSessionConcepts.forEach((img, idx) => handleDownload(img, idx + 1))}
                    className="px-5 py-3.5 border border-black/15 text-sm md:text-base font-bold uppercase tracking-[0.2em] text-black/50 hover:border-black hover:text-black transition-all"
                  >
                    {t('btn.downloadAll')}
                  </button>
                )}
              </div>
              {/* Shop this concept */}
              {selectedConceptUrl && (
                <div className="px-8 pb-4">
                  <button
                    type="button"
                    onClick={shopCurrentConcept}
                    className="w-full py-3.5 border border-black/15 text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/60 flex items-center justify-center gap-2 hover:border-black hover:text-black transition-all"
                  >
                    🛒 {t('ai.findTheseProducts')}
                  </button>
                </div>
              )}
              {/* Save notice — free tier */}
              {!user?.isPaid && allSessionConcepts.length > 0 && (
                <div className="mx-8 mb-4 px-4 py-3 bg-amber-50 border border-amber-200/60 flex items-start gap-3">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-700 uppercase tracking-[0.15em] leading-[1.8]">
                    {language === 'en'
                      ? 'Your concepts are not saved — download them before leaving or closing this page.'
                      : 'Your concepts are not saved — download before leaving.'}
                  </p>
                </div>
              )}

              </>) }

              {/* ══ STYLE QUIZ ══ */}
              {activeTool === 'quiz' && (
              <div id="style-quiz-section" className="flex flex-col bg-white">

                {/* ── State 1 — Logged-out hero (Direction B) ── */}
                {!authLoading && !user && !quizSharedView && !quizDone && (
                  <div className="bg-white py-16 md:py-20">
                    <div className="px-8 md:px-16">
                      <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#0047AB] mb-5">Style Quiz</p>
                      <h1 className="font-display font-normal tracking-tight leading-[1.05] text-black mb-5 max-w-[720px]" style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>
                        {t('ai.quiz.heroTitle')}
                      </h1>
                      <p className="text-[17px] text-black/75 max-w-[560px] leading-relaxed mb-12">
                        {t('ai.quiz.heroLead')}
                      </p>

                      {/* 2-col layout: voting preview + 3-step explainer.
                          Hero preview matches AI Vision logged-out: 1:1 square,
                          capped at 950 wide, centered in its column. Same cap
                          on both heroes for parity. */}
                      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14 items-stretch">
                        {/* LEFT — paused voting preview */}
                        <div
                          className="relative w-full max-w-[950px] mx-auto bg-black overflow-hidden shadow-[0_28px_60px_rgba(0,0,0,0.18)]"
                          style={{
                            aspectRatio: '1/1',
                            backgroundImage: `url('${cld('https://res.cloudinary.com/dys2k5muv/image/upload/v1774949502/5_sqgqmb.jpg', 50, { crop: 'fill', aspectRatio: '1/1', quality: 'eco', effect: 'blur:1000' })}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          <img
                            src={cld('https://res.cloudinary.com/dys2k5muv/image/upload/v1774949502/5_sqgqmb.jpg', 960, { crop: 'fill', aspectRatio: '1/1', quality: 'best', sharpen: 60 })}
                            srcSet={cldSrcSet('https://res.cloudinary.com/dys2k5muv/image/upload/v1774949502/5_sqgqmb.jpg', [640, 960, 1280, 1920], { crop: 'fill', aspectRatio: '1/1', quality: 'best', sharpen: 60 })}
                            sizes="(min-width: 1024px) min(950px, 60vw), 100vw"
                            alt="Quiz preview"
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
                          />
                          {/* Top overlay */}
                          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/55 to-transparent text-white">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Room 03 / 18</span>
                              <div className="w-[110px] h-[3px] bg-white/25 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0047AB]" style={{ width: '17%' }} />
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-white/95 text-black px-3 py-1.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#9E5E41]" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Favorites · 2</span>
                            </div>
                          </div>
                          {/* Style tag */}
                          <div className="absolute top-[70px] left-5 bg-white/95 text-black px-3 py-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Mid-Century</span>
                          </div>
                          {/* Bottom overlay */}
                          <div className="absolute bottom-0 left-0 right-0 px-5 pt-12 pb-5 bg-gradient-to-t from-black/70 to-transparent">
                            <div className="flex gap-2.5">
                              <button type="button" onClick={() => triggerGoogleSignIn()} className="flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white border border-white/70 bg-transparent backdrop-blur-sm">Not for me</button>
                              <button type="button" onClick={() => triggerGoogleSignIn()} className="flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white border border-white/70 bg-transparent backdrop-blur-sm">Skip</button>
                              <button type="button" onClick={() => triggerGoogleSignIn()} className="flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-black bg-white border border-white">✦ Love it</button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT — 3 steps + CTA */}
                        <div className="flex flex-col gap-10 justify-between">
                          <div className="flex flex-col gap-7">
                            {[
                              { n: '1', title: t('ai.quiz.step1Title'), body: t('ai.quiz.step1Body') },
                              { n: '2', title: t('ai.quiz.step2Title'), body: t('ai.quiz.step2Body') },
                              { n: '3', title: t('ai.quiz.step3Title'), body: t('ai.quiz.step3Body') },
                            ].map(s => (
                              <div key={s.n} className="grid grid-cols-[36px_1fr] gap-5 items-start">
                                <div className="w-8 h-8 rounded-full border-[1.5px] border-[#0047AB] text-[#0047AB] font-display text-lg flex items-center justify-center">{s.n}</div>
                                <div>
                                  <h4 className="text-[13px] font-bold uppercase tracking-[0.18em] text-black mb-1.5">{s.title}</h4>
                                  <p className="text-[14px] text-black/75 leading-relaxed">{s.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col gap-3.5 border-t border-[#DAD2C3] pt-7">
                            <button
                              type="button"
                              onClick={() => triggerGoogleSignIn()}
                              className="inline-flex items-center justify-center gap-3 px-7 py-[18px] bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.25em] hover:bg-[#003d99] transition-colors"
                            >
                              {t('ai.quiz.signInCta')} →
                            </button>
                            <p className="text-[11px] text-black/65 uppercase tracking-[0.18em] text-center">
                              {t('ai.quiz.heroMeta')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 8-style preview strip */}
                    <div className="px-8 md:px-16 mt-20">
                      <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-black/65 mb-4">{t('ai.quiz.eightStyles')}</p>
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                        {([
                          { style: 'Japandi',      url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774954444/9_ti0qtx.png' },
                          { style: 'Modern',       url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950422/3_2_be2ubi.jpg' },
                          { style: 'Mid-Century',  url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774949502/5_sqgqmb.jpg' },
                          { style: 'Bohemian',     url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774949549/1_piprtp.png' },
                          { style: 'Rustic',       url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950455/11_hjofyz.jpg' },
                          { style: 'Art Deco',     url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713416/19_eify7o.png' },
                          { style: 'Industrial',   url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774954018/6_xibejv.png' },
                          { style: 'Coastal',      url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950150/10_ezeifi.jpg' },
                        ] as const).map(({ style, url }) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => triggerGoogleSignIn()}
                            className="group relative overflow-hidden bg-[#DAD2C3] hover:-translate-y-1 transition-transform duration-300 focus:outline-none"
                            style={{ aspectRatio: '3/4' }}
                          >
                            <img
                              src={cld(url, 360, { crop: 'fill', aspectRatio: '3/4' })}
                              srcSet={cldSrcSet(url, THUMB_WIDTHS, { crop: 'fill', aspectRatio: '3/4' })}
                              sizes="(min-width: 768px) 12vw, 25vw"
                              width={360} height={480}
                              loading="lazy" decoding="async"
                              alt={style}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] font-bold uppercase tracking-[0.22em]">
                              {style}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── States 2 & 4 — Voting + Results (logged-in OR shared-view OR persisted results) ── */}
                {!authLoading && (user || quizSharedView || quizDone) && (<>

                {/* Shared-style banner — only when arriving from a share URL */}
                {quizSharedView && quizDone && (
                  <div className="bg-[#0047AB] text-white px-8 md:px-16 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em]">
                      {t('ai.quiz.sharedBanner')}
                    </span>
                    <button
                      type="button"
                      onClick={exitSharedView}
                      className="text-[11px] font-bold uppercase tracking-[0.18em] underline underline-offset-4 hover:text-white/85 transition-colors"
                    >
                      {t('ai.quiz.takeYourQuiz')}
                    </button>
                  </div>
                )}

                {/* ── State 2 — Voting (cinematic single-pane) ── */}
                {!quizDone && (
                  <div className="bg-[#0a0a0a]">
                    <div className="mx-auto px-6 md:px-14 pt-12 pb-16" style={{ maxWidth: '1280px' }}>
                      <div className="relative w-full overflow-hidden bg-black shadow-[0_32px_80px_rgba(0,0,0,0.4)]" style={{ aspectRatio: '16/10' }}>
                        {/* Room image — object-fit contain so the whole room is visible */}
                        <img
                          src={cld(currentQuizImage.url, 1600)}
                          srcSet={cldSrcSet(currentQuizImage.url, [768, 1280, 1600])}
                          sizes="(min-width: 1024px) 1100px, 100vw"
                          width={1600} height={1000}
                          decoding="async"
                          fetchPriority="high"
                          alt={currentQuizStyle}
                          onLoad={() => { if (!quizDone) setQuizImageReady(true); }}
                          onError={() => { if (!quizDone) setQuizImageReady(true); }}
                          className="absolute inset-0 w-full h-full object-contain"
                          loading="eager"
                        />
                        {/* Loading shimmer — masks Cloudinary cold-start latency on first visit. */}
                        <div
                          aria-hidden="true"
                          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${quizImageReady ? 'opacity-0' : 'opacity-100'}`}
                          style={{
                            background: 'linear-gradient(110deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0.04) 90%)',
                            backgroundSize: '200% 100%',
                            animation: 'quizShimmer 1.6s ease-in-out infinite',
                          }}
                        />
                        <style>{`@keyframes quizShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

                        {/* Top overlay bar */}
                        <div className="absolute top-0 left-0 right-0 flex flex-wrap items-center justify-between gap-3 px-5 md:px-7 py-5 bg-gradient-to-b from-black/65 to-transparent text-white z-[5]">
                          <div className="flex items-center gap-5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
                              {t('ai.quiz.roomOf').replace('{current}', (quizStep + 1).toString()).replace('{total}', QUIZ_LENGTH.toString())}
                            </span>
                            <div className="w-[140px] md:w-[180px] h-[3px] bg-white/22 rounded-full overflow-hidden">
                              <div className="h-full bg-[#0047AB] transition-all duration-500" style={{ width: `${((quizStep + 1) / QUIZ_LENGTH) * 100}%` }} />
                            </div>
                            {voteHistory.length > 0 && (
                              <button
                                type="button"
                                onClick={handleQuizBack}
                                className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80 hover:text-white transition-colors"
                              >
                                ← Previous room
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setQuizDrawerOpen(true)}
                            className="inline-flex items-center gap-2.5 bg-white/95 text-black px-4 py-2.5 rounded-full hover:scale-[1.04] transition-transform"
                          >
                            <Heart size={12} strokeWidth={2.5} className="text-[#9E5E41] fill-[#9E5E41]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
                              {t('ai.quiz.favorites')} · {lovedRooms.length}
                            </span>
                          </button>
                        </div>

                        {/* Style tag (top-left, below the bar) */}
                        <div className="absolute top-[78px] md:top-[90px] left-5 md:left-7 bg-white/95 text-black px-3.5 py-2 z-[5]">
                          <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
                            {t(`ai.style.${currentQuizStyle.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
                          </span>
                        </div>

                        {/* Bottom overlay — voting buttons + early-end link */}
                        <div className="absolute bottom-0 left-0 right-0 px-5 md:px-7 pt-14 pb-6 bg-gradient-to-t from-black/80 to-transparent z-[5]">
                          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-[760px] mx-auto">
                            <button
                              type="button"
                              onClick={() => handleQuizVote('no')}
                              disabled={!quizImageReady}
                              className="flex-1 py-4 px-2 text-center text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.28em] text-white border-[1.5px] border-white/60 bg-black/35 backdrop-blur-md hover:bg-black/55 hover:border-white/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ✕ {t('ai.quiz.notMyStyle')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuizVote('skip')}
                              disabled={!quizImageReady}
                              className="flex-1 py-4 px-2 text-center text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.28em] text-white border-[1.5px] border-white/60 bg-black/35 backdrop-blur-md hover:bg-black/55 hover:border-white/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {t('ai.quiz.skip')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuizVote('love')}
                              disabled={!quizImageReady}
                              className="flex-1 py-4 px-2 text-center text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.28em] text-black bg-white border-[1.5px] border-white hover:bg-[#f4f4f4] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ✦ {t('ai.quiz.loveIt')}
                            </button>
                          </div>
                          {lovedRooms.length >= 4 && (
                            <button
                              type="button"
                              onClick={handleQuizEarlyEnd}
                              className="block mx-auto mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-white/85 underline underline-offset-4 hover:text-white transition-colors"
                            >
                              Have enough — show me my style →
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-center mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                        {t('ai.quiz.stageCaption')}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── State 4 — Results (cinematic DNA reveal) ── */}
                {quizDone && (() => {
                  const top = quizResult[0];
                  const rawHero = top ? (quizRooms[top.style]?.[0]?.url || '') : '';
                  // Smart-cropped wide hero via cld helper (c_fill, g_auto, 16:9).
                  const heroBg = rawHero ? cld(rawHero, 1920, { crop: 'fill', aspectRatio: '16/9' }) : '';
                  const desc = top ? STYLE_DESCRIPTIONS[top.style] : null;
                  return (
                    <>
                      {/* Full-bleed cinematic results stage */}
                      <section
                        className="relative overflow-hidden bg-cover bg-center"
                        style={{
                          backgroundImage: heroBg ? `url('${heroBg}')` : undefined,
                          minHeight: '720px',
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/40 to-black/15" />
                        <div className="relative z-10 px-8 md:px-16 py-20 md:py-24">
                          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-end" style={{ minHeight: '540px' }}>
                            {/* LEFT — DNA reveal */}
                            <div className="text-white">
                              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/80 mb-5">
                                {t('ai.quiz.designDNA')}
                              </p>
                              <h2 className="font-display font-normal leading-[0.95] tracking-tight text-white mb-4" style={{ fontSize: 'clamp(56px, 7vw, 110px)', letterSpacing: '-0.02em' }}>
                                {top ? t(`ai.style.${top.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`) : ''}
                                {quizResult[1] && (
                                  <span className="block italic text-white/55 mt-2" style={{ fontSize: '0.55em', letterSpacing: '-0.01em' }}>
                                    + {t(`ai.style.${quizResult[1].style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
                                  </span>
                                )}
                              </h2>
                              {desc && (
                                <p className="text-[17px] md:text-[18px] font-light text-white/85 leading-relaxed max-w-[480px] mb-9">
                                  {desc.summary}
                                </p>
                              )}
                              {desc && (
                                <div className="flex flex-wrap gap-2">
                                  {desc.elements.map(el => (
                                    <span key={el} className="px-3.5 py-1.5 border border-white/40 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                                      {el}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* RIGHT — breakdown panel */}
                            <div className="bg-white/[0.08] border border-white/[0.12] rounded-md p-7 md:p-8" style={{ backdropFilter: 'blur(20px)' }}>
                              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/65 mb-5">
                                {t('ai.quiz.styleBreakdown')}
                              </p>
                              <div className="flex flex-col gap-3.5">
                                {quizResult.filter(r => r.pct > 0).slice(0, 5).map((r, i) => (
                                  <div key={r.style} className="flex items-center gap-3.5">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white truncate" style={{ flex: '0 0 110px' }}>
                                      {t(`ai.style.${r.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
                                    </span>
                                    <div className="flex-1 h-1 bg-white/[0.18] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-700 ${i < 2 ? 'bg-[#0047AB]' : 'bg-white/55'}`}
                                        style={{ width: `${r.pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[14px] font-display font-medium text-white text-right" style={{ flex: '0 0 56px' }}>
                                      {Math.round(r.pct)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Action bar */}
                      <section className="bg-[#0a0a0a] text-white py-9">
                        <div className="px-8 md:px-16 flex flex-wrap items-center justify-between gap-5">
                          <div className="flex-1 min-w-[260px]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/55 mb-1.5">
                              {t('ai.quiz.whatNext')}
                            </p>
                            <p className="font-display text-[22px] font-medium">
                              {t('ai.quiz.actionsTitle')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleApplyQuizStyle}
                              className="px-5 py-3.5 bg-[#0047AB] border border-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#003d99] transition-colors inline-flex items-center gap-2.5"
                            >
                              {t('ai.quiz.applyStyle').replace('{style}', t(`ai.style.${(top?.style || '').toLowerCase().replace(/-/g, '').replace(/ /g, '')}`))}
                            </button>
                            <button
                              type="button"
                              onClick={handleShareDna}
                              className="px-5 py-3.5 border border-white/35 text-white text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-white/10 hover:border-white transition-all"
                            >
                              {t('ai.quiz.share')}
                            </button>
                            <button
                              type="button"
                              onClick={quizSharedView ? exitSharedView : handleQuizReset}
                              className="px-5 py-3.5 border border-white/35 text-white text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-white/10 hover:border-white transition-all"
                            >
                              {t('ai.quiz.retake')}
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveStyle}
                              className={`px-5 py-3.5 border border-white/35 text-[11px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-2 transition-all ${user?.isPaid ? 'text-white hover:bg-white/10 hover:border-white' : 'text-white/60 hover:text-white/85 hover:border-white/55'}`}
                              title={user?.isPaid ? '' : t('ai.quiz.upgradeToSave')}
                            >
                              {t('ai.quiz.saveStyle')} {!user?.isPaid && <span aria-hidden>🔒</span>}
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* ── More rooms in your style — gallery of unseen rooms in
                          dominant style. Hides cleanly if the API failed or no
                          unseen images are available (resultGalleryImages stays []).
                          Background stays dark to continue the cinematic hero. */}
                      {resultGalleryImages.length > 0 && top && (
                        <section className="bg-[#0a0a0a] text-white pb-16 md:pb-20">
                          <div className="px-8 md:px-16">
                            <h3 className="font-display text-[26px] md:text-[28px] leading-tight mb-1">
                              {t('ai.quiz.moreInStyle')}
                            </h3>
                            <p className="text-[12px] uppercase tracking-[0.22em] text-white/55 mb-7">
                              {t('ai.quiz.moreInStyleCount')
                                .replace('{count}', String(resultGalleryImages.length))
                                .replace('{style}', t(`ai.style.${top.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`))}
                            </p>
                            {/* Single row at md+ (6 cols), 3 cols below md so
                                mobile thumbs stay tappable. */}
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                              {resultGalleryImages.map((url, i) => (
                                <button
                                  key={`gallery-${i}`}
                                  type="button"
                                  onClick={() => { setLightboxQuizUrl(url); setIsLightboxOpen(true); }}
                                  className="relative overflow-hidden aspect-square group focus:outline-none focus:ring-2 focus:ring-[#0047AB]"
                                  aria-label={`Open ${top.style} room ${i + 1} full size`}
                                >
                                  <img
                                    src={cld(url, 320, { crop: 'fill', aspectRatio: '1/1', quality: 'best' })}
                                    srcSet={cldSrcSet(url, [240, 360, 480, 640], { crop: 'fill', aspectRatio: '1/1', quality: 'best' })}
                                    sizes="(min-width: 768px) 16vw, 33vw"
                                    width={320} height={320}
                                    alt={`${top.style} room ${i + 1}`}
                                    loading="lazy" decoding="async"
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}

                </> )}

                {/* ── Drawer (slide-out from right) ── */}
                <AnimatePresence>
                  {quizDrawerOpen && (
                    <>
                      <motion.div
                        key="drawer-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 bg-black/55 z-[60]"
                        onClick={() => setQuizDrawerOpen(false)}
                      />
                      <motion.aside
                        key="drawer-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', ease: 'easeOut', duration: 0.28 }}
                        className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-white z-[61] flex flex-col shadow-[-22px_28px_70px_rgba(0,0,0,0.4)]"
                        role="dialog"
                        aria-label={t('ai.quiz.drawerTitle')}
                      >
                        <header className="px-6 py-5 border-b border-black/8 flex items-baseline justify-between">
                          <h3 className="font-display text-[22px] font-medium text-black">{t('ai.quiz.drawerTitle')}</h3>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                              {t('ai.quiz.drawerCount').replace('{loved}', String(lovedRooms.length)).replace('{total}', String(voteHistory.length))}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuizDrawerOpen(false)}
                              aria-label="Close"
                              className="text-black/55 hover:text-black transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </header>
                        {lovedRooms.length >= 1 && (
                          <div className="px-6 py-4 bg-[#F4EFE7] border-b border-black/8">
                            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#0047AB] mb-1">
                              {t('ai.quiz.leadingStyles')}
                            </p>
                            <p className="text-[12px] text-black font-medium">
                              {(() => {
                                const total = Object.values(quizVotes).reduce((a: number, b: number) => a + b, 0) || 1;
                                return STYLES
                                  .filter(s => (quizVotes[s] || 0) > 0)
                                  .sort((a, b) => (quizVotes[b] || 0) - (quizVotes[a] || 0))
                                  .slice(0, 3)
                                  .map(s => `${t(`ai.style.${s.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)} ${Math.round(((quizVotes[s] || 0) / total) * 100)}%`)
                                  .join(' · ');
                              })()}
                            </p>
                          </div>
                        )}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                          {lovedRooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-center py-12 text-black/55">
                              <Heart size={20} strokeWidth={1.5} />
                              <p className="text-[12px]">Love rooms to build your moodboard</p>
                            </div>
                          ) : (
                            <div ref={moodboardRef} className="grid grid-cols-2 gap-2.5">
                              {[...lovedRooms].reverse().map((room) => (
                                <div key={`drawer-${room.step}`} className="relative aspect-square overflow-hidden rounded-[4px] bg-neutral-100">
                                  <img
                                    src={cld(room.imageUrl, 360, { crop: 'fill', aspectRatio: '1/1' })}
                                    srcSet={cldSrcSet(room.imageUrl, [240, 360, 480], { crop: 'fill', aspectRatio: '1/1' })}
                                    sizes="160px"
                                    width={360} height={360}
                                    loading="lazy" decoding="async"
                                    alt="Loved room"
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <span className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent text-white text-[8px] font-bold uppercase tracking-[0.2em]">
                                    {Object.keys(room.styleChanges)[0] ?? ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.aside>
                    </>
                  )}
                </AnimatePresence>

                {/* ── Save my style modal (free user upgrade prompt) ── */}
                <AnimatePresence>
                  {quizSaveModalOpen && (
                    <>
                      <motion.div
                        key="save-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 bg-black/60 z-[80]"
                        onClick={() => setQuizSaveModalOpen(false)}
                      />
                      <motion.div
                        key="save-modal-panel"
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[480px] bg-white z-[81] shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="save-modal-title"
                      >
                        <div className="p-7 md:p-8">
                          <h3 id="save-modal-title" className="font-display text-[26px] md:text-[28px] font-medium text-black mb-3 leading-tight">
                            Save your style — Design tier feature
                          </h3>
                          <p className="text-[14px] text-black/75 leading-relaxed mb-7">
                            Saving your design DNA to your dashboard is part of the Design tier ($19/mo). Want to review pricing?
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => { setQuizSaveModalOpen(false); navigateTo('pricing'); }}
                              className="flex-1 px-5 py-3.5 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#003d99] transition-colors"
                            >
                              View pricing →
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuizSaveModalOpen(false)}
                              className="flex-1 sm:flex-none px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-black/65 hover:text-black transition-colors"
                            >
                              Maybe later
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* ── Toast (share / save feedback) ── */}
                <AnimatePresence>
                  {quizToast && (
                    <motion.div
                      key="quiz-toast"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.2 }}
                      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-3 z-[70] text-[11px] font-bold uppercase tracking-[0.22em] shadow-2xl"
                      role="status"
                    >
                      {quizToast}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Persistent feedback band — bottom of Style Quiz (AI-023 G) */}
                <FeedbackBand onOpenFeedback={() => setFeedbackOpen(true)} />
              </div>
              )}


              {/* ══ SHOP THIS LOOK ══ */}
              <div
                id="shop-this-look"
                className={`scroll-mt-28 border-t-2 border-black/8${activeTool !== 'shopping' ? ' hidden' : ''}`}
              >

                {/* AI-027: offline card — kill switch ON or daily budget exceeded.
                 *  Takes priority over the sign-in gate / quota UI / search panel so a
                 *  signed-in returning user sees the same graceful message as anyone
                 *  else. Shown for both logged-out and logged-in to keep the surface
                 *  consistent. */}
                {shoppingOffline ? (
                  <ShoppingOfflineCard code={shoppingOffline.code} resetAt={shoppingOffline.resetAt} />
                ) : (
                <>

                {/* Sign-in gate */}
                {!authLoading && !user && (
                  <div className="flex flex-col items-center justify-center gap-6 py-20 px-8 text-center flex-grow bg-white">
                    <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/25 text-3xl">◎</div>
                    <h3 className="font-display text-2xl font-light text-black/75 tracking-tight">
                      Shop any interior
                    </h3>
                    <p className="text-[13px] text-black/70 uppercase tracking-[0.2em] leading-[2]">
                      Free · 3 shopping lists · PDF included
                    </p>

                    {/* Trust signal: which shops we source from. */}
                    <div className="w-full max-w-xl">
                      <RetailerLogoStrip variant="trust" />
                    </div>

                    <button
                      onClick={() => triggerGoogleSignIn()}
                      className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.25em] px-5 py-3 hover:bg-[#003d99] transition-colors"
                    >
                      Sign in to shop →
                    </button>
                  </div>
                )}

                {/* Shopping UI — signed-in users only */}
                {!authLoading && user && (
                  <>

                {/* Shopping quota exhausted */}
                {(user?.shoppingListsLeft ?? 1) <= 0 && !shoppingDone && (
                  <div className="px-8 py-6">
                    <div className="border border-black/10 p-5 space-y-4 bg-neutral-50">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/55 mb-1">Free tier complete</p>
                        <p className="text-sm font-bold text-black leading-snug">You've used all 3 free shopping lists.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigateTo('pricing')}
                          className="px-6 py-3 bg-[#0047AB] text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#003d99] transition-all flex items-center gap-2"
                        >
                          ✦ Upgrade plan
                        </button>
                        <a
                          href={CALENDLY_URL}
                          onClick={(e) => { e.preventDefault(); trackCalendly(CALENDLY_URL); }}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 border border-black/15 text-[10px] font-bold uppercase tracking-[0.25em] text-black/50 hover:border-black/40 hover:text-black transition-all flex items-center gap-2"
                        >
                          {t('ai.bookConversation')} <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Initial CTA — first time or after clear */}
                {!shoppingDone && !shoppingLoading && !shoppingError && shoppingItems.length === 0 && (user?.shoppingListsLeft ?? 1) > 0 && (
                  <div className="bg-white">

                    {/* Logo strip banner — sets scope ("4-6 items") + retailers, includes upsell. */}
                    <RetailerLogoStrip variant="banner" onUpgradeClick={() => navigateTo('pricing')} />

                    {/* ── VARIANT B: AI concept exists — single primary action, alternate upload as quiet secondary ── */}
                    {selectedConceptUrl && results.length > 0 ? (
                      <div className="px-8 py-10 flex flex-col items-center max-w-2xl mx-auto">

                        {/* Primary: shop the AI concept */}
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/55 mb-3 text-center">
                          Source image
                        </p>
                        <div className="w-full aspect-[16/10] overflow-hidden border border-black/10 mb-5">
                          <img src={selectedConceptUrl} className="w-full h-full object-cover" alt="AI concept" />
                        </div>

                        <div className="flex items-center justify-center gap-3 flex-wrap mb-5">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-black/55">Searching</span>
                          <div className="relative">
                            <select
                              value={shoppingCountry}
                              onChange={e => setShoppingCountry(e.target.value)}
                              className="appearance-none bg-white border border-black/20 text-[10px] font-bold uppercase tracking-[0.1em] text-black px-3 py-1.5 pr-7 cursor-pointer hover:border-black/50 transition-colors focus:outline-none focus:border-black"
                            >
                              <option value="us">🇺🇸 United States</option>
                              <option value="gb" disabled>🇬🇧 United Kingdom — coming soon</option>
                              <option value="de" disabled>🇩🇪 Germany — coming soon</option>
                              <option value="fr" disabled>🇫🇷 France — coming soon</option>
                              <option value="am" disabled>🇦🇲 Armenia — coming soon</option>
                              <option value="ae" disabled>🇦🇪 UAE — coming soon</option>
                              <option value="ca" disabled>🇨🇦 Canada — coming soon</option>
                              <option value="au" disabled>🇦🇺 Australia — coming soon</option>
                              <option value="ch" disabled>🇨🇭 Switzerland — coming soon</option>
                            </select>
                            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/55 text-[9px]">▾</div>
                          </div>
                        </div>

                        <button
                          onClick={shopCurrentConcept}
                          className="bg-[#0047AB] text-white text-[10px] font-bold uppercase tracking-[0.25em] px-12 py-4 hover:bg-[#003d99] transition-all"
                        >
                          🛒 Find products in this concept
                        </button>

                        {/* Quiet secondary: shop a different photo */}
                        {!showAlternateUpload ? (
                          <button
                            onClick={() => setShowAlternateUpload(true)}
                            className="text-[12px] text-black/70 mt-6 hover:text-black transition-colors"
                          >
                            Want to shop a different photo instead?{' '}
                            <span className="underline text-black/70">Upload a different image →</span>
                          </button>
                        ) : (
                          <div className="w-full mt-8 pt-8 border-t border-black/8 flex flex-col gap-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/55 text-center">
                              Or shop a different photo
                            </p>
                            <label htmlFor="alt-shop-upload" className="block cursor-pointer">
                              <input
                                id="alt-shop-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) processShoppingFile(f); e.target.value = ''; }}
                              />
                              <div
                                className={`relative overflow-hidden border transition-colors ${shopDragOver ? 'border-black bg-black/5' : standaloneShoppingImage ? 'border-black' : 'border-dashed border-black/20 hover:border-black/50'}`}
                                style={{ aspectRatio: '16/10' }}
                                onDragOver={(e) => { e.preventDefault(); setShopDragOver(true); }}
                                onDragEnter={(e) => { e.preventDefault(); setShopDragOver(true); }}
                                onDragLeave={() => setShopDragOver(false)}
                                onDrop={handleShopDrop}
                              >
                                {standaloneShoppingImage ? (
                                  <>
                                    <img src={standaloneShoppingImage} className="w-full h-full object-cover" alt="Shopping source" />
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 px-3 text-[8px] font-bold uppercase tracking-widest text-white text-center">
                                      {t('btn.change')}
                                    </div>
                                  </>
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50">
                                    <div className="w-9 h-9 border border-black/15 flex items-center justify-center text-black/65 text-xl font-thin">⌂</div>
                                    <span className="text-sm font-bold uppercase tracking-[0.25em] text-black/70">{shopDragOver ? 'Drop to upload' : 'Upload a photo'}</span>
                                    <span className="text-[11px] text-black/65 uppercase tracking-widest">JPG, PNG · max 10MB</span>
                                  </div>
                                )}
                              </div>
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={focusShoppingTabAndRunStandaloneSearch}
                                disabled={!standaloneShoppingImage}
                                className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-[10px] font-bold uppercase tracking-[0.25em] py-3 hover:bg-black/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                🛒 {t('ai.shop.findProducts')}
                              </button>
                              {standaloneShoppingImage && (
                                <button onClick={() => setStandaloneShoppingImage(null)} className="text-[11px] text-black/70 uppercase tracking-widest border border-black/20 px-4 hover:text-black hover:border-black/55 transition-all">
                                  Reset
                                </button>
                              )}
                              <button
                                onClick={() => { setShowAlternateUpload(false); setStandaloneShoppingImage(null); }}
                                className="text-[11px] text-black/70 uppercase tracking-widest border border-black/20 px-4 hover:text-black hover:border-black/55 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    ) : (
                      /* ── SOLO: No AI concept — standalone upload only ── */
                      <div className="flex flex-col lg:flex-row" style={{ minHeight: '70vh' }}>
                      <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r border-black/8 px-8 py-6 flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-black text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">1</div>
                          <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/70">
                            {t('ai.shop.anyInterior')}
                          </span>
                        </div>
                        <div className="w-full">
                          <label htmlFor="standalone-shop-upload" className="block cursor-pointer">
                            <input
                              id="standalone-shop-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) processShoppingFile(f); e.target.value = ''; }}
                            />
                            <div
                              className={`relative overflow-hidden border transition-colors ${shopDragOver ? 'border-black bg-black/5' : standaloneShoppingImage ? 'border-black' : 'border-dashed border-black/20 hover:border-black/50'}`}
                              style={{ aspectRatio: standaloneShoppingAspectRatio }}
                              onDragOver={(e) => { e.preventDefault(); setShopDragOver(true); }}
                              onDragEnter={(e) => { e.preventDefault(); setShopDragOver(true); }}
                              onDragLeave={() => setShopDragOver(false)}
                              onDrop={handleShopDrop}
                            >
                              {standaloneShoppingImage ? (
                                <>
                                  <img src={standaloneShoppingImage} className="w-full h-full object-cover" alt="Shopping source" />
                                  <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 px-3 text-[8px] font-bold uppercase tracking-widest text-white text-center">
                                    {t('btn.change')}
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50">
                                  <div className="w-9 h-9 border border-black/15 flex items-center justify-center text-black/40 text-xl font-thin">⌂</div>
                                  <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/70">
                                    {shopDragOver ? 'Drop to upload' : 'Upload a photo'}
                                  </span>
                                  <span className="text-[11px] text-black/65 uppercase tracking-widest">JPG, PNG · max 10MB</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>

                        {/* STEP 2: Country */}
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-5 h-5 bg-black text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">2</div>
                            <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/70">
                              {t('ai.shop.shopIn')}
                            </span>
                          </div>
                          <div className="border border-dashed border-black/20 bg-neutral-50 flex flex-col items-center justify-center gap-3 py-5 px-4">
                            <div className="relative w-full">
                              <select
                                value={shoppingCountry}
                                onChange={e => setShoppingCountry(e.target.value)}
                                className="appearance-none w-full bg-white border border-black/20 text-[10px] font-bold uppercase tracking-[0.1em] text-black px-4 py-2.5 pr-8 cursor-pointer hover:border-black/50 transition-colors focus:outline-none focus:border-black"
                              >
                                <option value="us">🇺🇸 United States</option>
                                <option value="gb" disabled>🇬🇧 United Kingdom — coming soon</option>
                                <option value="de" disabled>🇩🇪 Germany — coming soon</option>
                                <option value="fr" disabled>🇫🇷 France — coming soon</option>
                                <option value="am" disabled>🇦🇲 Armenia — coming soon</option>
                                <option value="ae" disabled>🇦🇪 UAE — coming soon</option>
                                <option value="ca" disabled>🇨🇦 Canada — coming soon</option>
                                <option value="au" disabled>🇦🇺 Australia — coming soon</option>
                                <option value="ch" disabled>🇨🇭 Switzerland — coming soon</option>
                              </select>
                              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/55 text-[10px]">▾</div>
                            </div>
                            <span className="text-[11px] text-black/65 uppercase tracking-widest">
                              More countries coming soon
                            </span>
                          </div>
                        </div>

                        {/* CTA — bottom */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={focusShoppingTabAndRunStandaloneSearch}
                            disabled={!standaloneShoppingImage}
                            className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-[10px] font-bold uppercase tracking-[0.25em] py-3 hover:bg-black/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            🛒 {t('ai.shop.findProducts')}
                          </button>
                          {standaloneShoppingImage && (
                            <button onClick={() => setStandaloneShoppingImage(null)} className="text-[9px] text-black/45 uppercase tracking-widest border border-black/10 px-4 hover:text-black hover:border-black/40 transition-all">
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Right panel — preview content */}
                      <div className="flex-grow border-t border-black/8 lg:border-t-0 px-8 py-6 flex flex-col gap-5 bg-white">

                        {/* Benefits */}
                        <div>
                          <p className="text-sm font-bold text-black mb-3">What you'll get:</p>
                          <ul className="flex flex-col gap-2.5">
                            {[
                              '4 key furniture pieces identified',
                              '12 real products with live pricing',
                              'Direct links to trusted retailers',
                              'No affiliate fees or sponsored results',
                            ].map((item) => (
                              <li key={item} className="flex items-center gap-3">
                                <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center bg-[#22c55e] text-white text-[9px] font-bold rounded-full">✓</span>
                                <span className="text-[13px] text-black/70 leading-snug">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Sample product grid */}
                        <div>
                          <p className="text-[11px] text-black/55 mb-3 text-center">Example result from our showcase:</p>
                          <div className="grid grid-cols-2 gap-3 w-full">
                            {[
                              { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353545/1_y95xdr.webp', name: 'Eddy Sofa', retailer: 'West Elm' },
                              { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/4_dwcwnu.webp', name: 'Anton Coffee Table', retailer: 'West Elm' },
                              { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353555/7_pg0ovf.webp', name: 'Fillmore Chair', retailer: 'West Elm' },
                              { image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353567/10_jmhnrp.webp', name: 'Square Brown Pouf', retailer: 'CB2' },
                            ].map((p) => (
                              <div key={p.name} className="bg-white text-center" style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
                                <div className="overflow-hidden w-full" style={{ aspectRatio: '4/3', borderRadius: 4, marginBottom: 8 }}>
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <p className="text-[11px] font-medium text-black leading-tight truncate">{p.name}</p>
                                <p className="text-[10px] text-black/55 mt-0.5">{p.retailer}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2.5 text-[12px] text-black/65 text-center">Upload your room to get personalised results</p>
                        </div>

                      </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Re-search CTA — shown after generating a new concept variation */}
                {!shoppingDone && !shoppingLoading && !shoppingError && shoppingItems.length > 0 && (
                  <div className="px-8 py-6 bg-neutral-50 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black mb-1">
                        {t('ai.shop.newConcept')}
                      </p>
                      <p className="text-[12px] md:text-[13px] text-black/75 leading-relaxed max-w-xs">
                        {t('ai.shop.newConceptDesc')}
                      </p>
                    </div>
                    <button onClick={focusShoppingTabAndRunSearch} className="flex-shrink-0 flex items-center gap-2 bg-black text-white text-[10px] font-bold uppercase tracking-[0.3em] px-6 py-4 hover:bg-black/80 transition-all whitespace-nowrap">
                      🔄 {t('ai.shop.reSearch')}
                    </button>
                  </div>
                )}

                {/* Loading */}
                {shoppingLoading && (
                  <div className="px-8 py-8 bg-neutral-50 flex items-center gap-4">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/70">
                        {t('ai.shop.identifying')}
                      </p>
                      <p className="text-[9px] text-black/55 mt-0.5">{t('ai.shop.processingTime')}</p>
                    </div>
                  </div>
                )}

                {/* Error */}
                {shoppingError && !shoppingLoading && (
                  <div className="px-8 py-5 bg-neutral-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">{shoppingError}</p>
                    </div>
                    <button onClick={focusShoppingTabAndRunSearch} className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 hover:text-black/60 transition-colors">
                      {t('btn.tryAgain')}
                    </button>
                  </div>
                )}

                {/* Results */}
                {shoppingDone && !shoppingLoading && (
                  <div className="bg-white">

                    {/* Source image banner */}
                    {searchSourceImage && (
                      <div className="border-b border-black/8 bg-white px-8 py-6 flex items-start gap-6">
                        <img
                          src={searchSourceImage}
                          className="w-40 h-40 object-cover flex-shrink-0 border border-black/10"
                          alt="Source"
                        />
                        <div className="pt-1 flex-grow">
                          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65 mb-2">
                            {searchSourceIsStandalone
                              ? (language === 'en' ? 'Shopping from your uploaded photo' : 'Shopping from uploaded photo')
                              : (language === 'en' ? 'Shopping from your AI concept' : 'Shopping from AI concept')}
                          </p>
                          <p className="text-[13px] text-black/75 leading-relaxed mb-4">
                            {language === 'en' ? 'Products matched to the items identified in this interior.' : 'Products matched to this interior'}
                          </p>
                          <button
                            onClick={() => {
                              setShoppingDone(false);
                              setShoppingResults([]);
                              setShoppingItems([]);
                              setStandaloneShoppingImage(null);
                              setForceStandaloneUpload(false);
                            }}
                            className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/55 border border-black/15 px-4 py-2 hover:border-black/40 hover:text-black transition-colors"
                          >
                            ← Start over
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Items found header */}
                    {shoppingItems.length > 0 && (
                      <div className="mx-8 mt-6 py-4 border border-black/8 bg-neutral-50 flex items-center justify-between px-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-black/70">
                            {t('ai.shop.itemsIdentified').replace('{count}', shoppingItems.length.toString())}
                          </p>
                          {shoppingItems.map((item: any, idx: number) => (
                            <span key={idx} className="text-[11px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 bg-black text-white">
                              {item.category}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => { setShoppingDone(false); setShoppingResults([]); setShoppingItems([]); }}
                          className="text-[11px] uppercase tracking-widest text-black/65 hover:text-black transition-colors flex-shrink-0 ml-4"
                        >
                          {t('btn.reset')}
                        </button>
                      </div>
                    )}

                    {shoppingResults.length === 0 && (
                      <div className="px-8 py-8 text-center">
                        <p className="text-[12px] text-black/70 uppercase tracking-widest">
                          {t('ai.shop.noProducts')}
                        </p>
                      </div>
                    )}

                    {shoppingResults.length > 0 && (
                      <div className="mx-8 mt-4 mb-2 pl-4 pr-4 py-3 border-l-2 border-amber-400 bg-amber-50 flex items-start gap-2.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] text-amber-900 leading-relaxed">
                          <strong className="font-bold text-amber-900">Before you buy</strong> — these are AI-matched suggestions, not guaranteed exact matches. Always verify dimensions, materials, and quality before purchasing.
                        </p>
                      </div>
                    )}

                    <div className="divide-y divide-black/5">
                      {shoppingResults.map((group: any, gIdx: number) => (
                        <div key={gIdx} className="px-8 py-6">
                          {/* Item header */}
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-black">{group.item.category}</span>
                            <span className="text-[12px] text-black/70">— {group.item.description}</span>
                          </div>

                          {group.error ? (
                            <p className="text-[10px] text-red-500 italic">Error: {group.error}</p>

                          ) : group.byRetailer ? (
                            /* ── PAID: per-retailer grid ── */
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {group.byRetailer.map((entry: any, rIdx: number) => (
                                entry.product ? (
                                  <a key={rIdx} href={entry.product.link} target="_blank" rel="noopener noreferrer"
                                    className="group border border-black/10 bg-neutral-50 hover:border-black/30 hover:bg-white transition-all overflow-hidden flex flex-col">
                                    <div className="aspect-square bg-neutral-100 overflow-hidden flex-shrink-0">
                                      {entry.product.thumbnail
                                        ? <img src={entry.product.thumbnail} alt={entry.product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        : <div className="w-full h-full flex items-center justify-center text-2xl opacity-10">&#128715;</div>}
                                    </div>
                                    <div className="p-2.5 flex flex-col gap-0.5 flex-1">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0047AB]">{entry.retailer}</p>
                                      <p className="text-[12px] font-medium text-black leading-snug line-clamp-2">{entry.product.title}</p>
                                      <p className="text-[13px] font-bold text-black mt-auto pt-1">{entry.product.price || 'View →'}</p>
                                    </div>
                                  </a>
                                ) : (
                                  <div key={rIdx} className="border border-dashed border-black/10 bg-neutral-50/50 flex flex-col items-center justify-center gap-1 p-3 aspect-square">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/60">{entry.retailer}</p>
                                    <p className="text-[10px] text-black/55">Not found</p>
                                  </div>
                                )
                              ))}
                            </div>

                          ) : group.products && group.products.length > 0 ? (
                            /* ── FREE: mixed results grid ── */
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {group.products.map((product: any, pIdx: number) => (
                                <a key={pIdx} href={product.link} target="_blank" rel="noopener noreferrer"
                                  className="group border border-black/10 bg-neutral-50 hover:border-black/30 hover:bg-white transition-all overflow-hidden">
                                  <div className="aspect-square bg-neutral-100 overflow-hidden">
                                    {product.thumbnail
                                      ? <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      : <div className="w-full h-full flex items-center justify-center text-3xl opacity-15">&#128715;</div>}
                                  </div>
                                  <div className="p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/65 mb-1">{product.source}</p>
                                    <p className="text-[12px] md:text-[13px] font-medium text-black leading-snug line-clamp-2 mb-1">{product.title}</p>
                                    {product.rating && (
                                      <p className="text-[11px] text-black/70 mb-1">{'&#9733;'.repeat(Math.round(product.rating))} {product.rating}{product.reviews ? ` (${product.reviews})` : ''}</p>
                                    )}
                                    <p className="text-[13px] font-bold text-black">{product.price || 'View price →'}</p>
                                  </div>
                                </a>
                              ))}
                            </div>

                          ) : (
                            <p className="text-[12px] text-black/70 italic">{t('ai.shop.noProductsForItem')}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="px-8 py-5 border-t border-black/8 bg-neutral-50 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <p className="text-[12px] text-black/65 leading-relaxed">
                        {t('ai.shop.resultsVia')}
                      </p>
                      <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0">
                        <p className="text-[12px] text-black/70 text-left sm:text-right leading-snug max-w-[min(100%,300px)]">
                          {t('ai.shop.downloadPdfNotice')}
                        </p>
                        <button
                          type="button"
                          onClick={handleDownloadShoppingPDF}
                          className="flex items-center justify-center gap-2 bg-black text-white text-[11px] font-bold uppercase tracking-[0.25em] px-5 py-3 hover:bg-black/80 transition-all whitespace-nowrap"
                        >
                          <FileDown className="w-3 h-3" />
                          {t('ai.shop.downloadPDF')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                  </>
                )}

                </>
                )}

                {/* Persistent feedback band — bottom of Shopping List (AI-023 G) */}
                {activeTool === 'shopping' && (
                  <FeedbackBand onOpenFeedback={() => setFeedbackOpen(true)} />
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── PERSISTENT BOOKING CTA — shows after any interaction ── */}
      {(results.length > 0 ||
        sessionConceptArchive.length > 0 ||
        shoppingDone ||
        !!standaloneShoppingImage) && (
        <div className="border-t border-black/8 bg-black">
          <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/55 mb-1">
                {t('ai.loveWhatSee')}
              </p>
              <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                {t('ai.readyMakeReal')}
              </h3>
              <p className="text-sm text-white/55 uppercase tracking-widest mt-1">
                {t('ai.firstConversation')}
              </p>
            </div>
            <button
              onClick={() => navigateTo('home')}
              className="flex-shrink-0 flex items-center gap-3 bg-white text-black text-sm font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-white/90 transition-all"
            >
              {t('ai.bookConversation')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-black/10" />



      <Footer />

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* ── LIGHTBOX ──
          Falls back to lightboxQuizUrl when no AI-Vision concept is selected,
          so the Style Quiz "More rooms" gallery thumbs reuse the same modal.
          Download button is gated on selectedConceptUrl — quiz thumbs are
          public Cloudinary URLs the user can save via right-click. */}
      <AnimatePresence>
        {isLightboxOpen && (selectedConceptUrl || lightboxQuizUrl) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLightboxOpen(false)} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-zoom-out">
            <div className="absolute top-8 right-8 flex gap-4 z-[110]">
              {selectedConceptUrl && (
                <button onClick={(e) => { e.stopPropagation(); handleDownload(selectedConceptUrl, selectedConceptIndex + 1); }} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm md:text-base font-bold uppercase tracking-widest hover:bg-white/90 transition-all">
                  <Download className="w-4 h-4" /> {t('btn.download')}
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }} className="text-white/50 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img src={selectedConceptUrl || lightboxQuizUrl || ''} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="Full resolution" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIConceptsPage;
