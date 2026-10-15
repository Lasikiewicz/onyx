import { useEffect, useMemo } from 'react';
import { Game } from '../types/game';

interface UseAnimatedMediaPolicyOptions {
  filteredGames: Game[];
  overlaysOpen: boolean;
  disableAllAnimations: boolean;
  disableAnimatedBackgrounds: boolean;
  disableAnimatedBanners: boolean;
  disableAnimatedBoxarts: boolean;
  disableAnimatedIcons: boolean;
  disableAnimatedLogos: boolean;
}

const isAnimatedImageUrl = (url?: string) => !!url && /\.(gif|apng)(\?|$)/i.test(url);

const getVideoKind = (video: HTMLVideoElement): 'background' | 'banner' | 'boxart' | 'icon' | 'logo' | 'unknown' => {
  const explicit = video.getAttribute('data-animation-kind');
  if (explicit === 'background' || explicit === 'banner' || explicit === 'boxart' || explicit === 'icon' || explicit === 'logo') {
    return explicit;
  }

  const src = (video.currentSrc || video.getAttribute('src') || '').toLowerCase();
  if (/-(boxart)\.webm(\?|$)/i.test(src)) return 'boxart';
  if (/-(logo)\.webm(\?|$)/i.test(src)) return 'logo';
  if (/-(icon)\.webm(\?|$)/i.test(src)) return 'icon';
  if (/-(hero|banner|alternativebanner)\.webm(\?|$)/i.test(src)) return 'banner';
  return 'unknown';
};

type PauseReason = 'overlay' | 'all' | 'background' | 'banner' | 'boxart' | 'icon' | 'logo' | 'hidden' | 'offscreen' | null;

export function useAnimatedMediaPolicy({
  filteredGames,
  overlaysOpen,
  disableAllAnimations,
  disableAnimatedBackgrounds,
  disableAnimatedBanners,
  disableAnimatedBoxarts,
  disableAnimatedIcons,
  disableAnimatedLogos,
}: UseAnimatedMediaPolicyOptions) {
  const displayGames = useMemo(() => {
    if (
      !overlaysOpen &&
      !disableAllAnimations &&
      !disableAnimatedBanners &&
      !disableAnimatedBoxarts &&
      !disableAnimatedBackgrounds &&
      !disableAnimatedIcons &&
      !disableAnimatedLogos
    ) {
      return filteredGames;
    }

    const disableBoxartBySettings = disableAllAnimations || disableAnimatedBoxarts;
    const disableBannerBySettings = disableAllAnimations || disableAnimatedBanners;
    const disableBackgroundBySettings = disableAllAnimations || disableAnimatedBackgrounds;
    const disableIconBySettings = disableAllAnimations || disableAnimatedIcons;
    const disableLogoBySettings = disableAllAnimations || disableAnimatedLogos;

    return filteredGames.map((game) => {
      const clone: Game = { ...game };

      if (clone.boxArtUrl && (
        (disableBoxartBySettings && !clone.boxArtIsVideo && isAnimatedImageUrl(clone.boxArtUrl)) ||
        (overlaysOpen && !clone.boxArtIsVideo && isAnimatedImageUrl(clone.boxArtUrl))
      )) {
        clone.boxArtUrl = '';
      }
      if (clone.bannerUrl && (
        (disableBannerBySettings && !clone.bannerIsVideo && isAnimatedImageUrl(clone.bannerUrl)) ||
        (overlaysOpen && !clone.bannerIsVideo && isAnimatedImageUrl(clone.bannerUrl))
      )) {
        clone.bannerUrl = '';
      }
      if (clone.heroUrl && (
        (disableBackgroundBySettings && !clone.heroIsVideo && isAnimatedImageUrl(clone.heroUrl)) ||
        (overlaysOpen && !clone.heroIsVideo && isAnimatedImageUrl(clone.heroUrl))
      )) {
        clone.heroUrl = '';
      }
      if (clone.iconUrl && (
        (disableIconBySettings && !clone.iconIsVideo && isAnimatedImageUrl(clone.iconUrl)) ||
        (overlaysOpen && !clone.iconIsVideo && isAnimatedImageUrl(clone.iconUrl))
      )) {
        clone.iconUrl = '';
      }
      if (clone.logoUrl && (
        (disableLogoBySettings && !clone.logoIsVideo && isAnimatedImageUrl(clone.logoUrl)) ||
        (overlaysOpen && !clone.logoIsVideo && isAnimatedImageUrl(clone.logoUrl))
      )) {
        clone.logoUrl = '';
      }

      return clone;
    });
  }, [
    filteredGames,
    overlaysOpen,
    disableAllAnimations,
    disableAnimatedBanners,
    disableAnimatedBoxarts,
    disableAnimatedBackgrounds,
    disableAnimatedIcons,
    disableAnimatedLogos,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    if (disableAllAnimations) root.classList.add('onyx-animations-off');
    else root.classList.remove('onyx-animations-off');

    if (disableAllAnimations || disableAnimatedIcons) root.classList.add('onyx-icon-animations-off');
    else root.classList.remove('onyx-icon-animations-off');
  }, [disableAllAnimations, disableAnimatedIcons]);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;

    const pauseMarker = 'data-onyx-paused-by-policy';

    // Videos currently scrolled out of view. Tracked by IntersectionObserver below.
    const offscreenVideos = new WeakSet<HTMLVideoElement>();
    const observedVideos = new WeakSet<HTMLVideoElement>();

    const getPauseReason = (video: HTMLVideoElement): PauseReason => {
      if (overlaysOpen) return 'overlay';
      if (disableAllAnimations) return 'all';
      // Window hidden (minimised or closed to tray): nothing should be animating.
      if (document.visibilityState === 'hidden') return 'hidden';
      if (offscreenVideos.has(video)) return 'offscreen';

      const kind = getVideoKind(video);
      if (disableAnimatedBackgrounds && kind === 'background') return 'background';
      if (disableAnimatedBanners && kind === 'banner') return 'banner';
      if (disableAnimatedBoxarts && kind === 'boxart') return 'boxart';
      if (disableAnimatedIcons && kind === 'icon') return 'icon';
      if (disableAnimatedLogos && kind === 'logo') return 'logo';
      return null;
    };

    const enforceVideoPolicy = (video: HTMLVideoElement) => {
      const pauseReason = getPauseReason(video);
      // Settings pauses rewind to the first frame so the static poster shows. Visibility and
      // scroll pauses keep the position, so scrolling back does not restart the clip.
      const shouldSeekToFirstFrame =
        pauseReason !== null && pauseReason !== 'overlay' && pauseReason !== 'hidden' && pauseReason !== 'offscreen';

      if (pauseReason !== null) {
        // Only mark videos this policy actually paused. A video that was already stopped must
        // not be started again when the policy releases it.
        if (!video.paused) {
          video.setAttribute(pauseMarker, '1');
          video.pause();
        }

        if (shouldSeekToFirstFrame) {
          try {
            video.currentTime = 0;
          } catch {
            // ignore seek failures
          }
        }
      } else if (video.hasAttribute(pauseMarker)) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        video.removeAttribute(pauseMarker);
      }
    };

    const applyPausePolicy = () => {
      document.querySelectorAll('video').forEach((node) => {
        const video = node as HTMLVideoElement;
        if (intersectionObserver && !observedVideos.has(video)) {
          observedVideos.add(video);
          intersectionObserver.observe(video);
        }
        enforceVideoPolicy(video);
      });
    };

    // Pause videos that are scrolled out of view. The first callback after observe() reports the
    // initial state, so off-screen videos are paused as soon as they are found.
    const intersectionObserver = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const video = entry.target as HTMLVideoElement;
            if (entry.isIntersecting) offscreenVideos.delete(video);
            else offscreenVideos.add(video);
            enforceVideoPolicy(video);
          });
        });

    const handleVisibilityChange = () => applyPausePolicy();

    const enforceFromEventTarget = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLVideoElement) {
        enforceVideoPolicy(target);
      }
    };

    applyPausePolicy();

    // applyPausePolicy walks every <video> in the document. This observer watches the whole
    // body subtree, so without coalescing, any DOM change anywhere (typing in search,
    // hovering a tile, opening a menu) triggered a full-document walk synchronously.
    let pendingFrame: number | null = null;
    const observer = new MutationObserver(() => {
      if (pendingFrame !== null) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        applyPausePolicy();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('play', enforceFromEventTarget, true);
    document.addEventListener('loadeddata', enforceFromEventTarget, true);
    document.addEventListener('canplay', enforceFromEventTarget, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      intersectionObserver?.disconnect();
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      document.removeEventListener('play', enforceFromEventTarget, true);
      document.removeEventListener('loadeddata', enforceFromEventTarget, true);
      document.removeEventListener('canplay', enforceFromEventTarget, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    overlaysOpen,
    disableAllAnimations,
    disableAnimatedBackgrounds,
    disableAnimatedBanners,
    disableAnimatedBoxarts,
    disableAnimatedIcons,
    disableAnimatedLogos,
  ]);

  return { displayGames };
}
