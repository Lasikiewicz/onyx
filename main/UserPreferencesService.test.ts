import { describe, it, expect } from 'vitest';
import { normalizeResolutionKey } from './UserPreferencesService';

describe('normalizeResolutionKey', () => {
  it('returns default 1080p for undefined', () => {
    expect(normalizeResolutionKey(undefined)).toBe('1080p');
  });

  it('returns default 1080p for empty string', () => {
    expect(normalizeResolutionKey('')).toBe('1080p');
  });

  it('normalizes 4k correctly', () => {
    expect(normalizeResolutionKey('4k')).toBe('4K');
    expect(normalizeResolutionKey('4K')).toBe('4K');
  });

  it('normalizes 1440p correctly', () => {
    expect(normalizeResolutionKey('1440p')).toBe('1440p');
    expect(normalizeResolutionKey('1440P')).toBe('1440p');
  });

  it('normalizes 720p correctly', () => {
    expect(normalizeResolutionKey('720p')).toBe('720p');
    expect(normalizeResolutionKey('720P')).toBe('720p');
  });

  it('normalizes 1080p correctly', () => {
    expect(normalizeResolutionKey('1080p')).toBe('1080p');
    expect(normalizeResolutionKey('1080P')).toBe('1080p');
  });

  it('returns 1080p for unknown values', () => {
    expect(normalizeResolutionKey('invalid')).toBe('1080p');
    expect(normalizeResolutionKey('8k')).toBe('1080p');
    expect(normalizeResolutionKey('480p')).toBe('1080p');
  });
});
