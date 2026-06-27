import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveAmountAndCurrency,
  evaluatePaymentSuccess,
  buildGatewayRedirectUrl,
  isValidEmail,
  normalizeCode,
  CURRENCY_AMD,
  CURRENCY_USD,
  type PaymentDetails,
} from '../../services/payments/ameria';

// resolveAmountAndCurrency reads a few env vars — snapshot + restore around tests.
const ENV_KEYS = ['AMERIA_SANDBOX_AMOUNT', 'AMERIA_SANDBOX_CURRENCY', 'CONSULTATION_PRICE_USD'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('resolveAmountAndCurrency — mode branching', () => {
  it('sandbox forces 10 AMD (currency 051) by default', () => {
    delete process.env.AMERIA_SANDBOX_AMOUNT;
    delete process.env.AMERIA_SANDBOX_CURRENCY;
    expect(resolveAmountAndCurrency('sandbox')).toEqual({ amount: 10, currency: CURRENCY_AMD });
  });

  it('sandbox honours overrides from env', () => {
    process.env.AMERIA_SANDBOX_AMOUNT = '10';
    process.env.AMERIA_SANDBOX_CURRENCY = '051';
    expect(resolveAmountAndCurrency('sandbox')).toEqual({ amount: 10, currency: '051' });
  });

  it('production uses CONSULTATION_PRICE_USD in USD (840)', () => {
    process.env.CONSULTATION_PRICE_USD = '99';
    expect(resolveAmountAndCurrency('production')).toEqual({ amount: 99, currency: CURRENCY_USD });
  });

  it('production falls back to 99 when the price env is garbage', () => {
    process.env.CONSULTATION_PRICE_USD = 'not-a-number';
    expect(resolveAmountAndCurrency('production')).toEqual({ amount: 99, currency: CURRENCY_USD });
  });
});

describe('buildGatewayRedirectUrl', () => {
  it('builds the hosted-page URL with a single slash regardless of trailing slash', () => {
    expect(buildGatewayRedirectUrl('https://servicestest.ameriabank.am/VPOS/', 'pid-123')).toBe(
      'https://servicestest.ameriabank.am/VPOS/Payments/Pay?id=pid-123&lang=en',
    );
    expect(buildGatewayRedirectUrl('https://servicestest.ameriabank.am/VPOS', 'pid-123')).toBe(
      'https://servicestest.ameriabank.am/VPOS/Payments/Pay?id=pid-123&lang=en',
    );
  });

  it('url-encodes the payment id', () => {
    expect(buildGatewayRedirectUrl('https://x/VPOS/', 'a b/c')).toContain('id=a%20b%2Fc');
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('client@example.com')).toBe(true);
  });
  it('rejects junk', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123 as unknown)).toBe(false);
  });
});

describe('normalizeCode', () => {
  it('canonicalises 0 / "0" / "00" to "00"', () => {
    expect(normalizeCode(0)).toBe('00');
    expect(normalizeCode('0')).toBe('00');
    expect(normalizeCode('00')).toBe('00');
  });
  it('returns null for missing', () => {
    expect(normalizeCode(null)).toBe(null);
    expect(normalizeCode(undefined)).toBe(null);
    expect(normalizeCode('')).toBe(null);
  });
  it('passes decline codes through', () => {
    expect(normalizeCode('0100')).toBe('0100');
  });
});

describe('evaluatePaymentSuccess — server-side verification gate', () => {
  const good = (): PaymentDetails => ({
    ResponseCode: '00',
    PaymentState: 'payment_deposited',
    DepositedAmount: 10,
    Currency: '051',
  });

  it('passes a fully approved + deposited sandbox payment', () => {
    const r = evaluatePaymentSuccess(good(), 10, '051');
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it('accepts numeric currency 51 against expected "051"', () => {
    const r = evaluatePaymentSuccess({ ...good(), Currency: 51 }, 10, '051');
    expect(r.ok).toBe(true);
  });

  it('fails when the response code is a decline', () => {
    const r = evaluatePaymentSuccess({ ...good(), ResponseCode: '0100' }, 10, '051');
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('ResponseCode');
  });

  it('fails when not deposited (e.g. only authorised)', () => {
    const r = evaluatePaymentSuccess({ ...good(), PaymentState: 'payment_approved' }, 10, '051');
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('PaymentState');
  });

  it('fails when the captured amount is short', () => {
    const r = evaluatePaymentSuccess({ ...good(), DepositedAmount: 5 }, 10, '051');
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('DepositedAmount');
  });

  it('fails when the currency is wrong', () => {
    const r = evaluatePaymentSuccess({ ...good(), Currency: '840' }, 10, '051');
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('Currency');
  });

  it('collects all failures at once', () => {
    const r = evaluatePaymentSuccess(
      { ResponseCode: '0100', PaymentState: 'declined', DepositedAmount: 0, Currency: '978' },
      10,
      '051',
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.length).toBe(4);
  });
});
