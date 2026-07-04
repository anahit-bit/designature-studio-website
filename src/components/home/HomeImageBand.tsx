import React from 'react';
import { useLanguage } from '../../LanguageContext';
import ResponsiveImage from '../ResponsiveImage';

interface Panel {
  cat: string;
  cap: string;
  imageUrl: string;
  filter: 'Residential' | 'Commercial';
}

/**
 * Hero image band with desktop hover-to-expand. On mouse-enter of any panel,
 * non-hovered panels dim and shrink (flex 1) while the hovered one grows
 * (flex 6). On mouse-leave the panels return to equal thirds. The behavior
 * is gated by the `:hover` selector on the parent so it's automatically
 * disabled on touch devices (which never trigger CSS hover persistently).
 *
 * Mobile: stacks vertically, no hover, each panel ~50vh.
 *
 * Placeholder images are reused from the existing portfolio cover assets
 * until the owner swaps in real category renders.
 */
const HomeImageBand: React.FC = () => {
  const { t, navigateTo } = useLanguage();

  // Reuse the three hero slides from the previous Hero.tsx slideshow so the
  // hero band shows the same imagery the owner curated for /. These map
  // 1:1 to the new categories (apartment → house → commercial).
  const panels: Panel[] = [
    {
      cat: t('home.band.apartments.cat'),
      cap: t('home.band.apartments.cap'),
      imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1770985128/1_wsuf6e.jpg',
      filter: 'Residential',
    },
    {
      cat: t('home.band.houses.cat'),
      cap: t('home.band.houses.cap'),
      imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1777898987/hero_image_commercial_majogz.png',
      filter: 'Residential',
    },
    {
      cat: t('home.band.commercial.cat'),
      cap: t('home.band.commercial.cap'),
      imageUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1777895308/hero_commercial_o0m0sk.png',
      filter: 'Commercial',
    },
  ];

  return (
    <section
      aria-label="Studio categories"
      className="hero-image-band w-full bg-black flex flex-col md:flex-row gap-1"
      style={{ height: 'clamp(440px, 80vh, 900px)' }}
    >
      <style>{`
        .hero-image-band { display: flex; }
        .hero-image-band .hero-render {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          flex: 1 1 0;
          min-width: 0;
          transition: flex 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), filter 0.6s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .hero-image-band:hover .hero-render { flex: 1 1 0; filter: brightness(0.55) saturate(0.85); }
          .hero-image-band:hover .hero-render:hover { flex: 6 1 0; filter: brightness(1) saturate(1); }
          .hero-image-band:hover .hero-render:not(:hover) .hero-meta { opacity: 0; }
          .hero-render:hover .hero-render-img { transform: scale(1.06); }
        }
        .hero-render-img { transition: transform 1.2s ease; }
        .hero-meta { transition: opacity 0.4s ease; }
        @media (max-width: 767px) {
          .hero-image-band { flex-direction: column; height: auto !important; }
          .hero-image-band .hero-render { height: 50vh; min-height: 320px; flex: none; }
        }
      `}</style>

      {panels.map((p) => (
        <button
          key={p.cat}
          type="button"
          onClick={() => navigateTo('portfolio', undefined, p.filter)}
          aria-label={p.cat}
          className="hero-render appearance-none border-0 bg-transparent p-0 m-0 text-left w-full"
        >
          <div className="absolute inset-0">
            {/* crop="limit" delivers the full landscape source; object-cover then
                frames it the same way at any panel width (slim → expanded).
                Using a wide-screen sizes hint so the browser pulls a high-res
                variant that stays sharp when one panel expands to ~6/8 of the
                viewport on hover. */}
            <ResponsiveImage
              src={p.imageUrl}
              alt={p.cat}
              crop="limit"
              priority
              sizes="(min-width: 768px) 80vw, 100vw"
              className="hero-render-img absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          <div
            className="hero-meta absolute left-0 right-0 bottom-0 z-10 text-white p-7 md:p-8"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)' }}
          >
            <span className="block text-[12px] font-bold tracking-[0.32em] uppercase text-white/85 mb-2.5">
              {p.cat}
            </span>
            <span className="block font-display font-normal leading-[1.2] text-[22px] md:text-[26px] lg:text-[30px] max-w-[320px]">
              {p.cap}
            </span>
          </div>
        </button>
      ))}
    </section>
  );
};

export default HomeImageBand;
