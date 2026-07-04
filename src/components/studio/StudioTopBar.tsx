import React from 'react';
import { LogOut } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { useAuth } from '../../AuthContext';

/**
 * Slim "AI Studio" masthead that sits ABOVE the StudioTabs strip (owner decision
 * 2026-06-04). When the page-hero was removed in the card redesign, it took the
 * in-body sign-in/out control with it and left the white-text global Header
 * unreadable over the now-white studio. This dark strip restores both: the
 * studio identity on the left, the single auth control on the right — and, being
 * dark, it gives the overlaid Header legible contrast again.
 *
 * It owns auth for the whole studio; the global Header suppresses its secondary
 * CTA on /ai-concepts and the per-tool StatusHdr carries status/quota only.
 * Has its own top padding so its content clears the fixed Header.
 */
interface StudioTopBarProps {
  onSignIn: () => void;
  onSignOut: () => void;
}

const StudioTopBar: React.FC<StudioTopBarProps> = ({ onSignIn, onSignOut }) => {
  const { t } = useLanguage();
  const { user, isLoading } = useAuth();
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="bg-[#0a0a0a] text-white">
      <div className="px-6 md:px-10 pt-24 pb-4 flex items-end justify-between gap-4">
        {/* identity */}
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.34em] text-[#9E5E41] mb-1">{t('ai.studioBrand')}</p>
          <h1 className="font-display text-[22px] md:text-[28px] leading-none text-white">{t('nav.aiStudio')}</h1>
        </div>

        {/* auth — the studio's single sign-in / account control */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isLoading ? (
            <span className="w-7 h-7" aria-hidden />
          ) : user ? (
            <>
              <span className="hidden sm:flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full overflow-hidden bg-[#0047AB] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {user.picture
                    ? <img src={user.picture} alt="" className="w-full h-full object-cover" />
                    : <span>{initial}</span>}
                </span>
                <span className="text-[11px] font-semibold text-white/85 truncate max-w-[140px]">{user.name || user.email}</span>
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 border border-white/25 px-3 py-2 hover:border-white/60 hover:text-white transition"
              >
                <LogOut className="w-3 h-3" />
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="text-[10px] font-bold uppercase tracking-[0.22em] text-white bg-[#0047AB] px-5 py-2.5 hover:bg-[#0036a0] transition"
            >
              {t('ai.quiz.signIn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioTopBar;
