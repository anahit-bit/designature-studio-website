import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

const CHECK = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
    <path d="M1.5 6l3 3 6-6" stroke="#0047AB" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CHECK_W = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
    <path d="M1.5 6l3 3 6-6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CROSS = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
    <path d="M2 2l8 8M10 2l-8 8" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const NotifyButton: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!email || !email.includes('@')) return;
    // mailto as simple backend-free capture
    window.location.href = `mailto:hello@designature.studio?subject=Notify me — Pricing Launch&body=Please notify me when paid plans launch.%0A%0AEmail: ${email}`;
    setSent(true);
    setTimeout(() => { setOpen(false); setSent(false); setEmail(''); }, 2000);
  };

  if (sent) return (
    <div className={`w-full py-3 text-center text-[9px] font-bold uppercase tracking-[0.15em] ${dark ? 'text-green-400' : 'text-green-600'}`}>
      ✓ Got it — we'll notify you
    </div>
  );

  if (open) return (
    <div className="flex gap-2 mt-1">
      <input
        autoFocus
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        className={`flex-1 px-3 py-2.5 text-[10px] border outline-none min-w-0 ${dark ? 'bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/50' : 'bg-white border-black/20 text-black placeholder-black/30 focus:border-black/50'}`}
      />
      <button
        onClick={handleSubmit}
        className={`px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] whitespace-nowrap ${dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-black text-white hover:bg-black/80'} transition-colors`}
      >
        Notify me
      </button>
    </div>
  );

  return (
    <button
      onClick={() => setOpen(true)}
      className={`w-full py-3 text-[9px] font-bold uppercase tracking-[0.15em] border transition-colors ${dark ? 'bg-transparent text-white/40 border-white/15 hover:border-white/30 hover:text-white/60' : 'bg-transparent text-black/40 border-black/15 hover:border-black/30 hover:text-black/60'}`}
    >
      Notify me when live
    </button>
  );
};

const PricingSection: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { navigateTo } = useLanguage();

  return (
    <section id="pricing" className={`${compact ? "pt-6 md:pt-8" : "pt-16 md:pt-24"} pb-16 md:pb-24 bg-white font-body`}>
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">

        <div className="flex flex-col items-center text-center mb-8">
          <h2 className="text-sm font-bold uppercase tracking-[1em] text-black/30 mb-8">Pricing</h2>
          <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-4">
            Simple, honest pricing.
          </h3>
          <p className="text-black/50 text-sm md:text-base font-light leading-relaxed">
            Start free. Upgrade when you're ready.<br />Paid plans launching soon.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border border-black/8">

          {/* FREE */}
          <div className="border-r border-black/8 p-8 flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-black/5 text-black/40 w-fit mb-5">Free</span>
            <div className="mb-4">
              <span className="text-[34px] font-bold tracking-tight leading-none text-black">$0</span>
              <span className="text-[12px] text-black/40 ml-1">/ forever</span>
            </div>
            <div className="h-[22px] mb-3" />
            <div className="text-[13px] font-medium text-black mb-1">Explore</div>
            <div className="text-[10px] text-black/50 leading-relaxed mb-5 pb-5 border-b border-black/8">
              Try the full AI journey before spending anything. No credit card needed.
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-black/30 mb-3 mt-2">AI Tools</div>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">Style Quiz</strong> — unlimited</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">AI Vision</strong> — 3 concepts</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">Shopping List</strong> — per concept + PDF</span></div>
              <div className="flex items-start gap-2"><CROSS /><span className="text-[10px] text-black/30 leading-relaxed">Room Audit · Design Brief · Cultural Advisor</span></div>
            </div>
            <div className="mt-auto pt-4">
              <button onClick={() => navigateTo('ai-concepts')} className="w-full py-3 bg-[#0047AB] text-white text-[9px] font-bold uppercase tracking-[0.15em] hover:bg-[#003d99] transition-colors">
                Start free — no card needed
              </button>
              <p className="text-[8px] text-black/30 text-center mt-2 tracking-[0.08em]">Concepts not saved after session</p>
            </div>
          </div>

          {/* DESIGN */}
          <div className="bg-[#0a0a0a] border-r border-white/8 p-8 flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-[#0047AB] text-white w-fit mb-5">Most popular</span>
            <div className="mb-2">
              <span className="text-[34px] font-bold tracking-tight leading-none text-white" style={{ filter: 'blur(7px)', userSelect: 'none' }}>$9</span>
              <span className="text-[12px] text-white/30 ml-1">/ month</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">Coming soon</div>
            <div className="text-[13px] font-medium text-white mb-1">Design</div>
            <div className="text-[10px] text-white/35 leading-relaxed mb-5 pb-5 border-b border-white/8">
              For homeowners actively working on one space.
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/20 mb-3 mt-2">AI Tools</div>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-start gap-2"><CHECK_W /><span className="text-[10px] text-white/45 leading-relaxed">Everything in Free</span></div>
              <div className="flex items-start gap-2"><CHECK_W /><span className="text-[10px] text-white/45 leading-relaxed"><strong className="text-white/80 font-medium">AI Vision</strong> — 30 credits / month</span></div>
              <div className="flex items-start gap-2"><CHECK_W /><span className="text-[10px] text-white/45 leading-relaxed"><strong className="text-white/80 font-medium">Shopping Lists</strong> — 20 / month</span></div>
              <div className="flex items-start gap-2"><CHECK_W /><span className="text-[10px] text-white/45 leading-relaxed"><strong className="text-white/80 font-medium">Room Audit</strong> — 3 / month</span></div>
              <div className="flex items-start gap-2"><CHECK_W /><span className="text-[10px] text-white/45 leading-relaxed"><strong className="text-white/80 font-medium">Design Brief</strong> — 1 / month</span></div>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/20 mb-3">Project Discount</div>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-start gap-2"><CHECK_W /><span className="text-[10px] text-white/45 leading-relaxed"><strong className="text-white/80 font-medium">10% off</strong> full design project</span></div>
            </div>
            <div className="mt-auto pt-4">
              <NotifyButton dark />
              <p className="text-[8px] text-white/20 text-center mt-2 tracking-[0.08em]">Price shown when launched</p>
            </div>
          </div>

          {/* STUDIO */}
          <div className="p-8 flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-black/5 text-black/40 w-fit mb-5">Studio</span>
            <div className="mb-2">
              <span className="text-[34px] font-bold tracking-tight leading-none text-[#0047AB]" style={{ filter: 'blur(7px)', userSelect: 'none' }}>$24</span>
              <span className="text-[12px] text-black/40 ml-1">/ month</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30 mb-3">Coming soon</div>
            <div className="text-[13px] font-medium text-black mb-1">Studio</div>
            <div className="text-[10px] text-black/50 leading-relaxed mb-5 pb-5 border-b border-black/8">
              For designers or anyone renovating multiple spaces.
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-black/30 mb-3 mt-2">AI Tools</div>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed">Everything in Design</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">AI Vision</strong> — unlimited</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">Shopping Lists</strong> — unlimited</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">Room Audit</strong> — unlimited</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">All 6 AI tools</strong> incl. Cultural Advisor</span></div>
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">Project folders</strong> — save concepts &amp; images per project</span></div>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-black/30 mb-3">Project Discount</div>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-start gap-2"><CHECK /><span className="text-[10px] text-black/60 leading-relaxed"><strong className="text-black font-medium">20% off</strong> full design project</span></div>
            </div>
            <div className="mt-auto pt-4">
              <NotifyButton />
              <p className="text-[8px] text-black/30 text-center mt-2 tracking-[0.08em]">Price shown when launched</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PricingSection;
