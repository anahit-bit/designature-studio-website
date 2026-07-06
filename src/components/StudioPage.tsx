import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Instagram, Facebook, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import Header from './Header';
import Footer from './Footer';
import ResponsiveImage from './ResponsiveImage';
import { cld, cldSrcSet, DEFAULT_WIDTHS } from '../lib/cld';
import { STUDIO_SCROLL_KEY } from './ConsultationCTA';

const STUDIO_HERO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1771178204/memphis_1_bhkave.jpg';
const FOUNDER_PHOTO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775402047/20260124_090857_yj4blf.jpg';

const StudioPage: React.FC = () => {
  const { t, language, navigateTo } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // "Start a project" CTAs set STUDIO_SCROLL_KEY before navigating here, asking us to
  // land on the contact form instead of the hero. We must run AFTER LanguageContext's
  // on-navigation scrollTo(0,0) (a parent effect), so we schedule via rAF (smooth in a
  // real browser) with a setTimeout fallback (fires even when the tab never paints, e.g.
  // headless preview). Whichever runs first consumes the flag; the other no-ops.
  useEffect(() => {
    let flagged = false;
    try { flagged = sessionStorage.getItem(STUDIO_SCROLL_KEY) === 'contact'; } catch { /* unavailable — land on top */ }
    if (!flagged) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      try { sessionStorage.removeItem(STUDIO_SCROLL_KEY); } catch { /* ignore */ }
      document.getElementById('contact')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    const raf = requestAnimationFrame(run);
    const timer = setTimeout(run, 60);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      projectType: String(fd.get('projectType') || ''),
      budget: String(fd.get('budget') || ''),
      message: String(fd.get('message') || '').trim(),
    };
    if (!payload.name || !payload.email || !payload.message) { setFormStatus('error'); return; }
    setFormStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('bad status');
      setFormStatus('success');
      formRef.current?.reset();
    } catch {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />

      {/* ══════════════════════════════════════════
          SECTION 1 — HERO (unchanged, kept as-is)
          ══════════════════════════════════════════ */}
      <section className="relative w-full h-[85vh] md:h-screen overflow-hidden bg-black font-body">
        <div className="absolute inset-0 z-0">
          <img
            src={cld(STUDIO_HERO, 1440)}
            srcSet={cldSrcSet(STUDIO_HERO, DEFAULT_WIDTHS)}
            sizes="100vw"
            width={1920} height={1080}
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
        </div>
        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-20">
          <div className="max-w-4xl pt-20">
            <button
              onClick={() => navigateTo('home')}
              className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-12 hover:text-white transition-colors flex items-center gap-2 group w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              {t('portfolio.backHome')}
            </button>
            <h1 className="text-3xl md:text-5xl lg:text-[5.5vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase mb-12 animate-in fade-in slide-in-from-bottom duration-1000">
              {t('studio.heroTitle')}
            </h1>
            <div className="flex flex-col md:flex-row md:items-start gap-12 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              <p className="text-white/80 text-base md:text-xl font-light leading-relaxed max-w-xl">
                {t('studio.heroSub')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-grow">

        {/* ══════════════════════════════════════════
            SECTION 2 — FOUNDER: Photo + Name split
            ══════════════════════════════════════════ */}
        <section className="grid lg:grid-cols-2 min-h-[90vh] mt-12 md:mt-20 border-t border-black/6">
          {/* Left — photo fills the column */}
          <div className="relative overflow-hidden bg-neutral-200" style={{ minHeight: '60vh' }}>
            <img
              src={cld(FOUNDER_PHOTO, 1024)}
              srcSet={cldSrcSet(FOUNDER_PHOTO, [480, 768, 1024, 1440])}
              sizes="(min-width: 1024px) 50vw, 100vw"
              width={1024} height={1280}
              loading="lazy"
              decoding="async"
              alt="Anahit Ghasabyan"
              className="w-full h-full object-cover object-center"
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* Fade right edge into white */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/20 pointer-events-none hidden lg:block" />
          </div>

          {/* Right — name, quote, stats */}
          <div className="flex flex-col justify-between px-12 md:px-20 py-20 bg-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-black/65 mb-6">
                {t('studio.founderTitle')}
              </p>
              <h2 className="font-display text-4xl md:text-5xl lg:text-[4.5vw] font-bold tracking-architectural leading-[0.88] uppercase mb-3">
                Anahit
              </h2>
              <h2 className="font-display text-4xl md:text-5xl lg:text-[4.5vw] font-bold tracking-architectural leading-[0.88] uppercase italic font-light mb-6">
                Ghasabyan
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-black/65 mb-12">
                {t('studio.founderRole')} · Designature Studio · Est. 2021
              </p>

              <blockquote className="text-lg md:text-xl font-light text-black/80 leading-relaxed italic border-l border-black/10 pl-6 mb-12 max-w-sm">
                "{t('studio.founderQuote')}"
              </blockquote>

              <p className="text-sm md:text-[15px] font-light text-black/75 leading-relaxed max-w-sm">
                {t('studio.founderBio')}
              </p>
            </div>

            <div>
              {/* Stats */}
              <div className="flex gap-12 pt-10 border-t border-black/6 mb-8">
                <div>
                  <span className="font-display text-3xl font-bold text-black block mb-1">100+</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-black/65">{t('studio.projects')}</span>
                </div>
                <div>
                  <span className="font-display text-3xl font-bold text-black block mb-1">2021</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-black/65">{t('studio.founded')}</span>
                </div>
                <div>
                  <span className="font-display text-3xl font-bold text-black block mb-1">9</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-black/65">{language === 'en' ? 'Countries' : 'Երկրներ'}</span>
                </div>
              </div>

              {/* Social */}
              <div className="flex gap-5">
                <a href="https://www.instagram.com/designature_interior/" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65 hover:text-black transition-colors border-b border-black/10 hover:border-black pb-0.5">Instagram</a>
                <a href="https://www.facebook.com/Designature.Design.Studio" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65 hover:text-black transition-colors border-b border-black/10 hover:border-black pb-0.5">Facebook</a>
                <a href="mailto:anahit@designature.studio" className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65 hover:text-black transition-colors border-b border-black/10 hover:border-black pb-0.5">Email</a>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 3 — STORY
            ══════════════════════════════════════════ */}
        <section className="py-24 md:py-32 bg-neutral-50 border-y border-black/5">
          <div className="max-w-[1600px] mx-auto px-8 md:px-16">
            <div className="grid lg:grid-cols-3 gap-16 md:gap-24">

              {/* Sticky label */}
              <div className="lg:sticky lg:top-32 lg:self-start">
                <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-black/65 mb-4">{t('studio.aboutTitle')}</p>
                <h3 className="font-display text-3xl md:text-4xl font-light leading-tight">
                  {language === 'en' ? <>Crafting spaces<br />with <em>purpose</em></> : t('studio.aboutHeading')}
                </h3>
              </div>

              {/* Story paragraphs */}
              <div className="lg:col-span-2 space-y-8">
                <p className="text-base md:text-lg font-light leading-relaxed text-black/85">
                  {t('studio.aboutDesc1')}
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-black/75">
                  {t('studio.aboutDesc2')}
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-black/75">
                  {t('studio.story.p3')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 5 — CONTACT (redesigned per approved mockup;
            white-dominant, brand canon: cobalt · terracotta · white)
            ══════════════════════════════════════════ */}
        <section id="contact" className="bg-white text-[#0A0A0A] scroll-mt-24 border-t border-[#DAD2C3]">
          <div className="max-w-[1180px] mx-auto px-8 md:px-16 py-20 md:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-16 items-start">

            {/* Left — invitation + contacts */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#6B6B6B]">Start a conversation</span>
              <h2 className="font-display text-4xl md:text-5xl font-medium leading-[1.02] tracking-[-0.01em] mt-3.5">
                Tell us about<br /><em className="italic text-[#9E5E41]">your space.</em>
              </h2>
              <div className="w-14 h-[2px] bg-[#9E5E41] my-6" aria-hidden="true" />
              <p className="text-[16px] text-[#404040] leading-relaxed max-w-[380px]">
                Whether it's a first apartment or a full commercial fit-out — send us a few details and we'll come back within two business days. No commitment, no pressure.
              </p>

              <div className="mt-10 flex flex-col gap-5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6B6B6B]">Email</span>
                  <a href="mailto:hello@designature.studio" className="text-[15px] font-medium text-[#0047AB] hover:text-[#003d99] transition-colors w-fit">hello@designature.studio</a>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6B6B6B]">WhatsApp Business</span>
                  <a href="https://wa.me/37477901991" target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium text-[#0047AB] hover:text-[#003d99] transition-colors w-fit">+374 77 901 991</a>
                </div>
              </div>

              <div className="flex gap-3.5 mt-8">
                <a href="https://www.instagram.com/designature_interior/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 border border-[#DAD2C3] flex items-center justify-center text-[#0A0A0A] hover:border-[#0047AB] hover:text-[#0047AB] transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://www.facebook.com/Designature.Design.Studio" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 border border-[#DAD2C3] flex items-center justify-center text-[#0A0A0A] hover:border-[#0047AB] hover:text-[#0047AB] transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right — form */}
            <div>
              {formStatus === 'success' ? (
                <div className="border border-[#DAD2C3] border-l-[3px] border-l-[#15803d] bg-[#FAFAFA] p-8 md:p-10">
                  <div className="flex items-center gap-2 text-[#15803d] text-[13px] font-bold uppercase tracking-[0.1em]">
                    <CheckCircle2 className="w-4 h-4" /> Message sent
                  </div>
                  <p className="text-[15px] text-[#404040] mt-2 leading-relaxed">
                    Thank you — we've received your note and will reply within two business days at the email you gave us.
                  </p>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="border border-[#DAD2C3] p-6 md:p-9">
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label htmlFor="c-name" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B] mb-2">Your name</label>
                      <input id="c-name" name="name" type="text" required placeholder="Anahit Ghasabyan" className="w-full text-[15px] text-[#0A0A0A] bg-white border border-[#DAD2C3] px-3.5 py-3 outline-none focus:border-[#0047AB] transition-colors" />
                    </div>
                    <div>
                      <label htmlFor="c-email" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B] mb-2">Email</label>
                      <input id="c-email" name="email" type="email" required placeholder="you@email.com" className="w-full text-[15px] text-[#0A0A0A] bg-white border border-[#DAD2C3] px-3.5 py-3 outline-none focus:border-[#0047AB] transition-colors" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label htmlFor="c-type" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B] mb-2">Project type</label>
                      <select id="c-type" name="projectType" defaultValue="Apartment" className="w-full text-[15px] text-[#0A0A0A] bg-white border border-[#DAD2C3] px-3.5 py-3 outline-none focus:border-[#0047AB] transition-colors">
                        <option>Apartment</option>
                        <option>House</option>
                        <option>Commercial</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="c-budget" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B] mb-2">Rough budget (optional)</label>
                      <select id="c-budget" name="budget" defaultValue="Prefer not to say" className="w-full text-[15px] text-[#0A0A0A] bg-white border border-[#DAD2C3] px-3.5 py-3 outline-none focus:border-[#0047AB] transition-colors">
                        <option>Prefer not to say</option>
                        <option>Under $10k</option>
                        <option>$10k–30k</option>
                        <option>$30k–75k</option>
                        <option>$75k+</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-5">
                    <label htmlFor="c-message" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B] mb-2">Tell us about the space</label>
                    <textarea id="c-message" name="message" required rows={5} placeholder="Rooms, timeline, what you're hoping to achieve…" className="w-full min-h-[120px] text-[15px] text-[#0A0A0A] bg-white border border-[#DAD2C3] px-3.5 py-3 outline-none focus:border-[#0047AB] transition-colors resize-y" />
                  </div>
                  <button type="submit" disabled={formStatus === 'loading'} className="w-full bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.28em] py-4 hover:bg-[#003d99] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {formStatus === 'loading' ? 'Sending…' : 'Send message →'}
                  </button>
                  {formStatus === 'error' && (
                    <div className="flex items-center gap-2 text-[#9E5E41] mt-3.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[12px] font-semibold">Something went wrong — please email hello@designature.studio directly.</span>
                    </div>
                  )}
                  <p className="text-[12px] text-[#6B6B6B] mt-3.5 text-center">
                    We reply within 2 business days. See our <a href="/privacy" className="text-[#0047AB] hover:text-[#003d99] transition-colors">Privacy Policy</a>.
                  </p>
                </form>
              )}
            </div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default StudioPage;
