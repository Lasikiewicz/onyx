import { describe, it, expect, vi } from 'vitest';
import { ALLOWED_EXTERNAL_PROTOCOLS, isSafeExternalUrl } from './SecurityUtils.js';

vi.mock('electron', () => {
  return {
    shell: {
      openExternal: vi.fn(),
    },
  };
});

describe('SecurityUtils', () => {
  it('exposes a non-empty allowed protocol whitelist', () => {
    expect(ALLOWED_EXTERNAL_PROTOCOLS.size).toBeGreaterThan(0);
    expect(ALLOWED_EXTERNAL_PROTOCOLS.has('http:')).toBe(true);
    expect(ALLOWED_EXTERNAL_PROTOCOLS.has('https:')).toBe(true);
  });

  it('allows known safe HTTP/HTTPS URLs', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true);
    expect(isSafeExternalUrl('http://example.com/path?query=1')).toBe(true);
  });

  it('allows vetted launcher and mod manager protocols', () => {
    expect(isSafeExternalUrl('steam://rungameid/123')).toBe(true);
    expect(isSafeExternalUrl('goggalaxy://launchGame/456')).toBe(true);
    expect(isSafeExternalUrl('nexusm://mod-manager')).toBe(true);
    expect(isSafeExternalUrl('vortex://some/path')).toBe(true);
  });

  it('rejects malformed URLs', () => {
    expect(isSafeExternalUrl('not-a-url')).toBe(false);
    expect(isSafeExternalUrl('://missing-protocol')).toBe(false);
  });

  it('rejects dangerous or unapproved protocols', () => {
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeExternalUrl('smb://server/share')).toBe(false);
  });
});

