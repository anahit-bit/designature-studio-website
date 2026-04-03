import React, { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { getStoredToken } from '../sessionClient';

// ─── Types ─────────────────────────────────────────────────────────────────
interface AuditDimension {
  label: string;
  score: number;       // 1-10
  verdict: string;     // 1-2 sentence explanation
}

interface AuditResult {
  overallScore: number;          // 1-100
  dimensions: AuditDimension[];
  fixNow: string[];              // top 3 actionable improvements
}

interface RoomAuditProps {
  user: { email: string; isPaid?: boolean; auditsLeft?: number; generationsLeft?: number } | null;
  authLoading: boolean;
  t: (key: string) => string;
  language: string;
  onAuditComplete?: () => void;
  onRequestLogin?: () => void;
  onProcessingChange?: (processing: boolean) => void;
}

// ─── Goal chips ────────────────────────────────────────────────────────────
const AUDIT_GOALS = [
  { id: 'cozy',    label: 'Make it cozier' },
  { id: 'storage', label: 'More storage' },
  { id: 'flow',    label: 'Better flow' },
  { id: 'light',   label: 'Maximize light' },
  { id: 'style',   label: 'Elevate style' },
  { id: 'minimal', label: 'Reduce clutter' },
];

// ─── Scoring helpers ────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-amber-400';
  if (score >= 4) return 'bg-orange-400';
  return 'bg-red-400';
}

function scoreTextColor(score: number): string {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 6) return 'text-amber-600';
  if (score >= 4) return 'text-orange-500';
  return 'text-red-500';
}

function overallGrade(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: 'A+', color: 'text-emerald-600' };
  if (score >= 80) return { letter: 'A',  color: 'text-emerald-600' };
  if (score >= 70) return { letter: 'B',  color: 'text-emerald-500' };
  if (score >= 60) return { letter: 'C',  color: 'text-amber-500' };
  if (score >= 45) return { letter: 'D',  color: 'text-orange-500' };
  return { letter: 'F', color: 'text-red-500' };
}

function formatGeminiError(err: unknown): string {
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
  return msg || 'Audit failed. Please try again.';
}

// ─── Component ─────────────────────────────────────────────────────────────
const RoomAudit: React.FC<RoomAuditProps> = ({
  user,
  authLoading,
  onAuditComplete,
  onRequestLogin,
  onProcessingChange,
}) => {
  const [roomImage, setRoomImage]           = useState<string | null>(null);
  const [roomAspectRatio, setRoomAspectRatio] = useState<string>('4/3');
  const [selectedGoals, setSelectedGoals]   = useState<string[]>([]);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [result, setResult]                 = useState<AuditResult | null>(null);

  const isPaid         = user?.isPaid ?? false;
  const auditsLeftRaw  = user?.auditsLeft;
  const auditsLeft     = typeof auditsLeftRaw === 'number' ? auditsLeftRaw : 0;
  const generationsLeft = user?.generationsLeft ?? 0;

  const canAudit = isPaid
    ? typeof auditsLeftRaw === 'number'
      ? auditsLeftRaw === 999 || auditsLeftRaw > 0
      : generationsLeft > 0
    : generationsLeft > 0;

  const remainingLabel = isPaid ? 'Audits remaining' : 'Generations remaining';
  const remainingValue = isPaid
    ? (auditsLeft === 999 || auditsLeft > 50 ? 'Unlimited' : auditsLeft)
    : generationsLeft;

  // ── File handler ──
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setRoomImage(dataUrl);
      setError(null);
      setResult(null);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio > 1.4) setRoomAspectRatio('16/9');
        else if (ratio > 1.1) setRoomAspectRatio('4/3');
        else if (ratio > 0.85) setRoomAspectRatio('1/1');
        else setRoomAspectRatio('3/4');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // ── Goal toggle ──
  const toggleGoal = (id: string) =>
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  // ── Run audit ──
  const handleAudit = async () => {
    if (!roomImage || !canAudit) return;
    setIsProcessing(true);
    onProcessingChange?.(true);
    setError(null);
    setResult(null);

    let quotaConsumed = false;
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
      }

      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

      const ai = new GoogleGenAI({ apiKey });
      const matches = roomImage.match(/^data:(image\/[\w+]+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid image format');

      const goalContext = selectedGoals.length > 0
        ? `\nThe homeowner's goals: ${selectedGoals.map(id => AUDIT_GOALS.find(g => g.id === id)?.label).filter(Boolean).join(', ')}.`
        : '';

      const prompt = `You are an expert interior designer performing a professional room audit.
Analyze this room photo and produce a structured design audit.${goalContext}

Score each of these 6 dimensions from 1-10 and write 1-2 sentences explaining the score:
1. Layout & Flow — furniture arrangement, traffic paths, spatial balance
2. Lighting — natural light use, layered lighting, ambiance
3. Color Harmony — palette cohesion, contrast, mood
4. Clutter & Organization — visual cleanliness, storage use
5. Functionality — practical use of space, ergonomics
6. Style Cohesion — consistency of design language, intentionality

Then calculate an overall score from 1-100 (weighted average, not a simple mean — layout and functionality matter more).

Finally, list exactly 3 "Fix Now" items — the highest-impact, most actionable improvements the homeowner can make immediately.

Output ONLY valid JSON with no markdown fences, no explanation:
{"overallScore":72,"dimensions":[{"label":"Layout & Flow","score":7,"verdict":"The sofa placement creates a clear conversation zone, but the dining table blocks the path to the balcony."},{"label":"Lighting","score":5,"verdict":"..."},{"label":"Color Harmony","score":8,"verdict":"..."},{"label":"Clutter & Organization","score":6,"verdict":"..."},{"label":"Functionality","score":7,"verdict":"..."},{"label":"Style Cohesion","score":6,"verdict":"..."}],"fixNow":["Move the dining table 30cm left to open the balcony path","Add a floor lamp in the dark corner by the bookshelf","Replace the mismatched throw pillows with a cohesive neutral set"]}`;

      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: matches[1], data: matches[2] } },
            { text: prompt },
          ],
        },
      });

      const rawText = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse audit results');

      const parsed: AuditResult = JSON.parse(jsonMatch[0]);
      if (
        typeof parsed.overallScore !== 'number' ||
        !Array.isArray(parsed.dimensions) ||
        parsed.dimensions.length < 6 ||
        !Array.isArray(parsed.fixNow)
      ) throw new Error('Incomplete audit response');

      setResult(parsed);
      onAuditComplete?.();

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
      setError(formatGeminiError(err));
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  const handleReset = () => {
    setRoomImage(null);
    setSelectedGoals([]);
    setResult(null);
    setError(null);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  // Loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20 flex-grow">
        <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — mirrors AI Vision logged-out states
  if (!user) {
    return (
      <div className="flex w-full">
        {/* Left panel — logged out placeholder */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r border-black/8 flex flex-col">
          <div className="flex-grow p-8 flex flex-col gap-6 items-center justify-center text-center">
            <div className="w-12 h-12 bg-black/5 text-black/20 flex items-center justify-center text-2xl rounded-full">✦</div>
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight mb-2">Room Audit</h3>
              <p className="text-xs text-black/40 leading-relaxed uppercase tracking-widest">
                Sign in to unlock AI-powered room audits
              </p>
            </div>
            {onRequestLogin && (
              <button
                onClick={onRequestLogin}
                className="inline-flex items-center gap-2 bg-black text-white text-[9px] font-bold uppercase tracking-[0.25em] px-6 py-3 hover:bg-black/80 transition-colors"
              >
                Sign in to start
              </button>
            )}
          </div>
        </div>
        {/* Right panel — empty state */}
        <div className="flex-grow flex flex-col items-center justify-center gap-5 p-16 text-center">
          <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">✦</div>
          <h3 className="font-display text-3xl font-light text-black/20 tracking-tight">
            Your audit will appear here
          </h3>
          <p className="text-sm uppercase tracking-[0.3em] text-black/20 leading-[2]">
            Sign in · Upload a photo · Score your room
          </p>
        </div>
      </div>
    );
  }

  // ── Logged in: full 2-column layout ──
  const isDisabled = !roomImage || isProcessing || !canAudit;

  return (
    <div className="flex w-full min-h-0 flex-grow">

      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r border-black/8 flex flex-col">
        <div className="flex-grow p-8 flex flex-col gap-7 overflow-y-auto">

          {/* STEP 1: Upload room photo */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 bg-black text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">1</div>
              <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/50">
                Upload your room
              </span>
            </div>
            <label htmlFor="audit-room-upload" className="block cursor-pointer">
              <input id="audit-room-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <div
                className={`relative overflow-hidden border transition-colors ${roomImage ? 'border-black' : 'border-dashed border-black/20 hover:border-black/50'}`}
                style={{ aspectRatio: roomAspectRatio }}
              >
                {roomImage ? (
                  <>
                    <img src={roomImage} className="w-full h-full object-cover" alt="Room to audit" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 px-3 text-[8px] font-bold uppercase tracking-widest text-white text-center">
                      Change photo
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50">
                    <div className="w-9 h-9 border border-black/15 flex items-center justify-center text-black/25 text-xl font-thin">⌂</div>
                    <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/35">
                      Upload room photo
                    </span>
                    <span className="text-[8px] text-black/20 uppercase tracking-widest">JPG, PNG · max 10MB</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="h-px bg-black/6" />

          {/* STEP 2: Goals (optional) */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 bg-black/20 text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">2</div>
              <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/50">
                Your goals{' '}
                <span className="text-black/20 normal-case font-normal tracking-normal ml-1">(optional)</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AUDIT_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all rounded-[2px] ${
                    selectedGoals.includes(goal.id)
                      ? 'border-black bg-black text-white'
                      : 'border-black/15 text-black/40 hover:border-black/40 hover:text-black/70'
                  }`}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-black/6" />

          {/* Counter */}
          <div className="flex items-center justify-between bg-neutral-50 border border-black/8 px-4 py-3">
            <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/40">
              {remainingLabel}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`w-5 h-1 ${i < Math.min(Number(remainingValue), 3) ? 'bg-black' : 'bg-black/15'}`} />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-[10px]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Audit button */}
          <button
            onClick={handleAudit}
            disabled={isDisabled}
            className="w-full bg-black text-white py-5 text-sm md:text-base font-bold uppercase tracking-[0.4em] transition-all hover:bg-black/80 flex items-center justify-center gap-3 disabled:bg-black/20 disabled:cursor-not-allowed mt-auto"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>Score My Room <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>

        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex-grow flex flex-col overflow-y-auto">
        <AnimatePresence mode="wait">
          {!result ? (
            /* Empty state */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-grow flex flex-col items-center justify-center gap-5 p-16 text-center"
            >
              <div className="w-16 h-16 border border-black/8 flex items-center justify-center text-black/10 text-3xl">✦</div>
              <h3 className="font-display text-3xl font-light text-black/20 tracking-tight">
                Your audit will appear here
              </h3>
              <p className="text-sm uppercase tracking-[0.3em] text-black/20 leading-[2]">
                {roomImage ? 'Click Score My Room to start' : 'Complete the steps on the left'}
              </p>
            </motion.div>
          ) : (
            /* Results */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col p-8 gap-8"
            >
              {/* Overall score header */}
              <div className="flex items-end gap-4 pb-6 border-b border-black/8">
                {/* Photo thumbnail */}
                {roomImage && (
                  <div className="w-20 h-20 flex-shrink-0 overflow-hidden border border-black/10">
                    <img src={roomImage} className="w-full h-full object-cover" alt="Audited room" />
                  </div>
                )}
                <div className="flex items-end gap-3 flex-1">
                  <div className={`text-7xl font-display font-bold tracking-tight leading-none ${overallGrade(result.overallScore).color}`}>
                    {result.overallScore}
                  </div>
                  <div className="pb-2">
                    <div className={`text-2xl font-bold ${overallGrade(result.overallScore).color}`}>
                      {overallGrade(result.overallScore).letter}
                    </div>
                    <div className="text-[8px] text-black/25 uppercase tracking-widest">/ 100</div>
                  </div>
                </div>
                <p className="text-[8px] text-black/25 leading-relaxed self-end pb-2 max-w-[180px] text-right">
                  Weighted avg of 6 dimensions (each /10), scaled to 100
                </p>
              </div>

              {/* Mini score bars */}
              <div className="flex flex-col gap-2">
                {result.dimensions.map((dim, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[8px] text-black/40 w-[90px] truncate uppercase tracking-wide flex-shrink-0">
                      {dim.label.split(' ')[0]}
                    </span>
                    <div className="flex-1 h-1.5 bg-black/6 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dim.score * 10}%` }}
                        transition={{ duration: 0.6, delay: 0.08 * i, ease: 'easeOut' }}
                        className={`h-full rounded-full ${scoreColor(dim.score)}`}
                      />
                    </div>
                    <span className={`text-[9px] font-bold w-10 text-right flex-shrink-0 ${scoreTextColor(dim.score)}`}>
                      {dim.score}/10
                    </span>
                  </div>
                ))}
              </div>

              {/* Detailed breakdown */}
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/25 mb-4">
                  Detailed breakdown
                </p>
                <div className="space-y-4">
                  {result.dimensions.map((dim, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex gap-3"
                    >
                      <div className="flex-shrink-0 text-right w-10">
                        <span className={`text-base font-bold ${scoreTextColor(dim.score)}`}>{dim.score}</span>
                        <span className="text-[7px] text-black/20 block">/ 10</span>
                      </div>
                      <div className="flex-1 pb-4 border-b border-black/6 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${scoreColor(dim.score)}`} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">
                            {dim.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-black/50 leading-relaxed">{dim.verdict}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Fix Now */}
              <div className="bg-black p-6">
                <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4">
                  Fix now — Top 3 improvements
                </p>
                <div className="space-y-3">
                  {result.fixNow.map((fix, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + 0.1 * i }}
                      className="flex gap-3"
                    >
                      <div className="w-5 h-5 bg-white text-black text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed pt-0.5">{fix}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="self-center flex items-center gap-2 py-2.5 px-5 border border-black/15 text-[9px] font-bold uppercase tracking-[0.25em] text-black/40 hover:border-black/40 hover:text-black/70 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Audit another room
              </button>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default RoomAudit;
