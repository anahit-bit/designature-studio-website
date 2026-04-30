
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, LogOut } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { language, setLanguage, t, navigateTo, currentPage } = useLanguage();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account dropdown when clicking outside
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isAccountMenuOpen]);

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
      className={`text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300 px-2 ${
        (isDarkTextNeeded && !useLightNav) ? 'text-black hover:text-black/65' : 'text-white hover:text-white/70'
      }`}
    >
      {language === 'en' ? 'AM' : 'EN'}
    </button>
  );

  const CTAButton = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <button
        onClick={() => window.open("https://calendly.com/designature-studio-us/free_consultation", "_blank")}
        className="group flex items-center justify-center gap-3 bg-black border border-black text-white px-6 py-2.5 text-[11px] font-bold font-body tracking-[0.25em] uppercase rounded-none transition-all duration-500 hover:bg-white hover:text-black hover:scale-[1.02] active:scale-[0.98]"
      >
        {t('btn.bookCall')}
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </button>
      <span className={`text-[10px] font-semibold font-body tracking-wider uppercase leading-none transition-colors duration-700 ${
        (isDarkTextNeeded && !useLightNav) ? 'text-black/75' : 'text-white/85'
      } ${language === 'en' ? 'italic' : ''}`}>
        {t('btn.firstConvo')}
      </span>
    </div>
  );

  const onDarkBg = !(isDarkTextNeeded && !useLightNav);
  const isOnAIConcepts = currentPage === 'ai-concepts';
  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  /** Secondary header CTA — visibly less prominent than the primary "Let's chat" Calendly button.
   *  Logged out: "Try AI free →" text-link → /ai-concepts.
   *  Logged in: account chip + "Go to Studio" with a sign-out dropdown.
   *  Hidden while AuthContext is still probing /api/auth/me to avoid a flash of the wrong state. */
  const SecondaryCTA = ({ inMobileMenu = false }: { inMobileMenu?: boolean }) => {
    if (authLoading) {
      return inMobileMenu ? null : <div className="min-w-[100px]" aria-hidden />;
    }

    if (!user) {
      // Hide on /ai-concepts when logged out — the user is already there.
      if (isOnAIConcepts && !inMobileMenu) return null;
      const baseColor = inMobileMenu
        ? 'text-[#0047AB] hover:text-[#003d99]'
        : (onDarkBg ? 'text-white hover:text-white/70' : 'text-[#0047AB] hover:text-[#003d99]');
      return (
        <button
          onClick={() => {
            navigateTo('ai-concepts');
            if (inMobileMenu) setIsMobileMenuOpen(false);
          }}
          className={`group flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] uppercase transition-colors ${baseColor}`}
        >
          {t('nav.tryAiFree')}
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      );
    }

    // Logged-in chip + Go to Studio + sign-out dropdown
    const textColor = inMobileMenu ? 'text-black' : (onDarkBg ? 'text-white' : 'text-black');
    const subtleColor = inMobileMenu ? 'text-black/55' : (onDarkBg ? 'text-white/55' : 'text-black/55');
    return (
      <div className="relative flex items-center gap-2" ref={inMobileMenu ? undefined : accountMenuRef}>
        <button
          onClick={() => setIsAccountMenuOpen((v) => !v)}
          aria-label={user.name || user.email}
          aria-haspopup="menu"
          aria-expanded={isAccountMenuOpen}
          className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden border border-current/20 bg-[#0047AB] text-white text-[10px] font-bold flex-shrink-0"
        >
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span>{userInitial}</span>
          )}
        </button>
        <button
          onClick={() => {
            navigateTo('ai-concepts');
            if (inMobileMenu) setIsMobileMenuOpen(false);
          }}
          className={`group flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] uppercase transition-colors ${textColor} hover:opacity-70`}
        >
          {t('nav.goToStudio')}
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
        {isAccountMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 min-w-[180px] bg-white border border-black/10 shadow-lg py-1 z-[110]"
          >
            <div className="px-4 py-2 border-b border-black/5">
              <div className="text-[10px] font-bold text-black truncate">{user.name}</div>
              <div className={`text-[9px] truncate ${subtleColor.replace('text-white', 'text-black').replace('/55', '/45')}`}>
                {user.email}
              </div>
            </div>
            <button
              role="menuitem"
              onClick={async () => {
                setIsAccountMenuOpen(false);
                if (inMobileMenu) setIsMobileMenuOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-black hover:bg-black/5 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              {t('nav.signOut')}
            </button>
          </div>
        )}
      </div>
    );
  };

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
            : (isDarkTextNeeded && !useLightNav)
              ? 'bg-transparent py-8'
              : 'bg-gradient-to-b from-black/40 via-black/15 to-transparent py-8'
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 flex items-center">
          <div onClick={() => navigateTo('home')} className="cursor-pointer mr-auto">
            <Logo invert={!(isDarkTextNeeded && !useLightNav)} className="h-8 md:h-10" />
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
                className={`relative text-[12px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 group ${
                  link.isHighlight
                    ? 'text-[#0047AB] hover:text-[#0047AB]/75'
                    : isActive
                      ? ((isDarkTextNeeded && !useLightNav) ? 'text-black' : 'text-white')
                      : ((isDarkTextNeeded && !useLightNav) ? 'text-black/70 hover:text-black' : 'text-white/75 hover:text-white')
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
            {/* <LanguageSwitcher /> */}
            <SecondaryCTA />
            <CTAButton />
          </div>

          <button
            data-testid="mobile-menu-button"
            className={`lg:hidden ml-6 p-2 rounded-full transition-all duration-300 ${
              (isDarkTextNeeded && !useLightNav)
                ? 'text-black'
                : 'text-white bg-black/30 backdrop-blur-md border border-white/20 hover:bg-black/40'
            }`}
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
                className={`text-base md:text-lg font-body font-bold uppercase tracking-[0.25em] transition-all duration-700 ${
                  isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
                } hover:translate-x-4 ${link.isHighlight ? 'text-[#0047AB]' : 'text-black hover:text-[#0047AB]'}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="px-8 pb-10 md:px-16 md:pb-16 flex flex-col items-center gap-6">
            {/* <LanguageSwitcher /> */}
            <SecondaryCTA inMobileMenu />
            <CTAButton className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
