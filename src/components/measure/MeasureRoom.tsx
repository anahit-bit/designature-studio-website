/**
 * MEASURE A ROOM FROM A PHOTO — the flow itself, without a page around it.
 *
 * Used twice: standalone at /measure, and inside Redesign My Room, where the
 * photo has already been chosen and the redesign needs specific numbers. It is
 * one component on purpose — the wording here took several rounds of the owner
 * testing it on real rooms, and a second copy would drift from it.
 *
 *   1. we read the photo and name what could be measured from it
 *   2. pick the one thing whose size you know, and give that size
 *   3. trace it — four taps, any order
 *   4. measure the room off it
 *
 * The division of labour is the one the bench proved: the model NAMES (it is
 * good at that), the person PLACES (the model's coordinates were wrong on every
 * object it named), and our geometry does the arithmetic.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../AuthContext";
import {
  buildCalibration,
  CALIBRATION_MESSAGE,
  humanLength,
  isCalibration,
  orderCorners,
} from "../../lib/tapMeasure.js";
import {
  KNOWN_OBJECTS,
  PLANE_ASK,
  type FoundItem,
} from "../../../services/measure/objects.js";
import type { RoomDimensions } from "../../../services/measure/dimensions.js";
import type { Pt } from "../../../services/measure/projective.js";

interface Measurement {
  a: Pt;
  b: Pt;
  mm: number;
}

/** A named thing the caller needs, asked for in order. */
export interface MeasureAsk {
  /** Names the number afterwards: "Ceiling height". */
  label: string;
  /** The instruction while it is being measured. */
  hint: string;
}

interface MeasureRoomProps {
  src: string;
  /** What to ask for, in order. Without it, people measure whatever they like. */
  asks?: MeasureAsk[];
  /** Fires on every change: the measurements so far, or null while there are none. */
  onResult?: (dimensions: RoomDimensions | null) => void;
  /** Buttons belonging to the host — "New photo" on the bench, "Done" in a dialog. */
  controls?: React.ReactNode;
}

/**
 * Shrink the photo before sending it to be read.
 *
 * The reading never sees more than 1100 px — the server resizes before the model
 * call — so a 12 MP original spends seconds of a phone's uplink for nothing. The
 * photo on screen stays the original; only the copy that is read is small.
 */
async function shrinkForReading(url: string, max = 1400): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    // Without this a photo served from another origin taints the canvas and
    // toDataURL throws, so the reading could never see a hosted sample.
    if (/^https?:/i.test(url)) el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("could not read that image"));
    el.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("this browser cannot resize the photo");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Offered when the room-reading finds nothing usable, or is unavailable. */
const FALLBACK_ITEMS: FoundItem[] = KNOWN_OBJECTS.map((o) => ({
  name: o.label,
  plane: o.plane,
  wholeInFrame: true,
  knownId: o.id,
  knownLabel: o.label,
  widthMm: o.widthMm,
  heightMm: o.heightMm,
  note: o.note,
}));

export default function MeasureRoom({ src, asks, onResult, controls }: MeasureRoomProps) {
  const { apiFetch } = useAuth();

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const [found, setFound] = useState<FoundItem[] | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const [chosen, setChosen] = useState<FoundItem | null>(null);
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  /** The size is not used until it is confirmed — the "enter" the owner asked for. */
  const [sizeOk, setSizeOk] = useState(false);

  const [quad, setQuad] = useState<Pt[]>([]);
  const [pending, setPending] = useState<Pt | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  /**
   * Once the shape is traced the pins STOP intercepting taps. On a small object
   * — a 600 mm floor tile is ~35 px on screen — the 28 px pins overlap each
   * other and swallow every measurement tap near them.
   */
  const [adjusting, setAdjusting] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBoxSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  // The size is ALWAYS the person's to change. A standard only pre-fills it —
  // "we know this one" with no way to disagree was the tool overruling them.
  const widthMm = Number(customW);
  const heightMm = Number(customH);

  const calibration = useMemo(() => {
    if (!natural) return "need-four-points" as const;
    return buildCalibration(quad, widthMm, heightMm, { w: natural.w, h: natural.h });
  }, [quad, widthMm, heightMm, natural]);
  const ready = isCalibration(calibration);

  const toPt = useCallback((e: React.PointerEvent): Pt => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ];
  }, []);

  function onSurfaceDown(e: React.PointerEvent) {
    if (dragging !== null || !chosen) return;
    // While the corners are being moved, a tap on the photo belongs to the pins
    // and nothing else. Sharing taps between the two put a measurement tap into
    // a pin and dragged the traced shape across the room.
    if (adjusting) return;
    const p = toPt(e);
    if (quad.length < 4) {
      setQuad((q) => [...q, p]);
      return;
    }
    if (!ready) return;
    if (!pending) {
      setPending(p);
      return;
    }
    const mm = calibration.measure(pending, p);
    if (mm !== null) setMeasurements((m) => [...m, { a: pending, b: p, mm }]);
    setPending(null);
  }

  function onSurfaceMove(e: React.PointerEvent) {
    if (dragging === null) return;
    const p = toPt(e);
    setQuad((q) => q.map((old, i) => (i === dragging ? p : old)));
  }

  const clearTrace = useCallback(() => {
    setAdjusting(false);
    setQuad([]);
    setPending(null);
    setMeasurements([]);
  }, []);

  const readRoom = useCallback(
    async (url: string) => {
      setReading(true);
      setReadError(null);
      try {
        const dataUrl = await shrinkForReading(url);
        const res = await apiFetch("/api/measure/identify", {
          method: "POST",
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        });
        if (res.status === 401) {
          setReadError("you are not signed in");
          setFound(FALLBACK_ITEMS);
          return;
        }
        if (!res.ok) throw new Error(`server said ${res.status}`);
        const body = (await res.json()) as { items?: FoundItem[] };
        const items = body.items ?? [];
        setFound(items.length ? items : FALLBACK_ITEMS);
      } catch (e) {
        setReadError((e as Error).message);
        setFound(FALLBACK_ITEMS);
      } finally {
        setReading(false);
      }
    },
    [apiFetch],
  );

  // A new photo starts a new measurement: nothing from the last one survives.
  useEffect(() => {
    let live = true;
    setNatural(null);
    setFound(null);
    setChosen(null);
    setCustomW("");
    setCustomH("");
    setSizeOk(false);
    clearTrace();
    const probe = new Image();
    probe.onload = () => {
      if (!live) return;
      setNatural({ w: probe.naturalWidth, h: probe.naturalHeight });
      void readRoom(src);
    };
    probe.src = src;
    return () => {
      live = false;
    };
  }, [src, readRoom, clearTrace]);

  const labelFor = useCallback(
    (i: number) => asks?.[i]?.label ?? `Measurement ${i + 1}`,
    [asks],
  );

  // Hand the numbers up on every change, so the host never has to ask for them.
  useEffect(() => {
    if (!onResult) return;
    if (!isCalibration(calibration) || measurements.length === 0) {
      onResult(null);
      return;
    }
    onResult({
      items: measurements.map((m, i) => ({ label: labelFor(i), mm: Math.round(m.mm) })),
      bandPct: Math.round(calibration.band * 100),
      ruler: chosen?.name,
    });
  }, [measurements, calibration, chosen, labelFor, onResult]);

  function pick(item: FoundItem) {
    setSizeOk(false);
    setChosen(item);
    setCustomW(item.widthMm ? String(item.widthMm) : "");
    setCustomH(item.heightMm ? String(item.heightMm) : "");
    clearTrace();
  }

  /** "Something else" — the escape hatch that must always be there. */
  function pickOther() {
    setSizeOk(false);
    setChosen({ name: "something else", plane: "wall", wholeInFrame: true });
    setCustomW("");
    setCustomH("");
    clearTrace();
  }

  const X = (p: Pt) => p[0] * boxSize.w;
  const Y = (p: Pt) => p[1] * boxSize.h;
  /** Drawn in going-round order, so taps in any order never make a bow-tie. */
  const shape = natural && quad.length === 4 ? orderCorners(quad, natural) : quad;

  const sizeTyped = !!chosen && widthMm > 0 && heightMm > 0;
  const sizeGiven = sizeTyped && sizeOk;
  const traced = quad.length === 4;
  const thing = chosen?.name === "something else" ? "thing you measured" : chosen?.name;
  /** The named thing still wanted, if the host named any. */
  const nextAsk = asks?.[measurements.length];

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div
        ref={wrapRef}
        // Shrink-wraps the photo, so a tap's position is measured against the
        // picture itself and not against empty column space beside it.
        className="relative mx-auto w-fit touch-none select-none"
        onPointerDown={onSurfaceDown}
        onPointerMove={onSurfaceMove}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        {/* A portrait phone photo at full column width is taller than the screen,
            so the corners being tapped and the steps explaining them could not
            be seen together. Cap it to the viewport. */}
        <img src={src} alt="" className="block h-auto max-h-[70vh] w-auto max-w-full" draggable={false} />
        <svg
          className="pointer-events-none absolute inset-0"
          width={boxSize.w}
          height={boxSize.h}
          aria-hidden="true"
        >
          {quad.length === 4 && (
            <polygon
              points={shape.map((p) => `${X(p)},${Y(p)}`).join(" ")}
              fill="rgba(0,71,171,.14)"
              stroke="#0047AB"
              strokeWidth={2}
            />
          )}
          {measurements.map((m, i) => (
            <g key={i}>
              <line
                x1={X(m.a)} y1={Y(m.a)} x2={X(m.b)} y2={Y(m.b)}
                stroke="#B90000" strokeWidth={2}
              />
              <text
                x={(X(m.a) + X(m.b)) / 2}
                y={(Y(m.a) + Y(m.b)) / 2 - 8}
                fill="#B90000" fontSize={13} fontWeight={700} textAnchor="middle"
                style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 4 }}
              >
                {humanLength(m.mm)}
              </text>
            </g>
          ))}
          {pending && <circle cx={X(pending)} cy={Y(pending)} r={5} fill="#B90000" />}
        </svg>

        {/* What to do next, ON the photo — where the tap has to happen. */}
        {sizeGiven && (quad.length < 4 || adjusting || (ready && !pending && measurements.length === 0)) && (
          // Centred with flex, not a translate class: this app's stylesheet
          // applies translate utilities twice, which shifted the hint a whole
          // width to the left and off the photo.
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <div className="max-w-[90%] bg-black/75 px-3 py-1.5 text-center text-[11px] font-semibold leading-snug text-white shadow">
              {quad.length < 4
                ? `Tap the 4 corners of the ${thing} — ${4 - quad.length} to go`
                : adjusting
                  ? "Drag any pin onto its exact corner, then press Done moving"
                  : nextAsk
                    ? nextAsk.hint
                    : "Now tap one end of what you want to measure"}
            </div>
          </div>
        )}

        {quad.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Corner ${i + 1}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDragging(i);
            }}
            style={{
              left: X(p),
              top: Y(p),
              // Inline, not -translate-x-1/2: the translate classes are applied
              // twice here, which drew every pin half its size up and left of
              // the spot that was tapped.
              transform: "translate(-50%, -50%)",
              pointerEvents: quad.length < 4 || adjusting ? "auto" : "none",
              opacity: quad.length < 4 || adjusting ? 1 : 0.55,
            }}
            className="absolute grid h-7 w-7 cursor-grab place-items-center rounded-full border-2 border-white bg-[#0047AB] text-[10px] font-bold text-white shadow-md active:cursor-grabbing"
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <Step
          n={1}
          active={!chosen}
          done={!!chosen}
          summary={chosen?.name}
          onChange={() => {
            setChosen(null);
            setSizeOk(false);
            clearTrace();
          }}
          title={readError ? "Pick something you can see" : "What we found in your room"}
        >
          {reading && <p className="text-[12px] text-black/50">Reading the photo…</p>}
          {!reading && found && (
            <>
              {readError && (
                <p className="mb-3 border-l-2 border-[#9E5E41] bg-[#FBF3EC] px-3 py-2 text-[11px] text-[#7a4630]">
                  <b>We could not read this photo</b> ({readError}), so nothing below was found
                  in your room — it is just a list of things that come in standard sizes.
                  Pick one only if you can actually see it in the picture.
                </p>
              )}
              <p className="text-[12px] text-black/60">
                {readError
                  ? "Or measure anything you like with a tape and choose “something else”."
                  : "Which of these do you know the size of? Pick one — we only need one."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {found.map((f) => {
                  const usable = f.wholeInFrame;
                  const on = chosen?.name === f.name;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      disabled={!usable}
                      title={usable ? undefined : "Cut off or hidden — can't be traced"}
                      onClick={() => pick(f)}
                      className={`border px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-[.08em] ${
                        on
                          ? "border-transparent bg-[#0047AB] text-white"
                          : usable
                            ? "border-black/15 text-black/70 hover:border-[#0047AB]"
                            : "cursor-not-allowed border-dashed border-black/10 text-black/25"
                      }`}
                    >
                      {f.name}
                      {f.widthMm ? (
                        <span className={on ? "text-white/70" : "text-black/40"}>
                          {" "}· {f.widthMm / 10}×{f.heightMm! / 10} cm
                        </span>
                      ) : null}
                      {!usable && <span className="text-black/25"> · cut off</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={pickOther}
                  className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${
                    chosen?.name === "something else"
                      ? "border-transparent bg-[#0047AB] text-white"
                      : "border-black/15 text-black/70 hover:border-[#0047AB]"
                  }`}
                >
                  Something else — I'll measure it
                </button>
              </div>
            </>
          )}
        </Step>

        {chosen && (
          <Step
            n={2}
            active={!sizeGiven}
            done={sizeGiven}
            summary={`${widthMm} × ${heightMm} mm`}
            onChange={() => setSizeOk(false)}
            title={`How big is the ${chosen.name}?`}
          >
            <p className="text-[12px] text-black/60">
              {chosen.knownId
                ? `We filled in the standard size. ${chosen.note ?? ""} Change it if yours is different. The two sides can go in either order.`
                : `${chosen.note ?? "Measure it once with a tape."} The two sides can go in either order.`}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Num value={customW} onChange={setCustomW} label="one side" onEnter={() => sizeTyped && setSizeOk(true)} />
              <span className="text-black/30">×</span>
              <Num value={customH} onChange={setCustomH} label="other side" onEnter={() => sizeTyped && setSizeOk(true)} />
              <span className="text-[11px] text-black/45">mm</span>
            </div>
            <button
              type="button"
              disabled={!sizeTyped}
              onClick={() => setSizeOk(true)}
              className="mt-3 bg-[#0047AB] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-white disabled:cursor-not-allowed disabled:bg-black/15"
            >
              {sizeTyped ? `Use ${widthMm} × ${heightMm} mm →` : "Enter both numbers"}
            </button>
          </Step>
        )}

        {sizeGiven && (
          <Step
            n={3}
            active={!traced}
            done={traced}
            summary={adjusting ? "Drag any pin onto its corner" : "Traced"}
            changeLabel={adjusting ? "done" : "move the corners"}
            onChange={() => setAdjusting((a) => !a)}
            title={`Trace the ${chosen!.name}`}
          >
            {quad.length < 4 ? (
              <>
                <p className="text-[12px] text-black/80">
                  Now trace the same <b>{thing}</b> you
                  just gave the size of. Its four corners show us the angle the photo was taken from — that is
                  what turns the picture into centimetres.
                </p>
                <p className="text-[12px] text-black/60">
                  Tap its four corners on the photo, in any order. <b>{4 - quad.length} to go.</b>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#0047AB]">
                  {chosen!.trace ??
                    `Put the four pins on the ${chosen!.name} itself — the same thing whose size you just gave.`}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-black/60">
                {adjusting
                  ? "Drag any pin onto its exact corner. The accuracy comes from these four points."
                  : "Traced. If a pin is not exactly on a corner, move it — that is where the accuracy comes from."}
              </p>
            )}
          </Step>
        )}

        {quad.length === 4 && (
          <Step n={4} active title="Measure">
            {!ready ? (
              <p className="text-[12px] text-[#9E5E41]">
                {CALIBRATION_MESSAGE[calibration]}
              </p>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-black">
                  {pending
                    ? "Now tap the other end."
                    : nextAsk
                      ? nextAsk.hint
                      : measurements.length
                        ? "Tap two more points for another distance."
                        : PLANE_ASK[chosen!.plane].ask}
                </p>
                {/* One line, not a paragraph: people are standing in a room with a
                    phone, not reading. The ruler line only runs until they measure
                    something, then it gives way to what else is worth tapping. */}
                <p className="mt-1 text-[12px] text-black/60">
                  {measurements.length
                    ? PLANE_ASK[chosen!.plane].more
                    : `The ${thing} was just our ruler — these numbers are the room.`}
                </p>
                <p className="mt-1 text-[11px] text-black/45">
                  ±{Math.round(calibration.band * 100)}% on this photo.
                </p>
                {calibration.warnings.map((w) => (
                  <p
                    key={w}
                    className="mt-2 border-l-2 border-[#9E5E41] bg-[#FBF3EC] px-3 py-2 text-[11px] text-[#7a4630]"
                  >
                    {w}
                  </p>
                ))}
                <ul className="mt-3 flex flex-col gap-1">
                  {measurements.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between border-b border-black/10 py-1 text-[12px]"
                    >
                      <span className="text-black/50">{labelFor(i)}</span>
                      <b className="font-mono text-[13px]">{humanLength(m.mm)}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Step>
        )}

        <div className="flex flex-wrap gap-2">
          {traced && (
            <button
              type="button"
              onClick={() => setAdjusting((a) => !a)}
              className={`border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] ${
                adjusting
                  ? "border-transparent bg-[#0047AB] text-white"
                  : "border-black/15 text-black/60 hover:border-black/40"
              }`}
            >
              {adjusting ? "Done moving" : "Move the corners"}
            </button>
          )}
          {quad.length > 0 && (
            <button
              type="button"
              onClick={clearTrace}
              className="border border-black/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-black/60 hover:border-black/40"
            >
              Redo the corners
            </button>
          )}
          {controls}
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  active,
  done,
  summary,
  onChange,
  changeLabel,
  children,
}: {
  n: number;
  title: string;
  active: boolean;
  /** Settled — collapses to its answer so the eye goes to what is still open. */
  done?: boolean;
  summary?: string;
  onChange?: () => void;
  /** "change" says nothing about what changes; a step can say it plainly. */
  changeLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={active || done ? "" : "opacity-40"}>
      <div className="flex items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center text-[9px] font-bold text-white ${
            done ? "bg-[#15803d]" : "bg-black"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-[12px] font-bold uppercase tracking-[.3em]">{title}</h2>
      </div>
      {done ? (
        <p className="mt-1 flex items-center gap-2 pl-7 text-[12px]">
          <b>{summary}</b>
          {onChange && (
            <button
              type="button"
              onClick={onChange}
              className="text-[11px] font-semibold text-[#0047AB] underline underline-offset-2"
            >
              {changeLabel ?? "change"}
            </button>
          )}
        </p>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </section>
  );
}

function Num({
  value,
  onChange,
  label,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  onEnter?: () => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      placeholder={label}
      value={value}
      // Digits only. A text box that silently swallows "abc" and then reports a
      // size is worse than one that simply will not take it.
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
      }}
      className="w-20 border border-black/15 px-2 py-1 text-right font-mono text-[12px] focus:border-[#0047AB] focus:outline-none"
    />
  );
}
