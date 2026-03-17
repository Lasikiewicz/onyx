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

const isAnimatedImageUrl = (url?: string) => !!url && /\.(gif|webp|apng)(\?|$)/i.test(url);

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

type PauseReason = 'overlay' | 'all' | 'background' | 'banner' | 'boxart' | 'icon' | 'logo' | null;

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

    const getPauseReason = (video: HTMLVideoElement): PauseReason => {
      if (overlaysOpen) return 'overlay';
      if (disableAllAnimations) return 'all';

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
      const shouldSeekToFirstFrame = pauseReason !== null && pauseReason !== 'overlay';

      if (pauseReason !== null) {
        if (!video.hasAttribute(pauseMarker)) {
          video.setAttribute(pauseMarker, '1');
        }

        if (!video.paused) {
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
        enforceVideoPolicy(node as HTMLVideoElement);
      });
    };

    const enforceFromEventTarget = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLVideoElement) {
        enforceVideoPolicy(target);
      }
    };

    applyPausePolicy();
    const observer = new MutationObserver(() => {
      applyPausePolicy();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('play', enforceFromEventTarget, true);
    document.addEventListener('loadeddata', enforceFromEventTarget, true);
    document.addEventListener('canplay', enforceFromEventTarget, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('play', enforceFromEventTarget, true);
      document.removeEventListener('loadeddata', enforceFromEventTarget, true);
      document.removeEventListener('canplay', enforceFromEventTarget, true);
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
