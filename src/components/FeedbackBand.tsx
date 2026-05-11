interface FeedbackBandProps {
  onOpenFeedback: () => void;
}

// AI-022 back-port / AI-023: persistent feedback band at the bottom of every AI tool view.
// Wires into the existing FeedbackModal via setFeedbackOpen(true).
export default function FeedbackBand({ onOpenFeedback }: FeedbackBandProps) {
  return (
    <section className="bg-[#FAFAFA] border-t border-[#DAD2C3] py-9">
      <div className="max-w-[1440px] mx-auto px-6 md:px-14 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#0047AB] mb-1.5">Tell the studio</p>
          <p className="font-display text-[22px] leading-tight">How was this for you?</p>
        </div>
        <button
          type="button"
          onClick={onOpenFeedback}
          className="bg-[#0047AB] text-white px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#003d99] transition-colors inline-flex items-center gap-2"
        >
          Share feedback →
        </button>
      </div>
    </section>
  );
}
