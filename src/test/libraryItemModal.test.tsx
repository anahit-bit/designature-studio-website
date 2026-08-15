/** AC-002 — LibraryItemModal: opens an item, shows its image, copies a share link, deletes. */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryItemModal } from '../components/account/modals/LibraryItemModal';
import type { LibraryItem } from '../lib/accountApi';
import * as api from '../lib/accountApi';

const imageItem: LibraryItem = {
  id: 'lib-1',
  tool: 'ai_vision',
  title: 'Kitchen — Japandi',
  createdAt: new Date().toISOString(),
  thumbnailUrl: 'https://res.cloudinary.com/x/image/upload/v1/thumb.jpg',
  fullPreviewUrl: 'https://res.cloudinary.com/x/image/upload/v1/full.jpg',
  metadata: {},
};

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('LibraryItemModal', () => {
  it('renders the item image + title when opened', () => {
    render(<LibraryItemModal item={imageItem} onClose={() => {}} onDeleted={() => {}} />);
    expect(screen.getByText('Kitchen — Japandi')).toBeInTheDocument();
    expect(screen.getByAltText('Kitchen — Japandi')).toBeInTheDocument();
  });

  it('copies the shareable link on Share', async () => {
    render(<LibraryItemModal item={imageItem} onClose={() => {}} onDeleted={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Share/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    const arg = (navigator.clipboard.writeText as any).mock.calls[0][0];
    expect(arg).toContain('/shared/lib-1');
  });

  it('deletes via accountApi and fires onDeleted', async () => {
    const del = vi.spyOn(api.accountApi, 'deleteLibraryItem').mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(<LibraryItemModal item={imageItem} onClose={() => {}} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('lib-1'));
    expect(del).toHaveBeenCalledWith('lib-1');
  });

  it('renders nothing when item is null', () => {
    const { container } = render(<LibraryItemModal item={null} onClose={() => {}} onDeleted={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
