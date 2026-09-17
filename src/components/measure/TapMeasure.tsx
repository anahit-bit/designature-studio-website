/**
 * /measure — the bench page for measuring a room from a photo.
 *
 * Internal: it exists so the measuring can be tried on any photo, on its own,
 * without spending a redesign. The flow itself lives in MeasureRoom, which
 * Redesign My Room uses too — there is one implementation of it, not two.
 */
import { useState } from "react";
import MeasureRoom from "./MeasureRoom";

/**
 * The studio's own showcase room, already published on the live site. The photo
 * that used to sit here was of the owner's flat, which has no business in a
 * public repository — and a bench page should not import the product's UI just
 * to borrow a URL.
 */
const SAMPLE_ROOM =
  "https://res.cloudinary.com/dys2k5muv/image/upload/v1776281427/photo_t1vo5h.png";

export default function TapMeasure() {
  const [src, setSrc] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setSrc(URL.createObjectURL(f));
  }

  return (
    <div className="studio-frame mx-auto max-w-5xl px-5 py-10 text-black">
      <p className="text-[11px] font-bold uppercase tracking-[.32em] text-[color:var(--cobalt)]">
        Measure from a photo
      </p>
      <h1 className="hl text-black mt-2 text-[40px] leading-[1.05]">
        Tell us the size of <em>one thing.</em>
        <br />
        We work out the rest.
      </h1>

      {!src ? (
        <>
          <label className="mt-8 flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-black/20 bg-black/[.02] py-16 text-center hover:border-[color:var(--cobalt)]">
            <span className="text-[13px] font-semibold">Choose a photo of your room</span>
            <span className="mt-1 text-[11px] text-black/50">
              Any angle. It doesn't matter if the room runs off the edges.
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          <p className="mt-4 text-center text-[12px] text-black/50">
            No photo to hand?{" "}
            <button
              type="button"
              onClick={() => setSrc(SAMPLE_ROOM)}
              className="font-semibold text-[color:var(--cobalt)] underline underline-offset-2"
            >
              show it on a template room
            </button>
          </p>
        </>
      ) : (
        <div className="mt-8">
          <MeasureRoom
            // A different photo is a different measurement: remount rather than
            // carry a trace from the last room into this one.
            key={src}
            src={src}
            controls={
              <label className="cursor-pointer border border-black/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-black/60 hover:border-black/40">
                New photo
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
            }
          />
        </div>
      )}
    </div>
  );
}
