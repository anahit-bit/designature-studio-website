/** AC-001 — Bookings tab. Upcoming + past consultations; 24h-aware cancel handled by parent modal. */
import React from 'react';
import { Button, Card, Eyebrow, Skeleton, ErrorBanner, dateBlock, fmtTime } from '../ui';
import { useResource } from '../useResource';
import { accountApi, type Booking } from '../../../lib/accountApi';

const BookingRow: React.FC<{ booking: Booking; past?: boolean; children: React.ReactNode }> = ({
  booking,
  past,
  children,
}) => {
  const { day, month } = dateBlock(booking.slotStartTime);
  const label = booking.kind === 'paid_consult' ? '$99 Consultation' : 'Free Quick Chat';
  return (
    <Card
      className={`flex gap-[18px] items-center justify-between flex-wrap ${past ? 'opacity-70' : ''}`}
    >
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 border border-black/[0.12] flex flex-col items-center justify-center flex-shrink-0">
          <div className="font-display text-[26px] leading-none text-[#0A0A0A]">{day}</div>
          <div className="text-[10px] tracking-[0.16em] uppercase text-[#6B6B6B]">{month}</div>
        </div>
        <div>
          <div className="font-body font-semibold text-[#0A0A0A]">{label}</div>
          <div className="text-[#6B6B6B] text-[12px] font-body">
            {past
              ? 'Completed · 45 min'
              : `${fmtTime(booking.slotStartTime)} · GMT+4 (your local) · 45 min`}
          </div>
        </div>
      </div>
      <div className="flex gap-[10px] flex-wrap">{children}</div>
    </Card>
  );
};

export const BookingsTab: React.FC<{
  onCancel: (booking: Booking) => void;
  onToast: (msg: string) => void;
  onBookConsultation: () => void;
  onFreeChat: () => void;
}> = ({ onCancel, onToast, onBookConsultation, onFreeChat }) => {
  const { data, loading, error, reload } = useResource(() => accountApi.getBookings(), []);

  const hasAny = data && (data.upcoming.length > 0 || data.past.length > 0);

  return (
    <section>
      <h1 className="font-display text-[44px] leading-[1.05] mb-1 text-[#0A0A0A]">Bookings</h1>
      <p className="text-[#6B6B6B] mb-7 font-body">Your studio consultations.</p>

      {error && <ErrorBanner onRetry={reload} />}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
        </div>
      ) : !hasAny ? (
        <div className="text-center py-14 px-5 border border-black/[0.08] bg-[#FAFAFA]">
          <h3 className="font-display text-[30px] mb-[10px] text-[#0A0A0A]">No consultations yet.</h3>
          <p className="text-[#6B6B6B] max-w-[440px] mx-auto mb-[22px] font-body">
            Book a paid 45-minute studio consultation, or a free 15-minute chat.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="primary" onClick={onBookConsultation}>
              Book a $99 consultation
            </Button>
            <Button variant="secondary" onClick={onFreeChat}>
              Free 15-minute chat
            </Button>
          </div>
        </div>
      ) : (
        <>
          {data!.upcoming.length > 0 && (
            <>
              <Eyebrow className="mb-3">Upcoming</Eyebrow>
              <div className="flex flex-col gap-4 mb-2">
                {data!.upcoming.map((b) => (
                  <BookingRow key={b.id} booking={b}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => b.meetLink && window.open(b.meetLink, '_blank', 'noopener')}
                      disabled={!b.meetLink}
                    >
                      Join Meet
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        b.rescheduleUrl && window.open(b.rescheduleUrl, '_blank', 'noopener')
                      }
                      disabled={!b.rescheduleUrl}
                    >
                      Reschedule
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => onCancel(b)}>
                      Cancel
                    </Button>
                  </BookingRow>
                ))}
              </div>
            </>
          )}

          {data!.past.length > 0 && (
            <>
              <Eyebrow className="mt-[26px] mb-3">Past consultations</Eyebrow>
              <div className="flex flex-col gap-4">
                {data!.past.map((b) => (
                  <BookingRow key={b.id} booking={b} past>
                    <Button size="sm" variant="secondary" onClick={onBookConsultation}>
                      Book similar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onToast('Summary email sent')}
                    >
                      Get summary email
                    </Button>
                  </BookingRow>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};
