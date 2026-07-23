/**
 * AC-002 — PUBLIC shareable viewer for a saved Library item (/shared/:id).
 * No auth required: anyone with the link can view the concept / list. Fetches via
 * the public GET /api/share/:id. Renders a clean, branded page with a CTA back
 * into the AI Studio.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accountApi, type LibraryItem } from '../lib/accountApi';

const TOOL_LABEL: Record<string, string> = {
  ai_vision: 'AI Vision concept',
  shopping: 'Shopping list',
  room_audit: 'Room audit',
  style_quiz: 'Style DNA',
  design_brief: 'Design brief',
  cultural: 'Cultural advisor',
};

const SharedItemPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    if (!id) {
      setStatus('error');
      return;
    }
    accountApi
      .getSharedItem(id)
      .then((it) => {
        if (alive) {
          setItem(it);
          setStatus('ok');
        }
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [id]);

  const meta = (item?.metadata ?? {}) as any;
  const imageSrc = item?.fullPreviewUrl || item?.thumbnailUrl || null;
  const shoppingItems: any[] = Array.isArray(meta.items) ? meta.items : [];

  return (
    <div className="min-h-screen bg-white font-body flex flex-col">
      {/* minimal brand bar */}
      <header className="border-b border-[#DAD2C3]">
        <div className="max-w-[1000px] mx-auto px-6 py-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#9E5E41]" />
          <span className="font-bold tracking-[0.12em] text-[14px]">DESIGNATURE</span>
        </div>
      </header>

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-10">
        {status === 'loading' && (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/3 bg-black/[0.07]" />
            <div className="w-full bg-black/[0.07]" style={{ aspectRatio: '4 / 3' }} />
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-20">
            <h1 className="font-display text-[34px] text-[#0A0A0A] mb-3">Link not found</h1>
            <p className="text-[#6B6B6B] mb-6">This shared item no longer exists or the link is invalid.</p>
            <button
              onClick={() => navigate('/ai-concepts')}
              className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-[12px] font-bold uppercase tracking-[0.16em] px-6 py-3"
            >
              Explore the AI Studio →
            </button>
          </div>
        )}

        {status === 'ok' && item && (
          <>
            <div className="text-[11px] font-bold tracking-[0.28em] uppercase text-[#6B6B6B] mb-2">
              {TOOL_LABEL[item.tool] ?? 'Shared item'}
            </div>
            <h1 className="font-display text-[36px] leading-[1.05] text-[#0A0A0A] mb-6">{item.title}</h1>

            {imageSrc ? (
              <img src={imageSrc} alt={item.title} className="w-full h-auto border border-black/[0.08]" />
            ) : shoppingItems.length > 0 ? (
              <div className="border border-black/10 divide-y divide-black/[0.07]">
                {shoppingItems.map((it, i) => {
                  const name = it?.name || it?.title || it?.query || `Item ${i + 1}`;
                  const price = it?.price || it?.priceText || '';
                  const link = it?.link || it?.url || it?.productUrl || null;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-[14px] text-[#0A0A0A] truncate">{name}</div>
                        {price && <div className="text-[12px] text-[#6B6B6B]">{price}</div>}
                      </div>
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#0047AB] text-[12px] font-bold flex-shrink-0">
                          View →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#6B6B6B]">Nothing to preview for this item.</p>
            )}

            {/* CTA */}
            <div className="mt-10 border-t border-[#DAD2C3] pt-8 text-center">
              <p className="text-[#6B6B6B] mb-4">Made with Designature Studio's AI design tools.</p>
              <button
                onClick={() => navigate('/ai-concepts')}
                className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-[12px] font-bold uppercase tracking-[0.16em] px-6 py-3 hover:bg-[#333]"
              >
                Create your own →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SharedItemPage;
