import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Layout, Box, Palette, ArrowRight, CheckCircle2, X, Download, AlertCircle, RefreshCw, LogOut, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../LanguageContext';
import {
  getStoredToken,
  storeToken,
  clearSessionLocal,
  touchActivity,
  SESSION_EXPIRED_EVENT,
} from '../sessionClient';
import Header from './Header';
import Footer from './Footer';
import RoomAudit from './RoomAudit';

// ─── Google OAuth client ID ────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const QUIZ_VOTE_UNLOCK_MS = process.env.NODE_ENV === 'test' ? 10 : 1500;
/** Free tier: max generated concepts in the UI row (paid tier can be raised later). */
const FREE_TIER_MAX_CONCEPT_SLOTS = 3;

const STYLES = [
  'Japandi', 'Modern', 'Mid-Century', 'Bohemian', 'Rustic', 'Art Deco',
  'Industrial', 'Coastal'
];

// All styles available in AI Vision chip selector (superset of quiz styles)
const VISION_STYLES = [
  'Japandi', 'Modern', 'Mid-Century', 'Bohemian', 'Rustic', 'Art Deco',
  'Industrial', 'Coastal', 'Minimalist', 'Maximalist', 'Biophilic'
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
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/1_kedomn.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/10_ng0u6i.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/9_byfcww.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/7_pgij4k.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/11_ibhacx.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/2_z7qn5f.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/8_ky76uo.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/6_slhnwf.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/4_nx2j48.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/5_uwjq3d.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/w_1000,h_1000,c_fill,g_auto/Quiz/Art-Deco/3_ozxssy.png', credit: 'Art Deco' },
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

function styleToCloudinaryFolderName(style: string): string {
  // Cloudinary folders in this project use hyphens for spaces (e.g. "Art-Deco")
  return style.trim().replace(/\s+/g, '-');
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface AuthUser {
  email: string;
  name: string;
  picture: string;
  generationsLeft: number;
  /** Free-tier shopping list runs remaining (from server) */
  shoppingListsLeft?: number;
  isPaid?: boolean;
  /** Paid-tier audit quota (999 = unlimited) */
  auditsLeft?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['x-session-token'] = token;
  const res = await fetch(path, { ...options, headers });
  return res;
}

// ─── Google Sign-In button component ───────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (el: HTMLElement, config: any) => void;
          prompt: () => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// ─── Main Component ────────────────────────────────────────────────────────
const AIConceptsPage: React.FC = () => {
  const { language, t, navigateTo } = useLanguage();

  // Auth state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  // Generation state
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomAspectRatio, setRoomAspectRatio] = useState<string>('3/4');
  const [apiAspectRatio, setApiAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("3:4");
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  /** Index into `allSessionConcepts` (current results first, then pre-reset archive). */
  const [selectedConceptIndex, setSelectedConceptIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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
  const maxConceptSlots = user?.isPaid ? 30 : FREE_TIER_MAX_CONCEPT_SLOTS;

  // ── Shopping state ──
  const [shoppingResults, setShoppingResults] = useState<any[]>([]);
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingError, setShoppingError] = useState<string | null>(null);
  const [shoppingDone, setShoppingDone] = useState(false);
  const [standaloneShoppingImage, setStandaloneShoppingImage] = useState<string | null>(null);
  const [standaloneShoppingAspectRatio, setStandaloneShoppingAspectRatio] = useState<string>('4/3');
  const [shoppingCountry, setShoppingCountry] = useState<string>('us');

  // ── Style Quiz state ──
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizSeed, setQuizSeed] = useState<number>(() => Math.floor(Math.random() * 100));
  const QUIZ_LENGTH = 24;
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
  const [quizDone, setQuizDone] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{ style: string; pct: number }[]>([]);
  const [quizImageReady, setQuizImageReady] = useState<boolean>(false);
  const [quizHistory, setQuizHistory] = useState<{ style: string; pct: number }[][]>([]);
  const [selectedPrevResult, setSelectedPrevResult] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const quizResultSavedRef = useRef(false);
  const [activeTool, setActiveTool] = useState<'quiz' | 'vision' | 'shopping' | 'audit'>('quiz');
  const [auditComplete, setAuditComplete] = useState(false);
  const [auditProcessing, setAuditProcessing] = useState(false);
  const [quizRooms, setQuizRooms] = useState<QuizRooms>(QUIZ_ROOMS_FALLBACK);
  const [downloadCount, setDownloadCount] = useState<number>(() => {
    const saved = localStorage.getItem('ds_download_count');
    return saved ? parseInt(saved, 10) : 0;
  });

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

  // ── Load Google script ──
  useEffect(() => {
    // If script tag already exists
    if (document.getElementById('google-gsi-script')) {
      // If Google API already loaded, mark immediately
      if (window.google?.accounts?.id) {
        setGoogleScriptLoaded(true);
      } else {
        // Script tag exists but still loading — wait for it
        const existing = document.getElementById('google-gsi-script') as HTMLScriptElement;
        const prev = existing.onload;
        existing.onload = (e) => {
          if (prev) (prev as any)(e);
          setGoogleScriptLoaded(true);
        };
      }
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ── Restore session on mount ──
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiFetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.email) {
          touchActivity();
          setUser(data);
        } else clearSessionLocal();
      })
      .catch(() => clearSessionLocal())
      .finally(() => setAuthLoading(false));
  }, []);

  // ── Sync UI when app-wide inactivity guard clears the session ──
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setResults([]);
      setSessionConceptArchive([]);
      setRoomImage(null);
      setInspirationImages([]);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

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

  // ── Clear Google button when logged in ──
  useEffect(() => {
    if (user) {
      // Kill all Google sign-in UI
      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.cancel();
          window.google.accounts.id.disableAutoSelect();
        }
      } catch {}
      ['google-signin-btn', 'google-signin-btn-shop'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.innerHTML = ''; el.style.display = 'none'; }
      });
    }
  }, [user]);

  // ── Initialize Google Sign-In ──
  useEffect(() => {
    if (!googleScriptLoaded || authLoading || user) return;
    if (!GOOGLE_CLIENT_ID) return;

    // Retry until the DOM element actually exists — handles first-navigation timing
    let attempts = 0;
    const tryRender = () => {
      if (user) return; // user logged in while we were waiting
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

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
        // DOM not ready yet — retry every 150ms up to 10 times
        attempts++;
        t = setTimeout(tryRender, 150);
      }
    };

    let t = setTimeout(tryRender, 100);
    return () => clearTimeout(t);
  }, [googleScriptLoaded, user, authLoading, GOOGLE_CLIENT_ID]);

  // ── Handle Google credential response ──
  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    try {
      const res = await apiFetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          credential: response.credential,
          toolUsed: activeTool,
          source: 'ai-concepts',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      storeToken(data.token);
      setUser(data.user);
      try {
        window.google?.accounts?.id?.cancel?.();
        requestAnimationFrame(() => {
          window.google?.accounts?.id?.cancel?.();
        });
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setError(t('ai.signInFailed'));
    }
  }, [t, activeTool]);

  // ── Logout ──
  const handleLogout = useCallback(async () => {
    try {
      window.google?.accounts?.id?.cancel?.();
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      /* gsi not loaded */
    }
    await apiFetch('/api/auth/logout', { method: 'POST' });
    clearSessionLocal();
    setUser(null);
    setResults([]);
    setSessionConceptArchive([]);
    setRoomImage(null);
    setInspirationImages([]);
  }, []);

  // ── Escape key for lightbox ──
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ── File handling ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'inspiration' | 'room') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
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
      readFile(files[0]).then((dataUrl) => {
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
    e.target.value = '';
  };

  const removeInspirationImage = (index: number) => {
    setInspirationImages(prev => prev.filter((_, i) => i !== index));
  };

  // ── Generate ──
  const handleGenerate = async (isVariation = false) => {
    if (!user) return;
    if (inspirationImages.length === 0 || !roomImage) {
      setValidationError(t('ai.uploadInspRoom'));
      return;
    }

    // Always generate exactly 1 image per button press
    if ((user?.generationsLeft ?? 0) <= 0) return;

    setIsProcessing(true);
    setError(null);
    if (!isVariation) {
      setResults([]);
      setShoppingResults([]);
      setShoppingItems([]);
      setShoppingDone(false);
    } else {
      // Variation: keep shoppingItems so re-search CTA appears, but clear old results
      setShoppingResults([]);
      setShoppingDone(false);
    }

    // Consume exactly 1 generation on the server
    const useRes = await apiFetch('/api/generation/use', { 
      method: 'POST',
      body: JSON.stringify({ count: 1 })
    });
    const useData = await useRes.json();
    if (!useRes.ok) {
      setError(t('ai.noGenerationsLeft'));
      setIsProcessing(false);
      return;
    }
    setUser(prev => prev ? { ...prev, generationsLeft: useData.generationsLeft } : null);

    try {
      const toInlinePart = (dataUrl: string) => {
        const matches = dataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image format');
        return { inlineData: { mimeType: matches[1], data: matches[2] } };
      };

      const inspirationParts = inspirationImages.map(toInlinePart);
      const roomPart = toInlinePart(roomImage);

      const promptText = `You are an expert interior designer.
The first ${inspirationImages.length} image(s) are inspiration references showing the desired style, colors, and materials.
The last image is the actual room to redesign.
Generate a photorealistic interior design render of that room, redesigned in the exact style of the inspiration images.
Style preference: ${selectedStyle || 'No specific style — use your best judgment based on the room'}.
Keep the same room structure (windows, walls, ceiling). Apply the style, colors, furniture, lighting from the inspirations.
${isVariation ? 'Provide a unique variation of the previous design while maintaining the same core style.' : ''}
Output ONLY the redesigned room image. No text.`;

      const generateOne = async (retryCount = 0): Promise<string | null> => {
        try {
          const apiKey = process.env.GEMINI_API_KEY || '';
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [...inspirationParts, roomPart, { text: promptText }] },
            config: {
              imageConfig: { aspectRatio: apiAspectRatio },
            },
          });
          const parts = response?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
          }
          return null;
        } catch (err: any) {
          if (err?.message?.toLowerCase().includes('quota') && retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
            return generateOne(retryCount + 1);
          }
          throw err;
        }
      };

      // Generate exactly 1 image
      const generatedImage = await generateOne();
      if (!generatedImage) throw new Error('No image generated');
      const generatedImages = [generatedImage];

      if (isVariation) {
        setResults(prev => {
          const newResults = [...prev, ...generatedImages];
          setSelectedConceptIndex(newResults.length - 1);
          return newResults;
        });
      } else {
        setResults(generatedImages);
        setSelectedConceptIndex(0);
      }

    } catch (err: any) {
      console.error(err);
      // Restore 1 generation on failure
      const restoreRes = await apiFetch('/api/generation/restore', {
        method: 'POST',
        body: JSON.stringify({ count: 1 }),
      });
      let restoredGens: number | undefined;
      if (restoreRes.ok) {
        try {
          const data = await restoreRes.json();
          if (typeof data?.generationsLeft === 'number') restoredGens = data.generationsLeft;
        } catch {
          /* ignore */
        }
      }
      setUser(prev =>
        prev
          ? {
              ...prev,
              generationsLeft:
                restoredGens ?? Math.min(3, (prev.generationsLeft ?? 0) + 1),
            }
          : null
      );

      let errorMessage = t('ai.generationFailed');
      if (err?.message?.includes('403') || err?.message?.toLowerCase().includes('permission')) {
        errorMessage = t('ai.apiKeyError');
      } else if (err?.message?.toLowerCase().includes('quota')) {
        errorMessage = t('ai.quotaExceeded');
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Download ──
  const handleDownload = (dataUrl: string) => {
    const newCount = downloadCount + 1;
    setDownloadCount(newCount);
    localStorage.setItem('ds_download_count', newCount.toString());
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Designature_Studio_${newCount}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSessionConceptArchive((prev) => {
      const next = [...prev];
      for (const r of results) {
        if (!next.includes(r)) next.push(r);
      }
      return next;
    });
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
      if (!group.products || group.products.length === 0) continue;

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

      for (const product of group.products) {
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

  // ── Style Quiz handlers ──
  const handleQuizVote = (vote: 'love' | 'skip' | 'no') => {
    if (!quizImageReady) return;

    const style = quizSequence[quizStep];
    const newVotes = { ...quizVotes };
    if (vote === 'love') newVotes[style] = (newVotes[style] || 0) + 2;

    if (quizStep >= QUIZ_LENGTH - 1) {
      const total = Object.values(newVotes).reduce((a, b) => a + b, 0) || 1;
      const sorted = STYLES
        .map(s => ({ style: s, pct: Math.round(((newVotes[s] || 0) / total) * 100) }))
        .filter(r => r.pct > 0)
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

  const handleShoppingSearch = async (overrideItems?: any[]) => {
    const imageToAnalyse = allSessionConcepts[selectedConceptIndex] || standaloneShoppingImage;
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
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
        const ai = new GoogleGenAI({ apiKey });
        const imageDataUrl = imageToAnalyse!;
        const matches = imageDataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image format');

        const identifyPrompt = `You are a professional interior design sourcing assistant.
Look at this interior design image and identify the 3-4 most prominent furniture pieces.
For each piece write a specific retail search query to find it on sites like Wayfair, West Elm, CB2.
Output ONLY valid JSON with no markdown fences, no explanation:
{"items":[{"category":"Sofa","description":"Round pink velvet sofa modern","search_query":"round pink velvet sofa modern"},{"category":"Coffee Table","description":"Round marble coffee table","search_query":"round white marble coffee table"}]}`;

        const geminiRes = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: { parts: [{ inlineData: { mimeType: matches[1], data: matches[2] } }, { text: identifyPrompt }] }
        });

        const rawText = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not identify furniture items");
        const identified = JSON.parse(jsonMatch[0]);
        itemsToSearch = identified.items || [];
        setShoppingItems(itemsToSearch);
      }

      const res = await apiFetch('/api/shopping/search', {
        method: 'POST',
        body: JSON.stringify({ items: itemsToSearch, country: shoppingCountry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
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
    setActiveTool('shopping');
    setTimeout(() => {
      void handleShoppingSearch();
      const el = document.getElementById('shop-this-look');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const triggerGoogleSignIn = () => {
    // Create a temporary hidden button container and render Google Sign-In into it
    const tmp = document.createElement('div');
    tmp.style.position = 'absolute';
    tmp.style.opacity = '0';
    tmp.style.pointerEvents = 'none';
    document.body.appendChild(tmp);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(tmp, {
        theme: 'outline', size: 'large', width: '300',
      });
      setTimeout(() => {
        const btn = tmp.querySelector('div[role=button]') as HTMLElement;
        if (btn) btn.click();
        setTimeout(() => document.body.removeChild(tmp), 1000);
      }, 300);
    }
  };

  const isGenerateDisabled = isProcessing || inspirationImages.length === 0 || !roomImage || !user || (user?.generationsLeft ?? 0) <= 0;

  const features = [
    {
      icon: <Layout className="w-4 h-4" />,
      title: t('ai.spatialLogic'),
      desc: t('ai.spatialDesc'),
    },
    {
      icon: <Palette className="w-4 h-4" />,
      title: t('ai.materialSynthesis'),
      desc: t('ai.materialDesc'),
    },
    {
      icon: <Box className="w-4 h-4" />,
      title: t('ai.volumeAnalysis'),
      desc: t('ai.volumeDesc'),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />

      {/* ── PAGE HERO ── */}
      <div className="pt-24 bg-[#0a0a0a]">
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-12 flex items-start justify-between gap-12">
          <div className="flex-1">
            <button
              onClick={() => navigateTo('home')}
              className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/20 hover:text-white/50 transition-colors flex items-center gap-2 group mb-10"
            >
              <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
              {t('nav.backToHome')}
            </button>
            <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/30 mb-4">
              {t('ai.engine')}
            </p>
            <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tight leading-[0.88] uppercase text-white mb-6">
              <span>AI {t('ai.design')}</span><br /><span className="italic font-light text-white/50">{t('ai.studio')}</span>
            </h1>
            <p className="text-[11px] text-white/35 uppercase tracking-[0.18em] leading-[2.2] max-w-md mb-8">
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
          <div className="w-[240px] flex-shrink-0">
            {authLoading ? (
              <div className="w-full h-[100px]" />
            ) : (
              <>
                {user && (
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                      {user.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-white/70 truncate">{user.name}</div>
                        <div className="text-[9px] text-white/30 truncate">{user.email}</div>
                      </div>
                      <button type="button" onClick={handleLogout}>
                        <LogOut className="w-3.5 h-3.5 text-white/20 hover:text-white/50 transition-colors" />
                      </button>
                    </div>
                    <div className="text-[9px] text-white/70 uppercase tracking-[0.15em] text-right font-bold">
                      {user.generationsLeft} {t('ai.remaining')}
                    </div>
                  </div>
                )}
                <div className={user ? 'hidden' : 'block'}>
                  <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] text-right mb-2">
                    {t('ai.unlockAll')}
                  </p>
                  <div id="google-signin-btn" className="w-full min-h-[42px]" />
                  <p className="text-[8px] text-white/10 uppercase tracking-[0.15em] text-right mt-2">
                    {t('ai.noCard')}
                  </p>
                </div>
              </>
            )}
            <div className="flex gap-0 mt-8 pt-6 border-t border-white/8">
              <div className="flex-1 pr-5 border-r border-white/8">
                <div className="text-3xl font-bold text-white tracking-tight">Free</div>
                <div className="text-[8px] text-white/20 uppercase tracking-[0.18em] mt-1">{t('ai.toExplore')}</div>
              </div>
              <div className="flex-1 pl-5 text-right">
                <div className="text-3xl font-bold text-white tracking-tight">3</div>
                <div className="text-[8px] text-white/20 uppercase tracking-[0.18em] mt-1">{t('ai.liveTools')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOL SELECTOR GRID ── */}
      <div>
        <div className="max-w-[1600px] mx-auto px-8 md:px-16">
          <div id="ai-concepts-tools" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-y-2 border-black">

            {/* Tool 1 — Style Quiz (LIVE) */}
            <div
              onClick={() => setActiveTool('quiz')}
              className={`group relative p-4 cursor-pointer border-r border-black/10 transition-all ${activeTool === 'quiz' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
              style={{ minHeight: '130px' }}
            >
              <div className={`text-[8px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'quiz' ? 'text-white/40' : 'text-black/25'}`}>01</div>
              <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'quiz' ? 'text-white' : 'text-black'}`}>{t('ai.styleQuiz')}</div>
              <div className={`text-[9px] leading-relaxed uppercase tracking-wide ${activeTool === 'quiz' ? 'text-white/50' : 'text-black/40'}`}>
                {t('ai.discoverDNA')}
                {user && (
                  <span className={`block mt-1 font-bold ${activeTool === 'quiz' ? 'text-white' : 'text-black'}`}>
                    · {t('ai.unlimited')}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'quiz' ? 'text-blue-200 bg-blue-900/30' : 'text-green-600 bg-green-50'}`}>{t('ai.nowActive')}</span>
              </div>
            </div>

            {/* Tool 2 — AI Vision (LIVE) */}
            <div
              onClick={() => setActiveTool('vision')}
              className={`group relative p-4 cursor-pointer border-r border-black/10 transition-all ${activeTool === 'vision' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
              style={{ minHeight: '130px' }}
            >
              <div className={`text-[8px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'vision' ? 'text-white/40' : 'text-black/25'}`}>02</div>
              <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'vision' ? 'text-white' : 'text-black'}`}>{t('ai.aiVision')}</div>
              <div className={`text-[9px] leading-relaxed uppercase tracking-wide ${activeTool === 'vision' ? 'text-white/50' : 'text-black/40'}`}>
                {t('ai.transformRoom')}
                {user && (
                  <span className={`block mt-1 font-bold ${activeTool === 'vision' ? 'text-white' : 'text-black'}`}>
                    · {user.generationsLeft} {t('ai.remaining')}
                  </span>
                )}
                {!user && (
                  <span className="block mt-1">
                    · 3 {t('ai.toExplore')}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'vision' ? 'text-blue-200 bg-blue-900/30' : 'text-green-600 bg-green-50'}`}>{t('ai.nowActive')}</span>
              </div>
            </div>

            {/* Tool 3 — Shopping List (LIVE) */}
            <div
              onClick={() => setActiveTool('shopping')}
              className={`group relative p-4 cursor-pointer border-r border-black/10 transition-all ${activeTool === 'shopping' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
              style={{ minHeight: '130px' }}
            >
              <div className={`text-[8px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'shopping' ? 'text-white/40' : 'text-black/25'}`}>03</div>
              <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'shopping' ? 'text-white' : 'text-black'}`}>{t('ai.shoppingList')}</div>
              <div className={`text-[9px] leading-relaxed uppercase tracking-wide ${activeTool === 'shopping' ? 'text-white/50' : 'text-black/40'}`}>
                {t('ai.shopInterior')}
                {user && (
                  <span className={`block mt-1 font-bold ${activeTool === 'shopping' ? 'text-white' : 'text-black'}`}>
                    · {user.shoppingListsLeft ?? 3} {t('ai.remainingShopping')}
                  </span>
                )}
                {!user && (
                  <span className="block mt-1">
                    · 3 {t('ai.toExplore')}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'shopping' ? 'text-blue-200 bg-blue-900/30' : 'text-green-600 bg-green-50'}`}>{t('ai.nowActive')}</span>
              </div>
            </div>

            {/* Tool 4 — Room Audit (LIVE for paid/owner only, SOON for everyone else) */}
            {user?.isPaid ? (
              <div
                onClick={() => { if (!(isProcessing || auditProcessing)) setActiveTool('audit'); }}
                className={`group relative p-4 border-r border-black/10 transition-all ${
                  (isProcessing || auditProcessing) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${activeTool === 'audit' ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
                style={{ minHeight: '130px' }}
              >
                <div className={`text-[8px] font-bold uppercase tracking-[0.25em] mb-3 ${activeTool === 'audit' ? 'text-white/40' : 'text-black/25'}`}>04</div>
                <div className={`font-display text-base font-bold leading-tight mb-1 ${activeTool === 'audit' ? 'text-white' : 'text-black'}`}>{t('ai.roomAudit')}</div>
                <div className={`text-[9px] leading-relaxed uppercase tracking-wide ${activeTool === 'audit' ? 'text-white/50' : 'text-black/40'}`}>
                  {t('ai.scoreSpace')}
                  <span className={`block mt-1 font-bold ${activeTool === 'audit' ? 'text-white' : 'text-black'}`}>
                    · {user.auditsLeft === 999 ? 'Unlimited' : user.auditsLeft} {t('ai.remaining')}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${activeTool === 'audit' ? 'text-blue-200 bg-blue-900/30' : 'text-green-600 bg-green-50'}`}>
                    {t('ai.nowActive')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="group relative bg-[#f7f6f4] p-4 border-r border-black/8 cursor-default" style={{ minHeight: '130px' }}>
                <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 mb-3">04</div>
                <div className="font-display text-base font-bold leading-tight mb-1 text-black/30">{t('ai.roomAudit')}</div>
                <div className="text-[9px] text-black/20 leading-relaxed uppercase tracking-wide">
                  {t('ai.scoreSpace')}
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-black/20 bg-black/5 px-1.5 py-0.5">Soon</span>
                </div>
              </div>
            )}

            {/* Tool 5 — Design Brief (SOON) */}
            <div className="group relative bg-[#f7f6f4] p-4 border-r border-black/8 cursor-default" style={{ minHeight: '130px' }}>
              <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 mb-3">05</div>
              <div className="font-display text-base font-bold leading-tight mb-1 text-black/30">{t('ai.designBrief')}</div>
              <div className="text-[9px] text-black/20 leading-relaxed uppercase tracking-wide">
                {t('ai.buildBrief')}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="text-[8px] font-bold uppercase tracking-wide text-black/20 bg-black/5 px-1.5 py-0.5">Soon</span>
              </div>
            </div>

            {/* Tool 6 — Cultural Advisor (SOON) */}
            <div className="group relative bg-[#f7f6f4] p-4 cursor-default" style={{ minHeight: '130px' }}>
              <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-black/20 mb-3">06</div>
              <div className="font-display text-base font-bold leading-tight mb-1 text-black/30">{t('ai.culturalAdvisor')}</div>
              <div className="text-[9px] text-black/20 leading-relaxed uppercase tracking-wide">
                {t('ai.blendStyles')}
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="text-[8px] font-bold uppercase tracking-wide text-black/20 bg-black/5 px-1.5 py-0.5">Soon</span>
              </div>
            </div>

          </div>
        </div>

        {/* Active tool bar */}
        <div className="max-w-[1600px] mx-auto px-8 md:px-16">
          <div className="bg-[#0047AB] flex items-center justify-between px-6 py-3">
            <div>
              <div className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/40 mb-0.5">
                {activeTool === 'quiz' ? '01' : activeTool === 'vision' ? '02' : activeTool === 'shopping' ? '03' : '04'} — {t('ai.nowActive')}
              </div>
              <div className="text-[11px] font-bold text-white">
                {activeTool === 'quiz' ? t('ai.styleQuiz') : activeTool === 'vision' ? t('ai.aiVision') : activeTool === 'shopping' ? t('ai.shoppingList') : t('ai.roomAudit')}
              </div>
              <div className="text-[9px] text-white/45 mt-0.5">
                {activeTool === 'quiz'
                  ? t('ai.quizDesc')
                  : activeTool === 'vision'
                  ? t('ai.visionDesc')
                  : activeTool === 'shopping'
                  ? t('ai.shopDesc')
                  : 'Get a scored report card for any room with actionable fixes'}
              </div>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 hidden md:block">
              {t('ai.jumpToTool')} ↑
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TWO-COLUMN ── */}
      <div className="flex-grow flex flex-col border-t border-black/10">
        <div className="max-w-[1600px] w-full mx-auto px-8 md:px-16 flex-grow flex flex-col lg:flex-row" style={{ minHeight: '75vh' }}>

        {/* ════ LEFT SIDEBAR ════ */}
        <div id="ai-vision-panel" className={`w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r border-black/8 flex flex-col${activeTool === 'shopping' || activeTool === 'quiz' || activeTool === 'audit' || (!user && activeTool === 'vision') ? ' hidden' : ''}`}>
          <div className="flex-grow p-8 flex flex-col gap-7 overflow-y-auto">

            {/* ── LOGGED OUT: Show placeholder ── */}
            {!authLoading && !user && (
              <div className="flex flex-col gap-6 py-12 text-center">
                <div className="w-12 h-12 bg-black/5 text-black/20 flex items-center justify-center text-2xl mx-auto rounded-full">✦</div>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight mb-2">
                    {t('ai.aiVision')}
                  </h3>
                  <p className="text-xs text-black/40 leading-relaxed uppercase tracking-widest px-4">
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
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/50">
                      {t('ai.uploadFloor')}
                    </span>
                  </div>
                  <label htmlFor="room-upload" className="block cursor-pointer">
                    <input id="room-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'room')} />
                    <div className={`relative overflow-hidden border transition-colors ${roomImage ? 'border-black' : 'border-dashed border-black/20 hover:border-black/50'}`}
                      style={{ aspectRatio: roomAspectRatio }}>
                      {roomImage ? (
                        <>
                          <img src={roomImage} className="w-full h-full object-cover" alt="Room" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 px-3 text-[8px] font-bold uppercase tracking-widest text-white text-center">
                            {t('btn.change')}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50">
                          <div className="w-9 h-9 border border-black/15 flex items-center justify-center text-black/25 text-xl font-thin">⌂</div>
                          <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/35">
                            {t('ai.uploadFloor')}
                          </span>
                          <span className="text-[8px] text-black/20 uppercase tracking-widest">JPG, PNG · max 10MB</span>
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
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/50">
                      {t('ai.uploadInsp')}
                    </span>
                  </div>
                  {inspirationImages.length < 5 && (
                    <label htmlFor="insp-upload" className="block cursor-pointer mb-3">
                      <input id="insp-upload" type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'inspiration')} />
                      <div className="border border-dashed border-black/20 hover:border-black/50 transition-colors bg-neutral-50 flex flex-col items-center justify-center gap-2 py-5">
                        <div className="w-7 h-7 border border-black/15 flex items-center justify-center text-black/30 text-base font-thin">+</div>
                        <span className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-black/35">
                          {t('btn.add')}
                        </span>
                        <span className="text-[8px] text-black/20 uppercase tracking-widest">
                          {inspirationImages.length}/5 {t('ai.images')}
                        </span>
                      </div>
                    </label>
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

                {/* STEP 3: Style */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-black/20 text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/50">
                      {t('ai.styleQuiz')} <span className="text-black/20 normal-case font-normal tracking-normal ml-1">({t('common.optional')})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* None option */}
                    <button
                      onClick={() => setSelectedStyle('')}
                      className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                        selectedStyle === '' ? 'border-black bg-black text-white' : 'border-dashed border-black/20 text-black/30 hover:border-black/40 hover:text-black/50'
                      }`}
                    >
                      {language === 'en' ? 'No preference' : 'No preference'}
                    </button>
                    {VISION_STYLES.map((style) => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                          selectedStyle === style ? 'border-black bg-black text-white' : 'border-black/15 text-black/40 hover:border-black/40 hover:text-black/70'
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
                  <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/40">
                    {t('ai.remaining')}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`w-5 h-1 ${i < (user?.generationsLeft ?? 0) ? 'bg-black' : 'bg-black/15'}`} />
                    ))}
                  </div>
                </div>

                {validationError && (
                  <div className="flex items-start gap-2 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">{validationError}</p>
                  </div>
                )}

                {(user?.generationsLeft ?? 0) <= 0 && (
                  <div className="text-center space-y-3">
                    <p className="text-sm md:text-base font-bold uppercase tracking-widest text-red-500 leading-relaxed">
                      {t('ai.usedAll')}
                    </p>
                    <a 
                      href="https://calendly.com/designature-studio-us/free_consultation" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black border-b border-black pb-0.5 hover:text-black/60 flex items-center gap-2 mx-auto"
                    >
                      {t('ai.bookConversation')} <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={() => handleGenerate()}
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
              </>
            )}

            {/* Feature list — always visible */}
            <div className="flex flex-col gap-4 pt-2 border-t border-black/6">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 border border-black/10 flex items-center justify-center text-black/30 flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <h4 className="text-sm md:text-base font-bold uppercase tracking-[0.2em] mb-0.5">{f.title}</h4>
                    <p className="text-xs text-black/35 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ════ RIGHT CONTENT AREA ════ */}
        <div className="flex-grow bg-neutral-50 flex flex-col">

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
                  try {
                    const res = await apiFetch('/api/auth/me');
                    if (res.ok) {
                      const data = await res.json();
                      setUser((prev) =>
                        prev
                          ? { ...prev, generationsLeft: data?.generationsLeft ?? prev.generationsLeft, shoppingListsLeft: data?.shoppingListsLeft ?? prev.shoppingListsLeft }
                          : prev
                      );
                    }
                  } catch {}
                }}
                onRequestLogin={triggerGoogleSignIn}
              />
            </div>
          )}

          {/* Not logged in — right panel (vision only) */}
          {!authLoading && !user && activeTool === 'vision' && (
            <div className="flex-grow flex flex-col items-center justify-center gap-6 py-20 px-8 text-center bg-white">
              <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">◎</div>
              <h3 className="font-display text-2xl font-light text-black/30 tracking-tight">
                Transform your room
              </h3>
              <p className="text-sm text-black/30 uppercase tracking-[0.2em] leading-[2]">
                Free · 3 concepts · No card needed
              </p>
              <button
                onClick={() => triggerGoogleSignIn()}
                className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.25em] px-5 py-3 hover:bg-[#003d99] transition-colors"
              >
                Transform your room →
              </button>
            </div>
          )}

          {/* Not logged in — shopping list */}
          {!authLoading && !user && activeTool === 'shopping' && (
            <div className="flex-grow flex flex-col items-center justify-center gap-6 py-20 px-8 text-center bg-white">
              <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">◎</div>
              <h3 className="font-display text-2xl font-light text-black/30 tracking-tight">
                Shop any interior
              </h3>
              <p className="text-sm text-black/30 uppercase tracking-[0.2em] leading-[2]">
                Free · 3 shopping lists · PDF included
              </p>
              <button
                onClick={() => triggerGoogleSignIn()}
                className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.25em] px-5 py-3 hover:bg-[#003d99] transition-colors"
              >
                Shop any interior →
              </button>
            </div>
          )}

          {/* Empty state — vision only */}
          {!authLoading && user && results.length === 0 && !isProcessing && !error && activeTool === 'vision' && (
            <div className="flex-grow flex flex-col items-center justify-center gap-5 p-16 text-center">
              <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">✦</div>
              <h3 className="font-display text-3xl font-light text-black/20 tracking-tight">
                {t('ai.conceptAppear')}
              </h3>
              <p className="text-sm md:text-base uppercase tracking-[0.3em] text-black/20 leading-[2] text-center">
                {t('ai.completeSteps')}
              </p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="flex-grow flex flex-col items-center justify-center gap-6 bg-black p-16 text-center">
              <div className="w-12 h-12 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
              <div className="space-y-3">
                <p className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-white/50">
                  {t('common.processing')}
                </p>
                <p className="text-[9px] text-white/20 uppercase tracking-widest">
                  {t('ai.processingTime')}
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isProcessing && (
            <div className="flex-grow flex flex-col items-center justify-center gap-5 bg-black p-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-white/50">{error}</p>
              <button onClick={() => setError(null)} className="text-sm md:text-base font-bold uppercase tracking-widest text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors">
                {t('btn.tryAgain')}
              </button>
            </div>
          )}

          {/* Results state */}
          {(results.length > 0 ||
            sessionConceptArchive.length > 0 ||
            (activeTool === 'shopping' && !!user) ||
            activeTool === 'quiz') &&
            !isProcessing && (
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
                    <button onClick={() => handleGenerate(true)} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white bg-black px-4 py-2 hover:bg-black/70 transition-all">
                      <RefreshCw className="w-3 h-3" />
                      {t('ai.genVariation')}
                    </button>
                  )}
                  <button onClick={handleReset} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-black/40 border border-black/12 px-3 py-2 hover:border-black/40 hover:text-black transition-all">
                    <X className="w-3 h-3" />
                    {t('btn.reset')}
                  </button>
                </div>
              </div>
              )}

              {results.length > 0 && roomImage && (
              <div className="grid grid-cols-2 border-b border-black/8" style={{ gap: '1px', background: 'rgba(0,0,0,0.08)' }}>
                <div className="bg-white">
                  <div className="px-5 py-2.5 border-b border-black/6">
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-black/30">{t('ai.originalRoom')}</span>
                  </div>
                  <img src={roomImage} className="w-full object-cover" style={{ aspectRatio: roomAspectRatio }} alt="Original" />
                </div>
                <div className="bg-white">
                  <div className="px-5 py-2.5 border-b border-black/6 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-black/30">{t('ai.genConcept')}</span>
                    <span className="text-[7px] text-black/20 uppercase tracking-widest">AI{selectedStyle ? ` · ${t(`ai.style.${selectedStyle.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}` : ''}</span>
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
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/30 mb-1">{t('ai.genConcepts')}</p>
                {sessionConceptArchive.length > 0 && (
                  <p className="text-[10px] text-black/40 mb-3 leading-relaxed max-w-xl">
                    {t('ai.sessionConceptsArchiveHint')}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {allSessionConcepts.map((img, idx) => (
                    <button
                      key={`concept-${idx}`}
                      type="button"
                      onClick={() => setSelectedConceptIndex(idx)}
                      className={`relative overflow-hidden border-2 transition-all ${selectedConceptIndex === idx ? 'border-black' : 'border-transparent opacity-50 hover:opacity-75'}`}
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
                  {Array.from({ length: Math.max(0, maxConceptSlots - allSessionConcepts.length) }).map((_, idx) => (
                    <div key={`locked-${idx}`} className="border border-dashed border-black/10 bg-neutral-50 flex items-center justify-center text-black/15 text-xs" style={{ width: 72, height: 72 }}>🔒</div>
                  ))}
                </div>
              </div>

              <div className="px-8 py-5 bg-white flex gap-2">
                <button
                  type="button"
                  disabled={!selectedConceptUrl}
                  onClick={() => selectedConceptUrl && handleDownload(selectedConceptUrl)}
                  className="flex-1 py-3.5 bg-black text-white text-sm md:text-base font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('btn.downloadFull')}
                </button>
                {allSessionConcepts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => allSessionConcepts.forEach((img) => handleDownload(img))}
                    className="px-5 py-3.5 border border-black/15 text-sm md:text-base font-bold uppercase tracking-[0.2em] text-black/50 hover:border-black hover:text-black transition-all"
                  >
                    {t('btn.downloadAll')}
                  </button>
                )}
              </div>
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
              <div id="style-quiz-section" className="flex-grow flex flex-col bg-white">

                {/* Sign-in gate */}
                {!authLoading && !user && (
                  <div className="flex flex-col items-center justify-center gap-6 py-20 px-8 text-center flex-grow">
                    <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">◎</div>
                    <h3 className="font-display text-2xl font-light text-black/30 tracking-tight">
                      {t('ai.signInQuiz')}
                    </h3>
                    <p className="text-sm text-black/30 uppercase tracking-[0.2em] leading-[2]">
                      {language === 'en' ? 'Free · 12 rooms · 2 minutes' : 'Free'}
                    </p>
                    <button
                      onClick={() => {
                  triggerGoogleSignIn();
                      }}
                      className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.25em] px-5 py-3 hover:bg-[#003d99] transition-colors"
                    >
                      {t('ai.signInQuiz')} →
                    </button>
                  </div>
                )}

                {!authLoading && user && (<>

                {/* Progress bar */}
                {!quizDone && (
                  <div>
                    <div className="h-1 bg-black/5">
                      <div className="h-1 bg-[#0047AB] transition-all duration-300" style={{ width: `${(quizStep / QUIZ_LENGTH) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between px-8 py-3 border-b border-black/8">
                      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/40">
                        {t('ai.quiz.roomOf').replace('{current}', (quizStep + 1).toString()).replace('{total}', QUIZ_LENGTH.toString())}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-[9px] text-black/30 uppercase tracking-widest">
                          {t('ai.quiz.rateHonestly')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 3-col during quiz / 2-col on results ── */}
                <div className="flex flex-col lg:flex-row flex-grow">

                  {/* LEFT — room image (current during quiz, last loved when done) */}
                  <div className="flex-shrink-0 flex items-start justify-start bg-neutral-50 p-4 w-full lg:w-[632px]">
                    <div className="relative w-full max-w-[600px]">
                      <img
                        src={currentQuizImage.url}
                        alt={currentQuizStyle}
                        onLoad={() => { if (!quizDone) setQuizImageReady(true); }}
                        onError={() => { if (!quizDone) setQuizImageReady(true); }}
                        className="w-full object-cover"
                        style={{ aspectRatio: '1/1', display: 'block' }}
                      />
                      <div className="absolute top-3 left-3 bg-white/90 px-3 py-1.5 border border-black/10">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/60">
                          {t(`ai.style.${currentQuizStyle.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
                        </span>
                      </div>
                      {!quizDone && currentQuizImage.credit.includes('Designature') && (
                        <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1">
                          <span className="text-[8px] text-white/70 uppercase tracking-widest">{t('ai.quiz.fromPortfolio')}</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 bg-black/40 px-2 py-1">
                        <span className="text-[7px] text-white/50 uppercase tracking-widest">AI · Gemini</span>
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE — voting + taste bars (quiz only) */}
                  {!quizDone && (
                    <div className="w-full lg:w-[260px] flex-shrink-0 flex flex-col border-l border-black/8">
                      <div className="p-6 border-b border-black/8">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black mb-5">
                          {t('ai.quiz.howFeel')}
                        </p>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleQuizVote('love')} disabled={!quizImageReady} className="w-full py-3.5 bg-black text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <span>✦</span> {t('ai.quiz.loveIt')}
                          </button>
                          <button onClick={() => handleQuizVote('skip')} disabled={!quizImageReady} className="w-full py-3 border border-black/15 text-[10px] font-bold uppercase tracking-[0.25em] text-black/40 hover:border-black/40 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {t('ai.quiz.skip')}
                          </button>
                          <button onClick={() => handleQuizVote('no')} disabled={!quizImageReady} className="w-full py-3 border border-black/15 text-[10px] font-bold uppercase tracking-[0.25em] text-black/40 hover:border-black/40 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {t('ai.quiz.notMyStyle')}
                          </button>
                          {quizStep > 0 && (
                            <button
                              onClick={() => {
                                const total = Object.values(quizVotes).reduce((a: number, b: number) => a + b, 0) || 1;
                                const sorted = STYLES.map(s => ({ style: s, pct: Math.round(((quizVotes[s] || 0) / total) * 100) })).filter(r => r.pct > 0).sort((a, b) => b.pct - a.pct);
                                setQuizResult(sorted);
                                setQuizDone(true);
                              }}
                              className="w-full py-3 border border-black/20 text-[10px] font-bold uppercase tracking-[0.25em] text-black/60 hover:border-black/50 hover:text-black transition-all"
                            >
                              Stop &amp; see results
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-5 overflow-y-auto">
                        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/30 mb-4">{t('ai.quiz.tasteSoFar')}</p>
                        <div className="flex flex-col gap-2.5">
                          {(() => {
                            const total = Object.values(quizVotes).reduce((a: number, b: number) => a + b, 0) || 1;
                            return STYLES.slice().sort((a, b) => (quizVotes[b] || 0) - (quizVotes[a] || 0)).map(style => {
                              const pct = Object.keys(quizVotes).length === 0 ? 0 : Math.round(((quizVotes[style] || 0) / total) * 100);
                              const hasVotes = (quizVotes[style] || 0) > 0;
                              return (
                                <div key={style}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[8px] font-bold uppercase tracking-[0.08em] ${hasVotes ? 'text-black' : 'text-black/25'}`}>{t(`ai.style.${style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}</span>
                                    <span className={`text-[8px] font-bold ${hasVotes ? 'text-[#0047AB]' : 'text-black/15'}`}>{pct}%</span>
                                  </div>
                                  <div className="h-0.5 bg-black/6"><div className="h-0.5 bg-[#0047AB] transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RIGHT — history + education during quiz / full results when done */}
                  <div className={`flex-grow flex flex-col border-l border-black/8 overflow-y-auto ${quizDone ? 'lg:max-w-[500px]' : ''}`}>
                    {!quizDone ? (
                      /* Previous quiz results */
                      <div className="p-6 flex flex-col gap-4 flex-grow">
                        {quizHistory.length === 0 ? (
                          <div className="flex-grow flex flex-col items-center justify-center gap-3 text-center">
                            <div className="w-10 h-10 border border-black/8 flex items-center justify-center text-black/10 text-xl">◎</div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/20">Previous quiz<br/>results appear here</p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/30 mb-1">Previous results</p>
                              <p className="text-[8px] text-black/20 uppercase tracking-[0.15em]">Click a card to see the style</p>
                            </div>
                            <div className="flex flex-col gap-3">
                              {quizHistory.map((result, idx) => {
                                const isOpen = selectedPrevResult === idx;
                                const topStyle = result[0]?.style;
                                const desc = topStyle ? STYLE_DESCRIPTIONS[topStyle] : null;
                                return (
                                  <div key={idx}>
                                    <button
                                      onClick={() => setSelectedPrevResult(isOpen ? null : idx)}
                                      className={`w-full text-left border p-4 transition-all ${isOpen ? 'border-[#0047AB] bg-white' : 'border-black/8 bg-neutral-50 hover:border-black/20'}`}
                                    >
                                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30 mb-3">Quiz {quizHistory.length - idx}</p>
                                      <div className="flex flex-col gap-2">
                                        {result.slice(0, 3).map((r, i) => (
                                          <div key={r.style}>
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/70">{t(`ai.style.${r.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}</span>
                                              <span className="text-[9px] font-bold text-[#0047AB]">{r.pct}%</span>
                                            </div>
                                            <div className="h-0.5 bg-black/8">
                                              <div className="h-0.5" style={{ width: `${r.pct}%`, background: i === 0 ? '#0047AB' : i === 1 ? '#4477CC' : '#8899BB' }} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </button>
                                    {isOpen && desc && (
                                      <div className="border border-t-0 border-[#0047AB]/30 p-4 bg-white">
                                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0047AB] mb-2">{topStyle}</p>
                                        <p className="text-[10px] text-black/50 leading-relaxed mb-3">{desc.summary}</p>
                                        <div className="flex flex-wrap gap-1">
                                          {desc.elements.map(el => (
                                            <span key={el} className="text-[7px] font-bold uppercase tracking-wide text-black/40 border border-black/10 px-2 py-0.5">{el}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-auto pt-4">
                              <button
                                disabled={selectedPrevResult === null}
                                onClick={() => {
                                  if (selectedPrevResult !== null && quizHistory[selectedPrevResult]?.[0]) {
                                    setSelectedStyle(quizHistory[selectedPrevResult][0].style);
                                    setActiveTool('vision');
                                    setTimeout(() => {
                                      const el = document.getElementById('ai-concepts-tools');
                                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }, 50);
                                  }
                                }}
                                className="w-full py-4 bg-black text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black/80 transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                ✦ Apply selected style
                              </button>
                              {selectedPrevResult === null && (
                                <p className="text-[8px] text-black/25 uppercase tracking-widest text-center mt-2">Select a quiz to apply</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Results panel */
                      <div className="p-8 flex flex-col gap-5 flex-grow">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#0047AB] mb-2">{t('ai.quiz.designDNA')}</p>
                          <h2 className="font-display text-3xl font-bold tracking-tight mb-1">
                            {t(`ai.style.${quizResult[0]?.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}
                            {quizResult[1] && <span className="text-black/30"> · {t(`ai.style.${quizResult[1].style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}</span>}
                          </h2>
                          <p className="text-xs text-black/40 uppercase tracking-[0.2em]">{t('ai.quiz.basedOnRatings')}</p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button onClick={handleApplyQuizStyle} className="w-full py-4 bg-black text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black/80 transition-all flex items-center justify-center gap-2">
                            ✦ {t('ai.quiz.applyStyle').replace('{style}', t(`ai.style.${quizResult[0]?.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`))}
                          </button>
                          <button
                            onClick={() => setShowQuizResults(v => !v)}
                            className="w-full py-3.5 border border-black/15 text-[10px] font-bold uppercase tracking-[0.25em] text-black/50 hover:border-black/40 hover:text-black transition-all flex items-center justify-center gap-2"
                          >
                            {showQuizResults ? '↑ Hide results' : '↓ See quiz results'}
                          </button>
                          <button onClick={handleQuizReset} className="w-full py-3.5 border border-black/15 text-[10px] font-bold uppercase tracking-[0.25em] text-black/50 hover:border-black/40 hover:text-black transition-all">
                            {t('ai.quiz.retake')}
                          </button>
                        </div>

                        {showQuizResults && (
                          <div className="flex flex-col gap-4 border-t border-black/8 pt-4">
                            <div className="flex flex-col gap-3">
                              {quizResult.slice(0, 5).map((r, i) => (
                                <div key={r.style}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black">{t(`ai.style.${r.style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`)}</span>
                                    <span className="text-[10px] font-bold text-[#0047AB]">{r.pct}%</span>
                                  </div>
                                  <div className="h-1 bg-black/8">
                                    <div className="h-1 transition-all duration-700" style={{ width: `${r.pct}%`, background: i === 0 ? '#0047AB' : i === 1 ? '#4477CC' : '#8899BB' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {quizResult[0] && STYLE_DESCRIPTIONS[quizResult[0].style] && (() => {
                              const desc = STYLE_DESCRIPTIONS[quizResult[0].style];
                              return (
                                <div className="border border-black/8 p-4 bg-neutral-50">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0047AB] mb-2">{quizResult[0].style}</p>
                                  <p className="text-[10px] text-black/50 leading-relaxed mb-3">{desc.summary}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {desc.elements.map(el => (
                                      <span key={el} className="text-[7px] font-bold uppercase tracking-wide text-black/40 border border-black/10 px-2 py-0.5">{el}</span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                </> )}
              </div>
              )}


              {/* ══ SHOP THIS LOOK ══ */}
              <div
                id="shop-this-look"
                className={`scroll-mt-28 border-t-2 border-black/8${activeTool === 'quiz' ? ' hidden' : ''}`}
              >

                {/* Sign-in gate */}
                {!authLoading && !user && (
                  <div className="flex flex-col items-center justify-center gap-6 py-20 px-8 text-center flex-grow bg-white">
                    <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">◎</div>
                    <h3 className="font-display text-2xl font-light text-black/30 tracking-tight">
                      Shop any interior
                    </h3>
                    <p className="text-sm text-black/30 uppercase tracking-[0.2em] leading-[2]">
                      Free · 3 shopping lists · PDF included
                    </p>
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

                {/* Country selector */}
                <div className="px-8 pt-5 pb-4 border-b border-black/8 bg-white flex items-center gap-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/40 flex-shrink-0">
                    {t('ai.shop.shopIn')}
                  </p>
                  <div className="relative">
                    <select
                      value={shoppingCountry}
                      onChange={e => setShoppingCountry(e.target.value)}
                      className="appearance-none bg-white border border-black/20 text-[10px] font-bold uppercase tracking-[0.1em] text-black px-4 py-2 pr-8 cursor-pointer hover:border-black/50 transition-colors focus:outline-none focus:border-black"
                      style={{ minWidth: '210px' }}
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
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/40 text-[10px]">▾</div>
                  </div>
                </div>
                {/* Initial CTA — first time or after clear */}
                {!shoppingDone && !shoppingLoading && !shoppingError && shoppingItems.length === 0 && (
                  <div className="px-8 py-6 bg-neutral-50">
                    {/* AI concept exists — one-click CTA */}
                    {selectedConceptUrl ? (
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black mb-1">
                            {t('ai.shopThisLook')}
                          </p>
                          <p className="text-[10px] text-black/50 leading-relaxed max-w-xs">
                            {t('ai.shopThisLookDesc')}
                          </p>
                        </div>
                        <button
                          onClick={focusShoppingTabAndRunSearch}
                          className="flex-shrink-0 flex items-center gap-2 bg-[#0047AB] text-white text-[10px] font-bold uppercase tracking-[0.3em] px-6 py-4 hover:bg-[#003d99] transition-all whitespace-nowrap"
                        >
                          {t('ai.findTheseProducts')} →
                        </button>
                      </div>
                    ) : (
                      /* No AI concept — standalone upload */
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black mb-1">
                          {t('ai.shop.anyInterior')}
                        </p>
                        <p className="text-[10px] text-black/50 leading-relaxed mb-4">
                          {t('ai.shop.anyInteriorDesc')}
                        </p>
                        <div className="w-[316px] xl:w-[356px]">
                          <label htmlFor="standalone-shop-upload" className="block cursor-pointer">
                            <input
                              id="standalone-shop-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
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
                                e.target.value = '';
                              }}
                            />
                            <div
                              className={`relative overflow-hidden border transition-colors ${standaloneShoppingImage ? 'border-black' : 'border-dashed border-black/20 hover:border-black/50'}`}
                              style={{ aspectRatio: standaloneShoppingAspectRatio }}
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
                                  <div className="w-9 h-9 border border-black/15 flex items-center justify-center text-black/25 text-xl font-thin">⌂</div>
                                  <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/35">
                                    {t('ai.shop.uploadPhoto')}
                                  </span>
                                  <span className="text-[8px] text-black/20 uppercase tracking-widest">JPG, PNG · max 10MB</span>
                                </div>
                              )}
                            </div>
                          </label>
                          {standaloneShoppingImage && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={focusShoppingTabAndRunSearch} className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-[10px] font-bold uppercase tracking-[0.25em] py-3 hover:bg-black/80 transition-all">
                                🛒 {t('ai.shop.findProducts')}
                              </button>
                              <button onClick={() => setStandaloneShoppingImage(null)} className="text-[9px] text-black/30 uppercase tracking-widest border border-black/10 px-4 hover:text-black hover:border-black/40 transition-all">
                                {t('ai.shop.change')}
                              </button>
                            </div>
                          )}
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
                      <p className="text-[10px] text-black/50 leading-relaxed max-w-xs">
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
                      <p className="text-[9px] text-black/40 mt-0.5">{t('ai.shop.processingTime')}</p>
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
                    {(selectedConceptUrl || standaloneShoppingImage) && (
                      <div className="border-b border-black/8 bg-white px-8 py-6 flex items-start gap-6">
                        <img
                          src={selectedConceptUrl || standaloneShoppingImage || ''}
                          className="w-40 h-40 object-cover flex-shrink-0 border border-black/10"
                          alt="Source"
                        />
                        <div className="pt-1">
                          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/30 mb-2">
                            {selectedConceptUrl
                              ? (language === 'en' ? 'Shopping from your AI concept' : 'Shopping from AI concept')
                              : (language === 'en' ? 'Shopping from your uploaded photo' : 'Shopping from uploaded photo')}
                          </p>
                          <p className="text-[11px] text-black/60 leading-relaxed">
                            {language === 'en' ? 'Products matched to the items identified in this interior.' : 'Products matched to this interior'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Items found header */}
                    {shoppingItems.length > 0 && (
                      <div className="px-8 py-4 border-b border-black/8 bg-neutral-50 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/50">
                            {t('ai.shop.itemsIdentified').replace('{count}', shoppingItems.length.toString())}
                          </p>
                          {shoppingItems.map((item: any, idx: number) => (
                            <span key={idx} className="text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 bg-black text-white">
                              {item.category}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => { setShoppingDone(false); setShoppingResults([]); setShoppingItems([]); }}
                          className="text-[9px] uppercase tracking-widest text-black/30 hover:text-black transition-colors flex-shrink-0 ml-4"
                        >
                          {t('btn.reset')}
                        </button>
                      </div>
                    )}

                    {shoppingResults.length === 0 && (
                      <div className="px-8 py-8 text-center">
                        <p className="text-[10px] text-black/50 uppercase tracking-widest">
                          {t('ai.shop.noProducts')}
                        </p>
                      </div>
                    )}

                    <div className="divide-y divide-black/5">
                      {shoppingResults.map((group: any, gIdx: number) => (
                        <div key={gIdx} className="px-8 py-6">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black">{group.item.category}</span>
                            <span className="text-[9px] text-black/40">— {group.item.description}</span>
                          </div>
                          {group.error ? (
                            <p className="text-[10px] text-red-500 italic">
                              Error: {group.error}
                            </p>
                          ) : group.products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {group.products.map((product: any, pIdx: number) => (
                                <a key={pIdx} href={product.link} target="_blank" rel="noopener noreferrer"
                                  className="group border border-black/10 bg-neutral-50 hover:border-black/30 hover:bg-white transition-all overflow-hidden">
                                  <div className="aspect-square bg-neutral-100 overflow-hidden">
                                    {product.thumbnail
                                      ? <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      : <div className="w-full h-full flex items-center justify-center text-3xl opacity-15">🛋</div>}
                                  </div>
                                  <div className="p-3">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/50 mb-1">{product.source}</p>
                                    <p className="text-[11px] font-medium text-black leading-snug line-clamp-2 mb-1">{product.title}</p>
                                    {product.rating && (
                                      <p className="text-[9px] text-black/40 mb-1">{'★'.repeat(Math.round(product.rating))} {product.rating}{product.reviews ? ` (${product.reviews})` : ''}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <p className="text-[12px] font-bold text-black">{product.price || 'View price →'}</p>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-black/40 italic">
                              {t('ai.shop.noProductsForItem')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="px-8 py-5 border-t border-black/8 bg-neutral-50 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <p className="text-[9px] text-black/30 leading-relaxed">
                        {t('ai.shop.resultsVia')}
                      </p>
                      <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0">
                        <p className="text-[10px] text-black/50 text-left sm:text-right leading-snug max-w-[min(100%,300px)]">
                          {t('ai.shop.downloadPdfNotice')}
                        </p>
                        <button
                          type="button"
                          onClick={handleDownloadShoppingPDF}
                          className="flex items-center justify-center gap-2 bg-black text-white text-[9px] font-bold uppercase tracking-[0.25em] px-5 py-3 hover:bg-black/80 transition-all whitespace-nowrap"
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
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">
                {t('ai.loveWhatSee')}
              </p>
              <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                {t('ai.readyMakeReal')}
              </h3>
              <p className="text-sm text-white/40 uppercase tracking-widest mt-1">
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

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {isLightboxOpen && selectedConceptUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLightboxOpen(false)} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-zoom-out">
            <div className="absolute top-8 right-8 flex gap-4 z-[110]">
              <button onClick={(e) => { e.stopPropagation(); handleDownload(selectedConceptUrl); }} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm md:text-base font-bold uppercase tracking-widest hover:bg-white/90 transition-all">
                <Download className="w-4 h-4" /> {t('btn.download')}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }} className="text-white/50 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img src={selectedConceptUrl} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="Full resolution" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIConceptsPage;
