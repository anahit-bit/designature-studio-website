/**
 * AC-001 — delete account. Two gates before the final destructive button unlocks:
 *   1. "I understand this cannot be undone" checkbox
 *   2. Type your exact email to confirm
 * Posts via accountApi.deleteAccount(), then the caller signs out + redirects home.
 */
import React, { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { Button } from '../ui';
import { accountApi } from '../../../lib/accountApi';

export const DeleteAccountModal: React.FC<{
  open: boolean;
  onClose: () => void;
  email: string;
  onDeleted: () => void;
}> = ({ open, onClose, email, onDeleted }) => {
  const [understood, setUnderstood] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const canDelete = understood && confirmEmail.trim().toLowerCase() === email.toLowerCase();

  const submit = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      await accountApi.deleteAccount();
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete your account">
      <p className="font-body text-[13px] text-[#6B6B6B] mb-[18px]">
        This permanently deletes your saved concepts, shopping lists, room audits, and bookings
        history. An active subscription is canceled now — no refund per policy.
      </p>
      <label className="flex gap-[10px] items-start font-body text-[13px] mb-[14px] cursor-pointer">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="mt-[3px]"
        />
        <span>I understand this cannot be undone.</span>
      </label>
      <input
        type="email"
        value={confirmEmail}
        onChange={(e) => setConfirmEmail(e.target.value)}
        placeholder="Type your email to confirm"
        aria-label="Confirm your email"
        className="w-full border border-black/15 p-[11px] font-body text-[13px] mb-[14px]"
      />
      <ModalActions>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={busy}>
          Keep account
        </Button>
        <Button size="sm" variant="danger" onClick={submit} disabled={!canDelete || busy}>
          {busy ? 'Deleting…' : 'Delete my account'}
        </Button>
      </ModalActions>
    </Modal>
  );
};
