import React from 'react';
import { Game } from '../types/game';

interface GameCardProps {
  game: Game;
  onPlay?: (game: Game) => void;
  onEdit?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const formatPlaytime = (minutes?: number) => {
    if (!minutes) return 'Not Played';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="relative group overflow-hidden onyx-card aspect-[2/3] flex flex-col">
      {game.boxArtUrl ? (
        <img
          src={game.boxArtUrl}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            console.error('Failed to load image:', game.boxArtUrl, target.src);
            target.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Successfully loaded image:', game.boxArtUrl);
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-700/50 flex items-center justify-center">
          <span className="text-gray-300 text-sm">No Image</span>
        </div>
      )}
      
      {/* Game Title and Status Overlay (always visible at bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2">
        <h3 className="text-sm font-semibold text-white line-clamp-1">
          {game.title}
        </h3>
        {game.playtime && (
          <p className="text-xs text-gray-300 mt-1">
            {formatPlaytime(game.playtime)}
          </p>
        )}
      </div>
    </div>
  );
};
