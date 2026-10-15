import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useAnimatedMediaPolicy } from './useAnimatedMediaPolicy';

// jsdom has no media playback and no IntersectionObserver, so both are stubbed. The stub video
// tracks a `paused` flag, and the observer callbacks are driven by the test.
type ObserverCallback = (entries: Array<{ target: Element; isIntersecting: boolean }>) => void;
let observerCallback: ObserverCallback | null = null;
const observed: Element[] = [];

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }
  observe(target: Element) {
    observed.push(target);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

const makeVideo = (kind: string, startPlaying: boolean): HTMLVideoElement => {
  const video = document.createElement('video');
  video.setAttribute('data-animation-kind', kind);
  let paused = !startPlaying;
  Object.defineProperty(video, 'paused', { configurable: true, get: () => paused });
  video.play = vi.fn(() => {
    paused = false;
    return Promise.resolve();
  });
  video.pause = vi.fn(() => {
    paused = true;
  });
  document.body.appendChild(video);
  return video;
};

const renderPolicy = () =>
  renderHook(() =>
    useAnimatedMediaPolicy({
      filteredGames: [],
      overlaysOpen: false,
      disableAllAnimations: false,
      disableAnimatedBackgrounds: false,
      disableAnimatedBanners: false,
      disableAnimatedBoxarts: false,
      disableAnimatedIcons: false,
      disableAnimatedLogos: false,
    })
  );

const reportVisibility = (video: HTMLVideoElement, isIntersecting: boolean) => {
  observerCallback?.([{ target: video, isIntersecting }]);
};

describe('useAnimatedMediaPolicy visibility and viewport pausing', () => {
  beforeEach(() => {
    observerCallback = null;
    observed.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    setVisibility('visible');
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    setVisibility('visible');
    vi.unstubAllGlobals();
  });

  it('pauses a playing video that scrolls out of view and resumes it when it returns', () => {
    const video = makeVideo('background', true);
    renderPolicy();
    expect(observed).toContain(video);

    reportVisibility(video, false);
    expect(video.pause).toHaveBeenCalled();

    reportVisibility(video, true);
    expect(video.play).toHaveBeenCalled();
  });

  it('keeps the playback position when pausing for scroll or visibility', () => {
    const video = makeVideo('background', true);
    video.currentTime = 12;
    renderPolicy();

    reportVisibility(video, false);
    expect(video.currentTime).toBe(12);
  });

  it('pauses all playing video while the window is hidden and resumes when shown', () => {
    const video = makeVideo('logo', true);
    renderPolicy();

    setVisibility('hidden');
    expect(video.pause).toHaveBeenCalled();

    setVisibility('visible');
    expect(video.play).toHaveBeenCalled();
  });

  it('does not start a video the policy never paused', () => {
    const video = makeVideo('boxart', false);
    renderPolicy();

    reportVisibility(video, false);
    reportVisibility(video, true);
    setVisibility('hidden');
    setVisibility('visible');

    expect(video.pause).not.toHaveBeenCalled();
    expect(video.play).not.toHaveBeenCalled();
  });
});
