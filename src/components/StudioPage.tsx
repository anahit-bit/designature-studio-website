import React, { useState, useRef } from 'react';
import { ArrowLeft, Instagram, Facebook, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import Header from './Header';
import Footer from './Footer';
import emailjs from '@emailjs/browser';

const StudioPage: React.FC = () => {
  const { t, language, navigateTo } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    setFormStatus('loading');
    const SERVICE_ID = 'service_6v89z1a';
    const TEMPLATE_ID = 'template_v888z1a';
    const PUBLIC_KEY = 'user_v888z1a';
    emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, PUBLIC_KEY)
      .then(() => {
        setFormStatus('success');
        formRef.current?.reset();
        setTimeout(() => setFormStatus('idle'), 5000);
      }, (error) => {
        console.error('EmailJS Error:', error);
        setFormStatus('error');
        setTimeout(() => setFormStatus('idle'), 5000);
      });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />

      {/* ══════════════════════════════════════════
          SECTION 1 — HERO (unchanged, kept as-is)
          ══════════════════════════════════════════ */}
      <section className="relative w-full h-[85vh] md:h-screen overflow-hidden bg-black font-body">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(https://res.cloudinary.com/dys2k5muv/image/upload/v1771178204/memphis_1_bhkave.jpg)` }}
        >
          <div className="absolute inset-0 bg-black/40 z-[1]" />
        </div>
        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-20">
          <div className="max-w-4xl pt-20">
            <button
              onClick={() => navigateTo('home')}
              className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-12 hover:text-white transition-colors flex items-center gap-2 group w-fit"
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
              src="https://res.cloudinary.com/dys2k5muv/image/upload/v1775402047/20260124_090857_yj4blf.jpg"
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
              <p className="text-[8px] font-bold uppercase tracking-[0.5em] text-black/30 mb-6">
                {t('studio.founderTitle')}
              </p>
              <h2 className="font-display text-4xl md:text-5xl lg:text-[4.5vw] font-bold tracking-architectural leading-[0.88] uppercase mb-3">
                Anahit
              </h2>
              <h2 className="font-display text-4xl md:text-5xl lg:text-[4.5vw] font-bold tracking-architectural leading-[0.88] uppercase italic font-light mb-6">
                Ghasabyan
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-black/30 mb-12">
                {t('studio.founderRole')} · Designature Studio · Est. 2021
              </p>

              <blockquote className="text-lg md:text-xl font-light text-black/60 leading-relaxed italic border-l border-black/10 pl-6 mb-12 max-w-sm">
                "{t('studio.founderQuote')}"
              </blockquote>

              <p className="text-sm font-light text-black/50 leading-relaxed max-w-sm">
                {t('studio.founderBio')}
              </p>
            </div>

            <div>
              {/* Stats */}
              <div className="flex gap-12 pt-10 border-t border-black/6 mb-8">
                <div>
                  <span className="font-display text-3xl font-bold text-black block mb-1">100+</span>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-black/30">{t('studio.projects')}</span>
                </div>
                <div>
                  <span className="font-display text-3xl font-bold text-black block mb-1">2021</span>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-black/30">{t('studio.founded')}</span>
                </div>
                <div>
                  <span className="font-display text-3xl font-bold text-black block mb-1">9</span>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-black/30">{language === 'en' ? 'Countries' : 'Երկրներ'}</span>
                </div>
              </div>

              {/* Social */}
              <div className="flex gap-5">
                <a href="https://www.instagram.com/designature_interior/" target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/30 hover:text-black transition-colors border-b border-black/10 hover:border-black pb-0.5">Instagram</a>
                <a href="https://www.facebook.com/Designature.Design.Studio" target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/30 hover:text-black transition-colors border-b border-black/10 hover:border-black pb-0.5">Facebook</a>
                <a href="mailto:anahit@designature.studio" className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/30 hover:text-black transition-colors border-b border-black/10 hover:border-black pb-0.5">Email</a>
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
                <p className="text-[8px] font-bold uppercase tracking-[0.5em] text-black/30 mb-4">{t('studio.aboutTitle')}</p>
                <h3 className="font-display text-3xl md:text-4xl font-light leading-tight">
                  {language === 'en' ? <>Crafting spaces<br />with <em>purpose</em></> : t('studio.aboutHeading')}
                </h3>
              </div>

              {/* Story paragraphs */}
              <div className="lg:col-span-2 space-y-8">
                <p className="text-base md:text-lg font-light leading-relaxed text-black/70">
                  {t('studio.aboutDesc1')}
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-black/50">
                  {t('studio.aboutDesc2')}
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-black/50">
                  {t('studio.story.p3')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 5 — CONTACT (dark, redesigned)
            ══════════════════════════════════════════ */}
        <section id="contact" className="bg-neutral-950 text-white">
          <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-24 md:py-32 grid lg:grid-cols-2 gap-0">

            {/* Left — contact info */}
            <div className="lg:pr-20 lg:border-r border-white/20 flex flex-col justify-between pb-16 lg:pb-0">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.5em] text-white/50 mb-5">
                  {t('studio.contact.title')}
                </p>
                <h2 className="font-display text-5xl md:text-6xl font-light leading-[0.92] letter-spacing-tight mb-6">
                  {language === 'en' ? <>Let's build<br />something<br /><em className="text-white/70">remarkable</em></> : <>Ստեղծենք<br />ինչ-որ<br /><em className="text-white/70">հիշարժան</em></>}
                </h2>
                <p className="text-sm font-light text-white/60 leading-relaxed max-w-xs mt-8">
                  {t('studio.contactSub')}
                </p>
              </div>

              <div className="mt-16 space-y-0">
                {[
                  { label: t('studio.contact.email'), values: ['hello@designature.studio'], href: 'mailto:hello@designature.studio' },
                  { label: t('studio.contact.phone'), values: ['+1 (347) 480-1265', '+374 93 86 03 64'], href: 'tel:+13474801265' },
                  { label: t('studio.contact.location'), values: [t('studio.contact.location.desc')], href: null },
                ].map((item, i) => (
                  <div key={i} className="flex gap-8 py-5 border-t border-white/15">
                    <span className="text-[8px] uppercase tracking-[0.35em] text-white/40 w-14 flex-shrink-0 pt-0.5">{item.label}</span>
                    <div className="flex flex-col gap-1">
                      {item.values.map((v, j) => (
                        item.href ? (
                          <a key={j} href={item.href} className="text-sm font-light text-white/80 hover:text-white transition-colors">{v}</a>
                        ) : (
                          <span key={j} className="text-sm font-light text-white/80">{v}</span>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:pl-20 pt-16 lg:pt-0 flex flex-col justify-center">
              <p className="font-display text-lg italic text-white/60 mb-12">
                {t('studio.contact.form.title')}
              </p>

              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-0">
                {/* Name + Email row */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="border-b border-white/20 pb-3 focus-within:border-white/50 transition-colors">
                    <label className="block text-[7px] uppercase tracking-[0.4em] text-white/40 mb-2">{t('studio.formName')}</label>
                    <input type="text" name="user_name" required className="w-full bg-transparent text-white text-sm font-light outline-none placeholder-white/40" placeholder={t('studio.contact.form.name')} />
                  </div>
                  <div className="border-b border-white/20 pb-3 focus-within:border-white/50 transition-colors">
                    <label className="block text-[7px] uppercase tracking-[0.4em] text-white/40 mb-2">{t('studio.formEmail')}</label>
                    <input type="email" name="user_email" required className="w-full bg-transparent text-white text-sm font-light outline-none placeholder-white/40" placeholder={t('studio.contact.form.email')} />
                  </div>
                </div>

                <div className="border-b border-white/20 pb-3 focus-within:border-white/50 transition-colors mt-8">
                  <label className="block text-[7px] uppercase tracking-[0.4em] text-white/40 mb-2">{t('studio.formSubject')}</label>
                  <input type="text" name="subject" required className="w-full bg-transparent text-white text-sm font-light outline-none placeholder-white/40" placeholder={t('studio.contact.form.subject')} />
                </div>

                <div className="border-b border-white/20 pb-3 focus-within:border-white/50 transition-colors mt-8">
                  <label className="block text-[7px] uppercase tracking-[0.4em] text-white/40 mb-2">{t('studio.formMessage')}</label>
                  <textarea name="message" required rows={4} className="w-full bg-transparent text-white text-sm font-light outline-none resize-none placeholder-white/40" placeholder={t('studio.contact.form.message')} />
                </div>

                {/* Submit row */}
                <div className="flex items-center justify-end mt-10 pt-8 border-t border-white/15">
                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="flex items-center gap-3 bg-white text-black text-[9px] font-bold uppercase tracking-[0.35em] px-8 py-4 hover:bg-white/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {formStatus === 'loading' ? t('studio.formSending') : t('studio.formSend')}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {formStatus === 'success' && (
                  <div className="flex items-center gap-3 text-emerald-400 mt-4 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{t('studio.formSuccess')}</span>
                  </div>
                )}
                {formStatus === 'error' && (
                  <div className="flex items-center gap-3 text-rose-400 mt-4 animate-in fade-in">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{t('studio.formError')}</span>
                  </div>
                )}
              </form>
            </div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default StudioPage;
