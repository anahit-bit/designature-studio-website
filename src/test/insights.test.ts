import { describe, it, expect, beforeEach } from 'vitest';
import { getInsights, clearInsightsCache } from '../../server/analytics/insights';

// These run without Google credentials, so isAcquisitionConfigured() is false and
// getInsights must short-circuit to configured:false WITHOUT any network call.
describe('getInsights (unconfigured)', () => {
  beforeEach(() => {
    clearInsightsCache();
    delete process.env.GA4_PROPERTY_ID;
    delete process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE;
  });

  it('returns configured:false and empty payload, no network', async () => {
    const d = await getInsights(['ai interior design', 'online interior design']);
    expect(d.configured).toBe(false);
    expect(d.watchlist).toEqual([]);
    expect(d.pulse).toBeNull();
    expect(d.gsc).toBeNull();
    expect(typeof d.updatedAt).toBe('string');
    expect(d.rangeDays).toBe(28);
  });

  it('clearInsightsCache is idempotent', () => {
    expect(() => { clearInsightsCache(); clearInsightsCache(); }).not.toThrow();
  });
});
