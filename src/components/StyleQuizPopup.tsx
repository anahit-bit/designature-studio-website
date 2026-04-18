import React, { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';

const SHOW_DELAY_MS = 12_000;
const DISMISS_KEY = 'ds_style_quiz_popup_dismissed';

const HERO_IMAGE =
  'https://res.cloudinary.com/dys2k5muv/image/upload/v1770985128/1_wsuf6e.jpg';

const StyleQuizPopup: React.FC = () => {
  const { currentPage, navigateTo, language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (currentPage === 'ai-concepts') return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [currentPage]);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const startQuiz = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    navigateTo('ai-concepts');
  };

  if (!visible) return null;

  const isArm = language === 'am';
  const heading = isArm ? 'Հետաքրքի՞ր է Ձեր ոճը' : 'Curious What Your Style Is?';
  const sub = isArm
    ? 'Անցեք մեր կարճ թեստը՝ Ձեր ինտերիերի ոճը պարզելու համար'
    : 'Take our short quiz to find your interior style';
  const cta = isArm ? 'Սկսել ոճի թեստը' : 'Start My Style Quiz';

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-quiz-popup-title"
    >
      <div
        className="bg-white max-w-xl w-full max-h-[95vh] overflow-y-auto relative shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur text-black/60 hover:text-black hover:bg-white flex items-center justify-center text-2xl leading-none transition-colors z-10 shadow-sm"
        >
          ×
        </button>

        <div className="px-8 pt-10 pb-1 text-center">
          <h2
            id="style-quiz-popup-title"
            className="text-3xl md:text-4xl font-display font-semibold text-black mb-3 leading-tight"
          >
            {heading}
          </h2>
          <p className="text-sm md:text-base text-black/65 leading-relaxed max-w-md mx-auto">
            {sub}
          </p>
        </div>

        <div className="px-6 pt-6">
          <img
            src={HERO_IMAGE}
            alt=""
            className="w-full h-56 md:h-72 object-cover"
            loading="lazy"
          />
        </div>

        <div className="px-8 py-8 flex justify-center">
          <button
            onClick={startQuiz}
            className="px-10 py-4 bg-[#0047AB] hover:bg-[#003d99] text-white text-[11px] font-bold uppercase tracking-[0.3em] transition-colors"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleQuizPopup;
