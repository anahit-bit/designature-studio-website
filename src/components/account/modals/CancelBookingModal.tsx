/**
 * AC-001 — cancel a consultation. Enforces the 24h refund-policy copy branch:
 *   >24h before slot  → "full refund" · "Cancel & refund"
 *   ≤24h before slot  → "within 24h, no refund" · "Cancel without refund"
 * Posts via accountApi.cancelConsultation (server enforces the real refund).
 */
import React, { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { Button, isRefundEligible } from '../ui';
import { accountApi, type Booking } from '../../../lib/accountApi';

export const CancelBookingModal: React.FC<{
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCanceled: (orderId: string) => void;
}> = ({ open, onClose, booking, onCanceled }) => {
  const [busy, setBusy] = useState(false);
  if (!booking) return null;

  const refundable = isRefundEligible(booking.slotStartTime);

  const submit = async () => {
    setBusy(true);
    try {
      await accountApi.cancelConsultation(booking.id);
      onCanceled(booking.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancel this consultation?">
      {refundable ? (
        <p className="font-body text-[13px] text-[#6B6B6B] mb-[18px]">
          It's more than 24h before your slot, so you're eligible for a{' '}
          <b className="text-[#0A0A0A]">full refund</b> per our policy.
        </p>
      ) : (
        <p className="font-body text-[13px] text-[#6B6B6B] mb-[18px]">
          Your slot is <b className="text-[#0A0A0A]">within 24h</b> — no refund per our
          cancellation policy. You can cancel without a refund, or keep the booking.
        </p>
      )}
      <ModalActions>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={busy}>
          Keep booking
        </Button>
        <Button size="sm" variant="danger" onClick={submit} disabled={busy}>
          {busy ? 'Canceling…' : refundable ? 'Cancel & refund' : 'Cancel without refund'}
        </Button>
      </ModalActions>
    </Modal>
  );
};
