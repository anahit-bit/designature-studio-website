import { describe, it, expect } from 'vitest';
import { cannotAffordRun, isUnlimitedUser, notEnoughCreditsMessage } from '../lib/credits';

const creditsUser = { creditsEnabled: true, generationsLeft: 0 };

describe('credit gating rules (client)', () => {
  it('blocks when the balance cannot cover the tool price', () => {
    expect(cannotAffordRun(creditsUser, 9, 'redesign')).toBe(true);   // costs 10
    expect(cannotAffordRun(creditsUser, 10, 'redesign')).toBe(false);
    expect(cannotAffordRun(creditsUser, 24, 'shop')).toBe(true);      // costs 25
    expect(cannotAffordRun(creditsUser, 25, 'shop')).toBe(false);
    expect(cannotAffordRun(creditsUser, 4, 'score-room')).toBe(true); // costs 5
  });

  it('never blocks on an unknown balance: the server decides', () => {
    expect(cannotAffordRun(creditsUser, null, 'redesign')).toBe(false);
    expect(cannotAffordRun(creditsUser, undefined, 'redesign')).toBe(false);
  });

  it('never blocks when credits are off, so the legacy counters stay in charge', () => {
    expect(cannotAffordRun({ creditsEnabled: false, generationsLeft: 0 }, 0, 'redesign')).toBe(false);
    expect(cannotAffordRun({ generationsLeft: 0 }, 0, 'redesign')).toBe(false);
  });

  it('never blocks unlimited accounts', () => {
    expect(isUnlimitedUser({ generationsLeft: 999 })).toBe(true);
    expect(cannotAffordRun({ creditsEnabled: true, generationsLeft: 999 }, 0, 'redesign')).toBe(false);
  });

  it('a plan granting 999 shopping lists does not make redesigns unlimited', () => {
    expect(isUnlimitedUser({ generationsLeft: 3, shoppingListsLeft: 999 } as never)).toBe(false);
  });

  it('writes the 402 message with the tool price and what the user has', () => {
    expect(notEnoughCreditsMessage('A shopping list', 'shop', 12)).toBe(
      'Not enough credits. A shopping list costs 25 credits and you have 12.',
    );
    expect(notEnoughCreditsMessage('A redesign', 'redesign', undefined)).toBe(
      'Not enough credits. A redesign costs 10 credits and you have 0.',
    );
  });
});
