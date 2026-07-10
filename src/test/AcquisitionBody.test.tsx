import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AcquisitionBody, type AcquisitionData } from '../components/AdminPage';

const FULL: AcquisitionData = {
  configured: true,
  updatedAt: new Date().toISOString(),
  rangeDays: 28,
  ga4: {
    ok: true,
    totalSessions: 192,
    bounceRatePct: 60.9,
    channels: [{ channel: 'Direct', sessions: 110, bounceRatePct: 78.2 }],
    organicSearch: 4,
    direct: 110,
    social: 26,
    aiAssistant: 3,
    topLandingPage: { path: '/studio', sessions: 40 },
    topCountry: { country: 'Armenia', sessions: 75 },
  },
  gsc: {
    ok: true,
    clicks: 4,
    impressions: 336,
    ctrPct: 1.2,
    position: 5.6,
    topQueries: [{ query: 'designature', clicks: 3, impressions: 203 }],
    topPage: { page: 'https://designature.studio/', clicks: 4 },
    topCountry: { country: 'ARM', clicks: 3 },
  },
};

describe('AcquisitionBody', () => {
  it('renders Loading when data is null', () => {
    render(<AcquisitionBody data={null} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders all six tiles + keywords from live data', () => {
    render(<AcquisitionBody data={FULL} />);
    expect(screen.getByText('Direct')).toBeTruthy();
    expect(screen.getByText('110')).toBeTruthy(); // direct sessions
    expect(screen.getByText('60.9%')).toBeTruthy(); // bounce
    expect(screen.getByText('/studio')).toBeTruthy(); // top landing page
    expect(screen.getByText('Armenia')).toBeTruthy(); // top country (GA4 preferred)
    expect(screen.getByText('designature')).toBeTruthy(); // top query
    expect(screen.getByText(/336/)).toBeTruthy(); // impressions in header
    expect(screen.getByText('AI Assistant · LLM referrals')).toBeTruthy(); // GEO tile
  });

  it('shows a not-configured note when configured=false', () => {
    render(<AcquisitionBody data={{ configured: false, updatedAt: '', rangeDays: 28, ga4: null, gsc: null }} />);
    expect(screen.getByText('Not configured')).toBeTruthy();
  });

  it('degrades gracefully when GA4 failed but GSC is present', () => {
    render(<AcquisitionBody data={{
      ...FULL,
      ga4: { ok: false, error: 'GA4 down', totalSessions: 0, bounceRatePct: null, channels: [], organicSearch: 0, direct: 0, social: 0, aiAssistant: 0, topLandingPage: null, topCountry: null },
    }} />);
    expect(screen.getByText(/GA4: GA4 down/)).toBeTruthy();
    // GSC keywords still render
    expect(screen.getByText('designature')).toBeTruthy();
    // country falls back to the GSC country code
    expect(screen.getByText('ARM')).toBeTruthy();
  });
});
