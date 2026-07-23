/**
 * AC-002 — open a saved Library item: view it, download it, copy a shareable link,
 * or delete it. Images (AI Vision / Room Audit) render large; list-type items
 * (Shopping) render their saved items from metadata; Style Quiz renders its DNA.
 */
import React, { useState } from 'react';
import { X, Download, Share2, Trash2, Check, ExternalLink } from 'lucide-react';
import { Button, Eyebrow, TOOL_META, fmtMonthDay } from '../ui';
import { accountApi, type LibraryItem } from '../../../lib/accountApi';

/** Force a Cloudinary URL to download instead of display (fl_attachment). */
function downloadUrl(url: string): string {
  if (url.includes('/upload/') && url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
}

const ShoppingList: React.FC<{ items: any[] }> = ({ items }) => (
  <div className="flex flex-col divide-y divide-black/[0.07]">
    {items.map((it, i) => {
      const name = it?.name || it?.title || it?.query || `Item ${i + 1}`;
      const price = it?.price || it?.priceText || '';
      const link = it?.link || it?.url || it?.productUrl || null;
      return (
        <div key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="font-body text-[14px] text-[#0A0A0A] truncate">{name}</div>
            {price && <div className="text-[12px] text-[#6B6B6B]">{price}</div>}
          </div>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0047AB] text-[12px] font-bold inline-flex items-center gap-1 flex-shrink-0"
            >
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );
    })}
  </div>
);

const QuizDNA: React.FC<{ result: { style: string; pct: number }[] }> = ({ result }) => (
  <div className="flex flex-col gap-3">
    {result.map((r, i) => (
      <div key={i}>
        <div className="flex justify-between text-[13px] font-body mb-1">
          <span className="text-[#0A0A0A] font-semibold">{r.style}</span>
          <span className="text-[#6B6B6B]">{r.pct}%</span>
        </div>
        <div className="h-[6px] bg-[#DAD2C3]">
          <span className="block h-full bg-[#0047AB]" style={{ width: `${r.pct}%` }} />
        </div>
      </div>
    ))}
  </div>
);

export const LibraryItemModal: React.FC<{
  item: LibraryItem | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}> = ({ item, onClose, onDeleted }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!item) return null;

  const meta = (item.metadata ?? {}) as any;
  const isImage = item.tool === 'ai_vision' || item.tool === 'room_audit';
  const imageSrc = item.fullPreviewUrl || item.thumbnailUrl;
  const shoppingItems: any[] = Array.isArray(meta.items) ? meta.items : [];
  const quizResult: { style: string; pct: number }[] = Array.isArray(meta.result)
    ? meta.result
    : Array.isArray(meta)
      ? (meta as any)
      : [];

  const share = async () => {
    const url = accountApi.shareUrl(item.id);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked — still show the toast; url is in the title attr */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (imageSrc) {
      const a = document.createElement('a');
      a.href = downloadUrl(imageSrc);
      a.download = `${item.title.replace(/[^\w\-]+/g, '-')}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    // No image (list/quiz) — download a JSON snapshot.
    const blob = new Blob([JSON.stringify({ title: item.title, ...meta }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${item.title.replace(/[^\w\-]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await accountApi.deleteLibraryItem(item.id);
      onDeleted(item.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const { label } = TOOL_META[item.tool];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(8,9,12,0.72)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[860px] max-h-[90vh] overflow-auto border border-black/10">
        {/* header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-black/[0.08]">
          <div>
            <Eyebrow>{label}</Eyebrow>
            <h3 className="font-display text-[26px] leading-tight text-[#0A0A0A] mt-1">
              {item.title}
            </h3>
            <div className="text-[12px] text-[#6B6B6B] mt-1">Saved {fmtMonthDay(item.createdAt)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="p-6">
          {isImage && imageSrc ? (
            <img src={imageSrc} alt={item.title} className="w-full h-auto border border-black/[0.08]" />
          ) : shoppingItems.length > 0 ? (
            <ShoppingList items={shoppingItems} />
          ) : quizResult.length > 0 ? (
            <QuizDNA result={quizResult} />
          ) : (
            <p className="text-[#6B6B6B] font-body text-[14px]">
              This item has no preview to show, but you can still share or download it.
            </p>
          )}
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-[10px] justify-end p-6 border-t border-black/[0.08]">
          <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
            <Trash2 className="w-3 h-3" /> {busy ? 'Deleting…' : 'Delete'}
          </Button>
          <Button size="sm" variant="secondary" onClick={share} title={accountApi.shareUrl(item.id)}>
            {copied ? <><Check className="w-3 h-3" /> Link copied</> : <><Share2 className="w-3 h-3" /> Share</>}
          </Button>
          <Button size="sm" variant="primary" onClick={download}>
            <Download className="w-3 h-3" /> Download
          </Button>
        </div>
      </div>
    </div>
  );
};
