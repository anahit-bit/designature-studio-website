import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, RefreshCw } from 'lucide-react';
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
  onAuditComplete?: () => void;   // Signals parent that an audit was done (for booking CTA)
  onRequestLogin?: () => void;    // Trigger Google sign-in
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

// ─── Dimension color coding ────────────────────────────────────────────────
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
    } catch {
      /* ignore */
    }
  }
  return msg || 'Audit failed. Please try again.';
}

// ─── Component ─────────────────────────────────────────────────────────────
const RoomAudit: React.FC<RoomAuditProps> = ({
  user,
  authLoading,
  t,
  language,
  onAuditComplete,
  onRequestLogin,
  onProcessingChange,
}) => {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomAspectRatio, setRoomAspectRatio] = useState<string>('4/3');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const isPaid = user?.isPaid ?? false;
  const auditsLeftRaw = user?.auditsLeft;
  const auditsLeft = typeof auditsLeftRaw === 'number' ? auditsLeftRaw : 0;
  const generationsLeft = user?.generationsLeft ?? 0;

  // Backend currently only provides `generationsLeft` (free tier), so:
  // - paid users: use `auditsLeft` when present
  // - free users: fall back to `generationsLeft` quota
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
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setRoomImage(dataUrl);
      setError(null);
      setResult(null);

      // Detect aspect ratio
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
  const toggleGoal = (id: string) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  // ── Run audit ──
  const handleAudit = async () => {
    if (!roomImage || !canAudit) return;
    setIsProcessing(true);
    onProcessingChange?.(true);
    setError(null);
    setResult(null);

    let quotaConsumed = false;
    try {
      // Free-tier quota consumption: reuse existing concept generation quota.
      // If Gemini fails, we restore the quota so the user doesn't lose a run.
      if (!isPaid) {
        const token = getStoredToken();
        if (!token) throw new Error('Not authenticated');

        const useRes = await fetch('/api/generation/use', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': token,
          },
          body: JSON.stringify({ count: 1 }),
        });

        const useData = await useRes.json().catch(() => ({}));
        if (!useRes.ok) {
          throw new Error(useData?.error || 'No generations left');
        }

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

      // Avoid preview IDs that 404 on v1beta; match multimodal text used in AIConceptsPage shopping flow.
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

      // Validate structure
      if (
        typeof parsed.overallScore !== 'number' ||
        !Array.isArray(parsed.dimensions) ||
        parsed.dimensions.length < 6 ||
        !Array.isArray(parsed.fixNow)
      ) {
        throw new Error('Incomplete audit response');
      }

      setResult(parsed);
      onAuditComplete?.();

    } catch (err: any) {
      if (quotaConsumed && !isPaid) {
        // Best-effort restore; never override the main error.
        try {
          const token = getStoredToken();
          if (token) {
            await fetch('/api/generation/restore', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-session-token': token,
              },
              body: JSON.stringify({ count: 1 }),
            });
          }
        } catch {}
      }
      console.error('Room Audit error:', err);
      setError(formatGeminiError(err));
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  // ── Reset ──
  const handleReset = () => {
    setRoomImage(null);
    setSelectedGoals([]);
    setResult(null);
    setError(null);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="w-14 h-14 bg-black/5 text-black/20 flex items-center justify-center text-2xl mx-auto rounded-full mb-6">
          ✦
        </div>
        <h3 className="font-display text-xl font-bold tracking-tight mb-2">Room Audit</h3>
        <p className="text-xs text-black/40 leading-relaxed uppercase tracking-widest max-w-xs mb-6">
          Sign in to unlock AI-powered room audits
        </p>
        {onRequestLogin && (
          <button
            onClick={onRequestLogin}
            className="inline-flex items-center gap-2 bg-black text-white text-[9px] font-bold uppercase tracking-[0.25em] px-6 py-3 hover:bg-black/80 transition-colors"
          >
            Sign in to start
          </button>
        )}
      </div>
    );
  }

  // ── Full audit UI ──
  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!result ? (
          /* ──────── INPUT PHASE ──────── */
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 flex flex-col gap-7"
          >
            {/* STEP 1: Upload room photo */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 bg-black text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">1</div>
                <span className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-black/50">
                  Upload your room
                </span>
              </div>
              <label htmlFor="audit-room-upload" className="block cursor-pointer">
                <input
                  id="audit-room-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div
                  className={`relative overflow-hidden border transition-colors ${
                    roomImage
                      ? 'border-black'
                      : 'border-dashed border-black/20 hover:border-black/50'
                  }`}
                  style={{ aspectRatio: roomAspectRatio }}
                >
                  {roomImage ? (
                    <>
                      <img
                        src={roomImage}
                        className="w-full h-full object-cover"
                        alt="Room to audit"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 py-2 px-3 text-[8px] font-bold uppercase tracking-widest text-white text-center">
                        Change photo
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50">
                      <Upload className="w-6 h-6 text-black/20" />
                      <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/35">
                        Upload room photo
                      </span>
                      <span className="text-[8px] text-black/20 uppercase tracking-widest">
                        JPG, PNG · max 10MB
                      </span>
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
                  <span className="text-black/20 normal-case font-normal tracking-normal ml-1">
                    (optional)
                  </span>
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

            {/* Audit budget indicator */}
            <div className="flex items-center justify-between bg-neutral-50 border border-black/8 px-4 py-3">
              <span className="text-sm md:text-base font-bold uppercase tracking-[0.25em] text-black/40">
                {remainingLabel}
              </span>
              <span className="text-sm font-bold text-black/70">
                {remainingValue}
              </span>
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
              disabled={!roomImage || isProcessing || !canAudit}
              className={`w-full py-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                !roomImage || isProcessing || !canAudit
                  ? 'bg-black/10 text-black/25 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-black/85'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Analyzing your room...
                </>
              ) : (
                'Audit my room →'
              )}
            </button>
          </motion.div>
        ) : (
          /* ──────── RESULTS PHASE ──────── */
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col"
          >
            {/* Room image banner */}
            {roomImage && (
              <div className="relative">
                <img
                  src={roomImage}
                  className="w-full object-cover"
                  style={{ maxHeight: '280px' }}
                  alt="Audited room"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/50 mb-1">
                      Room Audit Report
                    </p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest">
                      AI · Gemini
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Overall score card */}
            <div className="px-8 py-6 border-b border-black/8">
              <div className="flex items-center gap-6">
                {/* Big score */}
                <div className="flex-shrink-0 text-center">
                  <div className={`text-5xl font-display font-bold tracking-tight ${overallGrade(result.overallScore).color}`}>
                    {result.overallScore}
                  </div>
                  <div className={`text-sm font-bold ${overallGrade(result.overallScore).color}`}>
                    {overallGrade(result.overallScore).letter}
                  </div>
                  <div className="text-[7px] text-black/25 uppercase tracking-widest mt-1">
                    out of 100
                  </div>
                </div>

                {/* Mini dimension bars */}
                <div className="flex-1 flex flex-col gap-1.5">
                  {result.dimensions.map((dim, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[8px] text-black/40 w-[90px] truncate uppercase tracking-wide">
                        {dim.label.split(' ')[0]}
                      </span>
                      <div className="flex-1 h-1.5 bg-black/6 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dim.score * 10}%` }}
                          transition={{ duration: 0.6, delay: 0.1 * i, ease: 'easeOut' }}
                          className={`h-full rounded-full ${scoreColor(dim.score)}`}
                        />
                      </div>
                      <span className={`text-[9px] font-bold w-4 text-right ${scoreTextColor(dim.score)}`}>
                        {dim.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed dimensions */}
            <div className="px-8 py-6 space-y-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/25 mb-4">
                Detailed breakdown
              </p>
              {result.dimensions.map((dim, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 text-right">
                    <span className={`text-base font-bold ${scoreTextColor(dim.score)}`}>
                      {dim.score}
                    </span>
                  </div>
                  <div className="flex-1 pb-4 border-b border-black/6 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${scoreColor(dim.score)}`} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">
                        {dim.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-black/50 leading-relaxed">
                      {dim.verdict}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Fix Now section */}
            <div className="mx-8 mb-6 bg-black p-6">
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4">
                Fix now — Top 3 improvements
              </p>
              <div className="space-y-3">
                {result.fixNow.map((fix, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + 0.1 * i }}
                    className="flex gap-3"
                  >
                    <div className="w-5 h-5 bg-white text-black text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-[11px] text-white/80 leading-relaxed pt-0.5">
                      {fix}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Reset button */}
            <div className="px-8 pb-8">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 border border-black/15 text-[9px] font-bold uppercase tracking-[0.25em] text-black/50 hover:border-black/40 hover:text-black/70 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Audit another room
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomAudit;
