import React from 'react';
import { Game } from '../types/game';

interface GameCardProps {
  game: Game;
  onPlay?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  hideTitle?: boolean;
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  useLogoInsteadOfBoxart?: boolean;
  descriptionSize?: number;
  viewMode?: 'grid' | 'logo' | 'list' | 'carousel';
  logoBackgroundColor?: string;
  logoBackgroundOpacity?: number;
}

export const GameCard: React.FC<GameCardProps> = ({ game, hideTitle = false, showLogoOverBoxart = true, logoPosition = 'middle', useLogoInsteadOfBoxart = false, descriptionSize = 14, viewMode = 'grid', logoBackgroundColor = '#374151', logoBackgroundOpacity = 100 }) => {
  const formatPlaytime = (minutes?: number) => {
    if (!minutes) return 'Not Played';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isLogoUnderneath = game.logoUrl && showLogoOverBoxart && logoPosition === 'underneath';

  // Determine which image to show
  const imageToShow = useLogoInsteadOfBoxart && game.logoUrl ? game.logoUrl : (game.boxArtUrl || game.bannerUrl);
  const imageAlt = useLogoInsteadOfBoxart && game.logoUrl ? `${game.title} Logo` : game.title;
  const imageClass = useLogoInsteadOfBoxart && game.logoUrl
    ? "w-full h-full object-contain transition-transform duration-300 group-hover:scale-110 p-4"
    : "w-full h-full object-cover transition-transform duration-300 group-hover:scale-110";

  // Use rectangular aspect ratio for logo view
  const aspectRatio = useLogoInsteadOfBoxart ? 'aspect-[16/9]' : 'aspect-[2/3]';

  const toRgba = (hex: string, opacityPct: number) => {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized.length === 3
      ? sanitized.split('').map((c) => c + c).join('')
      : sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const alpha = Math.max(0, Math.min(100, opacityPct)) / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const cardBackground = viewMode === 'logo' ? { backgroundColor: toRgba(logoBackgroundColor, logoBackgroundOpacity) } : undefined;

  return (
    <div className={`relative group overflow-hidden onyx-card game-card-transition ${aspectRatio} flex flex-col`} style={cardBackground}>
      {/* Box art image container - takes flex-1 when logo is underneath, full height otherwise */}
      <div className={`relative ${isLogoUnderneath ? 'flex-1 min-h-0' : 'w-full h-full'}`}>
        {imageToShow ? (
          <img
            key={imageToShow}
            src={imageToShow}
            alt={imageAlt}
            className={imageClass}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Prevent infinite retry loops - mark as handled immediately
              if (target.dataset.errorHandled === 'true') {
                // Already handled, stop all further processing
                e.stopPropagation();
                e.preventDefault();
                return;
              }

              // Mark as handled immediately to prevent retries
              target.dataset.errorHandled = 'true';

              // Stop the error from propagating
              e.stopPropagation();

              // Fallback to bannerUrl if boxArtUrl fails (only once)
              if (game.boxArtUrl && game.bannerUrl && target.src !== game.bannerUrl && !target.src.includes(game.bannerUrl) && !target.dataset.fallbackAttempted) {
                target.dataset.fallbackAttempted = 'true';
                target.src = game.bannerUrl;
              } else {
                // Hide the image and stop all retries
                target.style.display = 'none';
                target.src = ''; // Clear src to prevent any retries
                // Only log error once per image
                if (!target.dataset.errorLogged) {
                  target.dataset.errorLogged = 'true';
                  // Don't log to console to reduce spam - the protocol handler will log it
                }
              }
            }}
            onLoad={() => {
              console.log('Successfully loaded image:', imageToShow);
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-700/50 flex items-center justify-center">
            <span className="text-gray-300 text-sm">No Image</span>
          </div>
        )}

        {/* Logo - position based on settings (overlaid on boxart) */}
        {game.logoUrl && showLogoOverBoxart && logoPosition !== 'underneath' && (
          <div className={`absolute inset-0 flex p-4 pointer-events-none ${logoPosition === 'top' ? 'items-start' :
              logoPosition === 'bottom' ? 'items-end' :
                'items-center'
            } justify-center`}>
            <img
              key={game.logoUrl}
              src={game.logoUrl}
              alt={`${game.title} Logo`}
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
              style={game.removeLogoTransparency ? {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '8px',
                borderRadius: '4px'
              } : {}}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.error('Failed to load logo:', game.logoUrl, target.src);
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Game Title and Status Overlay (only when logo is not underneath) */}
        {!hideTitle && !isLogoUnderneath && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 z-10">
            <h3 className="font-semibold text-white line-clamp-1" style={{ fontSize: `${descriptionSize}px` }}>
              {game.title}
            </h3>
            {game.playtime && (
              <p className="text-gray-300 mt-1" style={{ fontSize: `${Math.max(10, descriptionSize - 2)}px` }}>
                {formatPlaytime(game.playtime)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Logo underneath boxart - separate flex item below the boxart */}
      {isLogoUnderneath && (
        <div className="bg-black/80 p-2 flex items-center justify-center flex-shrink-0 border-t border-gray-800/50">
          <img
            key={game.logoUrl}
            src={game.logoUrl}
            alt={`${game.title} Logo`}
            style={{
              maxWidth: '100%',
              maxHeight: `${game.logoSizePerViewMode?.[viewMode as keyof typeof game.logoSizePerViewMode] || 48}px`,
              objectFit: 'contain',
              ...(game.removeLogoTransparency ? {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '4px',
                borderRadius: '4px'
              } : {})
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.error('Failed to load logo:', game.logoUrl, target.src);
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Game Title below logo when logo is underneath */}
      {!hideTitle && isLogoUnderneath && (
        <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 flex-shrink-0">
          <h3 className="font-semibold text-white line-clamp-1" style={{ fontSize: `${descriptionSize}px` }}>
            {game.title}
          </h3>
          {game.playtime && (
            <p className="text-gray-300 mt-1" style={{ fontSize: `${Math.max(10, descriptionSize - 2)}px` }}>
              {formatPlaytime(game.playtime)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
