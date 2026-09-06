/**
 * AC-001 — shared account-area UI primitives + formatters.
 *
 * Transcribed 1:1 from the AC-001 mockup tokens. Colors match the locked brand
 * canon (navy/terracotta/cobalt/success). Type uses the site's shipped font
 * utilities — `font-display` (serif headlines) and `font-body` (everything else)
 * — so the account page coheres with the Header/Footer chrome that wraps it.
 */
import React from 'react';
import {
  Camera,
  ShoppingBag,
  Ruler,
  Palette,
  FileText,
  Globe,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import type { ToolKey } from '../../lib/accountApi';

// ── brand tokens ─────────────────────────────────────────────────────────────
export const C = {
  ink: '#0A0A0A',
  muted: '#6B6B6B',
  terra: '#9E5E41',
  cobalt: '#0047AB',
  success: '#15803d',
  hair: '#DAD2C3',
  paper: '#FAFAFA',
  navy: '#0B2240',
} as const;

// ── buttons ──────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success';
type BtnSize = 'md' | 'sm';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-body font-bold uppercase border cursor-pointer transition-colors duration-150 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';

const BTN_SIZE: Record<BtnSize, string> = {
  md: 'text-[12px] tracking-[0.16em] px-[22px] py-[13px]',
  sm: 'text-[11px] tracking-[0.12em] px-[14px] py-[9px]',
};

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-[#0A0A0A] text-white border-[#0A0A0A] hover:bg-[#333333]',
  secondary: 'bg-transparent text-[#0A0A0A] border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white',
  danger: 'bg-transparent text-[#9E5E41] border-[#9E5E41] hover:bg-[#9E5E41] hover:text-white',
  success: 'bg-transparent text-[#15803d] border-[#15803d] hover:bg-[#15803d] hover:text-white',
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: BtnSize;
  }
> = ({ variant = 'primary', size = 'md', className = '', children, type = 'button', ...rest }) => (
  <button
    type={type}
    className={`${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

// ── eyebrow label ────────────────────────────────────────────────────────────
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = '',
  style,
}) => (
  <div
    className={`font-body text-[11px] font-bold tracking-[0.28em] uppercase text-[#6B6B6B] ${className}`}
    style={style}
  >
    {children}
  </div>
);

// ── card ─────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = '',
  style,
}) => (
  <div className={`border border-black/10 bg-white p-7 ${className}`} style={style}>
    {children}
  </div>
);

// ── plan pill ────────────────────────────────────────────────────────────────
export const PlanPill: React.FC<{ tier: 'free' | 'design' | 'studio' }> = ({ tier }) => {
  const styles: Record<string, string> = {
    free: 'border-[#6B6B6B] text-[#6B6B6B]',
    design: 'bg-[#0047AB] border-[#0047AB] text-white',
    studio: 'bg-[#0047AB] border-[#0047AB] text-white',
  };
  // Credit model: a subscriber is a "Member"; everyone else is on the free grant.
  const label: Record<string, string> = { free: 'Free', design: 'Member', studio: 'Member' };
  return (
    <span
      className={`inline-block font-body text-[10px] font-bold tracking-[0.28em] uppercase px-[10px] py-[4px] border ${styles[tier]}`}
    >
      {label[tier] ?? tier}
    </span>
  );
};

// ── skeleton bar ─────────────────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => (
  <div
    className={`animate-pulse bg-black/[0.07] ${className}`}
    style={style}
    data-testid="account-skeleton"
    aria-hidden
  />
);

// ── error banner ─────────────────────────────────────────────────────────────
export const ErrorBanner: React.FC<{ onRetry?: () => void; message?: string }> = ({
  onRetry,
  message = "Couldn't load. Retry",
}) => (
  <div
    role="alert"
    className="flex items-center gap-4 border border-[#9E5E41] px-[18px] py-[14px] mb-6"
  >
    <AlertTriangle className="w-4 h-4 text-[#9E5E41] flex-shrink-0" />
    <span className="flex-1 font-body text-[13px] text-[#0A0A0A]">{message}</span>
    {onRetry && (
      <Button size="sm" variant="danger" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

// ── tool metadata (labels + icons) ───────────────────────────────────────────
export const TOOL_META: Record<ToolKey, { label: string; Icon: LucideIcon }> = {
  ai_vision: { label: 'AI Vision', Icon: Camera },
  shopping: { label: 'Shopping List', Icon: ShoppingBag },
  room_audit: { label: 'Room Audit', Icon: Ruler },
  style_quiz: { label: 'Style Quiz', Icon: Palette },
  design_brief: { label: 'Design Brief', Icon: FileText },
  cultural: { label: 'Cultural Advisor', Icon: Globe },
};

// ── date formatters ──────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Aug 12, 2026" */
export function fmtDate(isoStr: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Jul 3" */
export function fmtMonthDay(isoStr: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Thu, Jul 24 · 15:00" */
export function fmtDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} · ${hh}:${mm}`;
}

/** "15:00" */
export function fmtTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Day-block pieces: { day: "24", month: "JUL" } */
export function dateBlock(isoStr: string): { day: string; month: string } {
  const d = new Date(isoStr);
  return { day: String(d.getDate()).padStart(2, '0'), month: MONTHS[d.getMonth()].toUpperCase() };
}

/** "2 hours ago" / "Yesterday" / "Jul 3" */
export function timeAgo(isoStr: string): string {
  const then = new Date(isoStr).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const mins = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return fmtMonthDay(isoStr);
}

/** 24h refund policy branch for a booking slot. */
export function isRefundEligible(slotStartTimeIso: string): boolean {
  return new Date(slotStartTimeIso).getTime() - Date.now() > 24 * 3600 * 1000;
}
