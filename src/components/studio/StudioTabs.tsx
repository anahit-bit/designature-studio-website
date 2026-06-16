import React from 'react';
import { useLanguage } from '../../LanguageContext';

export type StudioTool = 'quiz' | 'vision' | 'shopping' | 'audit';

interface StudioTabsProps {
  active: StudioTool;
  onSelect: (tool: StudioTool) => void;
  /** Per-tool disabled flags (e.g. while a tool is processing). */
  disabled?: Partial<Record<StudioTool, boolean>>;
  /** Show a quiet "offline" marker on Shopping List. */
  shoppingOffline?: boolean;
}

/**
 * Locked 4-col studio tab strip (01 Style Quiz · 02 AI Vision · 03 Shopping List
 * · 04 Room Audit). The current tab is filled cobalt with a white/60 numeral;
 * the rest show an oxide numeral over a black label.
 *
 * This is the THIN, SWAPPABLE navigation wrapper (D2): the AI-021 EXPLORER rail
 * can replace it later WITHOUT touching the tool screens — screens never import
 * this component.
 */
const StudioTabs: React.FC<StudioTabsProps> = ({ active, onSelect, disabled, shoppingOffline }) => {
  const { t } = useLanguage();

  const tabs: { id: StudioTool; num: string; label: string }[] = [
    { id: 'quiz', num: '01', label: t('ai.styleQuiz') },
    { id: 'vision', num: '02', label: t('ai.aiVision') },
    { id: 'shopping', num: '03', label: t('ai.shoppingList') },
    { id: 'audit', num: '04', label: t('ai.roomAudit') },
  ];

  return (
    <div id="ai-concepts-tools" className="grid grid-cols-4 border-b border-black/10 text-center scroll-mt-24">
      {tabs.map((tab, i) => {
        const isActive = active === tab.id;
        const isDisabled = !!disabled?.[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            disabled={isDisabled}
            onClick={() => { if (!isDisabled) onSelect(tab.id); }}
            aria-current={isActive ? 'page' : undefined}
            className={`relative p-3 transition-colors ${i < tabs.length - 1 ? 'border-r border-black/10' : ''} ${
              isActive ? 'bg-[#0047AB] text-white' : 'bg-white text-black hover:bg-neutral-50'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`text-[9px] font-bold tracking-[0.25em] ${isActive ? 'text-white/60' : 'num-oxide'}`}>
              {tab.num}
            </div>
            <div className="text-[12px] font-bold leading-tight">{tab.label}</div>
            {tab.id === 'shopping' && shoppingOffline && (
              <span
                className={`absolute bottom-1.5 right-1.5 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 ${
                  isActive ? 'text-white/65 bg-black/20' : 'text-black/45 bg-black/[0.06]'
                }`}
              >
                offline
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StudioTabs;
