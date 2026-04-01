
import React from 'react';
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
// Fixed: Imported Variants type from framer-motion to resolve TypeScript inference issues with easing values
import { motion, Variants } from 'framer-motion';
import { useLanguage, PortfolioFilter } from '../LanguageContext';
import Header from './Header';
import Footer from './Footer';

const ServicesPage: React.FC = () => {
  const { t, language, navigateTo } = useLanguage();

  const serviceCategories = [
    {
      id: 'residential',
      title: t('serv.res.title'),
      intro: t('serv.res.intro'),
      items: t('serv.res.list').split('|'),
      cta: t('serv.cta.res'),
      filter: 'Residential' as PortfolioFilter
    },
    {
      id: 'commercial',
      title: t('serv.com.title'),
      intro: t('serv.com.intro'),
      items: t('serv.com.list').split('|'),
      cta: t('serv.cta.com'),
      filter: 'Commercial' as PortfolioFilter
    },
    {
      id: 'renovation',
      title: t('serv.ren.title'),
      intro: t('serv.ren.intro'),
      items: t('serv.ren.list').split('|'),
      cta: t('serv.cta.ren'),
      filter: 'All' as PortfolioFilter
    }
  ];

  const workingSteps = [
    { id: '01', titleKey: 'proc.step1.title', descKey: 'proc.step1.desc' },
    { id: '02', titleKey: 'proc.step2.title', descKey: 'proc.step2.desc' },
    { id: '03', titleKey: 'proc.step3.title', descKey: 'proc.step3.desc' },
    { id: '04', titleKey: 'proc.step4.title', descKey: 'proc.step4.desc' },
    { id: '05', titleKey: 'proc.step5.title', descKey: 'proc.step5.desc' },
    { id: '06', titleKey: 'proc.step6.title', descKey: 'proc.step6.desc' },
  ];

  const scrollToContent = () => {
    const element = document.getElementById('services-grid');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Animation variants
  // Fixed: Explicitly typed as Variants to avoid 'string' vs 'Easing' mismatch
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  // Fixed: Explicitly typed as Variants to allow cubic-bezier array [number, number, number, number] for ease property
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.23, 1, 0.32, 1]
      }
    }
  };

  // Fixed: Explicitly typed as Variants to ensure 'easeInOut' is recognized as a valid Easing value
  const pathVariants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 2,
        ease: "easeInOut",
        delay: 1
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body text-black">
      <Header />
      
      {/* Cinematic Hero Section */}
      <section className="relative w-full h-[85vh] md:h-screen overflow-hidden bg-black font-body">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(https://res.cloudinary.com/dys2k5muv/image/upload/v1771143071/services_1_oatiib.jpg)`,
          }}
        >
          <div className="absolute inset-0 bg-black/40 z-[1]" />
        </div>

        <div className="relative z-10 h-full max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col justify-center pb-20">
          <div className="max-w-4xl pt-20">
             <button 
              onClick={() => navigateTo('home')}
              className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/40 mb-10 hover:text-white transition-colors flex items-center gap-2 group w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
              {t('portfolio.backHome')}
            </button>
            
            <h1 className="text-5xl md:text-7xl lg:text-[9vw] font-bold font-display text-white tracking-architectural leading-[0.85] uppercase mb-12 animate-in fade-in slide-in-from-bottom duration-1000">
              {t('serv.pageHeroTitle')}
            </h1>
            
            <div className="flex flex-col md:flex-row md:items-start gap-12 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              <p className="text-white/80 text-base md:text-xl font-light leading-relaxed max-w-xl">
                {t('serv.pageHeroSub')}
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={scrollToContent}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 text-white/40 hover:text-white transition-all animate-bounce"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </section>
      
      <main id="services-grid" className="flex-grow pt-24 md:pt-40">
        {/* Services Grid Section */}
        <div className="max-w-[1800px] mx-auto px-8 md:px-16 mb-0">
          
          {/* Section Header */}
          <div className="flex flex-col items-center text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] uppercase mb-10">
              {t('serv.title')}
            </h2>
            <div className="w-24 h-[1px] bg-black/10 mx-auto mb-10" />
            <p className="text-black/60 text-sm md:text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
              {t('serv.subtext')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-black/5">
            {serviceCategories.map((cat, idx) => (
              <div 
                key={cat.id} 
                className={`pt-20 pb-12 md:px-12 flex flex-col h-full transition-all duration-700 border-b md:border-b-0 border-black/5 ${
                  idx !== 0 ? 'md:border-l border-black/5' : ''
                }`}
              >
                <h2 className="text-3xl md:text-4xl font-bold font-display tracking-architectural uppercase mb-8">
                  {cat.title}
                </h2>
                <p className="text-black text-sm md:text-base font-medium leading-relaxed mb-12 h-auto md:h-20 overflow-hidden">
                  {cat.intro}
                </p>
                <div className="flex-grow space-y-8 mb-16">
                  <h3 className="text-sm md:text-base font-bold uppercase tracking-[0.4em] text-black/30">
                    {t('serv.packageIncludes')}
                  </h3>
                  <ul className="space-y-4">
                    {cat.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-4 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/10 mt-1.5 shrink-0 group-hover:bg-[#0047AB] transition-colors" />
                        <span className="text-sm font-medium text-[#666] leading-snug group-hover:text-black transition-colors">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto">
                  <button 
                    onClick={() => navigateTo('portfolio', undefined, cat.filter)}
                    className="group flex items-center gap-6 text-sm md:text-base font-bold uppercase tracking-[0.4em] transition-all hover:text-[#0047AB]"
                  >
                    <span className="border-b border-black/10 pb-1 group-hover:border-[#0047AB] transition-all">
                      {cat.cta}
                    </span>
                    <div className="w-10 h-10 rounded-full border border-black/5 flex items-center justify-center transition-all group-hover:border-[#0047AB] group-hover:bg-[#0047AB] group-hover:text-white">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Working Process Section */}
        <section className="bg-white py-24 md:py-48 border-t border-black/5 overflow-hidden">
          <div className="max-w-[1800px] mx-auto px-8 md:px-16 relative">
            
            {/* Process Header */}
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] uppercase mb-10">
                {t('proc.title')}
              </h2>
              <div className="w-24 h-[1px] bg-black/10 mx-auto mb-10" />
              <p className="text-black/60 text-sm md:text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
                {t('proc.subtext')}
              </p>
            </div>

            {/* Steps Grid */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-y-24 md:gap-y-40 md:gap-x-12 relative"
            >
              {/* Wiring Arrows SVG - Dynamic desktop flow */}
              <div className="hidden lg:block absolute inset-0 w-full h-full z-0 pointer-events-none">
                <svg width="100%" height="100%" viewBox="0 0 1200 800" fill="none" preserveAspectRatio="none">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#0047AB" opacity="0.3" />
                    </marker>
                  </defs>
                  
                  {/* Step 01 to 02 */}
                  <motion.path 
                    variants={pathVariants}
                    d="M280,100 L440,100" 
                    stroke="#0047AB" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.2"
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Step 02 to 03 */}
                  <motion.path 
                    variants={pathVariants}
                    d="M680,100 L840,100" 
                    stroke="#0047AB" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.2"
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Step 03 to 04 (Diagonal Transition) */}
                  <motion.path 
                    variants={pathVariants}
                    d="M1000,200 C1000,300 100,250 100,450" 
                    stroke="#0047AB" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.1"
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Step 04 to 05 */}
                  <motion.path 
                    variants={pathVariants}
                    d="M280,550 L440,550" 
                    stroke="#0047AB" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.2"
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Step 05 to 06 */}
                  <motion.path 
                    variants={pathVariants}
                    d="M680,550 L840,550" 
                    stroke="#0047AB" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.2"
                    markerEnd="url(#arrowhead)"
                  />
                </svg>
              </div>

              {workingSteps.map((step, index) => (
                <motion.div 
                  key={step.id} 
                  variants={itemVariants}
                  whileHover={{ y: -10 }}
                  className="relative group z-10"
                >
                  {/* Large Architectural Background Number */}
                  <div className="absolute -top-20 -left-6 md:-left-12 select-none overflow-hidden h-32 md:h-48 w-full">
                    <span className={`text-8xl md:text-[12vw] font-display font-bold text-black/[0.03] leading-none transition-all duration-700 group-hover:text-[#0047AB]/10 group-hover:scale-110 block origin-left`}>
                      {step.id}
                    </span>
                  </div>
                  
                  {/* Card Content */}
                  <div className="relative pt-8 pl-0 md:pl-4">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-[1px] bg-black/10 group-hover:bg-[#0047AB] group-hover:w-16 transition-all duration-700" />
                      <h4 className="text-lg md:text-2xl font-bold font-body tracking-tight uppercase group-hover:text-[#0047AB] transition-colors duration-500">
                        {t(step.titleKey)}
                      </h4>
                    </div>
                    <p className="text-black/60 text-sm md:text-base font-medium leading-relaxed max-w-sm md:max-w-xs transition-colors duration-500 group-hover:text-black">
                      {t(step.descKey)}
                    </p>
                  </div>
                  
                  {/* Decorative indicator line */}
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                    className="h-[1px] bg-black/[0.05] mt-12 group-hover:bg-[#0047AB]/20 transition-colors" 
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Final CTA Banner Section */}
        <section className="bg-black text-white py-24 md:py-48 overflow-hidden relative">
          <div className="max-w-[1800px] mx-auto px-8 md:px-16 flex flex-col items-center text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="max-w-4xl"
            >
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-tight mb-10 uppercase">
                {t('serv.final.title')}
              </h2>
              <p className="text-white/60 text-base md:text-xl font-light leading-relaxed max-w-3xl mx-auto mb-16">
                {t('serv.final.desc')}
              </p>
              
              <div className="flex justify-center">
                <a 
                  href="https://calendly.com/designature-studio-us/free_consultation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center border border-white bg-transparent px-12 md:px-16 py-6 text-sm md:text-base font-bold tracking-[0.5em] uppercase transition-all duration-500 hover:bg-white hover:text-black overflow-hidden"
                >
                  <span className="relative z-10">{t('serv.final.btn')}</span>
                </a>
              </div>
            </motion.div>
          </div>
          
          {/* Decorative subtle background elements */}
          <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[30vw] h-[30vh] bg-[#0047AB]/5 blur-[80px] rounded-full pointer-events-none" />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ServicesPage;
