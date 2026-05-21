import { describe, it, expect } from 'vitest';
import { pickAspectRatio } from '../../services/aiVision/imageGeneration';

describe('pickAspectRatio · AI-030 aspect-preserved generation', () => {
  it('maps wide landscape (16:9 phone/DSLR) to "16:9"', () => {
    expect(pickAspectRatio(16 / 9)).toBe('16:9'); // 1.778
    expect(pickAspectRatio(2.0)).toBe('16:9');
  });

  it('maps standard landscape (4:3) to "4:3"', () => {
    expect(pickAspectRatio(4 / 3)).toBe('4:3'); // 1.333
    expect(pickAspectRatio(1.5)).toBe('4:3'); // 3:2 falls into 4:3 band
  });

  it('maps square (and near-square) to "1:1"', () => {
    expect(pickAspectRatio(1.0)).toBe('1:1');
    expect(pickAspectRatio(0.9)).toBe('1:1');
    expect(pickAspectRatio(1.1)).toBe('1:1');
  });

  it('maps standard portrait (3:4) to "3:4"', () => {
    expect(pickAspectRatio(3 / 4)).toBe('3:4'); // 0.75
    expect(pickAspectRatio(0.8)).toBe('3:4');
  });

  it('maps tall portrait (9:16 phone) to "9:16"', () => {
    expect(pickAspectRatio(9 / 16)).toBe('9:16'); // 0.5625
    expect(pickAspectRatio(0.5)).toBe('9:16');
  });

  it('threshold edges are stable', () => {
    expect(pickAspectRatio(1.65)).toBe('16:9');
    expect(pickAspectRatio(1.6499)).toBe('4:3');
    expect(pickAspectRatio(1.15)).toBe('4:3');
    expect(pickAspectRatio(1.1499)).toBe('1:1');
    expect(pickAspectRatio(0.85)).toBe('1:1');
    expect(pickAspectRatio(0.8499)).toBe('3:4');
    expect(pickAspectRatio(0.6)).toBe('3:4');
    expect(pickAspectRatio(0.5999)).toBe('9:16');
  });
});
