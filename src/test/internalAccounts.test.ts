import { describe, it, expect } from 'vitest';
import { isInternalAccount } from '../../server/internalAccounts';

describe('isInternalAccount', () => {
  it('matches the owner accounts requested for exclusion', () => {
    expect(isInternalAccount('anahit.ghasabyan@gmail.com')).toBe(true);
    expect(isInternalAccount('anahit@designature.studio')).toBe(true);
  });

  it('matches ANY address on the studio domain', () => {
    expect(isInternalAccount('hello@designature.studio')).toBe(true);
    expect(isInternalAccount('anyone@designature.studio')).toBe(true);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isInternalAccount('  Anahit@Designature.Studio ')).toBe(true);
    expect(isInternalAccount('ANAHIT.GHASABYAN@GMAIL.COM')).toBe(true);
  });

  it('does NOT match real users, anonymous, or empty', () => {
    expect(isInternalAccount('someone@gmail.com')).toBe(false);
    expect(isInternalAccount('client@example.com')).toBe(false);
    expect(isInternalAccount('anonymous')).toBe(false);
    expect(isInternalAccount('')).toBe(false);
    expect(isInternalAccount(undefined)).toBe(false);
    expect(isInternalAccount(null)).toBe(false);
  });

  it('does not match a lookalike domain (suffix guard)', () => {
    // must be exactly @designature.studio, not a domain that ends with it
    expect(isInternalAccount('a@notdesignature.studio')).toBe(false);
    expect(isInternalAccount('a@designature.studio.evil.com')).toBe(false);
  });
});
