import { describe, expect, it } from 'vitest';
import { titleSimilarity } from './MetadataValidator.js';

describe('titleSimilarity (artwork step 4)', () => {
  it('scores identical titles as a full match', () => {
    expect(titleSimilarity('Portal 2', 'Portal 2')).toBe(1);
  });

  it('keeps a title that differs only in case or punctuation', () => {
    expect(titleSimilarity('CONTROL Resonant', 'Control: Resonant')).toBeGreaterThanOrEqual(0.6);
  });

  it('rejects a clearly different game', () => {
    expect(titleSimilarity('Minecraft Dungeons II', 'Cozy Cat Cafe')).toBeLessThan(0.6);
  });

  it('treats an empty title against an empty title as a match', () => {
    expect(titleSimilarity('', '')).toBe(1);
  });
});
