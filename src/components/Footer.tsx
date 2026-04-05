import React, { useState } from 'react';
import { Mail, Instagram, Facebook, X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import Logo from './Logo';
import PolicyModal, { type PolicyKind } from './PolicyModal';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12.031 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.759.459 3.476 1.33 4.988l-1.413 5.161 5.281-1.386c1.465.799 3.11 1.22 4.79 1.221h.004c5.505 0 9.99-4.478 9.991-9.984 0-2.669-1.037-5.176-2.924-7.062-1.887-1.886-4.393-2.923-7.069-2.923zm5.729 14.28c-.245.69-1.42 1.265-1.95 1.345-.47.07-1.07.125-3.13-.725-2.64-1.085-4.34-3.79-4.475-3.97-.13-.18-1.09-1.445-1.09-2.76 0-1.315.685-1.96.93-2.225.245-.265.54-.33.72-.33l.515.005c.18 0 .42-.065.655.5.245.6.84 2.055.915 2.205.075.15.125.33.025.53-.1.2-.15.33-.3.51-.15.18-.315.4-.45.535-.15.15-.31.315-.135.62.175.3.775 1.28 1.66 2.07.1.09.2.145.3.19.145.065.345.1.515.05.21-.065.915-.365 1.155-.7.245-.335.245-.57.365-.775.125-.2.315-.165.535-.085.22.085 1.39.655 1.63.77.24.12.395.18.455.28.06.1.06.575-.185 1.265z" />
  </svg>
);

const SuccessModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { language, t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-6">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-500"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-black border border-white p-12 md:p-20 text-center animate-in fade-in zoom-in duration-500 rounded-none shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-8 uppercase tracking-architectural leading-tight">
          {t('footer.successTitle')}
        </h3>
        <p className="text-white/70 text-base md:text-lg font-body font-light leading-relaxed mb-16 max-w-md mx-auto">
          {t('footer.successDesc')}
        </p>
        
        <button 
          onClick={onClose}
          className="w-full md:w-auto px-16 py-5 bg-white text-black text-[11px] font-bold uppercase tracking-[0.5em] transition-all duration-500 hover:bg-[#0047AB] hover:text-white border border-white rounded-none"
        >
          {t('footer.close')}
        </button>
      </div>
    </div>
  );
};

const Footer: React.FC = () => {
  const { language, t, navigateTo } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyKind | null>(null);

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSubscribe = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (response.ok) {
        setStatus('success');
        setEmail('');
        setIsModalOpen(true);
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        const errorText = await response.text();
        console.error('API Response Error:', errorText);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Network failure:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const footerLinks = {
    studio: [
      { name: t('nav.portfolio'), action: () => navigateTo('portfolio') },
      { name: t('nav.services'), action: () => navigateTo('services') },
      { name: t('nav.blog'), action: () => navigateTo('home') },
      { name: t('footer.about'), action: () => navigateTo('studio') },
    ],
    useful: [
      { name: t('footer.terms'), policy: 'terms' as const },
      { name: t('footer.privacy'), policy: 'privacy' as const },
    ],
    faq: { name: 'FAQ', action: () => navigateTo('faq') },
  };

  const getButtonText = () => {
    if (status === 'loading') return t('footer.submitting');
    return t('footer.subscribe');
  };

  return (
    <>
      <footer className="bg-black text-white pt-20 pb-10 font-body border-t border-white/5">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16 mb-24">
            
            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/30">{t('footer.studio')}</h4>
              <nav className="flex flex-col gap-4">
                {footerLinks.studio.map((link) => (
                  <button 
                    key={link.name} 
                    onClick={link.action}
                    className="text-left text-xs font-bold uppercase tracking-widest text-white/60 hover:text-[#0047AB] transition-colors duration-300"
                  >
                    {link.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/30">{t('footer.usefulLinks')}</h4>
              <nav className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={footerLinks.faq.action}
                  className="text-left text-xs font-bold uppercase tracking-widest text-white/60 hover:text-[#0047AB] transition-colors duration-300"
                >
                  {footerLinks.faq.name}
                </button>
                {footerLinks.useful.map((link) => (
                  <button
                    key={link.name}
                    type="button"
                    onClick={() => setPolicyModal(link.policy)}
                    className="text-left text-xs font-bold uppercase tracking-widest text-white/60 hover:text-[#0047AB] transition-colors duration-300"
                  >
                    {link.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/30">{t('footer.contacts')}</h4>
              <div className="flex flex-col gap-6">
                <a href="mailto:hello@designature.studio" className="text-xs font-bold tracking-widest uppercase text-white/60 hover:text-[#0047AB] transition-colors duration-300">
                  hello@designature.studio
                </a>
                
                <div className="flex flex-col gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{t('footer.usOffice')}</span>
                  <a href="https://wa.me/13474801265" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 text-xs font-bold tracking-widest uppercase text-white/60 hover:text-[#0047AB] transition-colors duration-300">
                    <WhatsAppIcon className="w-4 h-4 text-white group-hover:text-[#0047AB] transition-colors" />
                    +1 (347) 480-1265
                  </a>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{t('footer.amOffice')}</span>
                  <a href="https://wa.me/37493860364" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 text-xs font-bold tracking-widest uppercase text-white/60 hover:text-[#0047AB] transition-colors duration-300">
                    <WhatsAppIcon className="w-4 h-4 text-white group-hover:text-[#0047AB] transition-colors" />
                    +374 93 86 03 64
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h4 className={`text-xl md:text-2xl font-display font-medium tracking-architectural leading-tight text-white ${language === 'en' ? 'italic' : ''}`}>
                {t('footer.newsletterHeader')}
              </h4>
              <div className="flex flex-col gap-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.emailLabel')}
                  className={`w-full bg-white text-black px-4 py-4 text-xs font-medium tracking-widest focus:outline-none rounded-none placeholder:text-black/40 transition-all duration-300 border ${
                    status === 'error' ? 'border-red-500 animate-shake' : 'border-transparent'
                  }`}
                />
                <button 
                  onClick={handleSubscribe}
                  disabled={status === 'loading'}
                  className="w-full bg-black border border-white text-white px-8 py-4 text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-500 hover:bg-[#0047AB] hover:border-[#0047AB] rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getButtonText()}
                </button>
                <p className="text-[9px] font-medium tracking-widest text-white/30 leading-relaxed uppercase">
                  {t('footer.newsletterSub')}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <Logo invert={true} className="h-6 md:h-8" />
            
            <div className="flex items-center gap-10">
              <a 
                href="https://www.facebook.com/Designature.Design.Studio" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-white hover:text-[#0047AB] transition-colors duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com/designature_interior/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-white hover:text-[#0047AB] transition-colors duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
            
            <div className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/20 md:order-first">
              {t('footer.rights')}
            </div>
          </div>
        </div>
      </footer>
      
      <SuccessModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
      <PolicyModal open={policyModal} onClose={() => setPolicyModal(null)} />
    </>
  );
};

export default Footer;
