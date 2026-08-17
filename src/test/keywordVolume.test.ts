import { describe, it, expect, beforeEach } from 'vitest';
import { getKeywordVolumes } from '../../server/analytics/keywordVolume';
import { googleAdsConfigured } from '../../server/analytics/googleAdsKeywords';
import { bingConfigured } from '../../server/analytics/bingKeywords';

// No keys in the test env → both providers report unconfigured and the
// orchestrator short-circuits to configured:false WITHOUT any network call.
describe('keyword volume (unconfigured)', () => {
  beforeEach(() => {
    delete process.env.BING_WEBMASTER_API_KEY;
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    delete process.env.GOOGLE_ADS_REFRESH_TOKEN;
    delete process.env.GOOGLE_ADS_CUSTOMER_ID;
  });

  it('reports both providers unconfigured', () => {
    expect(bingConfigured()).toBe(false);
    expect(googleAdsConfigured()).toBe(false);
  });

  it('returns configured:false with null volumes per phrase, no network', async () => {
    const r = await getKeywordVolumes(['ai interior design', 'online interior design']);
    expect(r.configured).toBe(false);
    expect(r.sources).toEqual([]);
    expect(r.byPhrase['ai interior design']).toEqual({ google: null, bing: null });
    expect(r.byPhrase['online interior design']).toEqual({ google: null, bing: null });
  });

  it('lowercases phrase keys', async () => {
    const r = await getKeywordVolumes(['AI Interior Design']);
    expect(r.byPhrase['ai interior design']).toBeDefined();
  });
});
