import { useEffect, useMemo, useState } from 'react';
import type { Game } from '../types/game';

interface UseAppShellBackgroundMediaOptions {
  activeGame: Game | null;
  activeGameId: string | null;
  backgroundBlur: number;
  disableAllAnimations: boolean;
  disableAnimatedBackgrounds: boolean;
  filteredGames: Game[];
  overlaysOpen: boolean;
}

export function useAppShellBackgroundMedia({
  activeGame,
  activeGameId,
  backgroundBlur,
  disableAllAnimations,
  disableAnimatedBackgrounds,
  filteredGames,
  overlaysOpen,
}: UseAppShellBackgroundMediaOptions) {
  const [displayedBackgroundImageUrl, setDisplayedBackgroundImageUrl] = useState('');

  const backgroundImageUrl = (activeGame?.useAlternativeBackground && activeGame?.alternativeBannerUrl)
    ? activeGame.alternativeBannerUrl
    : activeGame?.heroUrl || activeGame?.bannerUrl || activeGame?.boxArtUrl || '';

  const backgroundFromAltBanner = !!(activeGame?.useAlternativeBackground && activeGame?.alternativeBannerUrl === backgroundImageUrl);
  const backgroundFromHero = !!(activeGame?.heroUrl === backgroundImageUrl);
  const backgroundFromBanner = !!(activeGame?.bannerUrl === backgroundImageUrl);
  const backgroundFromBoxart = !!(activeGame?.boxArtUrl === backgroundImageUrl);

  const backgroundVideoKind: 'background' | 'banner' | 'boxart' = backgroundFromAltBanner
    ? 'background'
    : (backgroundFromHero || backgroundFromBanner)
      ? 'banner'
      : 'boxart';

  const isBackgroundVideo = !!(activeGame && backgroundImageUrl && (
    (backgroundFromAltBanner && activeGame.alternativeBannerIsVideo) ||
    (backgroundFromHero && activeGame.heroIsVideo) ||
    (backgroundFromBanner && activeGame.bannerIsVideo) ||
    (backgroundFromBoxart && activeGame.boxArtIsVideo)
  ));

  useEffect(() => {
    if (!backgroundImageUrl) {
      setDisplayedBackgroundImageUrl('');
      return;
    }

    const isAnimated = isBackgroundVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(backgroundImageUrl);
    const blockAnimatedBackground =
      overlaysOpen || disableAllAnimations || (disableAnimatedBackgrounds && backgroundFromAltBanner);

    if (blockAnimatedBackground) {
      if (isAnimated) {
        if (isBackgroundVideo) {
          setDisplayedBackgroundImageUrl(backgroundImageUrl);
          return;
        }

        const staticFallback = activeGame?.boxArtUrl &&
          !activeGame.boxArtIsVideo &&
          !/\.(gif|webp|apng|webm)(\?|$)/i.test(activeGame.boxArtUrl)
          ? activeGame.boxArtUrl
          : '';

        setDisplayedBackgroundImageUrl(staticFallback);
        return;
      }
    } else if (isAnimated) {
      setDisplayedBackgroundImageUrl(backgroundImageUrl);
      return;
    }

    let cancelled = false;
    let committed = false;
    const img = new Image();

    const commit = () => {
      if (cancelled || committed) {
        return;
      }

      committed = true;
      setDisplayedBackgroundImageUrl(backgroundImageUrl);
    };

    img.onload = commit;
    img.onerror = commit;
    img.src = backgroundImageUrl;

    if (img.decode) {
      img.decode().then(commit).catch(() => {
        // Fall back to onload/onerror.
      });
    }

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }, [
    activeGame?.boxArtIsVideo,
    activeGame?.boxArtUrl,
    backgroundFromAltBanner,
    backgroundImageUrl,
    disableAllAnimations,
    disableAnimatedBackgrounds,
    isBackgroundVideo,
    overlaysOpen,
  ]);

  const isAnimatedBackground = useMemo(() => {
    if (!displayedBackgroundImageUrl) {
      return false;
    }

    return isBackgroundVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(displayedBackgroundImageUrl);
  }, [displayedBackgroundImageUrl, isBackgroundVideo]);

  const optimizedBackgroundBlur = isAnimatedBackground ? Math.min(backgroundBlur, 10) : backgroundBlur;

  useEffect(() => {
    if (!activeGameId || filteredGames.length === 0) {
      return;
    }

    const index = filteredGames.findIndex((game) => game.id === activeGameId);
    if (index < 0) {
      return;
    }

    const previousGame = index > 0 ? filteredGames[index - 1] : null;
    const nextGame = index < filteredGames.length - 1 ? filteredGames[index + 1] : null;
    const toPreload: Array<{ url: string; isAnimated: boolean }> = [];

    for (const game of [previousGame, nextGame]) {
      if (!game) {
        continue;
      }

      const backgroundUrl = (game.useAlternativeBackground && game.alternativeBannerUrl)
        ? game.alternativeBannerUrl
        : game.heroUrl || game.bannerUrl || game.boxArtUrl || '';

      if (backgroundUrl) {
        const backgroundIsVideo =
          (game.useAlternativeBackground && game.alternativeBannerUrl === backgroundUrl && game.alternativeBannerIsVideo) ||
          (game.heroUrl === backgroundUrl && game.heroIsVideo) ||
          (game.bannerUrl === backgroundUrl && game.bannerIsVideo) ||
          (game.boxArtUrl === backgroundUrl && game.boxArtIsVideo);

        toPreload.push({
          isAnimated: !!backgroundIsVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(backgroundUrl),
          url: backgroundUrl,
        });
      }

      if (game.logoUrl) {
        toPreload.push({
          isAnimated: !!game.logoIsVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(game.logoUrl),
          url: game.logoUrl,
        });
      }

      if (game.boxArtUrl) {
        toPreload.push({
          isAnimated: !!game.boxArtIsVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(game.boxArtUrl),
          url: game.boxArtUrl,
        });
      }
    }

    const images: HTMLImageElement[] = [];
    for (const { isAnimated, url } of toPreload) {
      if (!url) {
        continue;
      }

      const img = new Image();
      images.push(img);
      img.src = url;

      if (!isAnimated && img.decode) {
        img.decode().catch(() => {});
      }
    }

    return () => {
      for (const img of images) {
        img.src = '';
      }
    };
  }, [activeGameId, filteredGames]);

  return {
    backgroundVideoKind,
    displayedBackgroundImageUrl,
    isAnimatedBackground,
    isBackgroundVideo,
    optimizedBackgroundBlur,
  };
}
