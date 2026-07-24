/** AC-001 — cancel subscription. Feedback textarea + keep/cancel. Posts via accountApi.cancelSubscription. */
import React, { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { Button } from '../ui';
import { fmtDate } from '../ui';
import { accountApi, type Plan } from '../../../lib/accountApi';

export const CancelPlanModal: React.FC<{
  open: boolean;
  onClose: () => void;
  periodEndAt: string | null;
  onCanceled: (plan: Plan) => void;
}> = ({ open, onClose, periodEndAt, onCanceled }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const endText = periodEndAt ? fmtDate(periodEndAt) : 'the end of your billing period';

  const submit = async () => {
    setBusy(true);
    try {
      const plan = await accountApi.cancelSubscription(reason || undefined);
      onCanceled(plan);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancel your plan?">
      <p className="font-body text-[13px] text-[#6B6B6B] mb-[18px]">
        You'll keep full access until <b className="text-[#0A0A0A]">{endText}</b> — we don't
        prorate. After that you drop to Free and your library becomes read-only.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Anything we could have done better? (optional)"
        className="w-full border border-black/15 p-[11px] font-body text-[13px] mb-[14px] min-h-[84px]"
      />
      <ModalActions>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={busy}>
          Keep my plan
        </Button>
        <Button size="sm" variant="danger" onClick={submit} disabled={busy}>
          {busy ? 'Canceling…' : 'Cancel my plan'}
        </Button>
      </ModalActions>
    </Modal>
  );
};
