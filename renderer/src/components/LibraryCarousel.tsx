import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';

interface LibraryCarouselProps {
  games: Game[];
  onPlay?: (game: Game) => void;
  onGameClick?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onEditCategories?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onPin?: (game: Game) => void;
  onFixMatch?: (game: Game) => void;
  onHide?: (game: Game) => void;
  onUnhide?: (game: Game) => void;
  isHiddenView?: boolean;
  activeGameId?: string | null;
  selectedBoxArtSize?: number;
  gameTilePadding?: number;
  onLogoResize?: (game: Game) => void;
}

export const LibraryCarousel: React.FC<LibraryCarouselProps> = ({
  games,
  onPlay,
  onGameClick,
  onEdit,
  onFavorite,
  activeGameId,
  selectedBoxArtSize = 25,
  gameTilePadding = 1,
  onLogoResize,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLogoResizer, setShowLogoResizer] = useState(false);
  const [logoSize, setLogoSize] = useState(100);
  const [carouselOffset, setCarouselOffset] = useState(0);
  
  // Ensure selectedIndex is valid
  const validSelectedIndex = Math.max(0, Math.min(selectedIndex, games.length - 1));
  const selectedGame = games.length > 0 ? games[validSelectedIndex] : null;

  // Calculate dimensions
  const baseGameWidth = 100; // Base width without padding
  const baseGameHeight = 150; // Base height
  
  // Ensure minimum size is same as base game size
  const minSelectedWidth = 100;
  const minSelectedHeight = 150;
  
  const selectedGameWidth = Math.max(minSelectedWidth, (selectedBoxArtSize * (typeof window !== 'undefined' ? window.innerWidth : 1920) / 100));
  // Use the same aspect ratio as base games (100px width / 150px height = 0.667)
  const selectedGameHeight = Math.max(minSelectedHeight, selectedGameWidth * 1.5); // Match box art aspect ratio

  // Calculate carousel offset for smooth animations
  const calculateOffset = (index: number) => {
    if (games.length === 0) return 0;
    
    // We want to bring the selected game to position 4 (index 3)
    // So we need to shift the carousel left by the difference
    const targetPosition = 3;
    const offsetNeeded = (index - targetPosition) * (baseGameWidth + gameTilePadding * 2);
    
    return -offsetNeeded;
  };
  
  // Handle game selection with smooth animation
  const handleGameSelect = (index: number) => {
    if (index === selectedIndex || index < 0 || index >= games.length) return;
    
    setSelectedIndex(index);
    setCarouselOffset(calculateOffset(index));
    
    const game = games[index];
    if (game) {
      onGameClick?.(game);
    }
  };

  // Handle activeGameId changes
  React.useEffect(() => {
    if (activeGameId) {
      const index = games.findIndex(game => game.id === activeGameId);
      if (index !== -1 && index !== selectedIndex) {
        setSelectedIndex(index);
        setCarouselOffset(calculateOffset(index));
      }
    }
  }, [activeGameId, games]);

  // Initialize carousel position
  React.useEffect(() => {
    setCarouselOffset(calculateOffset(validSelectedIndex));
  }, [validSelectedIndex]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (games.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = validSelectedIndex > 0 ? validSelectedIndex - 1 : games.length - 1;
          handleGameSelect(prevIndex);
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = validSelectedIndex < games.length - 1 ? validSelectedIndex + 1 : 0;
          handleGameSelect(nextIndex);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedGame) {
            onGameClick?.(selectedGame);
          }
          break;
        case ' ':
          e.preventDefault();
          if (selectedGame) {
            onPlay?.(selectedGame);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [games, validSelectedIndex, selectedGame, onGameClick, onPlay]);

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-lg">No games to display</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col absolute inset-0">
      {/* Game info display */}
      <div className="h-full relative overflow-hidden">
        {selectedGame && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2 max-w-2xl">
            <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
              {selectedGame.title}
            </h1>
            {selectedGame.description && (
              <p className="text-lg text-gray-200 leading-relaxed mb-6">
                {selectedGame.description}
              </p>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={() => onPlay?.(selectedGame)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-lg"
              >
                Play
              </button>
              <button
                onClick={() => onEdit?.(selectedGame)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-lg"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Animated flowing carousel */}
      <div className="fixed bottom-8 left-0 right-0 z-50 overflow-hidden" style={{ height: `${Math.max(selectedGameHeight, 150) + 20}px` }}>
        <div className="h-full flex items-end pb-4 relative">
          
          {/* Flowing carousel container with smooth animation */}
          <div 
            className="flex items-end transition-transform duration-700 ease-out absolute bottom-4"
            style={{ 
              gap: `${gameTilePadding}px`,
              transform: `translateX(${carouselOffset}px)`
            }}
          >
            {/* Render all games in sequence */}
            {games.map((game, index) => {
              const isSelected = index === validSelectedIndex;
              
              return (
                <div
                  key={game.id}
                  onClick={() => handleGameSelect(index)}
                  className={`relative flex-shrink-0 cursor-pointer transition-all duration-300 ease-out hover:scale-105 ${
                    isSelected 
                      ? 'z-20 opacity-100' 
                      : 'opacity-70 hover:opacity-90 z-10'
                  }`}
                  style={{
                    width: isSelected ? `${selectedGameWidth}px` : `${baseGameWidth}px`,
                    height: isSelected ? `${selectedGameHeight}px` : `${baseGameHeight}px`,
                    marginLeft: `${gameTilePadding}px`,
                    marginRight: `${gameTilePadding}px`,
                  }}
                >
                  <div className="w-full h-full relative overflow-hidden rounded-lg shadow-lg bg-gray-700">
                    {game.boxArtUrl || game.bannerUrl ? (
                      <img
                        src={game.boxArtUrl || game.bannerUrl}
                        alt={game.title}
                        className="w-full h-full object-cover transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs text-center px-2">
                          {game.title}
                        </span>
                      </div>
                    )}
                    
                    {/* Game Status Indicators */}
                    {(game.favorite || game.pinned) && (
                      <div className="absolute top-1 right-1 flex flex-col gap-1">
                        {game.favorite && (
                          <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </div>
                        )}
                        
                        {game.pinned && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};