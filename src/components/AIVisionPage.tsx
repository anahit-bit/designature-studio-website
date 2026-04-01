
import React from 'react';
import { ArrowLeft, Eye, Zap, Target, Shield, ArrowRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import Header from './Header';
import Footer from './Footer';

const AIVisionPage: React.FC = () => {
  const { t, navigateTo } = useLanguage();

  const visionPoints = [
    {
      icon: <Eye className="w-8 h-8" />,
      title: t('ai.vision.point1.title'),
      desc: t('ai.vision.point1.desc')
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: t('ai.vision.point2.title'),
      desc: t('ai.vision.point2.desc')
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: t('ai.vision.point3.title'),
      desc: t('ai.vision.point3.desc')
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: t('ai.vision.point4.title'),
      desc: t('ai.vision.point4.desc')
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-body">
      <Header />
      
      <main className="flex-grow pt-32 md:pt-48 pb-24 md:pb-40">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16">
          
          {/* Header Section */}
          <div className="flex flex-col mb-24 md:mb-40">
            <button 
              onClick={() => navigateTo('home')}
              className="text-sm md:text-base font-bold uppercase tracking-widest text-white/40 mb-16 hover:text-white transition-colors flex items-center gap-2 group w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
              {t('ai.vision.back')}
            </button>
            
            <div className="grid lg:grid-cols-2 gap-20 items-end">
              <h1 className="text-5xl md:text-7xl lg:text-[10vw] font-bold font-display tracking-architectural leading-[0.8] uppercase">
                {t('ai.vision.hero')}
              </h1>
              <p className="text-white/60 text-lg md:text-2xl font-light leading-relaxed max-w-xl italic border-l border-white/10 pl-8">
                {t('ai.vision.heroDesc')}
              </p>
            </div>
          </div>

          {/* Vision Grid */}
          <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10 mb-40">
            {visionPoints.map((point, i) => (
              <div key={i} className="bg-black p-12 md:p-20 space-y-10 group hover:bg-neutral-900 transition-colors duration-700">
                <div className="text-[#0047AB] transform group-hover:scale-110 transition-transform duration-500 origin-left">
                  {point.icon}
                </div>
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-4xl font-bold font-display tracking-architectural uppercase">
                    {point.title}
                  </h3>
                  <p className="text-white/40 text-base md:text-lg font-light leading-relaxed group-hover:text-white/70 transition-colors">
                    {point.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Immersive Quote Section */}
          <div className="relative py-40 md:py-60 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
              <img 
                src="https://res.cloudinary.com/dys2k5muv/image/upload/v1771143071/ai_vision_bg_oatiib.jpg" 
                className="w-full h-full object-cover opacity-20 grayscale"
                alt="Architectural Vision"
              />
            </div>
            
            <div className="relative z-20 max-w-5xl px-8">
              <h2 className="text-4xl md:text-6xl lg:text-8xl font-bold font-display tracking-architectural leading-tight uppercase mb-16">
                {t('ai.vision.quote')}
              </h2>
              <button 
                onClick={() => navigateTo('studio')}
                className="group flex items-center gap-8 text-sm md:text-base font-bold uppercase tracking-[0.6em] text-white/60 hover:text-white transition-all"
              >
                <span className="border-b border-white/20 pb-2 group-hover:border-white transition-all">
                  {t('ai.vision.cta')}
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIVisionPage;
