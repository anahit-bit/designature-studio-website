import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowRight, CheckCircle2, X, Download, AlertCircle, RefreshCw, FileDown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// GoogleGenAI removed — AI Vision generation is now handled server-side.
import { useLanguage } from '../LanguageContext';
import { useAuth, AuthUser } from '../AuthContext';
import Header from './Header';
import Footer from './Footer';
import RoomAuditExperience from './RoomAuditExperience';
import FeedbackModal from './FeedbackModal';
import AIVisionShowcase from './AIVisionShowcase';
import VisionExperience from './VisionExperience';
import { buildShoppingListPdf } from '../lib/shoppingPdf';
import FeedbackBand from './FeedbackBand';
import ShoppingListShowcase from './ShoppingListShowcase';
import ShoppingExperience from './ShoppingExperience';
import StyleQuizScreen from './StyleQuizScreen';
import ShoppingOfflineCard from './ShoppingOfflineCard';
import RetailerLogoStrip from './RetailerLogoStrip';
import ExplorerRail from './studio/ExplorerRail';
import { ExplorerPanelHeader, ComingSoonPanel } from './studio/ExplorerPanel';
import { EXPLORER_TOOLS, toolById, DEFAULT_TOOL_ID, LIVE_HASH_TO_ID } from './studio/explorerRoster';
import StartHerePanel from './studio/StartHerePanel';
import {
  EMPTY_ROUTER_STATE,
  SCENARIOS,
  hasWorkflow,
  resultForState,
  type QuestionId,
  type RouterState,
} from '../data/studioRouter';
import StudioNudge from './studio/StudioNudge';
import type { StudioTool } from './studio/StudioTabs';
import { cld, cldSrcSet } from '../lib/cld';
import { useShoppingStatus } from '../lib/shoppingStatus';
import { trackCalendly, trackVisionStart, trackShoppingStart } from '../lib/track';
import { trackEvent } from '../lib/analytics';
import { popSigninSource } from '../lib/signinSource';

const CALENDLY_URL = 'https://calendly.com/hello-designature/quick-conversation';
/** Where a guest's in-progress workflow is kept for the session. */
const ROUTER_KEY = 'ds_studio_router_v2';

/** Free tier: max generated concepts in the UI row (paid tier can be raised later). */
const FREE_TIER_MAX_CONCEPT_SLOTS = 3;

// All styles available in AI Vision chip selector (superset of quiz styles)
const VISION_STYLES = [
  'Warm Contemporary', 'Japandi', 'Modern', 'Mid-Century', 'Bohemian', 'Rustic', 'Art Deco',
  'Industrial', 'Coastal', 'Minimalist', 'Maximalist', 'Dopamine', 'Biophilic'
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
  const { language, t, navigateTo, setNavGuard } = useLanguage();

  // Go to /pricing and land on the plan cards (not the hero). PricingPage reads this flag
  // once on mount (see PRICING_SCROLL_KEY there) and scrolls to #pricing-plans.
  const goToPricingPlans = () => {
    try { sessionStorage.setItem('ds_pricing_scroll', 'plans'); } catch { /* ignore */ }
    navigateTo('pricing');
  };

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
  // AI-029 Phase 1.5 — soft warning when the uploaded photo shows only one wall
  // (head-on), where the generator can't hold the real proportions. Non-blocking.
  const [roomStructureWarning, setRoomStructureWarning] = useState(false);
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
  /** Free-tier: identified-but-not-searched items (names only) → upgrade teaser. */
  const [shoppingTeaser, setShoppingTeaser] = useState<{ category: string; label: string }[]>([]);
  /** Total items identify enumerated (searched + teaser). */
  const [shoppingTotalIdentified, setShoppingTotalIdentified] = useState<number>(0);
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

  // ── Shopping result persistence (session-scoped, all tiers) ──
  // A completed search is snapshotted to sessionStorage so it survives Edit,
  // navigation, and reload for the whole browser-tab session — free users too.
  // The snapshot is tagged with the user's identity so it never shows for a
  // different account; cleared only by "Start over" (or closing the tab). The
  // RESTORE runs in a separate effect below the account-reset effect (declaration
  // order matters) so login (null→email) doesn't wipe it.
  const SHOP_SNAPSHOT_KEY = 'ds_shopping_snapshot_v1';
  useEffect(() => {
    try {
      if (shoppingDone && shoppingResults.length > 0) {
        sessionStorage.setItem(SHOP_SNAPSHOT_KEY, JSON.stringify({
          identity: user?.email ?? null,
          done: true,
          results: shoppingResults,
          teaser: shoppingTeaser,
          total: shoppingTotalIdentified,
          country: shoppingCountry,
          sourceImage: searchSourceImage,
          sourceStandalone: searchSourceIsStandalone,
        }));
      }
    } catch { /* sessionStorage full / unavailable — non-fatal */ }
  }, [shoppingDone, shoppingResults, shoppingTeaser, shoppingTotalIdentified, shoppingCountry, searchSourceImage, searchSourceIsStandalone]);

  // ── Quiz → AI Vision DNA handoff ──
  // The Style Quiz screen owns its own state but persists the DNA result to
  // sessionStorage. The parent reads it from there so VisionExperience can show
  // the "apply your DNA" banner + pre-highlight the matching style chip.
  const readPersistedQuizResult = useCallback((): { style: string; pct: number }[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem('ds_quiz_results_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.quizResult) ? parsed.quizResult : [];
    } catch { return []; }
  }, []);
  const [quizResultForVision, setQuizResultForVision] = useState<{ style: string; pct: number }[]>(() => readPersistedQuizResult());

  // AI-021 EXPLORER — `selectedId` (a roster slug) is the source of truth for which
  // rail card is open. `activeTool` (one of the 4 live tools) is DERIVED from it and
  // still drives every live tool-content block below. A non-live selection keeps
  // activeTool at its last live value while the Coming-Soon panel renders instead.
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_TOOL_ID;
    // Shared-link arrivals (quiz result) always land on Find My Style.
    const params = new URLSearchParams(window.location.search);
    if (params.get('dna') && params.get('pcts')) return 'find-style';
    const h = window.location.hash.replace(/^#/, '');
    if (toolById(h)) return h;                              // new explorer slug
    if (h in LIVE_HASH_TO_ID) return LIVE_HASH_TO_ID[h as StudioTool]; // legacy #quiz/#vision/#shopping/#audit
    return DEFAULT_TOOL_ID;
  });
  const [activeTool, setActiveTool] = useState<StudioTool>(() => {
    return toolById(selectedId)?.liveTool ?? 'vision';
  });
  // Refresh the Quiz→Vision DNA snapshot whenever the user lands on AI Vision.
  useEffect(() => {
    if (activeTool === 'vision') setQuizResultForVision(readPersistedQuizResult());
  }, [activeTool, readPersistedQuizResult]);
  const [auditComplete, setAuditComplete] = useState(false);
  const [auditProcessing, setAuditProcessing] = useState(false);
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

  // ── Reset ALL ephemeral tool state. Used on mount (fresh start) AND whenever
  //    the signed-in identity changes, so one user's concepts / shopping list
  //    never leak to the next account (the latter was a real cross-account bug).
  const resetEphemeralState = useCallback(() => {
    // AI Vision
    setInspirationImages([]);
    setRoomImage(null);
    setRoomStructureWarning(false);
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
    setShoppingTeaser([]);
    setShoppingTotalIdentified(0);
    setShoppingOffline(null);
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

  // Fresh start on mount (load / navigate).
  useEffect(() => { resetEphemeralState(); }, [resetEphemeralState]);

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

  // ── Clear ALL per-user tool state whenever the signed-in IDENTITY changes
  //    (login, logout, OR switching accounts). Keyed on email — NOT the `user`
  //    object, which also changes on every quota refresh (that must not wipe a
  //    live result). Fixes one account's shopping list leaking to the next.
  const lastIdentityRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const identity = user?.email ?? null;
    if (lastIdentityRef.current === undefined) { lastIdentityRef.current = identity; return; }
    if (lastIdentityRef.current === identity) return;
    lastIdentityRef.current = identity;
    resetEphemeralState();
  }, [user, resetEphemeralState]);

  // ── Restore a persisted shopping search for the CURRENT identity ──
  // Declared AFTER the account-reset effect so on login (null→email) it runs
  // last and re-applies the snapshot the reset just cleared. The identity tag
  // keeps one account's list from showing for another. Guarded so a quota
  // refresh (same email, new `user` object) doesn't re-restore over live edits.
  const shopRestoredForRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const identity = user?.email ?? null;
    if (shopRestoredForRef.current === identity) return;
    shopRestoredForRef.current = identity;
    try {
      const raw = sessionStorage.getItem(SHOP_SNAPSHOT_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && s.done && (s.identity ?? null) === identity && Array.isArray(s.results) && s.results.length > 0) {
        setShoppingResults(s.results);
        setShoppingTeaser(Array.isArray(s.teaser) ? s.teaser : []);
        setShoppingTotalIdentified(typeof s.total === 'number' ? s.total : s.results.length);
        setSearchSourceImage(s.sourceImage || null);
        setSearchSourceIsStandalone(!!s.sourceStandalone);
        // Seed the source image so an "Edit search" lands on the Entry view (with
        // the image + a "Back to your list" button), not the empty Landing view.
        if (s.sourceImage) setStandaloneShoppingImage(s.sourceImage);
        if (typeof s.country === 'string') setShoppingCountry(s.country);
        setShoppingDone(true);
      }
    } catch { /* ignore corrupt snapshot */ }
  }, [user]);

  // ── Warn before leaving if a generation is running or there are unsaved concepts ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing || results.length > 0 || sessionConceptArchive.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing, results, sessionConceptArchive]);

  // ── Guard in-app navigation while an AI Vision generation is running, so leaving
  //    the page (header nav, logo, "My account") doesn't silently discard it. The
  //    rail already blocks tool-switching mid-generation; this covers leaving entirely.
  useEffect(() => {
    setNavGuard(
      isProcessing
        ? 'A design is still generating — if you leave now you’ll lose it. Leave anyway?'
        : null,
    );
    return () => setNavGuard(null);
  }, [isProcessing, setNavGuard]);

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
    // The identity-change effect also clears state, but reset here for immediacy.
    resetEphemeralState();
  }, [signOut, resetEphemeralState]);

  // ── AI-021 EXPLORER selection ──────────────────────────────────────────
  /** Switch to a LIVE tool from inside the page (e.g. quiz→vision handoff,
   *  "Shop this room"). Keeps the rail selection in sync with activeTool. */
  const goToLiveTool = useCallback((lt: StudioTool) => {
    setActiveTool(lt);
    setSelectedId(LIVE_HASH_TO_ID[lt]);
  }, []);

  /**
   * Is there a finished result on screen that leaving would throw away? Free users
   * have no dashboard, so switching tools silently is how their work disappears.
   * Saved-to-Library state is per-tool and not tracked here, so this deliberately
   * over-asks rather than under-asks.
   */
  const unsavedResultWarning = useCallback((): string | null => {
    if (activeTool === 'vision' && (results.length > 0 || sessionConceptArchive.length > 0)) {
      return 'You have concepts on screen that aren’t saved. Leaving this tool will clear them. Continue?';
    }
    if (activeTool === 'shopping' && shoppingDone && shoppingResults.length > 0) {
      return 'Your shopping list isn’t saved. Leaving this tool will clear it. Continue?';
    }
    if (activeTool === 'audit' && auditComplete) {
      return 'Your room report isn’t saved. Leaving this tool will clear it. Continue?';
    }
    return null;
  }, [activeTool, results, sessionConceptArchive, shoppingDone, shoppingResults, auditComplete]);

  /**
   * AI-032 v2 — the "Start here" survey replaces the panel body when open. Kept as
   * its own flag rather than a magic `selectedId`, so every existing code path that
   * assumes selectedId is a real roster slug keeps working untouched.
   */
  const [showStartHere, setShowStartHere] = useState(false);

  /**
   * The router state lives HERE, not inside the panel, because the rail has to
   * render the same workflow — "after the plan is generated the left pane must
   * show the plan". One owner, two readers, no chance of them disagreeing.
   */
  const [routerState, setRouterState] = useState<RouterState>(() => {
    try {
      const raw = sessionStorage.getItem(ROUTER_KEY);
      return raw ? (JSON.parse(raw) as RouterState) : EMPTY_ROUTER_STATE;
    } catch {
      return EMPTY_ROUTER_STATE; // private mode — the router just won't resume
    }
  });

  useEffect(() => {
    try { sessionStorage.setItem(ROUTER_KEY, JSON.stringify(routerState)); }
    catch { /* storage blocked — everything still works, it just won't resume */ }
  }, [routerState]);

  const routerResult = useMemo(() => resultForState(routerState), [routerState]);
  const workflowReady = hasWorkflow(routerState);

  /** Picking an identity by name fills its answers AND locks the scenario. */
  const pickScenario = useCallback((scenarioId: string) => {
    const sc = SCENARIOS.find((x) => x.id === scenarioId);
    if (!sc) return;
    setRouterState({ pickedId: scenarioId, answers: { ...sc.prefill } });
  }, []);

  const answerQuestion = useCallback((id: QuestionId, value: string) => {
    setRouterState((prev) => ({ ...prev, answers: { ...prev.answers, [id]: value } }));
  }, []);

  const resetRouter = useCallback(() => setRouterState(EMPTY_ROUTER_STATE), []);

  const openStartHere = useCallback(() => {
    setShowStartHere(true);
    // No unsaved-work prompt here: the survey only swaps the panel body, and the
    // tool's results live in page state, so coming back restores them intact.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);


  /** Rail card click. Live cards drive activeTool; non-live cards just open the
   *  Coming-Soon panel. Blocked mid-generation so we never drop a running job,
   *  and confirmed first when a finished-but-unsaved result is on screen. */
  const handleSelectTool = useCallback((id: string) => {
    const tool = toolById(id);
    if (!tool || isProcessing) return;
    if (id !== selectedId) {
      const warning = unsavedResultWarning();
      if (warning && !window.confirm(warning)) return;
    }
    setSelectedId(id);
    if (tool.liveTool) setActiveTool(tool.liveTool);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [isProcessing, selectedId, unsavedResultWarning]);


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
        // AI-029 Phase 1.5 — soft single-wall pre-check (non-blocking). Reset
        // first, then flag only if the analysis confirms a head-on one-wall shot.
        setRoomStructureWarning(false);
        apiFetch('/api/ai-vision/analyze-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomPhoto: dataUrl }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d?.singleWall) setRoomStructureWarning(true); })
          .catch(() => { /* non-fatal — a failed pre-check never blocks upload */ });
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

      // A-004/I-023 — GA4 engagement events (client-side, env-gated). Sample runs
      // don't consume quota, so they can't have "burned" the user to 0.
      trackEvent('ai_vision_completed');
      if (!isSampleRun && data.generationsLeft === 0) {
        trackEvent('quota_burned', { tool: 'ai_vision' });
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
    setRoomStructureWarning(false);
    setSelectedStyle('');
    setSelectedRoom('');
    setError(null);
    setValidationError(null);
    setShoppingResults([]);
    setShoppingItems([]);
    setShoppingDone(false);
    setShoppingError(null);
    setStandaloneShoppingImage(null);
    variationSeedRef.current = 0;
  };

  // ── Edit — return to the setup screen keeping the room, inspirations, and
  //    style/room selections, so the user can change the style and regenerate
  //    without re-uploading the photo (vs Reset, which clears everything).
  const handleEdit = () => {
    if (results.length > 0 && !lastGenWasSampleRef.current) {
      setSessionConceptArchive((prev) => {
        const next = [...prev];
        for (const r of results) {
          if (!next.includes(r)) next.push(r);
        }
        return next;
      });
    }
    lastGenWasSampleRef.current = false;
    setResults([]); // drops State 3 (results) → State 2 (setup)
    setSelectedConceptIndex(0);
    setError(null);
    setValidationError(null);
    setShoppingResults([]);
    setShoppingItems([]);
    setShoppingDone(false);
    setShoppingError(null);
    variationSeedRef.current = 0;
    // roomImage, inspirationImages, selectedStyle, selectedRoom are retained.
  };

  // ── Shopping search ──
  // ── PDF Download ──
  const handleDownloadShoppingPDF = async () => {
    // Shared builder (lib/shoppingPdf) — same document for fresh + saved lists,
    // with the brand logo + aspect-correct hero.
    await buildShoppingListPdf(shoppingResults, {
      conceptImage: allSessionConcepts[selectedConceptIndex],
    });
  };

  // ── Apply the quiz's top style to AI Vision (handoff target for StyleQuizScreen) ──
  const handleApplyQuizStyle = useCallback((style: string, navigate: boolean) => {
    if (style) setSelectedStyle(style);
    setQuizResultForVision(readPersistedQuizResult());
    if (navigate) {
      goToLiveTool('vision');
      setTimeout(() => {
        document.getElementById('ai-concepts-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, []);

  const handleShoppingSearch = async (overrideItems?: any[], forceStandalone?: boolean, budgetOpts?: { budgetLevel?: string; roomCap?: number | null; scopeIds?: string[] | null }) => {
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
        // budgetLevel + roomCap are passed through for the search session (#12) to act on
        // (retailer-tier routing); the server currently accepts + ignores them.
        body: JSON.stringify({
          items: itemsToSearch,
          country: shoppingCountry,
          budgetLevel: budgetOpts?.budgetLevel,
          roomCap: budgetOpts?.roomCap ?? null,
          // #12 P3d — PAID "Find" pre-search scope (taxonomy ids, or null = all).
          scopeIds: budgetOpts?.scopeIds ?? null,
        }),
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
      setShoppingResults(data.searched || data.results || []);
      setShoppingTeaser(Array.isArray(data.teaser) ? data.teaser : []);
      setShoppingTotalIdentified(typeof data.totalIdentified === 'number' ? data.totalIdentified : (data.searched || data.results || []).length);
      setShoppingDone(true);
      if (typeof data.shoppingListsLeft === 'number') {
        setUser((prev) => (prev ? { ...prev, shoppingListsLeft: data.shoppingListsLeft } : null));
      }
      // A-004/I-023 — GA4 engagement events (client-side, env-gated).
      trackEvent('ai_shopping_completed', { item_count: Array.isArray(data.results) ? data.results.length : 0 });
      if (data.shoppingListsLeft === 0) trackEvent('quota_burned', { tool: 'ai_shopping' });
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
    goToLiveTool('shopping');
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
    goToLiveTool('shopping');
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
  // AI-021 — the selected roster tool + whether it's one of the 4 live experiences.
  const selectedTool = toolById(selectedId) ?? EXPLORER_TOOLS.find((tl) => tl.id === DEFAULT_TOOL_ID)!;
  const isLiveSelected = !!selectedTool.liveTool;

  // "Used this session" — LIVE tools the user has actually run this run, derived from
  // existing in-session signals. Drives the rail's "✓ Used" marker. Client-side only,
  // resets with the session / on identity change. (Per-tool COUNTS + per-project
  // journey history are the separate journey-diagram feature, logged as a ticket.)
  const usedTools = useMemo(() => {
    const s = new Set<string>();
    if (quizResultForVision.length > 0) s.add('find-style');
    if (allSessionConcepts.length > 0) s.add('redesign');
    if (shoppingDone || shoppingResults.length > 0) s.add('shop');
    if (auditComplete) s.add('score-room');
    return s;
  }, [quizResultForVision, allSessionConcepts, shoppingDone, shoppingResults, auditComplete]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />

      {/* Someone still scrolling the rail after a while has told us, by that act,
          that they have not found their card. Offered once, from the corner. */}
      {!showStartHere && (
        <StudioNudge onOpen={openStartHere} busy={isProcessing || auditProcessing} />
      )}

      {/* ── AI-021 EXPLORER shell: dark card rail (left) + auth-aware panel (right) ── */}
      <div id="ai-concepts-tools" className="pt-24 scroll-mt-24 lg:flex lg:items-start">
        <ExplorerRail
          selectedId={selectedId}
          onSelect={(id) => { setShowStartHere(false); handleSelectTool(id); }}
          usedIds={usedTools}
          onStartHere={openStartHere}
          startHereOn={showStartHere}
          workflow={workflowReady ? routerResult : null}
          onOpenStep={(id) => { setShowStartHere(false); handleSelectTool(id); }}
          onChangeWorkflow={openStartHere}
          onClearWorkflow={resetRouter}
        />
        <div className="flex-1 min-w-0 flex flex-col bg-white lg:min-h-[calc(100vh-6rem)]">
          {!showStartHere && (
          <ExplorerPanelHeader
            tool={selectedTool}
            user={user}
            authLoading={authLoading}
            onLogout={handleLogout}
            unlimitedLabel={t('ai.unlimited')}
            remainingLabel={t('ai.remaining')}
            unlockAllLabel={t('ai.unlockAll')}
            noCardLabel={t('ai.noCard')}
          />
          )}

          {/* ── LIVE tool experiences (unchanged) render for the 4 shipped tools;
                 the 12 not-yet-built tools fall through to <ComingSoonPanel/> below. ── */}
          {showStartHere ? (
            <StartHerePanel
              state={routerState}
              onPick={pickScenario}
              onAnswer={answerQuestion}
              onReset={resetRouter}
              onOpenTool={(id) => { setShowStartHere(false); handleSelectTool(id); }}
              onBookCall={() => window.open(CALENDLY_URL, '_blank', 'noopener')}
            />
          ) : isLiveSelected ? (
          <>
          {/* AI-021 — the old cobalt "active tool" stripe is now the ExplorerPanelHeader. */}

      {/* ── AI VISION SHOWCASE (logged-out) ── */}
      {!authLoading && !user && activeTool === 'vision' && (
        <AIVisionShowcase onRequestLogin={() => triggerGoogleSignIn()} onOpenFeedback={() => setFeedbackOpen(true)} />
      )}

      {/* ── AI VISION EXPERIENCE (logged-in, AI-023 Variant D) ── */}
      {!authLoading && user && activeTool === 'vision' && (
        <VisionExperience
          onGoToTool={handleSelectTool}
          roomImage={roomImage}
          structureWarning={roomStructureWarning}
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
          handleEdit={handleEdit}
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
          quizResult={quizResultForVision}
          quizDone={quizResultForVision.length > 0}
          isPaid={user?.isPaid ?? false}
          navigateTo={navigateTo}
          setFeedbackOpen={setFeedbackOpen}
          shopCurrentConcept={shopCurrentConcept}
          onShopThisRoom={(conceptUrl) => {
            if (!user) { triggerGoogleSignIn(); return; }
            // Reset Shopping to a fresh ENTRY (no results, no auto-search)…
            setShoppingResults([]);
            setShoppingItems([]);
            setShoppingTeaser([]);
            setShoppingTotalIdentified(0);
            setShoppingDone(false);
            setShoppingError(null);
            setShoppingLoading(false);
            setForceStandaloneUpload(false);
            // …then load the generated concept as the Shopping source image.
            setStandaloneShoppingImage(conceptUrl);
            setSearchSourceImage(conceptUrl);
            setSearchSourceIsStandalone(false);
            goToLiveTool('shopping');
            setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 50);
          }}
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

      {/* ── SHOPPING LIST EXPERIENCE (logged-in, locked 4-state) ──
           Self-contained panel; the identify→search→PDF pipeline + offline
           guardrails stay in this file and are passed in as handlers/state. */}
      {!authLoading && user && activeTool === 'shopping' && (
        <ShoppingExperience
          onGoToTool={handleSelectTool}
          user={user}
          shoppingResults={shoppingResults}
          shoppingTeaser={shoppingTeaser}
          shoppingTotalIdentified={shoppingTotalIdentified}
          shoppingItems={shoppingItems}
          shoppingLoading={shoppingLoading}
          shoppingError={shoppingError}
          shoppingDone={shoppingDone}
          shoppingOffline={shoppingOffline}
          standaloneShoppingImage={standaloneShoppingImage}
          searchSourceImage={searchSourceImage}
          searchSourceIsStandalone={searchSourceIsStandalone}
          selectedConceptUrl={selectedConceptUrl}
          shoppingCountry={shoppingCountry}
          setShoppingCountry={setShoppingCountry}
          onStartOver={() => {
            setShoppingResults([]);
            setShoppingTeaser([]);
            setShoppingTotalIdentified(0);
            setShoppingItems([]);
            setShoppingDone(false);
            setShoppingError(null);
            setStandaloneShoppingImage(null);
            setForceStandaloneUpload(false);
            setSearchSourceImage(null);
            try { sessionStorage.removeItem(SHOP_SNAPSHOT_KEY); } catch { /* ignore */ }
          }}
          onEditSearch={() => {
            // Return to Step-1 (Entry) preserving inputs (image, country, Find cats,
            // budget — Find/budget are local to ShoppingExperience so they persist).
            // Results are KEPT in state + the session snapshot, so the user can return
            // to them via "Back to your list" without re-running (which costs a list).
            // TODO(#12/#11): incremental re-search of only newly-added categories.
            setShoppingDone(false);
          }}
          onBackToResults={() => setShoppingDone(true)}
          processShoppingFile={processShoppingFile}
          handleShopDrop={handleShopDrop}
          runSearch={(opts) => {
            // A standalone image the user uploaded in the Shopping entry ALWAYS wins —
            // even if a prior AI Vision concept is still in the session. (Bug: after
            // "Start over" the old concept lingered in allSessionConcepts, so a newly
            // uploaded image was ignored and the search re-analyzed the old concept.)
            // Coming from AI Vision "Shop this concept" nulls standaloneShoppingImage,
            // so that path still correctly shops the concept.
            const standalone = !!standaloneShoppingImage;
            setSearchSourceImage(standalone ? standaloneShoppingImage : selectedConceptUrl);
            setSearchSourceIsStandalone(standalone);
            void handleShoppingSearch(undefined, standalone, opts);
          }}
          fetchAlternate={async (item, excludeSources) => {
            try {
              const r = await apiFetch('/api/shopping/alternate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item, country: shoppingCountry, excludeSources }),
              });
              const d = await r.json();
              if (!r.ok) return null;
              return d.product ?? null;
            } catch { return null; }
          }}
          handleDownloadShoppingPDF={handleDownloadShoppingPDF}
          navigateTo={navigateTo}
        />
      )}

      {/* ── ROOM AUDIT EXPERIENCE (logged-in PAID, locked 4-state) ──
           Self-contained .studio-frame panel mounted beside Vision/Shopping. Owns its own
           upload→analyze→report pipeline. Free + logged-out keep the in-studio paid landing
           below. FeedbackBand is preserved here (it used to sit under the old RoomAudit). */}
      {!authLoading && user?.isPaid && activeTool === 'audit' && (
        <>
          <RoomAuditExperience
            user={user}
            onProcessingChange={setAuditProcessing}
            onAuditComplete={async () => {
              setAuditComplete(true);
              await refreshQuota();
            }}
            onRedesignWithVision={(auditedRoom) => {
              // Preload the audited room as AI Vision's source room (no auto-generate).
              setRoomImage(auditedRoom);
              const img = new Image();
              img.onload = () => {
                const ratio = img.width / img.height;
                setRoomAspectRatio(`${img.width}/${img.height}`);
                let ar: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
                if (ratio > 1.5) ar = '16:9';
                else if (ratio > 1.2) ar = '4:3';
                else if (ratio > 0.8) ar = '1:1';
                else if (ratio > 0.6) ar = '3:4';
                else ar = '9:16';
                setApiAspectRatio(ar);
              };
              img.src = auditedRoom;
              goToLiveTool('vision');
              setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 50);
            }}
            navigateTo={navigateTo}
          />
          {/* Persistent feedback band — bottom of Room Audit (AI-023 G) */}
          <FeedbackBand onOpenFeedback={() => setFeedbackOpen(true)} />
        </>
      )}

      {/* ── ROOM AUDIT — in-studio paid landing (free OR logged-out; NOT a pricing redirect) ──
           Matches WEBSITE-PLAN-room-audit-paid-landing.html. Design+ users get the real tool
           (rendered in the main two-column below). */}
      {!authLoading && activeTool === 'audit' && !user?.isPaid && (
        <div className="bg-[#0a0a0a] text-white border-t border-black/10">
          <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-12">
            <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-start">

              {/* LEFT — sample audit output (sells the value) */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E5E41] mb-4">{t('ai.audit.sampleKicker')}</p>
                <div className="relative overflow-hidden border border-white/10" style={{ aspectRatio: '4/3' }}>
                  <img
                    src={cld('https://res.cloudinary.com/dys2k5muv/image/upload/v1774950187/12_iwshvs.jpg', 1200, { crop: 'fill', aspectRatio: '4/3' })}
                    alt={t('ai.audit.sampleKicker')}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.35))' }} />
                  {/* overall score */}
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-4 py-3 flex items-center gap-3">
                    <div className="font-display text-[34px] leading-none text-white">7.4</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 leading-tight">{t('ai.audit.overallScore')}</div>
                  </div>
                  {/* annotation pins */}
                  <span className="absolute flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#0047AB] text-white text-[12px] font-bold border-2 border-white/85 shadow-[0_6px_18px_rgba(0,0,0,.5)]" style={{ top: '30%', left: '22%' }}>1</span>
                  <span className="absolute flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#0047AB] text-white text-[12px] font-bold border-2 border-white/85 shadow-[0_6px_18px_rgba(0,0,0,.5)]" style={{ top: '58%', left: '62%' }}>2</span>
                  <span className="absolute flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#0047AB] text-white text-[12px] font-bold border-2 border-white/85 shadow-[0_6px_18px_rgba(0,0,0,.5)]" style={{ top: '74%', left: '34%' }}>3</span>
                </div>
                {/* pin notes */}
                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  <div className="border border-white/10 p-3">
                    <div className="text-[10px] font-bold text-[#9E5E41] mb-1">① {t('ai.audit.pin1Title')}</div>
                    <div className="text-[12px] text-white/70 leading-snug">{t('ai.audit.pin1Note')}</div>
                  </div>
                  <div className="border border-white/10 p-3">
                    <div className="text-[10px] font-bold text-[#9E5E41] mb-1">② {t('ai.audit.pin2Title')}</div>
                    <div className="text-[12px] text-white/70 leading-snug">{t('ai.audit.pin2Note')}</div>
                  </div>
                  <div className="border border-white/10 p-3">
                    <div className="text-[10px] font-bold text-[#9E5E41] mb-1">③ {t('ai.audit.pin3Title')}</div>
                    <div className="text-[12px] text-white/70 leading-snug">{t('ai.audit.pin3Note')}</div>
                  </div>
                </div>
              </div>

              {/* RIGHT — the pitch + CTAs */}
              <div>
                <span className="inline-block text-[9px] font-bold uppercase tracking-[0.22em] bg-[#0047AB] text-white px-3 py-1.5 mb-5">{t('ai.audit.badge')}</span>
                <h2 className="font-display text-[48px] md:text-[56px] leading-[0.95] mb-3">{t('ai.roomAudit')}</h2>
                <p className="text-[15px] text-white/75 leading-relaxed mb-6">
                  {t('ai.audit.valueLine')}<span className="text-white font-semibold">{t('ai.audit.valueLineBold')}</span>
                </p>

                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55 mb-3">{t('ai.audit.scoredAcross')}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
                  {[
                    [t('ai.audit.metricLayout'), 6],
                    [t('ai.audit.metricLighting'), 8],
                    [t('ai.audit.metricColour'), 7],
                    [t('ai.audit.metricProportion'), 6],
                    [t('ai.audit.metricMaterials'), 8],
                    [t('ai.audit.metricStyling'), 7],
                  ].map(([label, score]) => (
                    <div key={label as string} className="flex items-center gap-2.5">
                      <span className="text-[12px] text-white/80 flex-1">{label}</span>
                      <span className="w-16 h-[5px] bg-white/15 overflow-hidden">
                        <span className="block h-full" style={{ width: `${(score as number) * 10}%`, background: (score as number) >= 8 ? '#0047AB' : '#9E5E41' }} />
                      </span>
                      <span className="text-[11px] font-bold text-white/60 w-7 text-right">{score}/10</span>
                    </div>
                  ))}
                </div>

                {/* Primary CTA is auth-aware: logged-out → sign in (like the other tools'
                    logged-out states); free logged-in → upgrade. Secondary always → pricing. */}
                <button
                  type="button"
                  onClick={() => (user ? goToPricingPlans() : triggerGoogleSignIn())}
                  className="inline-flex items-center justify-center gap-3 w-full bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.22em] px-7 py-4 mb-3 hover:bg-[#003d99] transition-colors"
                >
                  {user ? t('ai.audit.upgradeCta') : t('ai.audit.signInCta')} →
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goToPricingPlans}
                    className="flex-1 border border-white/25 text-white/80 text-[11px] font-bold uppercase tracking-[0.16em] py-3.5 hover:border-white/60 hover:text-white transition"
                  >
                    {user ? t('ai.audit.seeSample') : t('ai.audit.seePlans')}
                  </button>
                </div>
                <p className="text-[11px] text-white/50 mt-4 leading-relaxed">
                  {user ? t('ai.audit.ctaNoteFree') : t('ai.audit.ctaNoteOut')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN TWO-COLUMN ──
           During the quiz RATING step, drop flex-grow and minHeight so the
           working area sizes to its content and the feedback CTA sits close
           below it. For ALL quiz steps (rating and result) drop the viewport
           height chain — other tools keep flex-grow + minHeight:'75vh'. */}
      <div className={`flex flex-col border-t border-black/10${(activeTool === 'vision' || activeTool === 'shopping' || activeTool === 'audit') ? ' hidden' : ''}${activeTool !== 'quiz' ? ' flex-grow' : ''}`}>
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
                        onClick={(e) => { e.preventDefault(); trackCalendly(CALENDLY_URL, 'ai_vision_quota'); }}
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

          {/* 04 Room Audit (paid) now renders top-level as <RoomAuditExperience/> above —
              the locked 4-state panel mirrors Vision/Shopping, so the two-column shell is
              hidden for activeTool==='audit'. */}

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
                    'Independent picks — we may earn a small commission',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center bg-[#22c55e] text-white text-[9px] font-bold rounded-full">✓</span>
                      <span className="text-[13px] text-black/70 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-black/45 leading-snug mt-3">Some retailer links may earn us a commission at no extra cost to you. It never changes what we recommend.</p>
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

              {/* Feedback CTA — lives here in the empty state */}
              <button
                onClick={() => setFeedbackOpen(true)}
                className="mt-8 inline-flex items-center gap-2 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-[#003d99] transition-colors duration-200"
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
                  <div className="w-2 h-2 rounded-full bg-[#15803d]" />
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

              {/* ══ STYLE QUIZ (self-contained screen — PHASE 1 redesign) ══ */}
              {activeTool === 'quiz' && (
                <StyleQuizScreen onApplyStyle={handleApplyQuizStyle} onSignIn={triggerGoogleSignIn} onGoToTool={handleSelectTool} />
              )}

              {/* ══ SHOP THIS LOOK (legacy inline flow — superseded by <ShoppingExperience/>;
                   always hidden now since the container is hidden for activeTool==='shopping'.
                   id removed to avoid colliding with ShoppingExperience's #shop-this-look. ══ */}
              <div
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
                          onClick={(e) => { e.preventDefault(); trackCalendly(CALENDLY_URL, 'ai_shopping_quota'); }}
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
                              'Independent picks — we may earn a small commission',
                            ].map((item) => (
                              <li key={item} className="flex items-center gap-3">
                                <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center bg-[#22c55e] text-white text-[9px] font-bold rounded-full">✓</span>
                                <span className="text-[13px] text-black/70 leading-snug">{item}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-black/45 leading-snug mt-3">Some retailer links may earn us a commission at no extra cost to you. It never changes what we recommend.</p>
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
          </>
          ) : (
            <ComingSoonPanel tool={selectedTool} user={user} onSeePlans={goToPricingPlans} />
          )}
        </div>
      </div>

      <div className="border-t border-black/10" />

      <Footer />

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* ── LIGHTBOX ──
          Falls back to lightboxQuizUrl when no AI-Vision concept is selected,
          so the Style Quiz "More rooms" gallery thumbs reuse the same modal.
          Download button is gated on selectedConceptUrl — quiz thumbs are
          public Cloudinary URLs the user can save via right-click. */}
      <AnimatePresence>
        {isLightboxOpen && selectedConceptUrl && (
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
              <img src={selectedConceptUrl || ''} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="Full resolution" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIConceptsPage;
