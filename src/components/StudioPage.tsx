import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Instagram, Facebook } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useProjects } from '../ProjectsContext';
import Header from './Header';
import Footer from './Footer';
import ResponsiveImage from './ResponsiveImage';
import { cld, cldSrcSet, DEFAULT_WIDTHS } from '../lib/cld';
import { STUDIO_SCROLL_KEY } from './ConsultationCTA';
import { trackCalendly } from '../lib/track';

const STUDIO_HERO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1771178204/memphis_1_bhkave.jpg';
const FOUNDER_PHOTO = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1775402047/20260124_090857_yj4blf.jpg';

/** Free 15-min intro chat — same Calendly link the header/AI surfaces use. */
const FREE_CONVO_URL = 'https://calendly.com/hello-designature/quick-conversation';

/** Client-facing distillation of the studio's 10-stage workflow. */
const PROCESS_STEPS = [
  { n: '01', title: 'Brief',                body: 'We listen — how you live, what must stay, what the space needs to become. Everything starts here.' },
  { n: '02', title: 'Concept',              body: 'Plans, palette and materials come together into one considered design concept you can feel.' },
  { n: '03', title: 'Drawings & renders',   body: 'Technical drawings and photoreal 3D, so nothing is left to chance before a wall moves.' },
  { n: '04', title: 'Sourcing & handover',  body: 'A costed shopping list, supervision, and a walkthrough — down to the last light switch.' },
];

const StudioPage: React.FC = () => {
  const { t, language, navigateTo } = useLanguage();
  const { projects } = useProjects();

  // Selected work — same behaviour as the home FeaturedWork: Fisher-Yates shuffle
  // the full (Sanity-backed) list on each mount and take 4, so every page reload
  // surfaces a different cross-section of the studio's work.
  const featured = useMemo(() => {
    const arr = [...projects];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 4);
  }, [projects]);

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

  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />

      {/* ══════════════════════════════════════════
          SECTION 1 — HERO (unchanged, kept as-is)
          ══════════════════════════════════════════ */}
      <section className="relative w-full h-[60vh] md:h-[68vh] min-h-[440px] max-h-[720px] overflow-hidden bg-black font-body">
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
        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-10">
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
                  <span className="text-[11px] uppercase tracking-[0.3em] text-black/65">Countries</span>
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
                  Engineered to feel<br /><em>effortless</em>
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
            SECTION 4 — PROCESS (how we work: 4 client-facing steps)
            ══════════════════════════════════════════ */}
        <section className="bg-white py-24 md:py-32">
          <div className="max-w-[1600px] mx-auto px-8 md:px-16">
            <div className="max-w-2xl mb-16 md:mb-20">
              <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-black/65 mb-4">How we work</p>
              <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-light leading-[1.05]">
                From first conversation<br />to <em>keys in the door.</em>
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {PROCESS_STEPS.map((step) => (
                <div key={step.n} className="border-t-2 border-[#0047AB] pt-6">
                  <span className="font-display text-lg text-[#0047AB] font-semibold tracking-[0.1em]">{step.n}</span>
                  <h4 className="text-[15px] font-bold uppercase tracking-[0.08em] mt-3 mb-3">{step.title}</h4>
                  <p className="text-sm font-light leading-relaxed text-black/70">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 5 — SELECTED WORK (real portfolio projects → /portfolio)
            ══════════════════════════════════════════ */}
        <section className="bg-white border-t border-black/5 py-24 md:py-32">
          <div className="max-w-[1600px] mx-auto px-8 md:px-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-12 md:mb-16">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-black/65 mb-4">Selected work</p>
                <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-light leading-[1.05]">
                  A few rooms we're <em>proud of.</em>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { navigateTo('portfolio'); window.scrollTo({ top: 0 }); }}
                className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#0047AB] border-b border-[#0047AB] pb-1 hover:text-[#003d99] transition-colors"
              >
                View portfolio
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((project) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => { navigateTo('project-detail', project.id); window.scrollTo({ top: 0 }); }}
                  aria-label={project.titleEN}
                  className="group relative aspect-[4/5] bg-neutral-100 overflow-hidden text-left w-full appearance-none border-0 p-0 cursor-pointer"
                >
                  <ResponsiveImage
                    src={project.imageUrl}
                    alt={project.titleEN}
                    aspectRatio="4/5"
                    crop="fill"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    widths={[300, 480, 640]}
                    baseWidth={480}
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/70 mb-1">
                      {project.categoryEN}
                    </p>
                    <p className="text-sm font-medium text-white leading-tight">
                      {project.titleEN}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 6 — CONTACT (two doors: paid consultation · free chat;
            replaces the old project-submission form. Keeps #contact anchor so
            site-wide "Start a project" CTAs still land here.)
            ══════════════════════════════════════════ */}
        <section id="contact" className="bg-white text-[#0A0A0A] scroll-mt-24 border-t border-[#DAD2C3]">
          <div className="max-w-[1180px] mx-auto px-8 md:px-16 py-20 md:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-16 items-start">

            {/* Left — invitation + direct contacts */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#6B6B6B]">Start a conversation</span>
              <h2 className="font-display text-4xl md:text-5xl font-medium leading-[1.02] tracking-[-0.01em] mt-3.5">
                Let's talk about<br /><em className="italic text-[#9E5E41]">your space.</em>
              </h2>
              <div className="w-14 h-[2px] bg-[#9E5E41] my-6" aria-hidden="true" />
              <p className="text-[16px] text-[#404040] leading-relaxed max-w-[380px]">
                Two easy ways to begin — pick whichever fits where you are. Prefer to write first? Reach us on email or WhatsApp anytime.
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

            {/* Right — two booking "doors" */}
            <div className="flex flex-col gap-4">
              {/* Door 1 — paid consultation (you know what you need) */}
              <div className="border border-[#DAD2C3] p-7 md:p-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#0047AB]">Ready to start</span>
                <h3 className="font-display text-2xl md:text-[28px] font-medium mt-2 mb-2.5">Book a consultation</h3>
                <p className="text-[14px] text-[#404040] leading-relaxed mb-6 max-w-[440px]">
                  You know what your space needs and want expert answers. 45 focused minutes on Google Meet — and it credits toward a full project later.
                </p>
                <button
                  type="button"
                  onClick={() => { navigateTo('consultation'); window.scrollTo({ top: 0 }); }}
                  className="group inline-flex items-center gap-2 bg-[#0047AB] text-white text-[12px] font-bold uppercase tracking-[0.22em] px-6 py-3.5 hover:bg-[#003d99] transition-colors"
                >
                  Book a $99 consultation
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Door 2 — free conversation (still deciding) */}
              <div className="border border-[#DAD2C3] p-7 md:p-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#6B6B6B]">Still deciding</span>
                <h3 className="font-display text-2xl md:text-[28px] font-medium mt-2 mb-2.5">Book a free conversation</h3>
                <p className="text-[14px] text-[#404040] leading-relaxed mb-6 max-w-[440px]">
                  Not sure we're the right studio for you yet? A relaxed 15-minute chat to talk it through — no commitment, no pressure.
                </p>
                <button
                  type="button"
                  onClick={() => trackCalendly(FREE_CONVO_URL, 'studio_contact')}
                  className="group inline-flex items-center gap-2 bg-transparent border border-[#0A0A0A]/25 text-[#0A0A0A] text-[12px] font-bold uppercase tracking-[0.22em] px-6 py-3.5 hover:border-[#0A0A0A]/60 transition-colors"
                >
                  Book a free conversation
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default StudioPage;
