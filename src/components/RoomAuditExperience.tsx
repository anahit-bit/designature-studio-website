import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { cld } from '../lib/cld';
import { AuthUser } from '../AuthContext';
import ConversionBand from './studio/ConversionBand';
import { getStoredToken } from '../sessionClient';
import { trackAuditStart } from '../lib/track';
import { trackEvent } from '../lib/analytics';

// Locked Room Audit sample/demo room (same version-form URL as the paid landing).
const SAMPLE_ROOM = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774950187/12_iwshvs.jpg';

// The six i18n keys for the REAL server dimensions (server.ts:2152-2158). Used for the
// landing/setup marquee + the analyzing veil-phrase only — the report renders the live
// `result.dimensions[].label` the server returns. Kept in sync for honesty.
const DIMENSION_KEYS = [
  'ai.audit.dimLayout',
  'ai.audit.dimLighting',
  'ai.audit.dimColor',
  'ai.audit.dimClutter',
  'ai.audit.dimFunction',
  'ai.audit.dimStyle',
] as const;

// Goal chips — id is stable, `en` is the label sent to the (English) Gemini prompt,
// `key` is the i18n label shown to the user (locked: copy lives in i18n, not here).
const AUDIT_GOALS = [
  { id: 'cozy', en: 'Make it cozier', key: 'ai.audit.goal.cozy' },
  { id: 'storage', en: 'More storage', key: 'ai.audit.goal.storage' },
  { id: 'flow', en: 'Better flow', key: 'ai.audit.goal.flow' },
  { id: 'light', en: 'Maximize light', key: 'ai.audit.goal.light' },
  { id: 'style', en: 'Elevate style', key: 'ai.audit.goal.style' },
  { id: 'minimal', en: 'Reduce clutter', key: 'ai.audit.goal.minimal' },
] as const;

// Optional room-type refinement (NOT auto-detected — an honest optional input that is
// folded into the goals/context array the analyze endpoint already accepts).
const AUDIT_ROOMS = [
  { id: 'living', en: 'Living room', key: 'ai.audit.room.living' },
  { id: 'bedroom', en: 'Bedroom', key: 'ai.audit.room.bedroom' },
  { id: 'dining', en: 'Dining', key: 'ai.audit.room.dining' },
  { id: 'kitchen', en: 'Kitchen', key: 'ai.audit.room.kitchen' },
  { id: 'office', en: 'Office', key: 'ai.audit.room.office' },
  { id: 'bathroom', en: 'Bathroom', key: 'ai.audit.room.bathroom' },
  { id: 'outdoor', en: 'Outdoor', key: 'ai.audit.room.outdoor' },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────
interface AuditDimension {
  label: string;
  score: number; // 1-10
  verdict: string;
}
/** PINS change: each fix now carries a normalized location (x,y ∈ 0-100, % of image). */
export interface AuditFix {
  text: string;
  x?: number;
  y?: number;
}
interface AuditResult {
  overallScore: number; // 1-100
  dimensions: AuditDimension[];
  fixNow: AuditFix[];
}

interface Props {
  user: AuthUser | null;
  /** Refresh quota + mark audit-complete in the parent (mirrors the old onAuditComplete). */
  onAuditComplete?: () => void;
  /** Lets the parent lock tab-switching while an audit is running. */
  onProcessingChange?: (processing: boolean) => void;
  /** Forward handoff: carry the audited room into AI Vision as its source room. */
  onRedesignWithVision: (roomImage: string) => void;
  navigateTo: (page: string) => void;
}

// ─── Scoring helpers ────────────────────────────────────────────────────────
// Lock §3: cobalt for strong, oxide-soft otherwise. NO red/green (matches the paid landing).
const COBALT = '#0047AB';
const OXIDE_SOFT = '#C97A60';
/** Per-dimension (out of 10): cobalt ≥ 8, oxide-soft below. */
const scoreHex = (s: number): string => (s >= 8 ? COBALT : OXIDE_SOFT);
/** Overall (out of 100): cobalt ≥ 80, oxide-soft below — same two hues, scaled. */
const overallHex = (s: number): string => (s >= 80 ? COBALT : OXIDE_SOFT);

function overallGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

const numOrUndef = (v: unknown): number | undefined =>
  typeof v === 'number' && isFinite(v) ? v : undefined;

/** Normalize a server fix into {text,x,y}; tolerates the legacy string[] shape too. */
const normalizeFix = (f: unknown): AuditFix => {
  if (typeof f === 'string') return { text: f };
  const o = (f ?? {}) as { text?: unknown; x?: unknown; y?: unknown };
  return { text: String(o.text ?? ''), x: numOrUndef(o.x), y: numOrUndef(o.y) };
};
/** A pin is only drawn when both coords are present AND in range — else degrade gracefully. */
const pinValid = (f: AuditFix): f is AuditFix & { x: number; y: number } =>
  typeof f.x === 'number' && typeof f.y === 'number' &&
  f.x >= 0 && f.x <= 100 && f.y >= 0 && f.y <= 100;

function formatGeminiError(err: unknown, fallback: string): string {
  const msg =
    err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : String(err);
  const trimmed = msg.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch { /* ignore */ }
  }
  return msg || fallback;
}

/**
 * Room Audit — LOGGED-IN PAID experience (locked 4-state, room-audit-LOGGED-IN-mockup-v4).
 * Self-contained: owns the upload → analyze → report pipeline (ported from RoomAudit.tsx),
 * wrapped in a `.studio-frame` exactly like ShoppingExperience. Free + logged-out users never
 * reach this — they keep the in-studio paid landing in AIConceptsPage.
 */
const RoomAuditExperience: React.FC<Props> = (p) => {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Pipeline state (owns its own state machine) ──
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [roomType, setRoomType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [refineOpen, setRefineOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [hotPin, setHotPin] = useState<number | null>(null);
  const [veilIdx, setVeilIdx] = useState(0);

  // ── Quota (paid only; 999 / undefined / >50 == unlimited) ──
  const isPaid = p.user?.isPaid ?? false;
  const auditsLeftRaw = p.user?.auditsLeft;
  const unlimited = auditsLeftRaw === 999 || auditsLeftRaw === undefined || auditsLeftRaw > 50;
  const auditsLeft = typeof auditsLeftRaw === 'number' ? auditsLeftRaw : 0;
  const quotaLine = unlimited
    ? t('ai.audit.quotaUnlimited')
    : t('ai.audit.quotaLeft').replace('{n}', String(auditsLeft));
  const canAudit = unlimited || auditsLeft > 0;

  // Derived view (mirrors ShoppingExperience's `view` derivation).
  const view: 'landing' | 'setup' | 'analyzing' | 'report' =
    result ? 'report' : isProcessing ? 'analyzing' : roomImage ? 'setup' : 'landing';

  // ── Upload handler (ported from RoomAudit) ──
  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError(t('ai.uploadRoomImage')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRoomImage(ev.target?.result as string);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
    if (f) processFile(f);
  };

  // ── "Score a sample" — fetch the demo room, convert to a data URL for analyze ──
  const loadSample = async () => {
    if (sampleLoading) return;
    setSampleLoading(true);
    setError(null);
    try {
      const res = await fetch(cld(SAMPLE_ROOM, 1600, { quality: 'best' }));
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(blob);
      });
      setResult(null);
      setRoomImage(dataUrl);
    } catch {
      setError(t('ai.audit.errorGeneric'));
    } finally {
      setSampleLoading(false);
    }
  };

  const toggleGoal = (id: string) =>
    setSelectedGoals((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Fold goals + (optional) room type + notes into the goals/context array the analyze
  // endpoint already accepts — keeps the request shape unchanged (only the response gains pins).
  const buildGoalsPayload = (): string[] => {
    const goalLabels = AUDIT_GOALS.filter((g) => selectedGoals.has(g.id)).map((g) => g.en);
    const rt = roomType ? AUDIT_ROOMS.find((r) => r.id === roomType)?.en : null;
    const extras = [rt ? `Room type: ${rt}` : null, notes.trim() ? `Notes: ${notes.trim()}` : null];
    return [...goalLabels, ...extras.filter(Boolean) as string[]];
  };

  // ── Run audit (ported from RoomAudit — quota behavior intact) ──
  const handleAudit = async () => {
    if (!roomImage || !canAudit || isProcessing) return;
    setIsProcessing(true);
    p.onProcessingChange?.(true);
    setError(null);
    setResult(null);

    let quotaConsumed = false;
    let remainingAfterUse: number | undefined;
    try {
      if (!isPaid) {
        const token = getStoredToken();
        if (!token) throw new Error('Not authenticated');
        const useRes = await fetch('/api/generation/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-token': token },
          body: JSON.stringify({ count: 1 }),
        });
        const useData = await useRes.json().catch(() => ({}));
        if (!useRes.ok) throw new Error(useData?.error || 'No generations left');
        quotaConsumed = true;
        remainingAfterUse = typeof useData?.generationsLeft === 'number' ? useData.generationsLeft : undefined;
      }

      const token = getStoredToken();
      if (!token) throw new Error('Not authenticated');

      const analyzeRes = await fetch('/api/room-audit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': token },
        body: JSON.stringify({ imageDataUrl: roomImage, goals: buildGoalsPayload() }),
      });
      const analyzeData = await analyzeRes.json().catch(() => ({}));
      if (!analyzeRes.ok) throw new Error(analyzeData?.error || 'Audit failed');

      const raw = analyzeData.result;
      if (
        typeof raw?.overallScore !== 'number' ||
        !Array.isArray(raw?.dimensions) ||
        raw.dimensions.length < 6 ||
        !Array.isArray(raw?.fixNow)
      ) throw new Error('Incomplete audit response');

      const parsed: AuditResult = {
        overallScore: raw.overallScore,
        dimensions: raw.dimensions,
        fixNow: raw.fixNow.map(normalizeFix).slice(0, 3),
      };
      setResult(parsed);
      p.onAuditComplete?.();

      // A-004/I-023 — GA4 engagement events (client-side, env-gated).
      trackEvent('ai_audit_completed', { score: parsed.overallScore });
      if (!isPaid && remainingAfterUse === 0) trackEvent('quota_burned', { tool: 'ai_audit' });
    } catch (err: unknown) {
      if (quotaConsumed && !isPaid) {
        try {
          const token = getStoredToken();
          if (token) {
            await fetch('/api/generation/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-session-token': token },
              body: JSON.stringify({ count: 1 }),
            });
          }
        } catch { /* best-effort */ }
      }
      console.error('Room Audit error:', err);
      setError(formatGeminiError(err, t('ai.audit.errorGeneric')));
    } finally {
      setIsProcessing(false);
      p.onProcessingChange?.(false);
    }
  };

  const handleReset = () => {
    setRoomImage(null);
    setSelectedGoals(new Set());
    setRoomType(null);
    setNotes('');
    setResult(null);
    setError(null);
    setHotPin(null);
  };

  // ── Pin ⇄ fix linking (ported from the mockup's poke()/hot()) ──
  const fixRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const poke = (n: number) => {
    setHotPin(n);
    window.setTimeout(() => setHotPin((cur) => (cur === n ? null : cur)), 1100);
    fixRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // I-021b — audit_started fires once when the Score button transitions disabled → enabled.
  const isDisabled = !roomImage || isProcessing || !canAudit;
  const auditStartFired = useRef(false);
  useEffect(() => {
    if (isDisabled) {
      if (!result && !isProcessing) auditStartFired.current = false;
      return;
    }
    if (!auditStartFired.current) {
      auditStartFired.current = true;
      trackAuditStart();
    }
  }, [isDisabled, result, isProcessing]);

  // Analyzing — rotate the veil-phrase through the real dimensions.
  useEffect(() => {
    if (!isProcessing) return;
    const id = window.setInterval(() => setVeilIdx((i) => (i + 1) % DIMENSION_KEYS.length), 1400);
    return () => window.clearInterval(id);
  }, [isProcessing]);

  const goalCount = selectedGoals.size;
  const goalsSummary = goalCount === 0
    ? t('ai.audit.noGoals')
    : goalCount === 1
      ? t('ai.audit.oneGoal')
      : t('ai.audit.manyGoals').replace('{n}', String(goalCount));

  // Marquee track — the six real dimensions, repeated for a seamless loop.
  const marqueeTrack = (
    <div className="marquee-track">
      {[0, 1, 2].flatMap((rep) =>
        DIMENSION_KEYS.map((k, i) => <span key={`${rep}-${i}`} className="dim">{t(k)}</span>))}
    </div>
  );

  // ── STATE 0 · LANDING ──────────────────────────────────────────────────
  const renderLanding = () => (
    <>
      <div className="statushdr">
        <div className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-[#0047AB]" /><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.audit.statusReady')}</span></div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{quotaLine}</span>
      </div>
      <div className="hero">
        <div className="hero-media"><img src={cld(SAMPLE_ROOM, 2000, { crop: 'fill', aspectRatio: '16/9' })} alt="" /></div>
        <div className="hero-scrim" />
        {/* a sample overall score (illustrative — this is the marketing launchpad) */}
        <div className="badge-dark absolute top-6 left-6 z-10 flex items-center gap-3 px-4 py-3">
          <div className="hl text-[36px] leading-none">74</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/75 leading-tight">{t('ai.audit.heroOverall')}<br />{t('ai.audit.heroOverallMeta')}</div>
        </div>
        <span className="badge-cobalt absolute top-6 right-6 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 z-10">{t('ai.audit.dimsScored')}</span>
        <span className="pin absolute w-9 h-9 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center shadow-lg z-10" style={{ top: '34%', left: '24%' }}>1</span>
        <span className="pin absolute w-9 h-9 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center shadow-lg z-10" style={{ top: '62%', left: '66%', animationDelay: '.5s' }}>2</span>
        <span className="pin absolute w-9 h-9 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center shadow-lg z-10" style={{ top: '74%', left: '38%', animationDelay: '.9s' }}>3</span>
        <div className="hero-overlay" style={{ zIndex: 20 }}>
          <div className="glass px-10 py-10 md:px-12 md:py-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/70 mb-3">{t('ai.audit.heroKicker')}</p>
            <h1 className="hl text-[52px] md:text-[76px] leading-[0.92] mb-3">{t('ai.audit.heroTitle')}<br /><em>{t('ai.audit.heroTitleEm')}</em></h1>
            <span className="block w-16 h-[2px] rule-oxide mx-auto mb-5" />
            <p className="text-[14px] text-white/75 leading-relaxed max-w-[380px] mx-auto mb-8">{t('ai.audit.heroSub')}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="cta-primary text-[12px] font-bold uppercase tracking-[0.24em] px-11 py-4 transition">{t('ai.audit.uploadCta')}</button>
            <div className="flex items-center justify-center gap-5 mt-5">
              <button type="button" onClick={() => void loadSample()} disabled={sampleLoading} className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65 border-b border-white/30 pb-0.5 hover:text-white transition disabled:opacity-50">{sampleLoading ? t('ai.audit.sampleLoading') : t('ai.audit.sampleCta')}</button>
            </div>
          </div>
        </div>
        <span className="cap absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.25em] px-4 py-2 z-10">{t('ai.audit.heroCap')}</span>
      </div>
      {/* value strip (lives ONLY on landing) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-black/[0.08] text-center">
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.audit.v1k')}</p><p className="text-[14px] text-black/55 leading-relaxed">{t('ai.audit.v1b')}</p></div>
        <div className="px-8 py-7 border-r border-black/[0.08]"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.audit.v2k')}</p><p className="text-[14px] text-black/55 leading-relaxed">{t('ai.audit.v2b')}</p></div>
        <div className="px-8 py-7"><p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker mb-1.5">{t('ai.audit.v3k')}</p><p className="text-[14px] text-black/55 leading-relaxed">{t('ai.audit.v3b')}</p></div>
      </div>
      <div className="px-10 py-6 flex items-center gap-7">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60 flex-shrink-0">{t('ai.audit.scoredAcrossLabel')}</span>
        <div className="marquee flex-1 overflow-hidden">{marqueeTrack}</div>
      </div>
    </>
  );

  // ── STATE 1 · SETUP ────────────────────────────────────────────────────
  const renderSetup = () => (
    <>
      <div className="titlehdr">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] kicker mb-1.5">{t('ai.audit.heroKicker')}</p>
          <h1 className="hl text-[34px] md:text-[42px] leading-[1.0] text-black">{t('ai.audit.setupTitle')} <em className="text-black">{t('ai.audit.setupTitleEm')}</em></h1>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60 pb-1 whitespace-nowrap">{quotaLine}</span>
      </div>
      <div className="grid lg:grid-cols-[42%_58%] items-start" style={{ gap: '1px', background: 'rgba(0,0,0,.08)' }}>
        {/* LEFT — the room (upload target) */}
        <div className="bg-white self-stretch" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <div className="relative bg-[#0e0e0e] overflow-hidden lg:sticky lg:top-0" style={{ aspectRatio: '1/1' }}>
            {roomImage && <img src={cld(roomImage, 1100, { crop: 'fill', aspectRatio: '1/1' })} alt="" className="absolute inset-0 w-full h-full object-cover" decoding="async" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.45) 100%)' }} />
            <span className="badge-cobalt absolute top-6 left-6 text-[9px] font-bold uppercase tracking-[0.22em] px-3 py-1.5">{t('ai.audit.theRoom')}</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 text-black text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 hover:bg-white transition-colors">{t('ai.audit.changePhoto')}</button>
          </div>
          <div className="px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-[10px] text-black/60 uppercase tracking-[0.16em]">{t('ai.audit.uploadHint')}</p>
            <button type="button" onClick={() => void loadSample()} disabled={sampleLoading} className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0047AB] border-b border-[#0047AB]/40 hover:border-[#0047AB] transition whitespace-nowrap disabled:opacity-50">{sampleLoading ? t('ai.audit.sampleLoading') : t('ai.audit.sampleInstead')}</button>
          </div>
        </div>

        {/* RIGHT — controls */}
        <div className="bg-white p-6 md:p-9 flex flex-col gap-5" style={{ minHeight: 620 }}>
          {/* live summary (solid cobalt) */}
          <div className="px-6 py-4 text-white" style={{ background: '#0047AB' }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-white/75 mb-1.5">{t('ai.audit.yourAudit')}</p>
            <p className="text-[15px] font-bold tracking-[0.04em]">{t('ai.audit.wholeRoom')} <span className="text-white/55 mx-0.5">·</span> {goalsSummary}</p>
            <p className="hl italic text-[19px] leading-snug mt-2 text-white/90">{t('ai.audit.summaryLine')}</p>
          </div>

          {/* STEP 1 — your photo (resolved in the left well) */}
          <div>
            <div className="flex items-center gap-3 mb-1"><span className="w-5 h-5 bg-black text-white text-[9px] flex items-center justify-center font-bold">1</span><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/70">{t('ai.audit.step1')}</span><span className="text-[10px] font-semibold kicker tracking-[0.06em]">{t('ai.audit.step1Ready')}</span></div>
            <p className="text-[12px] text-black/55 leading-relaxed mt-2">{t('ai.audit.step1Body')}</p>
          </div>

          {/* STEP 2 — goals (optional) */}
          <div>
            <div className="flex items-center gap-3 mb-3"><span className="w-5 h-5 border border-black/25 text-black/60 text-[9px] flex items-center justify-center font-bold">2</span><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/70">{t('ai.audit.step2')} <span className="text-black/45 normal-case font-normal tracking-normal ml-1">{t('ai.audit.optional')}</span></span></div>
            <p className="text-[11px] text-black/55 mb-3">{t('ai.audit.step2Body')}</p>
            <div className="flex flex-wrap gap-2">
              {AUDIT_GOALS.map((g) => {
                const on = selectedGoals.has(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => toggleGoal(g.id)} className={`px-4 py-2 border text-[11px] font-semibold transition ${on ? 'border-[#0047AB] bg-[#0047AB] text-white' : 'border-black/15 text-black/65 hover:border-black/40'}`}>{t(g.key)}</button>
                );
              })}
            </div>
          </div>

          {/* OPTIONAL refinements — room type & notes (open on tap) */}
          <div className="border border-black/12">
            <button type="button" onClick={() => setRefineOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/60">{t('ai.audit.refinements')}</span>
              <span className="text-[10px] text-black/55 uppercase tracking-[0.14em]">{t('ai.audit.refinementsHint')} {refineOpen ? '▴' : '▾'}</span>
            </button>
            <div className={`opt${refineOpen ? ' open' : ''}`}>
              <div className="px-4 pb-5 pt-1 flex flex-col gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/60 mb-2">{t('ai.audit.roomTypeLabel')} <span className="text-black/40 normal-case font-normal tracking-normal">{t('ai.audit.roomTypeOptional')}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {AUDIT_ROOMS.map((r) => {
                      const on = roomType === r.id;
                      return (
                        <button key={r.id} type="button" onClick={() => setRoomType(on ? null : r.id)} className={`px-4 py-2 border text-[11px] font-semibold transition ${on ? 'border-dashed border-[#0047AB] text-[#0047AB]' : 'border-black/15 text-black/65 hover:border-black/40'}`}>{on ? '✦ ' : ''}{t(r.key)}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="h-px bg-black/8" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/60 mb-2">{t('ai.audit.notesLabel')}</p>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ai.audit.notesPlaceholder')} className="w-full border border-black/15 bg-white px-3.5 py-2.5 text-[12px] text-black/80 outline-none focus:border-[#0047AB] resize-none" />
                </div>
              </div>
            </div>
          </div>

          {error && <div className="text-[12px] text-[#8E3F2D] border border-[#8E3F2D]/30 bg-[#8E3F2D]/5 px-4 py-3">{error}</div>}

          {/* PRIMARY ACTION — pinned */}
          <div className="mt-auto pt-1 flex items-center gap-4">
            <button type="button" onClick={() => void handleAudit()} disabled={isDisabled} className="cta-primary flex-1 text-[13px] font-bold uppercase tracking-[0.25em] py-4 transition disabled:opacity-40 disabled:cursor-not-allowed">{t('ai.audit.scoreCta')}</button>
            <span className="text-[11px] text-black/60 uppercase tracking-[0.18em] whitespace-nowrap">{t('ai.audit.scoreEta')}</span>
          </div>
        </div>
      </div>

      <div className="px-10 py-6 flex items-center gap-7">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60 flex-shrink-0">{t('ai.audit.scoredAcrossLabel')}</span>
        <div className="marquee flex-1 overflow-hidden">{marqueeTrack}</div>
      </div>
    </>
  );

  // ── STATE 2 · ANALYZING ────────────────────────────────────────────────
  const renderAnalyzing = () => (
    <>
      <div className="statushdr">
        <div className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.audit.statusAnalyzing')}</span></div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">{t('ai.audit.usingOne')}</span>
      </div>
      <div className="hero">
        <div className="hero-media"><img src={roomImage ? cld(roomImage, 2000, { crop: 'fill', aspectRatio: '16/9' }) : ''} alt="" /></div>
        <div className="absolute inset-0 bg-black/[0.65]" />
        <div className="scanline" aria-hidden />
        <span className="pin absolute w-9 h-9 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center z-10" style={{ top: '34%', left: '24%', animationDelay: '.2s' }}>1</span>
        <span className="pin absolute w-9 h-9 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center z-10" style={{ top: '62%', left: '66%', animationDelay: '.9s' }}>2</span>
        <span className="pin absolute w-9 h-9 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center z-10" style={{ top: '74%', left: '38%', animationDelay: '1.6s' }}>3</span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-8 z-10">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">{t('ai.audit.scoreEta')}</p>
          <p className="veilphrase hl text-[30px] md:text-[40px] text-white/95">{t('ai.audit.assessing')} <em>{t(DIMENSION_KEYS[veilIdx]).toLowerCase()}…</em></p>
        </div>
      </div>
    </>
  );

  // ── STATE 3 · REPORT ────────────────────────────────────────────────────
  const renderReport = () => {
    if (!result) return null;
    const grade = overallGrade(result.overallScore);
    return (
      <>
        <div className="statushdr">
          <div className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[12px] font-bold uppercase tracking-[0.3em] text-black/60">{t('ai.audit.statusComplete')}</span></div>
          <button type="button" onClick={handleReset} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60 border border-black/15 px-4 py-2 hover:border-black/40 hover:text-black transition">{t('ai.audit.auditAnother')}</button>
        </div>
        <div className="px-6 md:px-10 py-8">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 items-start">
            {/* LEFT — annotated room (sticky), score overlay + pins */}
            <div className="lg:sticky lg:top-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] kicker mb-3">{t('ai.audit.annotatedKicker')}</p>
              <div className="relative overflow-hidden bg-black shadow-[0_24px_50px_rgba(0,0,0,0.18)]" style={{ aspectRatio: '1/1' }}>
                {roomImage && <img src={cld(roomImage, 1100, { crop: 'fill', aspectRatio: '1/1' })} alt="" className="w-full h-full object-cover" decoding="async" />}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,0) 28%,rgba(0,0,0,.35))' }} />
                {/* big overall score (kept regardless of pin availability) */}
                <div className="absolute top-5 left-5 bg-black/[0.72] backdrop-blur px-5 py-4 flex items-center gap-3">
                  <div className="hl text-[52px] leading-none text-white">{result.overallScore}</div>
                  <div className="leading-tight">
                    <div className="hl text-[26px] font-semibold" style={{ color: overallHex(result.overallScore) }}>{grade}</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">/ 100</div>
                  </div>
                </div>
                {/* pins = the fixes WITH valid coords (others gracefully omitted) */}
                {result.fixNow.map((f, i) => pinValid(f) ? (
                  <span key={i} data-pin={i + 1} onClick={() => poke(i + 1)} className={`pin absolute w-8 h-8 rounded-full bg-white text-black text-[13px] font-bold flex items-center justify-center cursor-pointer shadow-lg${hotPin === i + 1 ? ' hot' : ''}`} style={{ top: `${f.y}%`, left: `${f.x}%` }}>{i + 1}</span>
                ) : null)}
              </div>
              <p className="text-[11px] text-black/60 mt-3 leading-relaxed">{t('ai.audit.annotatedHint')}</p>
            </div>

            {/* RIGHT — the report */}
            <div>
              <div className="flex items-end justify-between mb-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] kicker">{t('ai.audit.reportKicker')}</p>
                <p className="text-[12px] font-bold">{t('ai.audit.overallLabel')} · <span style={{ color: overallHex(result.overallScore) }}>{result.overallScore}</span><span className="text-black/45"> / 100 · {grade}</span></p>
              </div>
              <p className="text-[11px] text-black/55 mb-5 leading-relaxed">{t('ai.audit.weightedNote')}</p>

              {/* dimension score bars (dynamic) */}
              <div className="flex flex-col gap-2.5 mb-8">
                {result.dimensions.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] text-black/75 w-[120px] truncate uppercase tracking-wide flex-shrink-0">{d.label}</span>
                    <span className="scorebar flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(10, d.score)) * 10}%`, background: scoreHex(d.score), animationDelay: `${0.06 * i}s` }} /></span>
                    <span className="text-[11px] font-bold w-10 text-right flex-shrink-0" style={{ color: scoreHex(d.score) }}>{d.score}/10</span>
                  </div>
                ))}
              </div>

              {/* detailed breakdown (dynamic) */}
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/60 mb-4">{t('ai.audit.detailedBreakdown')}</p>
              <div className="space-y-4 mb-8">
                {result.dimensions.map((d, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 text-right w-10">
                      <span className="text-base font-bold" style={{ color: scoreHex(d.score) }}>{d.score}</span>
                      <span className="text-[10px] text-black/55 block">{t('ai.audit.outOf')}</span>
                    </div>
                    <div className="flex-1 pb-4 border-b border-black/[0.06] last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: scoreHex(d.score) }} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/85">{d.label}</span>
                      </div>
                      <p className="text-[13px] text-black/75 leading-relaxed">{d.verdict}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fix now — top 3 (black block; pins link here) */}
              <div className="bg-black p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/75 mb-4">{t('ai.audit.fixNowTitle')}</p>
                <div className="space-y-3">
                  {result.fixNow.map((f, i) => (
                    <div key={i} data-fix={i + 1} ref={(el) => { fixRefs.current[i + 1] = el; }} onClick={() => poke(i + 1)} className={`fixrow flex gap-3 transition cursor-pointer${hotPin === i + 1 ? ' hot' : ''}`}>
                      <div className="w-5 h-5 bg-white text-black text-[11px] flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                      <p className="text-[13px] text-white/85 leading-relaxed pt-0.5">{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* action row — forward handoff (the through-line) */}
              <div className="border-t border-[#DAD2C3] mt-7 pt-6 flex flex-col gap-3">
                <button type="button" onClick={() => { if (roomImage) p.onRedesignWithVision(roomImage); }} className="w-full inline-flex items-center justify-center gap-2 border border-[#0047AB] text-[#0047AB] text-[12px] font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#0047AB]/5 transition">{t('ai.audit.redesignVision')}</button>
                <p className="text-[11px] text-black/60 text-center leading-relaxed">{t('ai.audit.reportDisclaimer')}</p>
              </div>
            </div>
          </div>
        </div>
        <ConversionBand
          kicker={t('ai.audit.convKicker')}
          headline={<>{t('ai.audit.convHeadline')} <em>{t('ai.audit.convHeadlineEm')}</em></>}
          actions={<button type="button" onClick={() => p.navigateTo('pricing')} className="bg-white text-black text-sm font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-white/90 transition">{t('ai.audit.bookStudio')}</button>}
        />
      </>
    );
  };

  return (
    <div className="studio-frame bg-white w-full" id="room-audit-experience">
      <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      {view === 'report' ? renderReport()
        : view === 'analyzing' ? renderAnalyzing()
          : view === 'setup' ? renderSetup()
            : renderLanding()}
    </div>
  );
};

export default RoomAuditExperience;
