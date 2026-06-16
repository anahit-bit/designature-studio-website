import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';
import { QUIZ_IMAGE_WEIGHTS, TIER_POINTS } from '../data/quizImageWeights';
import { cld, cldSrcSet } from '../lib/cld';
import { trackQuizStart, trackQuizComplete } from '../lib/track';
import StatusHdr from './studio/StatusHdr';
import StudioHero, { Glass } from './studio/StudioHero';
import ValueStrip from './studio/ValueStrip';
import Marquee from './studio/Marquee';
import ConversionBand from './studio/ConversionBand';
import SigninVeil from './studio/SigninVeil';

// ── The 9 quiz styles (must match quizImageWeights.ts) ──
const STYLES = [
  'Japandi', 'Modern', 'Mid-Century', 'Bohemian', 'Rustic', 'Art Deco',
  'Industrial', 'Coastal', 'Transitional',
];

const QUIZ_LENGTH = 18;
/** Voting unlocks once the deck image loads; this is the safety fallback. */
const QUIZ_VOTE_UNLOCK_MS = process.env.NODE_ENV === 'test' ? 10 : 1500;
/** B5 audit: early-end needs both ≥4 loves AND a minimum number of rooms seen. */
const EARLY_END_MIN_STEP = 4; // quizStep is 0-indexed → ≥5 rooms shown
/** Logged-in "Reading your taste" dwell before the DNA reveal. */
const READING_MS = process.env.NODE_ENV === 'test' ? 10 : 1500;

const STYLE_KEY = (style: string) => `ai.style.${style.toLowerCase().replace(/-/g, '').replace(/ /g, '')}`;

const STYLE_DESCRIPTIONS: Record<string, { summary: string; elements: string[] }> = {
  'Japandi':     { summary: 'A fusion of Japanese wabi-sabi and Scandinavian hygge. Celebrates imperfection, natural materials, and quiet beauty — everything earns its place.', elements: ['Neutral tones', 'Natural textures', 'Low furniture', 'Negative space'] },
  'Modern':      { summary: 'Clean geometry, minimal ornament, honest materials. Form follows function — every line is intentional, every surface purposeful.', elements: ['Clean lines', 'Open layout', 'Monochrome palette', 'Statement lighting'] },
  'Mid-Century': { summary: 'Clean walnut lines softened by raw, honest materials. You’re drawn to rooms that feel collected and warm — confident, never cold.', elements: ['Walnut tones', 'Clean lines', 'Warm light', 'Organic forms'] },
  'Bohemian':    { summary: 'Layered, personal, and free-spirited. A curated mix of textiles, cultures, and eras that feels lived-in and full of stories.', elements: ['Mixed textiles', 'Plants & greenery', 'Global artefacts', 'Rich colour'] },
  'Rustic':      { summary: 'Rooted in nature and craftsmanship. Raw edges, weathered surfaces, and handmade quality bring warmth and authenticity.', elements: ['Reclaimed wood', 'Stone & brick', 'Earthy tones', 'Handmade details'] },
  'Art Deco':    { summary: 'Glamour, geometry, and opulence from the 1920s. Bold symmetry, luxe materials, and rich contrast make every room feel like a statement.', elements: ['Gold accents', 'Geometric patterns', 'Velvet & marble', 'High contrast'] },
  'Industrial':  { summary: 'Celebrates the beauty of raw, unfinished spaces. Exposed structure and utilitarian materials are the decoration.', elements: ['Exposed brick', 'Raw metal', 'Concrete', 'Edison bulbs'] },
  'Coastal':     { summary: 'Light, airy, and unhurried. Inspired by shorelines — bleached woods, sandy tones, and ocean blues create effortless calm.', elements: ['Sandy neutrals', 'Ocean blues', 'Natural linen', 'Weathered wood'] },
  'Transitional':{ summary: 'A measured balance of classic and contemporary. Familiar shapes in a restrained palette — calm, timeless, never fussy.', elements: ['Soft neutrals', 'Balanced forms', 'Layered texture', 'Quiet contrast'] },
};

type QuizRoom = { url: string; credit: string };
type QuizRooms = Record<string, QuizRoom[]>;

// Minimal fallback so the deck/mosaic render before /api/images resolves.
// IMPORTANT: this Cloudinary account is in dynamic-folders mode — the public_ids
// live at ROOT, so the canonical delivery URL is /upload/v<version>/<public_id>.<ext>
// (the form /api/images returns). Folder-path URLs (/upload/.../Quiz/<Style>/<id>)
// 404 here. All 18 IDs below verified 200. cld() adds f_auto/q_auto/crop on top.
export const QUIZ_ROOMS_FALLBACK: QuizRooms = {
  'Mid-Century': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950187/12_iwshvs.jpg', credit: 'Mid-Century' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774938198/14_zulrwj.jpg', credit: 'Mid-Century' },
  ],
  'Industrial': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774954080/5_an8tny.jpg', credit: 'Industrial' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774938215/8_o9nuyt.jpg', credit: 'Industrial' },
  ],
  'Bohemian': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774949652/8_r7zpqa.jpg', credit: 'Bohemian' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774949648/10_u56vvx.jpg', credit: 'Bohemian' },
  ],
  'Japandi': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774954453/14_valixc.png', credit: 'Japandi' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774954428/13_logbtm.png', credit: 'Japandi' },
  ],
  'Coastal': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950277/14_mwuyw1.jpg', credit: 'Coastal' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950152/9_cbgmet.jpg', credit: 'Coastal' },
  ],
  'Modern': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950446/3_1_vpngnt.jpg', credit: 'Modern' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774938203/10_y7bds9.jpg', credit: 'Modern' },
  ],
  'Art Deco': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775713413/17_gmhspd.png', credit: 'Art Deco' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775711587/12_jvapje.png', credit: 'Art Deco' },
  ],
  'Rustic': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774952371/10_ihohiz.png', credit: 'Rustic' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950455/11_hjofyz.jpg', credit: 'Rustic' },
  ],
  'Transitional': [
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774940232/10_tuag7j.jpg', credit: 'Transitional' },
    { url: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774938188/2_2_kdupyu.jpg', credit: 'Transitional' },
  ],
};

export const DNA_HERO_FALLBACK = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780425409/output_1_xfhm8j.png';
/** Logged-in landing hero (kept here so the image regression test can assert it). */
export const QUIZ_LANDING_HERO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780430248/stylequiz_kvmv7p.png';

function styleToCloudinaryFolderName(style: string): string {
  return style.trim().replace(/\s+/g, '-');
}

/** Largest-remainder rounding so displayed percentages sum to exactly 100. */
function roundPercentages(values: number[], decimals = 1): number[] {
  const multiplier = Math.pow(10, decimals);
  const target = 100 * multiplier;
  const scaled = values.map(v => v * multiplier);
  const floored = scaled.map(Math.floor);
  const diff = target - floored.reduce((a, b) => a + b, 0);
  const remainders = scaled.map((v, i) => ({ index: i, remainder: v - floored[i] }));
  remainders.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < diff; i++) floored[remainders[i % remainders.length].index]++;
  return floored.map(v => v / multiplier);
}

type QuizResult = { style: string; pct: number }[];

// Parse `?dna=Mid-Century-Coastal&pcts=62-24-8-4-2` so a shared link opens
// straight to the DNA result (no flash of the playable quiz).
function parseSharedQuizFromUrl(): { quizResult: QuizResult } | null {
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
      if (acc.length > 0 && (match === candidate || match === candHyphen)) acc[acc.length - 1] = match;
      else acc.push(match);
    } else {
      acc.push(part);
    }
    return acc;
  }, []);
  const validStyles = styleSlugs.filter(s => STYLES.includes(s));
  const pctVals = pcts.split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  if (validStyles.length === 0 || pctVals.length === 0) return null;
  const synthResult: QuizResult = [];
  const used = new Set<string>();
  for (let i = 0; i < pctVals.length; i++) {
    let style = validStyles[i];
    if (!style || used.has(style)) style = STYLES.find(s => !used.has(s)) ?? STYLES[0];
    used.add(style);
    synthResult.push({ style, pct: pctVals[i] });
  }
  return { quizResult: synthResult };
}

const QUIZ_PERSIST_KEY = 'ds_quiz_results_v1';

interface StyleQuizScreenProps {
  /** Apply the quiz top style to AI Vision. `navigate` switches tools now (logged-in). */
  onApplyStyle: (style: string, navigate: boolean) => void;
  /** Trigger Google sign-in with a source slug (reuses the page-level attribution). */
  onSignIn: (sourceSlug?: string) => void;
}

/**
 * Self-contained Style Quiz screen (PHASE 1). Owns all quiz state, logic, and the
 * locked UI: a playable logged-out one-pager (mosaic hero → value strip → swipe
 * deck → inline DNA result) and a logged-in 4-state flow (landing / quiz /
 * reading / result). Does NOT depend on StudioTabs — the AI-021 EXPLORER rail can
 * mount it unchanged. Guests play free (D1); Save is greyed + lockchipped (D6);
 * Share + Apply stay available.
 */
const StyleQuizScreen: React.FC<StyleQuizScreenProps> = ({ onApplyStyle, onSignIn }) => {
  const { t, navigateTo } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();

  // Synchronous shared-link parse so the result paints on first frame.
  const sharedInitRef = useRef<{ quizResult: QuizResult } | null | undefined>(undefined);
  if (sharedInitRef.current === undefined) sharedInitRef.current = parseSharedQuizFromUrl();
  const sharedInit = sharedInitRef.current;

  // ── Core quiz state ──
  const [quizSeed, setQuizSeed] = useState(() => Math.floor(Math.random() * 100));
  const generateQuizSequence = useCallback(() => {
    const seq: string[] = [];
    const shuffled = [...STYLES].sort(() => Math.random() - 0.5);
    seq.push(...shuffled);
    while (seq.length < QUIZ_LENGTH) seq.push(STYLES[Math.floor(Math.random() * STYLES.length)]);
    return seq.slice(0, QUIZ_LENGTH).sort(() => Math.random() - 0.5);
  }, []);
  const [quizSequence, setQuizSequence] = useState<string[]>(() => generateQuizSequence());
  const [quizStep, setQuizStep] = useState(0);
  const [quizVotes, setQuizVotes] = useState<Record<string, number>>({});
  const [quizDone, setQuizDone] = useState<boolean>(!!sharedInit);
  const [quizResult, setQuizResult] = useState<QuizResult>(sharedInit?.quizResult ?? []);
  const [quizImageReady, setQuizImageReady] = useState(false);
  const [reading, setReading] = useState(false);
  /** Logged-in only: false until "Start the quiz" (so Landing shows first). */
  const [hasStarted, setHasStarted] = useState(false);
  const [isSampleResult, setIsSampleResult] = useState(false);

  const [voteHistory, setVoteHistory] = useState<Array<{
    step: number; vote: 'love' | 'skip' | 'no'; imageUrl: string; styleChanges: Record<string, number>;
  }>>([]);
  const [lovedRooms, setLovedRooms] = useState<Array<{
    step: number; imageUrl: string; styleChanges: Record<string, number>;
  }>>([]);
  const moodboardRef = useRef<HTMLDivElement>(null);
  const [seenQuizImages, setSeenQuizImages] = useState<Set<string>>(new Set());
  const [resultGalleryImages, setResultGalleryImages] = useState<string[]>([]);

  const [quizSharedView, setQuizSharedView] = useState<boolean>(!!sharedInit);
  const [quizSaveModalOpen, setQuizSaveModalOpen] = useState(false);
  const [signinReason, setSigninReason] = useState<string | null>(null);
  const [quizToast, setQuizToast] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [quizRooms, setQuizRooms] = useState<QuizRooms>(QUIZ_ROOMS_FALLBACK);

  const quizResultSavedRef = useRef(false);
  const quizToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const quizSectionRef = useRef<HTMLDivElement>(null);

  const isGuest = !user && !quizSharedView;
  const isPaid = !!user?.isPaid;

  const showQuizToast = useCallback((msg: string) => {
    setQuizToast(msg);
    if (quizToastTimerRef.current) clearTimeout(quizToastTimerRef.current);
    quizToastTimerRef.current = setTimeout(() => setQuizToast(null), 3200);
  }, []);

  // ── Load full Quiz dataset from Cloudinary (deck + thumbs + mosaic) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          STYLES.map(async (style) => {
            const folder = `Quiz/${styleToCloudinaryFolderName(style)}`;
            const res = await fetch(`/api/images?folder=${encodeURIComponent(folder)}`);
            if (!res.ok) return [style, null] as const;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) return [style, null] as const;
            const sorted = [...data].sort((a: any, b: any) => String(a.public_id || '').localeCompare(String(b.public_id || '')));
            const rooms: QuizRoom[] = sorted
              .map((r: any) => ({ url: String(r.secure_url || r.url || ''), credit: style }))
              .filter((r: QuizRoom) => !!r.url);
            return [style, rooms.length ? rooms : null] as const;
          })
        );
        if (cancelled) return;
        setQuizRooms((prev) => {
          const next: QuizRooms = { ...prev };
          for (const [style, rooms] of entries) if (rooms && rooms.length) next[style] = rooms;
          return next;
        });
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Restore (logged-in only) once auth resolves; GUESTS start fresh each load ──
  // Persistence is a logged-in convenience (cross-navigation). Guests get a new quiz
  // on every page load — clear any prior persisted result and don't restore.
  const restoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || sharedInit) return;
    if (authLoading || restoreAttemptedRef.current) return; // wait for auth; run once
    restoreAttemptedRef.current = true;
    if (!user) {
      try { sessionStorage.removeItem(QUIZ_PERSIST_KEY); } catch { /* blocked */ }
      return;
    }
    try {
      const raw = sessionStorage.getItem(QUIZ_PERSIST_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.quizResult) || parsed.quizResult.length === 0) return;
      setQuizResult(parsed.quizResult);
      if (parsed.quizVotes) setQuizVotes(parsed.quizVotes);
      if (Array.isArray(parsed.lovedRooms)) setLovedRooms(parsed.lovedRooms);
      setQuizDone(true);
    } catch { /* ignore */ }
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist results (logged-in only) so navigating away/back keeps the DNA visible ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return; // guests are session-only — never persisted
    if (!quizDone || quizResult.length === 0 || quizSharedView || isSampleResult) return;
    try {
      sessionStorage.setItem(QUIZ_PERSIST_KEY, JSON.stringify({ quizResult, quizVotes, lovedRooms, ts: Date.now() }));
    } catch { /* quota / blocked */ }
  }, [user, quizDone, quizResult, quizVotes, lovedRooms, quizSharedView, isSampleResult]);

  const getQuizImage = useCallback((style: string, seed: number, step: number): QuizRoom => {
    const imgs = quizRooms[style] || [];
    if (!imgs.length) return { url: '', credit: '' };
    return imgs[(seed + step * 7) % imgs.length];
  }, [quizRooms]);

  const currentQuizStyle = quizSequence[quizStep] || STYLES[0];
  const currentQuizImage = getQuizImage(currentQuizStyle, quizSeed, quizStep);

  // Mosaic tiles — 2 per style, interleaved, from the live dataset (not a hardcoded pool).
  const mosaicTiles = useMemo(() => {
    const perStyle = STYLES.map(s => (quizRooms[s] || []).slice(0, 2));
    const out: string[] = [];
    for (let i = 0; i < 2; i++) for (const arr of perStyle) if (arr[i]) out.push(arr[i].url);
    return out.slice(0, 18);
  }, [quizRooms]);

  // ── Lock voting until the deck image loads ──
  useEffect(() => {
    if (quizDone || reading) return;
    if (!currentQuizImage.url) { setQuizImageReady(true); return; }
    setQuizImageReady(false);
    const unlock = setTimeout(() => setQuizImageReady(true), QUIZ_VOTE_UNLOCK_MS);
    return () => clearTimeout(unlock);
  }, [quizStep, quizSeed, quizSequence, currentQuizImage.url, quizDone, reading]);

  // ── Track seen images (excluded from the result gallery) ──
  useEffect(() => {
    if (currentQuizImage.url && !quizDone) {
      setSeenQuizImages(prev => new Set(prev).add(currentQuizImage.url));
    }
  }, [currentQuizImage.url, quizDone]);

  // ── quiz_start — once per session, when the playable quiz first appears (anon OK, D1) ──
  const quizStartFiredRef = useRef(false);
  useEffect(() => {
    if (quizDone || sharedInit) return;
    const playing = isGuest || hasStarted; // guest one-pager is immediately playable
    if (playing && quizStep === 0 && currentQuizImage.url && !quizStartFiredRef.current) {
      quizStartFiredRef.current = true;
      trackQuizStart();
    }
  }, [quizStep, quizDone, currentQuizImage.url, isGuest, hasStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── quiz_complete — when the DNA result renders (not for shared viewers / samples) ──
  const quizCompleteFiredRef = useRef(false);
  useEffect(() => {
    if (!quizDone) { quizCompleteFiredRef.current = false; return; }
    if (sharedInit || isSampleResult) return;
    if (!quizCompleteFiredRef.current) {
      quizCompleteFiredRef.current = true;
      trackQuizComplete(quizResult[0]?.style);
    }
  }, [quizDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch "more rooms in your style" gallery on completion ──
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

  // ── Auto-scroll loves grid to newest ──
  useEffect(() => {
    const el = moodboardRef.current;
    if (!el || lovedRooms.length === 0) return;
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: 0, behavior: 'smooth' });
    else el.scrollTop = 0;
  }, [lovedRooms.length]);

  // ── Escape closes the save modal / signin veil ──
  useEffect(() => {
    if (!quizSaveModalOpen && signinReason === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setQuizSaveModalOpen(false); setSigninReason(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quizSaveModalOpen, signinReason]);

  useEffect(() => () => {
    if (quizToastTimerRef.current) clearTimeout(quizToastTimerRef.current);
    if (readingTimerRef.current) clearTimeout(readingTimerRef.current);
  }, []);

  const extractCloudinaryPath = (url: string): string => {
    const match = url.match(/Quiz\/[^?]+/);
    return match ? match[0] : '';
  };

  const computeResult = useCallback((votes: Record<string, number>): QuizResult => {
    const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
    const stylesWithVotes = STYLES.filter(s => (votes[s] || 0) > 0);
    const rounded = roundPercentages(stylesWithVotes.map(s => ((votes[s] || 0) / total) * 100));
    return stylesWithVotes.map((s, i) => ({ style: s, pct: rounded[i] })).sort((a, b) => b.pct - a.pct);
  }, []);

  const concludeQuiz = useCallback((finalVotes: Record<string, number>) => {
    const sorted = computeResult(finalVotes);
    setQuizResult(sorted);
    if (user) {
      // Logged-in: cinematic "Reading your taste" dwell before the reveal.
      setReading(true);
      readingTimerRef.current = setTimeout(() => {
        setReading(false);
        setQuizDone(true);
        setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }, READING_MS);
    } else {
      // Guest one-pager: reveal the DNA inline + scroll to it.
      setQuizDone(true);
      setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }, [computeResult, user]);

  const handleQuizVote = (vote: 'love' | 'skip' | 'no') => {
    if (!quizImageReady) return;
    const newVotes = { ...quizVotes };
    const styleChanges: Record<string, number> = {};
    if (vote === 'love') {
      const imagePath = extractCloudinaryPath(currentQuizImage.url);
      const weights = QUIZ_IMAGE_WEIGHTS[imagePath];
      if (weights) {
        styleChanges[weights.primary] = (styleChanges[weights.primary] || 0) + TIER_POINTS.primary;
        for (const s of weights.strong) styleChanges[s] = (styleChanges[s] || 0) + TIER_POINTS.strong;
        for (const s of weights.hint) styleChanges[s] = (styleChanges[s] || 0) + TIER_POINTS.hint;
      } else {
        styleChanges[currentQuizStyle] = TIER_POINTS.primary;
      }
      for (const [s, pts] of Object.entries(styleChanges)) newVotes[s] = (newVotes[s] || 0) + pts;
    }
    setVoteHistory(prev => [...prev, { step: quizStep, vote, imageUrl: currentQuizImage.url, styleChanges }]);
    if (vote === 'love') setLovedRooms(prev => [...prev, { step: quizStep, imageUrl: currentQuizImage.url, styleChanges }]);

    if (quizStep >= QUIZ_LENGTH - 1) {
      setQuizVotes(newVotes);
      concludeQuiz(newVotes);
    } else {
      setQuizImageReady(false);
      setQuizVotes(newVotes);
      setQuizStep(prev => prev + 1);
    }
  };

  const handleQuizBack = () => {
    if (voteHistory.length === 0) return;
    const last = voteHistory[voteHistory.length - 1];
    const newVotes = { ...quizVotes };
    for (const [s, pts] of Object.entries(last.styleChanges)) {
      newVotes[s] = Math.max(0, (newVotes[s] || 0) - pts);
      if (newVotes[s] === 0) delete newVotes[s];
    }
    setVoteHistory(prev => prev.slice(0, -1));
    if (last.vote === 'love') setLovedRooms(prev => prev.slice(0, -1));
    setQuizVotes(newVotes);
    setQuizStep(last.step);
    setQuizImageReady(false);
  };

  const handleQuizEarlyEnd = () => concludeQuiz(quizVotes);

  const startQuiz = () => {
    setHasStarted(true);
    setTimeout(() => quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const handleQuizReset = useCallback(() => {
    if (readingTimerRef.current) clearTimeout(readingTimerRef.current);
    quizResultSavedRef.current = false;
    setQuizStep(0);
    setQuizVotes({});
    setQuizDone(false);
    setQuizResult([]);
    setQuizImageReady(false);
    setReading(false);
    setHasStarted(!!user); // logged-in retake drops back to the playable quiz; guest restarts the one-pager
    setIsSampleResult(false);
    setQuizSeed(Math.floor(Math.random() * 100));
    setQuizSequence(generateQuizSequence());
    setVoteHistory([]);
    setLovedRooms([]);
    setSeenQuizImages(new Set());
    setResultGalleryImages([]);
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(QUIZ_PERSIST_KEY); } catch { /* blocked */ }
    }
  }, [generateQuizSequence, user]);

  const exitSharedView = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}#quiz`);
      try { sessionStorage.removeItem(QUIZ_PERSIST_KEY); } catch { /* blocked */ }
    }
    sharedInitRef.current = null;
    setQuizSharedView(false);
    handleQuizReset();
  }, [handleQuizReset]);

  // Share URL with DNA baked in.
  const buildShareUrl = useCallback((): string => {
    if (typeof window === 'undefined' || quizResult.length === 0) return '';
    const primary = quizResult[0]?.style ?? '';
    const secondary = quizResult[1]?.style ?? '';
    const dna = secondary
      ? `${primary.replace(/\s+/g, '-')}-${secondary.replace(/\s+/g, '-')}`
      : primary.replace(/\s+/g, '-');
    const pcts = quizResult.slice(0, 5).map(r => Math.round(r.pct)).join('-');
    return `${window.location.origin}/ai-concepts?${new URLSearchParams({ dna, pcts }).toString()}`;
  }, [quizResult]);

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
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      showQuizToast(t('ai.quiz.shareToast'));
    } catch { /* cancelled / blocked */ }
  }, [buildShareUrl, quizResult, showQuizToast, t]);

  const handleApply = () => {
    const top = quizResult[0]?.style;
    if (!top) return;
    if (!quizResultSavedRef.current) quizResultSavedRef.current = true;
    if (user) {
      onApplyStyle(top, true); // logged-in: switch to Vision with style applied
    } else {
      onApplyStyle(top, false); // stash style; sign-in needed to enter Vision
      setSigninReason(t('ai.quiz.reason.apply'));
    }
  };

  const handleSaveStyle = () => {
    if (!isPaid) { setQuizSaveModalOpen(true); return; }
    showQuizToast(t('ai.quiz.savedToast'));
  };

  const showSampleResult = () => {
    setQuizResult([
      { style: 'Mid-Century', pct: 38 }, { style: 'Industrial', pct: 24 },
      { style: 'Japandi', pct: 16 }, { style: 'Modern', pct: 13 }, { style: 'Transitional', pct: 9 },
    ]);
    setIsSampleResult(true);
    setQuizDone(true);
  };

  // ── Derived display helpers ──
  const lovedCount = lovedRooms.length;
  const leanStyle = useMemo(() => {
    const tally: Record<string, number> = {};
    lovedRooms.forEach(r => { const k = Object.keys(r.styleChanges)[0]; if (k) tally[k] = (tally[k] || 0) + 1; });
    return Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || '';
  }, [lovedRooms]);
  const canEarlyEnd = lovedCount >= 4 && quizStep >= EARLY_END_MIN_STEP;
  const styleLabel = (s: string) => t(STYLE_KEY(s));

  const marqueeItems = STYLES.map(s => styleLabel(s));

  // ════════════════════════════════════════════════════════════════════════
  // Render pieces
  // ════════════════════════════════════════════════════════════════════════

  const renderDeck = () => (
    <div className="bg-white p-9">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/70">
          {t('ai.quiz.roomOf').replace('{current}', String(quizStep + 1)).replace('{total}', String(QUIZ_LENGTH))}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">{t('ai.quiz.trustGut')}</span>
      </div>
      <div className="h-[3px] bg-black/10 mb-5">
        <div className="h-full bg-[#0047AB] transition-all duration-500" style={{ width: `${((quizStep + 1) / QUIZ_LENGTH) * 100}%` }} />
      </div>

      <div className="deck" style={{ aspectRatio: '16/11' }}>
        <div className="peek p2" />
        <div className="peek p1" />
        <div key={`card-${quizStep}-${quizSeed}`} className="card-in relative w-full h-full overflow-hidden bg-[#0e0e0e]">
          {currentQuizImage.url && (
            <img
              src={cld(currentQuizImage.url, 1200, { crop: 'fill', aspectRatio: '16/11' })}
              srcSet={cldSrcSet(currentQuizImage.url, [768, 1200, 1600], { crop: 'fill', aspectRatio: '16/11' })}
              sizes="(min-width: 1024px) 60vw, 100vw"
              alt={styleLabel(currentQuizStyle)}
              onLoad={() => setQuizImageReady(true)}
              onError={() => setQuizImageReady(true)}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          )}
          <div aria-hidden className={`absolute inset-0 quiz-shimmer pointer-events-none transition-opacity duration-500 ${quizImageReady ? 'opacity-0' : 'opacity-100'}`} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.22) 0%,rgba(0,0,0,0) 32%,rgba(0,0,0,.5) 100%)' }} />
          <span className="badge-dark absolute top-4 left-4 text-[9px] font-bold uppercase tracking-[0.22em] px-3 py-1.5">{styleLabel(currentQuizStyle)}</span>
          <span className="cap absolute bottom-4 right-4 text-[9px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 max-w-[60%] text-right">{t('ai.quiz.deckCap')}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        <button type="button" onClick={() => handleQuizVote('no')} disabled={!quizImageReady}
          className="border border-black/15 text-black/70 text-[12px] font-bold uppercase tracking-[0.14em] py-4 hover:border-black/50 hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed">
          ✕ {t('ai.quiz.notMyStyle')}
        </button>
        <button type="button" onClick={() => handleQuizVote('skip')} disabled={!quizImageReady}
          className="border border-black/15 text-black/55 text-[12px] font-bold uppercase tracking-[0.14em] py-4 hover:border-black/40 transition disabled:opacity-50 disabled:cursor-not-allowed">
          {t('ai.quiz.skip')}
        </button>
        <button type="button" onClick={() => handleQuizVote('love')} disabled={!quizImageReady}
          className="cta-primary text-[12px] font-bold uppercase tracking-[0.18em] py-4 transition disabled:opacity-50 disabled:cursor-not-allowed">
          ✦ {t('ai.quiz.loveIt')}
        </button>
      </div>
      {voteHistory.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <button type="button" onClick={handleQuizBack}
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/50 hover:text-black transition">
            ← {t('ai.quiz.previousRoom')}
          </button>
          <button type="button" onClick={handleQuizReset}
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/50 hover:text-black transition">
            ↻ {t('ai.quiz.startOver')}
          </button>
        </div>
      )}
    </div>
  );

  const renderLoves = () => (
    <div className="bg-white p-9 flex flex-col gap-5" style={{ minHeight: 560 }}>
      <div className="px-6 py-4 text-white" style={{ background: '#0047AB' }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-white/75 mb-1.5">{t('ai.quiz.lovesSoFar')}</p>
        <p className="text-[15px] font-bold tracking-[0.04em]">
          {t('ai.quiz.lovesSummary')
            .replace('{n}', String(lovedCount))
            .replace('{lean}', leanStyle ? styleLabel(leanStyle) : '—')}
        </p>
        <p className="font-display italic text-[19px] leading-snug mt-2 text-white/90">{t('ai.quiz.patternShowing')}</p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/60">{t('ai.quiz.savedRooms')}</span>
          <span className="text-[10px] font-semibold text-black/55 tracking-[0.06em]">{t('ai.quiz.tapRevisit')}</span>
        </div>
        <div ref={moodboardRef} className="grid grid-cols-3 gap-2.5">
          {[...lovedRooms].reverse().slice(0, 9).map((room, i) => (
            <button key={`loved-${i}-${room.step}`} type="button" onClick={() => setLightboxUrl(room.imageUrl)}
              className="relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#0047AB]" style={{ aspectRatio: '1/1' }}>
              <img src={cld(room.imageUrl, 240, { crop: 'fill', aspectRatio: '1/1' })} className="w-full h-full object-cover" alt="Loved room" loading="lazy" />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#0047AB] text-white text-[9px] flex items-center justify-center">♥</span>
            </button>
          ))}
        </div>
        {lovedCount === 0 && <p className="text-[12px] text-black/45 leading-relaxed mt-1">{t('ai.quiz.lovesEmpty')}</p>}
      </div>
      {canEarlyEnd && (
        <div className="mt-auto pt-1 flex flex-col gap-3">
          <button type="button" onClick={handleQuizEarlyEnd}
            className="cta-primary w-full text-[13px] font-bold uppercase tracking-[0.22em] py-4 transition">
            {t('ai.quiz.haveEnough')}
          </button>
          <p className="text-[11px] text-black/60 text-center leading-relaxed">{t('ai.quiz.keepSwiping')}</p>
        </div>
      )}
    </div>
  );

  const renderQuizStage = () => (
    <div ref={quizSectionRef} className="scroll-mt-24">
      <div className="titlehdr">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] kicker mb-1.5">{t('ai.quiz.tryNow')}</p>
          <h2 className="hl text-[34px] md:text-[42px] leading-[1.0] text-black">
            {t('ai.quiz.whichRooms1')} <em className="text-black">{t('ai.quiz.whichRooms2')}</em>
          </h2>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60 pb-1">
          {isGuest ? t('ai.quiz.playingGuest') : t('ai.quiz.alwaysFree')}
        </span>
      </div>
      <div className="grid lg:grid-cols-[58%_42%] items-start" style={{ gap: '1px', background: 'rgba(0,0,0,.08)' }}>
        {renderDeck()}
        {renderLoves()}
      </div>
      <Marquee label={t('ai.quiz.stylesYoullMeet')} items={marqueeItems} />
    </div>
  );

  const renderResult = (opts: { inline?: boolean } = {}) => {
    const top = quizResult[0];
    if (!top) return null;
    const desc = STYLE_DESCRIPTIONS[top.style];
    const rawHero = quizRooms[top.style]?.[0]?.url || DNA_HERO_FALLBACK;
    const heroBg = cld(rawHero, 2000, { crop: 'fill', aspectRatio: '16/9' });
    const breakdown = quizResult.filter(r => r.pct > 0).slice(0, 5);

    return (
      <section ref={resultSectionRef} className={`scroll-mt-24${opts.inline ? ' reveal-up' : ''}`}>
        <StatusHdr
          tone="done"
          label={t('ai.quiz.resultReady')}
          right={
            <button type="button" onClick={quizSharedView ? exitSharedView : handleQuizReset}
              className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/55 border border-black/12 px-3 py-2 hover:border-black/40 hover:text-black transition">
              ↻ {t('ai.quiz.retake')}
            </button>
          }
        />

        {/* cinematic DNA hero */}
        <div className="hero" style={{ height: 'auto', minHeight: 560 }}>
          <div className="hero-media"><img src={heroBg} alt={styleLabel(top.style)} /></div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg,rgba(0,0,0,.80) 0%,rgba(0,0,0,.52) 42%,rgba(0,0,0,.2) 100%)' }} />
          <div className="absolute inset-0 flex items-center py-12">
            <div className="w-full px-10 md:px-16 grid lg:grid-cols-[1fr_360px] gap-10 items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/75 mb-3">{t('ai.quiz.designDNA')}</p>
                <h1 className="hl text-white text-[54px] md:text-[92px] leading-[0.9]">{styleLabel(top.style)}</h1>
                {quizResult[1] && (
                  <p className="hl text-white/85 italic text-[30px] md:text-[40px] leading-tight mt-1">+ {styleLabel(quizResult[1].style)}</p>
                )}
                <span className="block w-20 h-[2px] rule-oxide mt-5 mb-5" />
                {desc && <p className="text-[15px] text-white/85 leading-relaxed max-w-[460px]">{desc.summary}</p>}
                {desc && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {desc.elements.map(el => (
                      <span key={el} className="badge-dark text-[10px] font-bold uppercase tracking-[0.16em] px-3 py-1.5">{el}</span>
                    ))}
                  </div>
                )}
              </div>
              <Glass className="px-7 py-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/75 mb-5">{t('ai.quiz.styleBreakdown')}</p>
                <div className="flex flex-col gap-4">
                  {breakdown.map((r, i) => (
                    <div key={r.style}>
                      <div className={`flex justify-between text-[11px] uppercase tracking-[0.12em] mb-1.5 ${i < 2 ? 'font-bold text-white' : 'font-semibold text-white/70'}`}>
                        <span>{styleLabel(r.style)}</span><span>{Math.round(r.pct)}%</span>
                      </div>
                      <div className="bar"><span style={{ width: `${r.pct}%`, background: i < 2 ? '#0047AB' : 'rgba(255,255,255,.55)' }} /></div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/60 leading-relaxed mt-5">
                  {t('ai.quiz.readFrom').replace('{count}', String(lovedCount || breakdown.length))}
                </p>
              </Glass>
            </div>
          </div>
        </div>

        {/* shared-view banner */}
        {quizSharedView && (
          <div className="bg-[#0047AB] text-white px-10 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em]">{t('ai.quiz.sharedBanner')}</span>
            <button type="button" onClick={exitSharedView}
              className="text-[11px] font-bold uppercase tracking-[0.18em] underline underline-offset-4 hover:text-white/85 transition">
              {t('ai.quiz.takeYourQuiz')}
            </button>
          </div>
        )}

        {/* action bar */}
        <div className="px-10 py-8">
          <div className="flex flex-col gap-3 max-w-[760px] mx-auto">
            <button type="button" onClick={handleApply}
              className="w-full cta-primary text-[13px] font-bold uppercase tracking-[0.22em] py-4 flex items-center justify-center gap-2 transition">
              → {t('ai.quiz.applyStyle').replace('{style}', styleLabel(top.style))}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" onClick={handleShareDna}
                className="border border-black/15 text-black/70 text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:border-black/45 hover:text-black transition">
                ⤴ {t('ai.quiz.share')}
              </button>
              <button type="button" onClick={quizSharedView ? exitSharedView : handleQuizReset}
                className="border border-black/15 text-black/70 text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:border-black/45 hover:text-black transition">
                ↻ {t('ai.quiz.retake')}
              </button>
              {/* SAVE — greyed + lockchip for free (D6); never a sign-in veil */}
              <div className="paid">
                <span className="lockchip">🔒 {t('ai.quiz.lockStudio')}</span>
                <button type="button" onClick={handleSaveStyle}
                  className="w-full border border-black/15 text-black/70 text-[11px] font-bold uppercase tracking-[0.14em] py-3.5 hover:border-black/45 hover:text-black transition">
                  ♥ {t('ai.quiz.saveStyle')}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-black/60 text-center leading-relaxed mt-1">
              {isPaid ? t('ai.quiz.savePaidNote') : t('ai.quiz.saveFreeNote')}
            </p>
          </div>
        </div>

        {/* more rooms in your style */}
        {resultGalleryImages.length > 0 && (
          <section className="bg-[#0a0a0a] text-white px-10 pt-8 pb-14">
            <h3 className="font-display text-[26px] md:text-[28px] leading-tight mb-1">{t('ai.quiz.moreInStyle')}</h3>
            <p className="text-[12px] uppercase tracking-[0.22em] text-white/55 mb-7">
              {t('ai.quiz.moreInStyleCount').replace('{count}', String(resultGalleryImages.length)).replace('{style}', styleLabel(top.style))}
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {resultGalleryImages.map((url, i) => (
                <button key={`gallery-${i}`} type="button" onClick={() => setLightboxUrl(url)}
                  className="relative overflow-hidden aspect-square group focus:outline-none focus:ring-2 focus:ring-[#0047AB]"
                  aria-label={`Open ${top.style} room ${i + 1}`}>
                  <img
                    src={cld(url, 320, { crop: 'fill', aspectRatio: '1/1', quality: 'best' })}
                    srcSet={cldSrcSet(url, [240, 360, 480, 640], { crop: 'fill', aspectRatio: '1/1', quality: 'best' })}
                    sizes="(min-width: 768px) 16vw, 33vw"
                    alt={`${styleLabel(top.style)} room ${i + 1}`} loading="lazy" decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        <ConversionBand
          kicker={t('ai.quiz.conv.kicker')}
          headline={isGuest
            ? (<>{t('ai.quiz.conv.guest1')} <em>{t('ai.quiz.conv.guest2')}</em></>)
            : (<>{t('ai.quiz.conv.user1')} <em>{t('ai.quiz.conv.user2')}</em></>)}
          actions={isGuest ? (
            <>
              <button type="button" onClick={() => setSigninReason(t('ai.quiz.reason.saveStyle'))}
                className="bg-white text-black text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/90 transition">
                {t('ai.quiz.conv.signinSave')}
              </button>
              <button type="button" onClick={() => navigateTo('home')}
                className="border border-white/30 text-white text-sm font-bold uppercase tracking-[0.24em] px-8 py-4 hover:bg-white/10 transition">
                {t('ai.bookConversation')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => navigateTo('home')}
              className="bg-white text-black text-sm font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-white/90 transition">
              {t('ai.quiz.conv.book')}
            </button>
          )}
        />
      </section>
    );
  };

  // ── Logged-out one-pager ──
  const renderLoggedOut = () => {
    const mosaic = (
      <div className="hero-mosaic">
        {mosaicTiles.map((url, i) => (
          <img key={i} src={cld(url, 420, { crop: 'fill', aspectRatio: '1/1' })} alt="" loading="eager" />
        ))}
      </div>
    );
    return (
      <>
        {/* Auth lives in the StudioTopBar masthead; the status row stays status-only. */}
        <StatusHdr tone="ready" label={t('ai.quiz.statusReady')} />
        <StudioHero media={mosaic} scrim={<div className="hero-mosaic-scrim" />} overlay
          style={{ height: '74vh' }}>
          <span className="badge-cobalt absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.quiz.lo.badge')}</span>
          <Glass className="px-10 py-10 md:px-12 md:py-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/70 mb-3">{t('ai.styleQuiz')}</p>
            <h1 className="hl text-[50px] md:text-[72px] leading-[0.94] mb-3">{t('ai.quiz.lo.title1')}<br /><em>{t('ai.quiz.lo.title2')}</em></h1>
            <span className="block w-16 h-[2px] rule-oxide mx-auto mb-5" />
            <p className="text-[14px] text-white/80 leading-relaxed max-w-[410px] mx-auto mb-8">
              {t('ai.quiz.lo.sub')} <span className="text-white font-semibold">{t('ai.quiz.lo.subStrong')}</span>
            </p>
            <button type="button" onClick={() => quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-block cta-primary text-[12px] font-bold uppercase tracking-[0.24em] px-11 py-4 transition">
              {t('ai.quiz.lo.cta')}
            </button>
            <div className="flex items-center justify-center gap-5 mt-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">{t('ai.quiz.lo.note')}</span>
            </div>
          </Glass>
          <span className="cap absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.25em] px-4 py-2 z-10 text-center">{t('ai.quiz.lo.cap')}</span>
        </StudioHero>

        <ValueStrip items={[
          { kicker: t('ai.quiz.vs.k1'), body: t('ai.quiz.vs.b1') },
          { kicker: t('ai.quiz.vs.k2'), body: t('ai.quiz.vs.b2') },
          { kicker: t('ai.quiz.vs.k3'), body: t('ai.quiz.vs.b3Guest') },
        ]} />

        {renderQuizStage()}

        {quizDone && renderResult({ inline: true })}
      </>
    );
  };

  // ── Logged-in 4-state ──
  const renderLoggedIn = () => {
    if (quizDone) return renderResult();
    if (reading) {
      const top = quizResult[0];
      const rawHero = (top && quizRooms[top.style]?.[0]?.url) || DNA_HERO_FALLBACK;
      return (
        <>
          <StatusHdr tone="working" label={t('ai.quiz.readingTitle')} right={
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{t('ai.quiz.readingQuota')}</span>
          } />
          <StudioHero media={<div className="hero-media"><img src={cld(rawHero, 2000, { crop: 'fill', aspectRatio: '16/9' })} alt="" /></div>}
            scrim={<div className="absolute inset-0 bg-black/[0.72]" />}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-8">
              <div className="w-12 h-12 border-2 border-white/15 border-t-white rounded-full animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">
                {t('ai.quiz.readingCount').replace('{n}', String(lovedCount))}
              </p>
              <p className="veilphrase hl text-[30px] md:text-[40px] text-white/95">
                {t('ai.quiz.readingPhrase1')} <em>{t('ai.quiz.readingPhrase2')}</em>
              </p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest">{t('ai.quiz.readingSecs')}</p>
            </div>
          </StudioHero>
        </>
      );
    }
    if (!hasStarted) {
      // Landing (state 0)
      const landingHero = QUIZ_LANDING_HERO;
      return (
        <>
          <StatusHdr tone="ready" label={t('ai.quiz.statusReady')} right={
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{t('ai.quiz.alwaysFree')}</span>
          } />
          <StudioHero media={<div className="hero-media"><img src={cld(landingHero, 2000, { crop: 'fill', aspectRatio: '16/9' })} alt="" /></div>} scrim overlay>
            <span className="badge-cobalt absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.quiz.li.badge')}</span>
            <Glass className="px-10 py-10 md:px-12 md:py-12 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/70 mb-3">{t('ai.styleQuiz')}</p>
              <h1 className="hl text-[52px] md:text-[76px] leading-[0.92] mb-3">{t('ai.quiz.li.title1')}<br /><em>{t('ai.quiz.li.title2')}</em></h1>
              <span className="block w-16 h-[2px] rule-oxide mx-auto mb-5" />
              <p className="text-[14px] text-white/80 leading-relaxed max-w-[400px] mx-auto mb-8">{t('ai.quiz.li.sub')}</p>
              <button type="button" onClick={startQuiz} className="cta-primary text-[12px] font-bold uppercase tracking-[0.24em] px-11 py-4 transition">{t('ai.quiz.li.startCta')}</button>
              <div className="flex items-center justify-center gap-5 mt-5">
                <button type="button" onClick={showSampleResult} className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 border-b border-white/30 pb-0.5 hover:text-white transition">
                  {t('ai.quiz.li.sampleResult')}
                </button>
              </div>
            </Glass>
            <span className="cap absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.25em] px-4 py-2 z-10 text-center">{t('ai.quiz.li.cap')}</span>
          </StudioHero>
          <ValueStrip items={[
            { kicker: t('ai.quiz.vs.k1'), body: t('ai.quiz.vs.b1') },
            { kicker: t('ai.quiz.vs.k2'), body: t('ai.quiz.vs.b2') },
            { kicker: t('ai.quiz.vs.k3'), body: t('ai.quiz.vs.b3User') },
          ]} />
          <Marquee label={t('ai.quiz.stylesYoullMeet')} items={marqueeItems} />
        </>
      );
    }
    // Quiz (state 1)
    return (
      <>
        <StatusHdr tone="ready" label={t('ai.quiz.statusReady')} right={
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{t('ai.quiz.alwaysFree')}</span>
        } />
        {renderQuizStage()}
      </>
    );
  };

  // ── Modals / overlays ──
  const renderSaveModal = () => (
    <AnimatePresence>
      {quizSaveModalOpen && (
        <>
          <motion.div key="save-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} className="fixed inset-0 bg-black/60 z-[80]" onClick={() => setQuizSaveModalOpen(false)} />
          <motion.div key="save-pn" initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[480px] bg-white z-[81] shadow-2xl"
            role="dialog" aria-modal="true">
            <div className="p-7 md:p-8">
              <h3 className="font-display text-[26px] md:text-[28px] font-medium text-black mb-3 leading-tight">{t('ai.quiz.saveModalTitle')}</h3>
              <p className="text-[14px] text-black/75 leading-relaxed mb-7">{t('ai.quiz.saveModalBody')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => { setQuizSaveModalOpen(false); navigateTo('pricing'); }}
                  className="flex-1 px-5 py-3.5 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#003d99] transition">
                  {t('ai.quiz.viewPricing')}
                </button>
                <button type="button" onClick={() => setQuizSaveModalOpen(false)}
                  className="flex-1 sm:flex-none px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-black/65 hover:text-black transition">
                  {t('ai.quiz.maybeLater')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const tier = isPaid ? '' : ' as-free';

  return (
    <div className={`studio-frame${tier} bg-white`}>
      {!authLoading && (quizSharedView ? renderResult() : isGuest ? renderLoggedOut() : renderLoggedIn())}

      <SigninVeil
        open={signinReason !== null}
        onClose={() => setSigninReason(null)}
        onSignIn={() => { onSignIn('quiz_signin'); setSigninReason(null); }}
        kicker={t('ai.quiz.veil.kicker')}
        title={<>{t('ai.quiz.veil.title1')} <em className="italic">{t('ai.quiz.veil.title2')}</em></>}
        lead={t('ai.quiz.veil.lead').replace('{reason}', signinReason || '')}
        note={t('ai.quiz.veil.note')}
        googleLabel={t('ai.quiz.veil.google')}
        fineprint={t('ai.quiz.veil.fine')}
        dismissLabel={t('ai.quiz.veil.dismiss')}
      />

      {renderSaveModal()}

      <AnimatePresence>
        {quizToast && (
          <motion.div key="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }} role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-3 z-[70] text-[11px] font-bold uppercase tracking-[0.22em] shadow-2xl">
            {quizToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox for loved-room / gallery thumbs */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-zoom-out">
            <button onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition text-2xl">✕</button>
            <img src={cld(lightboxUrl, 1600)} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="Full resolution" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StyleQuizScreen;
