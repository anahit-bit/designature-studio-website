/** AC-001 — Library tab. Filter chips + grid of saved items; Studio project-folders strip; free-tier upsell empty state. */
import React, { useState } from 'react';
import { MoreHorizontal, Check } from 'lucide-react';
import { Button, Eyebrow, Skeleton, ErrorBanner, TOOL_META, fmtMonthDay } from '../ui';
import { useResource } from '../useResource';
import { accountApi, type PlanTier, type ToolKey, type LibraryItem } from '../../../lib/accountApi';
import { LibraryItemModal } from '../modals/LibraryItemModal';
import { Modal, ModalActions } from '../modals/Modal';

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

// Deep-link hash for the AI Studio (/ai-concepts#<hash>). Only the four live tools
// have a hash; the rest (and "All") open the studio landing.
const CHIP_TO_HASH: Partial<Record<ChipKey, string>> = {
  ai_vision: 'vision',
  shopping: 'shopping',
  room_audit: 'audit',
  style_quiz: 'quiz',
};
const chipLabelFor = (key: ChipKey) => CHIPS.find((c) => c.key === key)?.label ?? 'concept';

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
  /** Jump into the AI Studio; pass a tool hash (vision/shopping/audit/quiz) to deep-link. */
  onTryTool: (toolHash?: string) => void;
  onSeePlans: () => void;
}> = ({ tier, onTryTool, onSeePlans }) => {
  const [chip, setChip] = useState<ChipKey>('all');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<LibraryItem | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const paid = tier !== 'free';

  const { data, loading, error, reload } = useResource(
    () => accountApi.getLibrary({ tool: chip, search: search || undefined }),
    [chip, search]
  );

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const doBulkDelete = async () => {
    setDeleting(true);
    try {
      await accountApi.bulkDeleteLibraryItems([...selected]);
      setConfirmBulk(false);
      exitSelect();
      reload();
    } finally {
      setDeleting(false);
    }
  };

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
            <Button variant="primary" onClick={() => onTryTool()}>
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

      {/* select / bulk-delete toolbar */}
      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="font-body text-[11px] font-bold tracking-[0.14em] uppercase text-[#0A0A0A] border border-black/15 px-3 py-2 hover:border-black/45"
            >
              Select
            </button>
          ) : (
            <>
              <button
                onClick={selectAll}
                className="font-body text-[11px] font-bold tracking-[0.14em] uppercase text-[#0A0A0A] border border-black/15 px-3 py-2 hover:border-black/45"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
              <span className="text-[13px] text-[#6B6B6B] font-body">{selected.size} selected</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="danger" disabled={selected.size === 0} onClick={() => setConfirmBulk(true)}>
                  Delete ({selected.size})
                </Button>
                <Button size="sm" variant="secondary" onClick={exitSelect}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

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
              onClick={() => (selectMode ? toggleSel(item.id) : setOpenItem(item))}
              className={`border group cursor-pointer transition-colors ${
                selectMode && selected.has(item.id)
                  ? 'border-[#0047AB] ring-2 ring-[#0047AB]'
                  : 'border-black/10 hover:border-black/25'
              }`}
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
                {selectMode ? (
                  <div
                    aria-hidden
                    className={`absolute top-2 right-2 w-[26px] h-[26px] border-2 flex items-center justify-center ${
                      selected.has(item.id) ? 'bg-[#0047AB] border-[#0047AB]' : 'bg-black/40 border-white'
                    }`}
                  >
                    {selected.has(item.id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                ) : (
                  <button
                    aria-label="Open item"
                    onClick={(e) => { e.stopPropagation(); setOpenItem(item); }}
                    className="absolute top-2 right-2 text-white bg-black/40 w-[26px] h-[26px] flex items-center justify-center hover:bg-black/60"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
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
          <Button variant="primary" onClick={() => onTryTool(CHIP_TO_HASH[chip])}>
            {chip === 'all' ? 'Open the AI Studio →' : `Create a ${chipLabelFor(chip)} →`}
          </Button>
        </div>
      )}

      {/* Persistent CTA — always offer a way to create more, even with saved items. */}
      {!loading && data && data.items.length > 0 && (
        <div className="mt-10 border-t border-[#DAD2C3] pt-8 text-center">
          <p className="text-[#6B6B6B] font-body mb-4">Ready to make another?</p>
          <Button variant="primary" onClick={() => onTryTool(CHIP_TO_HASH[chip])}>
            {chip === 'all' ? 'Open the AI Studio →' : `Create another ${chipLabelFor(chip)} →`}
          </Button>
        </div>
      )}

      <LibraryItemModal
        item={openItem}
        onClose={() => setOpenItem(null)}
        onDeleted={() => reload()}
      />

      <Modal
        open={confirmBulk}
        onClose={() => !deleting && setConfirmBulk(false)}
        title={`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`}
      >
        <p className="font-body text-[13px] text-[#6B6B6B] mb-[18px]">
          This <b className="text-[#9E5E41]">permanently</b> deletes the selected item
          {selected.size === 1 ? '' : 's'} from your library — including any generated images.
          This cannot be undone.
        </p>
        <ModalActions>
          <Button size="sm" variant="secondary" onClick={() => setConfirmBulk(false)} disabled={deleting}>
            Keep {selected.size === 1 ? 'it' : 'them'}
          </Button>
          <Button size="sm" variant="danger" onClick={doBulkDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : `Delete ${selected.size}`}
          </Button>
        </ModalActions>
      </Modal>
    </section>
  );
};
