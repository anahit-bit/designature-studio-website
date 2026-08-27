/**
 * /virtual-staging — the real-estate "doorway" for Virtual Staging (V1).
 *
 * English-only, targeted at US/UK agents, sellers, and short-let hosts. It does NOT
 * change the consumer "Redesign my room" experience — its primary CTA deep-links into
 * the existing AI Studio in staging mode (`/ai-concepts?mode=staging`), which routes the
 * generate call to the fal virtual-staging engine and shows the "Virtually staged" MLS
 * disclosure banner. Batch upload, agent pricing, and a burned-in image label are V2/V1.1.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Home, ShieldCheck, ShoppingBag, UserCheck, ArrowRight } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';

const STAGE_CTA = '/ai-concepts?mode=staging';

const STEPS = [
  { n: '01', title: 'Upload the empty room', body: 'Drop in a photo of a vacant or tired room from the listing.' },
  { n: '02', title: 'Pick a style', body: 'Choose a broad-appeal look — modern, transitional, Scandinavian, coastal.' },
  { n: '03', title: 'Get a staged photo', body: 'AI furnishes the space in seconds, keeping the real walls, windows, and proportions.' },
];

const TRUST = [
  { icon: Home, title: 'Keeps the real room', body: 'We furnish the space you actually have — we don’t invent new windows or doors, so photos represent the property.' },
  { icon: ShoppingBag, title: 'Optionally shoppable', body: 'Turn a staged room into a shopping list of real furniture — a nice touch for buyers, and a lead magnet for you.' },
  { icon: UserCheck, title: 'Human review available', body: 'Want a designer to polish a hero shot before it goes live? Add a review — something pure-AI tools don’t offer.' },
];

const VirtualStagingPage: React.FC = () => {
  const navigate = useNavigate();
  const stage = () => navigate(STAGE_CTA);

  return (
    <div className="min-h-screen bg-white font-body text-black">
      <Header />

      {/* Hero */}
      <section className="px-6 pt-28 pb-16 md:pt-36 md:pb-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A3A82] mb-5">
          <Sparkles size={14} /> AI Virtual Staging for Real Estate
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight text-black">
          Stage a listing in seconds — not weeks.
        </h1>
        <p className="mt-6 text-[16px] md:text-[18px] text-black/70 max-w-2xl mx-auto leading-relaxed">
          Physical staging runs $1,500&ndash;$5,000 a room. Upload a photo of an empty room and our AI furnishes it
          in seconds &mdash; keeping the real space, so buyers trust what they see. Built for agents, sellers, and short-let hosts.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={stage}
            className="inline-flex items-center gap-2 bg-[#0A3A82] text-white text-[12px] font-bold uppercase tracking-[0.2em] px-8 py-4 hover:bg-[#082f6b] transition-colors">
            Stage a listing <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/pricing')}
            className="text-[12px] font-bold uppercase tracking-[0.2em] px-8 py-4 border border-black/20 hover:border-black/50 transition-colors">
            See pricing
          </button>
        </div>
        <p className="mt-4 text-[12px] text-black/50">First staging is free &middot; no credit card</p>
      </section>

      {/* How it works */}
      <section className="bg-[#F7F5F0] px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center md:text-left">
                <div className="font-display text-3xl text-[#0A3A82] mb-2">{s.n}</div>
                <h3 className="text-[15px] font-semibold mb-1.5">{s.title}</h3>
                <p className="text-[14px] text-black/65 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / differentiators */}
      <section className="px-6 py-16 md:py-24 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-10">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="w-11 h-11 flex items-center justify-center bg-[#0A3A82]/8 text-[#0A3A82] rounded-full mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
              <p className="text-[14px] text-black/65 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance note */}
      <section className="bg-black text-white px-6 py-14">
        <div className="max-w-3xl mx-auto flex items-start gap-4">
          <ShieldCheck size={24} className="text-white/70 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-display text-2xl font-semibold mb-2">Honest by default</h3>
            <p className="text-[14px] text-white/70 leading-relaxed">
              Every staged image is clearly marked <strong className="text-white">&ldquo;Virtually staged&rdquo;</strong> and comes with
              ready-to-paste disclosure text for your listing remarks. Most MLSs (and some states) require it &mdash; we make it easy to stay compliant.
              We never edit out a property&rsquo;s real condition; we stage its potential.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">Try it on your next listing.</h2>
        <p className="text-[15px] text-black/65 mb-8">Your first staging is free. See the difference before you spend a cent.</p>
        <button onClick={stage}
          className="inline-flex items-center gap-2 bg-[#0A3A82] text-white text-[12px] font-bold uppercase tracking-[0.2em] px-10 py-4 hover:bg-[#082f6b] transition-colors">
          Stage a listing free <ArrowRight size={16} />
        </button>
      </section>

      <Footer />
    </div>
  );
};

export default VirtualStagingPage;
