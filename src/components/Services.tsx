import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { getServices } from '../constants';
import { useLanguage } from '../LanguageContext';
import { SERVICE_ASSETS } from '../serviceAssets';

type PopupState =
  | { type: 'closed' }
  | { type: 'image'; urls: string[] }
  | { type: 'video'; urls: string[] };

const downloadPdf = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('PDF download failed, opening in new tab:', error);
    window.open(url, '_blank');
  }
};

const ImagePopup: React.FC<{ urls: string[]; onClose: () => void }> = ({ urls, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, currentIndex]);

  const next = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  }, [urls.length]);

  const prev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  }, [urls.length]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-12 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        className="absolute top-6 right-6 z-10 text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-2"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-3"
            onClick={prev}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-3"
            onClick={next}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium tracking-widest">
            {currentIndex + 1} / {urls.length}
          </div>
        </>
      )}

      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          key={urls[currentIndex]}
          src={urls[currentIndex]}
          alt="Service example"
          className="max-w-full max-h-full object-contain shadow-2xl animate-in fade-in zoom-in-95 duration-500"
        />
      </div>
    </div>
  );
};

const VideoPopup: React.FC<{ urls: string[]; onClose: () => void }> = ({ urls, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, currentIndex]);

  const next = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  }, [urls.length]);

  const prev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  }, [urls.length]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-12 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        className="absolute top-6 right-6 z-10 text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-2"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-3"
            onClick={prev}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-3"
            onClick={next}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium tracking-widest">
            {currentIndex + 1} / {urls.length}
          </div>
        </>
      )}

      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <video
          key={urls[currentIndex]}
          src={urls[currentIndex]}
          controls
          autoPlay
          className="w-full aspect-video shadow-2xl bg-black animate-in fade-in zoom-in-95 duration-500"
        />
      </div>
    </div>
  );
};

const Services: React.FC = () => {
  const { language, t } = useLanguage();
  const services = getServices(language);
  const [popup, setPopup] = useState<PopupState>({ type: 'closed' });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = popup.type !== 'closed' ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [popup.type]);

  const closePopup = useCallback(() => setPopup({ type: 'closed' }), []);

  const handleExample = async (serviceId: string) => {
    const asset = SERVICE_ASSETS[serviceId];
    if (!asset) return;
    const value = language === 'en' ? asset.en : asset.am;

    if (asset.action === 'image-popup') {
      const urls = Array.isArray(value) ? value : [value];
      setPopup({ type: 'image', urls });
    } else if (asset.action === 'video-popup') {
      const urls = Array.isArray(value) ? value : [value];
      setPopup({ type: 'video', urls });
    } else if (asset.action === 'pdf-download') {
      const url = Array.isArray(value) ? value[0] : value;
      setDownloadingId(serviceId);
      const filename = asset.filename
        ? (language === 'en' ? asset.filename.en : asset.filename.am)
        : `Designature_${serviceId}.pdf`;
      await downloadPdf(url, filename);
      setDownloadingId(null);
    }
  };

  return (
    <>
      <section id="services" className="pt-16 md:pt-24 pb-0 bg-white font-body">
        <div className="max-w-[1800px] mx-auto px-8 md:px-16">
          <div className="flex flex-col items-center text-center mb-10 md:mb-12">
            <h2 className="text-sm md:text-base font-bold uppercase tracking-[1em] text-black/30 mb-8">{t('serv.title')}</h2>
            <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-10">{t('serv.heading')}</h3>
            <p className="text-black/60 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Our comprehensive suite of services ensures every aspect of your architectural journey is handled with precision and artistic integrity.'
                : 'Մեր ծառայությունների ամբողջական փաթեթը'}
            </p>
          </div>

          <div className="border border-black/8 divide-y divide-black/8">
            {[services.slice(0, 4), services.slice(4, 8)].map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-2 md:grid-cols-4 divide-x divide-black/8">
                {row.map((service) => {
                  const asset = SERVICE_ASSETS[service.id];
                  const isDownloading = downloadingId === service.id;
                  const serviceIdx = services.indexOf(service) + 1;
                  const iconMap: Record<string, React.ReactNode> = {
                    'floor-plans': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="20" height="20" rx="1"/><path d="M3 9h20M9 3v20"/></svg>,
                    'style-boards': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="20" height="16" rx="1"/><path d="M8 5V3M18 5V3M3 11h20"/><path d="M8 15h2M12 15h6M8 18h4"/></svg>,
                    'shopping-list': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h10l2 4H6L8 3z"/><rect x="4" y="7" width="18" height="16" rx="1"/><path d="M10 13h6M10 17h4"/></svg>,
                    'instructions': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h12v2l2 2v14a1 1 0 01-1 1H6a1 1 0 01-1-1V7l2-2V3z"/><path d="M10 3v4h6V3M9 13l2 2 5-5"/></svg>,
                    '3d-rendering': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L3 8v10l10 5 10-5V8L13 3z"/><path d="M3 8l10 5M13 23V13M23 8l-10 5"/><path d="M8 5.5l10 5"/></svg>,
                    'virtual-tour': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 5C8 5 4 9 4 13s4 8 9 8 9-4 9-8"/><circle cx="13" cy="13" r="3"/><path d="M19 5l-3 3M22 3l-3 2"/><circle cx="21" cy="4" r="1.5" fill="currentColor" stroke="none"/></svg>,
                    'custom-designs': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3l5 5-12 12H6v-5L18 3z"/><path d="M15 6l5 5"/><path d="M6 18l-3 3"/><path d="M9 20H4v-5"/></svg>,
                    'technical-plans': <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="18" height="20" rx="1"/><path d="M8 8h10M8 12h10M8 16h6"/><circle cx="19" cy="19" r="4" fill="white" stroke="currentColor"/><path d="M17 19h4M19 17v4"/></svg>,
                  };
                  return (
                    <div
                      key={service.id}
                      className="group p-6 md:p-8 flex flex-col gap-3 hover:bg-neutral-50 transition-colors duration-200 cursor-default"
                    >
                      <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">
                        {String(serviceIdx).padStart(2, '0')}
                      </div>
                      <div className="text-black group-hover:text-[#0047AB] transition-colors duration-200">
                        {iconMap[service.id] ?? service.renderIcon()}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-black group-hover:text-[#0047AB] transition-colors duration-200 leading-tight">
                        {service.title}
                      </div>
                      <div className="text-[10px] text-black/50 leading-relaxed flex-1">
                        {service.description}
                      </div>
                      <button
                        onClick={() => handleExample(service.id)}
                        disabled={isDownloading}
                        className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0047AB] hover:text-black transition-colors duration-200 text-left disabled:opacity-50 disabled:cursor-wait w-fit flex items-center gap-1"
                      >
                        {isDownloading ? t('services.downloading') : `${t('btn.example')} →`}
                        {!isDownloading && asset?.action === 'pdf-download' && <Download className="w-2.5 h-2.5 opacity-50" />}
                        {!isDownloading && asset?.action === 'video-popup' && <Play className="w-2.5 h-2.5 opacity-50" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {popup.type === 'image' && <ImagePopup urls={popup.urls} onClose={closePopup} />}
      {popup.type === 'video' && <VideoPopup urls={popup.urls} onClose={closePopup} />}
    </>
  );
};

export default Services;
