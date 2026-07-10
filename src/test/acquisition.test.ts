import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Google client layer so the fetchers + orchestrator run hermetically.
vi.mock('../../server/analytics/googleClients', () => ({
  getSearchConsoleClient: vi.fn(),
  getAnalyticsDataClient: vi.fn(),
  isAcquisitionConfigured: vi.fn(() => true),
  ga4PropertyId: vi.fn(() => '538719817'),
  gscSiteUrl: vi.fn(() => 'sc-domain:designature.studio'),
}));

import {
  getSearchConsoleClient,
  getAnalyticsDataClient,
  isAcquisitionConfigured,
} from '../../server/analytics/googleClients';
import { fetchSearchConsole } from '../../server/analytics/searchConsole';
import { fetchGa4 } from '../../server/analytics/ga4';
import { getAcquisition, __clearAcquisitionCache } from '../../server/analytics/acquisition';

function gscClient() {
  return {
    searchanalytics: {
      query: vi.fn(async ({ requestBody }: any) => {
        const dims = requestBody.dimensions;
        if (!dims) return { data: { rows: [{ clicks: 4, impressions: 336, ctr: 0.0119, position: 5.63 }] } };
        if (dims[0] === 'query') return { data: { rows: [
          { keys: ['designature'], clicks: 3, impressions: 203 },
          { keys: ['designatura'], clicks: 0, impressions: 2 },
        ] } };
        if (dims[0] === 'page') return { data: { rows: [{ keys: ['https://designature.studio/'], clicks: 2 }] } };
        if (dims[0] === 'country') return { data: { rows: [{ keys: ['arm'], clicks: 3 }] } };
        return { data: {} };
      }),
    },
  };
}

function ga4Client() {
  return {
    properties: {
      batchRunReports: vi.fn(async () => ({ data: { reports: [
        { rows: [
          { dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: '110' }, { value: '0.782' }] },
          { dimensionValues: [{ value: 'Organic Social' }], metricValues: [{ value: '26' }, { value: '0.462' }] },
          { dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '4' }, { value: '0.5' }] },
          { dimensionValues: [{ value: 'AI Assistant' }], metricValues: [{ value: '3' }, { value: '0.333' }] },
        ] },
        { rows: [{ metricValues: [{ value: '170' }, { value: '0.6' }] }] },
        { rows: [{ dimensionValues: [{ value: '/studio' }], metricValues: [{ value: '40' }] }] },
        { rows: [{ dimensionValues: [{ value: 'Armenia' }], metricValues: [{ value: '90' }] }] },
      ] } })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __clearAcquisitionCache();
  vi.mocked(isAcquisitionConfigured).mockReturnValue(true);
  vi.mocked(getSearchConsoleClient).mockReturnValue(gscClient() as any);
  vi.mocked(getAnalyticsDataClient).mockReturnValue(ga4Client() as any);
});

describe('fetchSearchConsole', () => {
  it('maps totals, top queries, top page, and uppercased country', async () => {
    const r = await fetchSearchConsole(28);
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ clicks: 4, impressions: 336, ctrPct: 1.2, position: 5.6 });
    expect(r.topQueries[0]).toEqual({ query: 'designature', clicks: 3, impressions: 203 });
    expect(r.topPage).toEqual({ page: 'https://designature.studio/', clicks: 2 });
    expect(r.topCountry).toEqual({ country: 'ARM', clicks: 3 });
  });

  it('returns ok:false when the client is unavailable', async () => {
    vi.mocked(getSearchConsoleClient).mockReturnValue(null as any);
    const r = await fetchSearchConsole();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not configured/i);
  });

  it('returns ok:false (never throws) when the API rejects', async () => {
    vi.mocked(getSearchConsoleClient).mockReturnValue({
      searchanalytics: { query: vi.fn(async () => { throw new Error('403 permission denied'); }) },
    } as any);
    const r = await fetchSearchConsole();
    expect(r.ok).toBe(false);
    expect(r.error).toContain('403');
  });
});

describe('fetchGa4', () => {
  it('splits channels into organic/direct/social and maps bounce + geo', async () => {
    const r = await fetchGa4(28);
    expect(r.ok).toBe(true);
    expect(r.direct).toBe(110);
    expect(r.organicSearch).toBe(4);
    expect(r.social).toBe(26); // Organic Social + Paid Social(0)
    expect(r.aiAssistant).toBe(3); // GA4 "AI Assistant" channel
    expect(r.totalSessions).toBe(170);
    expect(r.bounceRatePct).toBe(60);
    expect(r.channels[0]).toEqual({ channel: 'Direct', sessions: 110, bounceRatePct: 78.2 });
    expect(r.topLandingPage).toEqual({ path: '/studio', sessions: 40 });
    expect(r.topCountry).toEqual({ country: 'Armenia', sessions: 90 });
  });

  it('returns ok:false when the client is unavailable', async () => {
    vi.mocked(getAnalyticsDataClient).mockReturnValue(null as any);
    const r = await fetchGa4();
    expect(r.ok).toBe(false);
  });
});

describe('getAcquisition orchestrator', () => {
  it('composes GA4 + GSC into a configured payload', async () => {
    const a = await getAcquisition(true);
    expect(a.configured).toBe(true);
    expect(a.rangeDays).toBe(28);
    expect(a.ga4?.direct).toBe(110);
    expect(a.gsc?.clicks).toBe(4);
    expect(typeof a.updatedAt).toBe('string');
  });

  it('returns configured:false with no sources when unconfigured', async () => {
    vi.mocked(isAcquisitionConfigured).mockReturnValue(false);
    const a = await getAcquisition(true);
    expect(a.configured).toBe(false);
    expect(a.ga4).toBeNull();
    expect(a.gsc).toBeNull();
  });

  it('serves from cache on the second call (no re-fetch)', async () => {
    const ga4 = ga4Client();
    vi.mocked(getAnalyticsDataClient).mockReturnValue(ga4 as any);
    await getAcquisition();
    await getAcquisition();
    expect(ga4.properties.batchRunReports).toHaveBeenCalledTimes(1);
  });

  it('force=true bypasses the cache', async () => {
    const ga4 = ga4Client();
    vi.mocked(getAnalyticsDataClient).mockReturnValue(ga4 as any);
    await getAcquisition();
    await getAcquisition(true);
    expect(ga4.properties.batchRunReports).toHaveBeenCalledTimes(2);
  });

  it('still returns GSC data when GA4 fails (graceful degradation)', async () => {
    vi.mocked(getAnalyticsDataClient).mockReturnValue({
      properties: { batchRunReports: vi.fn(async () => { throw new Error('GA4 down'); }) },
    } as any);
    const a = await getAcquisition(true);
    expect(a.configured).toBe(true);
    expect(a.ga4?.ok).toBe(false);
    expect(a.gsc?.ok).toBe(true);
    expect(a.gsc?.clicks).toBe(4);
  });
});
