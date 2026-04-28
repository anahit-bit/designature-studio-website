import { useState } from 'react';
import { useLanguage } from '../LanguageContext';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

type FeedbackType = 'testimonial' | 'bug' | 'feature' | 'general';
type ProjectType = '' | 'Residential' | 'Commercial' | 'Other';
type FieldErrors = Partial<Record<'name' | 'email' | 'message', string>>;

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [projectType, setProjectType] = useState<ProjectType>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');

  if (!open) return null;

  const isTestimonial = type === 'testimonial';

  // ── Validation ──────────────────────────────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (isTestimonial) {
      if (!name.trim())                          errors.name  = 'Name is required for testimonials';
      if (!email.trim())                         errors.email = 'Email is required for testimonials';
      else if (!EMAIL_RE.test(email.trim()))     errors.email = 'Please enter a valid email';
    }
    if (!message.trim()) errors.message = 'Message is required';
    return errors;
  };

  // Clear a specific field error when the user starts typing
  const clearError = (field: keyof FieldErrors) =>
    setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitError('');
    setSubmitting(true);
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          country: country.trim(),
          email: email.trim(),
          type,
          message: message.trim(),
          rating: isTestimonial ? rating : '',
          project_type: isTestimonial ? projectType : '',
        }),
      });
      const data = await r.json();
      if (data.ok) {
        setSubmitted(true);
      } else {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please try again or email hello@designature.studio');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setName(''); setCountry(''); setEmail('');
    setType('general'); setMessage(''); setRating(5); setProjectType('');
    setSubmitted(false); setFieldErrors({}); setSubmitError('');
  };

  // ── Label helpers ───────────────────────────────────────────────────────────
  // Required fields show "FIELD *", optional show "FIELD (OPTIONAL)"
  // CSS uppercase class handles capitalisation.
  const lbl = (base: string, required: boolean) =>
    required ? `${base} *` : `${base} (optional)`;

  // ── Shared input classes ────────────────────────────────────────────────────
  const inputCls = (hasError: boolean) =>
    `w-full border px-3 py-2.5 text-[13px] focus:outline-none transition-colors ${
      hasError
        ? 'border-red-400 focus:border-red-500 bg-red-50/30'
        : 'border-black/15 focus:border-black/40'
    }`;

  const errorMsg = (msg?: string) =>
    msg ? <p className="text-[11px] text-red-500 mt-1 leading-snug">{msg}</p> : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-md w-full p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-2xl font-display font-bold mb-4">{t('feedback.thanks')}</p>
            <p className="text-sm text-black/60 mb-8 leading-relaxed">{t('feedback.thanksMsg')}</p>
            <button
              onClick={() => { reset(); onClose(); }}
              className="px-8 py-3 bg-black text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black/80 transition-colors"
            >
              {t('feedback.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-7">
              <h2 className="text-2xl font-display font-bold">{t('feedback.title')}</h2>
              <button
                onClick={onClose}
                className="text-black/65 hover:text-black text-2xl leading-none transition-colors ml-4 flex-shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              {/* Type */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-1.5">
                  {t('feedback.type')}
                </label>
                <select
                  value={type}
                  onChange={e => { setType(e.target.value as FeedbackType); setFieldErrors({}); }}
                  className="w-full border border-black/15 px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:border-black/40"
                >
                  <option value="general">{t('feedback.type.general')}</option>
                  <option value="testimonial">{t('feedback.type.testimonial')}</option>
                  <option value="bug">{t('feedback.type.bug')}</option>
                  <option value="feature">{t('feedback.type.feature')}</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-1.5">
                  {lbl('Name', isTestimonial)}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); clearError('name'); }}
                  className={inputCls(!!fieldErrors.name)}
                />
                {errorMsg(fieldErrors.name)}
              </div>

              {/* Country — always optional */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-1.5">
                  {lbl('Country', false)}
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className={inputCls(false)}
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-1.5">
                  {lbl('Email', isTestimonial)}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError('email'); }}
                  className={inputCls(!!fieldErrors.email)}
                />
                {errorMsg(fieldErrors.email)}
              </div>

              {/* Testimonial-only fields */}
              {isTestimonial && (
                <>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-2">
                      {t('feedback.rating')} *
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className={`text-2xl transition-colors leading-none ${
                            n <= rating ? 'text-[#0047AB]' : 'text-black/25'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-1.5">
                      {lbl('Project type', false)}
                    </label>
                    <select
                      value={projectType}
                      onChange={e => setProjectType(e.target.value as ProjectType)}
                      className="w-full border border-black/15 px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:border-black/40"
                    >
                      <option value="">{t('feedback.pt.select')}</option>
                      <option value="Residential">{t('feedback.pt.residential')}</option>
                      <option value="Commercial">{t('feedback.pt.commercial')}</option>
                      <option value="Other">{t('feedback.pt.other')}</option>
                    </select>
                  </div>
                </>
              )}

              {/* Message — always required */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 block mb-1.5">
                  {lbl('Message', true)}
                </label>
                <textarea
                  value={message}
                  onChange={e => { setMessage(e.target.value); clearError('message'); }}
                  rows={5}
                  className={`${inputCls(!!fieldErrors.message)} resize-none`}
                  placeholder={isTestimonial ? t('feedback.placeholder.testimonial') : t('feedback.placeholder.general')}
                />
                {errorMsg(fieldErrors.message)}
              </div>

              {/* Submit-level error (network / server) */}
              {submitError && (
                <p className="text-[12px] text-red-600 leading-snug">{submitError}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full px-6 py-3.5 bg-black text-white text-[11px] font-bold uppercase tracking-[0.25em]
                           disabled:bg-black/30 hover:bg-black/80 transition-colors"
              >
                {submitting ? t('feedback.sending') : t('feedback.send')}
              </button>

              {isTestimonial && (
                <p className="text-[12px] text-black/65 text-center leading-relaxed">
                  {t('feedback.review')}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
