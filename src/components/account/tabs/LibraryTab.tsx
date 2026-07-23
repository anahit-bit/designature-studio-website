/** AC-001 — Library tab. Filter chips + grid of saved items; Studio project-folders strip; free-tier upsell empty state. */
import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button, Eyebrow, Skeleton, ErrorBanner, TOOL_META, fmtMonthDay } from '../ui';
import { useResource } from '../useResource';
import { accountApi, type PlanTier, type ToolKey, type LibraryItem } from '../../../lib/accountApi';
import { LibraryItemModal } from '../modals/LibraryItemModal';

type ChipKey = ToolKey | 'all';
const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ai_vision', label: 'AI Vision' },
  { key: 'shopping', label: 'Shopping List' },
  { key: 'room_audit', label: 'Room Audit' },
  { key: 'style_quiz', label: 'Style Quiz' },
  { key: 'design_brief', label: 'Design Brief' },
  { key: 'cultural', label: 'Cultural Advisor' },
];

const ProjectStrip: React.FC = () => {
  const { data } = useResource(() => accountApi.getProjectFolders(), []);
  if (!data || data.length === 0) return null;
  return (
    <div className="mb-6">
      <Eyebrow className="mb-3">Projects</Eyebrow>
      <div className="flex gap-[14px] overflow-x-auto pb-2">
        {data.map((p) => (
          <div key={p.id} className="flex-none w-[200px]">
            <div className="h-[110px] border border-black/10 overflow-hidden bg-[#FAFAFA]">
              {p.coverUrl && (
                <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="font-body font-semibold mt-2 text-[13px] text-[#0A0A0A]">{p.name}</div>
            <div className="text-[11px] text-[#6B6B6B]">{p.itemCount} items</div>
          </div>
        ))}
        <div className="flex-none w-[200px]">
          <div className="h-[110px] border border-dashed border-black/20 flex items-center justify-center text-[#6B6B6B] text-[12px] tracking-[0.1em] uppercase cursor-pointer hover:border-black/40">
            + New project
          </div>
        </div>
      </div>
    </div>
  );
};

export const LibraryTab: React.FC<{
  tier: PlanTier;
  onTryFree: () => void;
  onSeePlans: () => void;
}> = ({ tier, onTryFree, onSeePlans }) => {
  const [chip, setChip] = useState<ChipKey>('all');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<LibraryItem | null>(null);
  const paid = tier !== 'free';

  const { data, loading, error, reload } = useResource(
    () => accountApi.getLibrary({ tool: chip, search: search || undefined }),
    [chip, search]
  );

  if (!paid) {
    return (
      <section>
        <h1 className="font-display text-[44px] leading-[1.05] mb-1 text-[#0A0A0A]">Library</h1>
        <p className="text-[#6B6B6B] mb-7 font-body">
          Everything you've generated — concepts, lists, audits, quiz results.
        </p>
        <div className="text-center py-14 px-5 border border-black/[0.08] bg-[#FAFAFA]">
          <div className="w-[60px] h-[60px] border-2 border-[#9E5E41] rounded-full mx-auto mb-5 flex items-center justify-center text-[#9E5E41] text-[26px]">
            ▢
          </div>
          <h3 className="font-display text-[30px] mb-[10px] text-[#0A0A0A]">Your library is empty.</h3>
          <p className="text-[#6B6B6B] max-w-[440px] mx-auto mb-[22px] font-body">
            Everything you generate — concepts, shopping lists, audits — saves here automatically
            once you upgrade.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="primary" onClick={onTryFree}>
              Try a tool free →
            </Button>
            <Button variant="secondary" onClick={onSeePlans}>
              See plans
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 className="font-display text-[44px] leading-[1.05] mb-1 text-[#0A0A0A]">Library</h1>
      <p className="text-[#6B6B6B] mb-7 font-body">
        Everything you've generated — concepts, lists, audits, quiz results.
      </p>

      {tier === 'studio' && <ProjectStrip />}

      {/* filter chips + search */}
      <div className="flex gap-2 flex-wrap items-center mb-5">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setChip(c.key)}
            className={`font-body text-[11px] font-bold tracking-[0.14em] uppercase px-[14px] py-2 border cursor-pointer transition-colors ${
              chip === c.key
                ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                : 'bg-white text-[#0A0A0A] border-[#0A0A0A] hover:bg-black/5'
            }`}
          >
            {c.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          aria-label="Search library"
          className="ml-auto border border-black/15 px-3 py-[9px] font-body text-[13px] w-[170px]"
        />
      </div>

      {error && <ErrorBanner onRetry={reload} />}

      {loading ? (
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-black/10">
              <Skeleton className="w-full" style={{ aspectRatio: '4 / 5' }} />
              <div className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {data.items.map((item) => (
            <div
              key={item.id}
              onClick={() => setOpenItem(item)}
              className="border border-black/10 group cursor-pointer hover:border-black/25 transition-colors"
            >
              <div className="relative overflow-hidden bg-[#FAFAFA]" style={{ aspectRatio: '4 / 5' }}>
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#0B2240 0%,#9E5E41 100%)' }}
                  >
                    {(() => {
                      const { Icon } = TOOL_META[item.tool];
                      return <Icon className="w-10 h-10 text-white/85" strokeWidth={1.25} />;
                    })()}
                  </div>
                )}
                <span className="absolute top-[10px] left-[10px] bg-[#0A0A0A]/55 text-white text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1">
                  {TOOL_META[item.tool].label}
                </span>
                <button
                  aria-label="Open item"
                  onClick={(e) => { e.stopPropagation(); setOpenItem(item); }}
                  className="absolute top-2 right-2 text-white bg-black/40 w-[26px] h-[26px] flex items-center justify-center hover:bg-black/60"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="font-display text-[17px] leading-[1.15] text-[#0A0A0A]">
                  {item.title}
                </div>
                <div className="text-[11px] text-[#6B6B6B] mt-1">Saved {fmtMonthDay(item.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-14 px-5 border border-black/[0.08] bg-[#FAFAFA]">
          <h3 className="font-display text-[30px] mb-[10px] text-[#0A0A0A]">Nothing here yet.</h3>
          <p className="text-[#6B6B6B] max-w-[440px] mx-auto mb-[22px] font-body">
            {search || chip !== 'all'
              ? 'No saved items match this filter.'
              : 'Generate a concept, list, or audit and it saves here automatically.'}
          </p>
          <Button variant="primary" onClick={onTryFree}>
            Try a tool →
          </Button>
        </div>
      )}

      <LibraryItemModal
        item={openItem}
        onClose={() => setOpenItem(null)}
        onDeleted={() => reload()}
      />
    </section>
  );
};
