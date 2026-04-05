
import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, t, navigateTo, currentPage } = useLanguage();

  // On white-background pages without hero images, we need black text from the start.
  // Studio page now has a hero, so it starts transparent like Home.
  const isDarkTextNeeded = isScrolled || currentPage === 'portfolio' || currentPage === 'project-detail' || currentPage === 'services' || currentPage === 'studio' || currentPage === 'pricing' || currentPage === 'faq';
  const isAIConceptsPage = currentPage === 'ai-concepts';
  const useLightNav = isAIConceptsPage && !isScrolled;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: t('nav.studio'), href: '#studio', page: 'studio', action: () => navigateTo('studio') },
    { name: t('nav.portfolio'), href: '#projects', page: 'portfolio', action: () => navigateTo('portfolio') },
    { name: t('nav.services'), href: '#services', page: 'services', action: () => navigateTo('services') },
    { name: t('nav.pricing'), href: '#pricing', page: 'pricing', action: () => navigateTo('pricing') },
    { name: t('nav.aiConcepts'), href: '#ai-concepts', page: 'ai-concepts', action: () => navigateTo('ai-concepts'), isHighlight: true },
  ];

  const LanguageSwitcher = () => (
    <button 
      onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
      className={`text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-300 px-2 ${
        (isDarkTextNeeded && !useLightNav) ? 'text-black hover:text-black/40' : 'text-white hover:text-white/40'
      }`}
    >
      {language === 'en' ? 'AM' : 'EN'}
    </button>
  );

  const CTAButton = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <button 
        onClick={() => window.open("https://calendly.com/designature-studio-us/free_consultation", "_blank")}
        className="group flex items-center justify-center gap-3 bg-black border border-black text-white px-6 py-2.5 text-[10px] font-bold font-body tracking-[0.25em] uppercase rounded-none transition-all duration-500 hover:bg-white hover:text-black hover:scale-[1.02] active:scale-[0.98]"
      >
        {t('btn.bookCall')}
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </button>
      <span className={`text-[8px] font-semibold font-body tracking-wider uppercase leading-none transition-colors duration-700 ${
        (isDarkTextNeeded && !useLightNav) ? 'text-black' : 'text-white/80'
      } ${language === 'en' ? 'italic' : ''}`}>
        {t('btn.firstConvo')}
      </span>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes ai-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.6); }
        }
      `}</style>
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 font-body ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-2xl border-b border-black/5 py-3' 
            : 'bg-transparent py-8'
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 flex items-center">
          <div onClick={() => navigateTo('home')} className="cursor-pointer mr-auto">
            <Logo invert={isAIConceptsPage || !(isDarkTextNeeded && !useLightNav)} className="h-8 md:h-10" />
          </div>

          <nav className="hidden lg:flex items-center gap-8 mr-12">
            {navLinks.map((link) => {
              const isActive = currentPage === link.page;
              return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  link.action();
                }}
                className={`relative text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 group ${
                  link.isHighlight
                    ? 'text-[#0047AB] hover:text-[#0047AB]/70'
                    : isActive
                      ? ((isDarkTextNeeded && !useLightNav) ? 'text-black' : 'text-white')
                      : ((isDarkTextNeeded && !useLightNav) ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white')
                }`}
                style={link.isHighlight ? { animation: 'ai-pulse 2.5s ease-in-out infinite' } : {}}
              >
                {link.name}
                {link.isHighlight && (
                  <span style={{
                    display: 'inline-block',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#0047AB',
                    marginLeft: '5px',
                    verticalAlign: 'middle',
                    animation: 'dot-pulse 2.5s ease-in-out infinite',
                  }} />
                )}
                {isActive && !link.isHighlight && (
                  <span className={`absolute -bottom-1 left-0 w-full h-[1.5px] ${(isDarkTextNeeded && !useLightNav) ? 'bg-black' : 'bg-white'}`} />
                )}
              </a>
            );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-8">
            <LanguageSwitcher />
            <CTAButton />
          </div>

          <button 
            data-testid="mobile-menu-button"
            className={`lg:hidden ml-6 transition-colors duration-300 ${(isDarkTextNeeded && !useLightNav) ? 'text-black' : 'text-white'}`} 
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div 
        className={`fixed inset-0 z-[200] bg-white transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] lg:hidden ${
          isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-8 py-8 md:px-16">
            <Logo invert={false} className="h-8" />
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-black">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center px-12 md:px-24 gap-6">
            {navLinks.map((link, i) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => {
                  e.preventDefault();
                  link.action();
                  setIsMobileMenuOpen(false);
                }}
                className={`text-3xl md:text-5xl lg:text-6xl font-display tracking-architectural transition-all duration-700 ${
                  isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
                } hover:translate-x-4 ${link.isHighlight ? 'text-[#0047AB]' : 'text-black hover:text-[#0047AB]'} ${language === 'en' ? 'italic' : ''}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="px-8 pb-10 md:px-16 md:pb-16 flex flex-col items-center gap-6">
            <LanguageSwitcher />
            <CTAButton className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
