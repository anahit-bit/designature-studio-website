/**
 * AC-001 — update card. Primary "Continue to bank →" calls
 * accountApi.replacePaymentMethod(). In mock mode there is no redirect, so we just
 * close and toast "Card updated"; in real mode the returned redirectUrl sends the
 * user to Ameriabank's binding page (same tab).
 */
import React, { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { Button } from '../ui';
import { accountApi } from '../../../lib/accountApi';

export const UpdatePaymentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ open, onClose, onToast }) => {
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { redirectUrl } = await accountApi.replacePaymentMethod();
      if (redirectUrl) {
        window.location.href = redirectUrl; // real mode → bank binding page
        return;
      }
      onToast('Card updated');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Update your card">
      <p className="font-body text-[13px] text-[#6B6B6B] mb-[18px]">
        You'll be sent to Ameriabank's secure page to bind a new card, then returned here. Your
        subscription keeps running.
      </p>
      <ModalActions>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={busy}>
          Not now
        </Button>
        <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
          {busy ? 'Working…' : 'Continue to bank →'}
        </Button>
      </ModalActions>
    </Modal>
  );
};
