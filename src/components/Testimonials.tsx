import React, { useState, useEffect } from 'react';
import { Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import FeedbackModal from './FeedbackModal';

interface Testimonial {
  name: string;
  country: string;
  message: string;
  rating: number;
  project_type?: string;
}

const PAGE_SIZE = 4;

const Testimonials: React.FC = () => {
  const { t } = useLanguage();
  const [all, setAll] = useState<Testimonial[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    fetch('/api/testimonials')
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.testimonials) && data.testimonials.length > 0) {
          const shuffled = [...data.testimonials].sort(() => Math.random() - 0.5);
          setAll(shuffled);
          setPage(0);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (error) return null;

  const pageCount = Math.ceil(all.length / PAGE_SIZE);
  const visible = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showArrows = pageCount > 1;

  const prev = () => setPage(p => (p - 1 + pageCount) % pageCount);
  const next = () => setPage(p => (p + 1) % pageCount);

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-white font-body">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        <div className="flex flex-col items-center text-center mb-10 md:mb-12">
          <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.5em] lg:tracking-[1em] text-black/45 mb-8">
            {t('test.title')}
          </h2>
          <h3 className="text-4xl md:text-5xl lg:text-7xl font-bold font-display tracking-architectural leading-[1] max-w-4xl mb-10">
            {t('test.heading')}
          </h3>
          <p className="text-black/60 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
            {t('test.subtext')}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-neutral-50 border border-neutral-100 p-6 lg:p-8 h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visible.map((item, idx) => (
              <div
                key={`${page}-${idx}`}
                className="group relative bg-white p-6 lg:p-8 border border-neutral-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[#0047AB] hover:-translate-y-1 hover:shadow-xl flex flex-col h-full"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 transition-all duration-300 ${
                        i < (item.rating || 5) ? 'fill-[#0047AB] text-[#0047AB]' : 'text-neutral-100'
                      }`}
                    />
                  ))}
                </div>

                <blockquote className="mb-8 flex-1">
                  <p className="text-lg lg:text-xl font-display font-medium text-black/90 leading-relaxed italic">
                    "{item.message}"
                  </p>
                </blockquote>

                <div className="flex flex-col items-start mt-auto">
                  <span className="text-sm md:text-base font-bold font-body text-neutral-800 tracking-widest uppercase">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-bold font-body uppercase tracking-[0.3em] text-neutral-400 mt-2">
                    {item.country}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination arrows ── */}
        {showArrows && !loading && (
          <div className="mt-10 flex items-center justify-center gap-6">
            <button
              onClick={prev}
              aria-label="Previous testimonials"
              className="flex items-center justify-center w-10 h-10 border border-black/15 text-black/50 hover:border-black/50 hover:text-black transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.2em] text-black/45 tabular-nums">
              {page + 1} / {pageCount}
            </span>

            <button
              onClick={next}
              aria-label="Next testimonials"
              className="flex items-center justify-center w-10 h-10 border border-black/15 text-black/50 hover:border-black/50 hover:text-black transition-all duration-200"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Feedback CTA ── */}
        <div className="mt-14 md:mt-20 flex justify-center">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="inline-flex items-center gap-3 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.2em] px-8 py-4 hover:bg-[#003d99] transition-colors duration-200"
          >
            {t('testimonials.feedback')}
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </section>
  );
};

export default Testimonials;
