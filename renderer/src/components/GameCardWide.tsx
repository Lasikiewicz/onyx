import React from 'react';
import { Game } from '../types/game';
import { prefetchGameArtwork } from '../utils/imagePrefetch';

interface GameCardWideProps {
  game: Game;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedLogos?: boolean;
  /** When true, renders just the poster - no logo/details pane. */
  postersOnly?: boolean;
}

const isAnimatedImage = (url: string | undefined) => !!url && /\.(gif|webp|apng|webm)(\?|$)/i.test(url);
const isWebmUrl = (url: string | undefined) => !!url && /\.webm(\?|$)/i.test(url);

const GameCardWideComponent: React.FC<GameCardWideProps> = ({
  game,
  disableAnimatedBoxarts = false,
  disableAnimatedLogos = false,
  postersOnly = false,
}) => {
  let posterUrl: string | undefined = game.boxArtUrl || game.bannerUrl;
  if (posterUrl && disableAnimatedBoxarts && isAnimatedImage(posterUrl)) {
    posterUrl = undefined;
  }
  const isPosterVideo = !!posterUrl && (
    (posterUrl === game.boxArtUrl && game.boxArtIsVideo) ||
    (posterUrl === game.bannerUrl && game.bannerIsVideo) ||
    isWebmUrl(posterUrl)
  );

  const hasLogo = game.logoUrl && (!disableAnimatedLogos || !isAnimatedImage(game.logoUrl));
  const isLogoVideo = hasLogo && (game.logoIsVideo || isWebmUrl(game.logoUrl));

  const handlePrefetch = () => prefetchGameArtwork(game);

  const poster = posterUrl ? (
    isPosterVideo ? (
      <video
        key={posterUrl}
        src={posterUrl}
        data-animation-kind="boxart"
        muted
        loop
        playsInline
        autoPlay
        className="w-full h-full object-cover"
      />
    ) : (
      <img
        key={posterUrl}
        src={posterUrl}
        alt={game.title}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.dataset.errorHandled === 'true') return;
          target.dataset.errorHandled = 'true';
          if (game.boxArtUrl && game.bannerUrl && target.src !== game.bannerUrl && !target.dataset.fallbackAttempted) {
            target.dataset.fallbackAttempted = 'true';
            target.src = game.bannerUrl;
          } else {
            target.style.display = 'none';
          }
        }}
      />
    )
  ) : (
    <div className="w-full h-full bg-gray-700/50 flex items-center justify-center">
      <span className="text-gray-300 text-xs">No Image</span>
    </div>
  );

  if (postersOnly) {
    return (
      <div
        className="relative w-full overflow-hidden onyx-card game-card-transition"
        style={{ aspectRatio: '2 / 3', clipPath: 'inset(0 round 0.75rem)' }}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
      >
        {poster}
      </div>
    );
  }

  return (
    <div
      className="relative flex w-full overflow-hidden onyx-card game-card-transition"
      style={{ aspectRatio: '2 / 1', clipPath: 'inset(0 round 0.75rem)' }}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
    >
      {/* Poster - left third. Height comes from the card's own aspect-ratio (fixed above), not
          from sibling content, so every card in a row is the same height regardless of what's
          in its details pane (e.g. an oversized logo image). */}
      <div className="relative flex-shrink-0 h-full basis-1/3">
        {poster}
      </div>

      {/* Details - expands two poster-widths to the right */}
      <div className="flex-1 h-full flex items-center justify-center bg-gray-800/60 p-3 min-w-0">
        {hasLogo ? (
          isLogoVideo ? (
            <video
              key={game.logoUrl}
              src={game.logoUrl}
              data-animation-kind="logo"
              muted
              loop
              playsInline
              autoPlay
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
            />
          ) : (
            <img
              key={game.logoUrl}
              src={game.logoUrl}
              alt={`${game.title} Logo`}
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )
        ) : (
          <h3 className="font-semibold text-white text-center line-clamp-3">{game.title}</h3>
        )}
      </div>
    </div>
  );
};

export const GameCardWide = React.memo(GameCardWideComponent);
