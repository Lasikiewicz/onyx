import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Game } from '../types/game';
import { GameContextMenu } from './GameContextMenu';

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
  showCarouselDetails?: boolean;
  showCarouselLogos?: boolean;
  detailsBarSize?: number;
  onDetailsBarSizeChange?: (size: number) => void;
  carouselLogoSize?: number;
  onCarouselLogoSizeChange?: (size: number) => void;
  carouselButtonSize?: number;
  onCarouselButtonSizeChange?: (size: number) => void;
  carouselDescriptionSize?: number;
  onCarouselDescriptionSizeChange?: (size: number) => void;
  onMoreSettings?: () => void;
}

export const LibraryCarousel: React.FC<LibraryCarouselProps> = ({
  games,
  onPlay,
  onGameClick,
  onEdit,
  onFavorite,
  onPin,
  activeGameId,
  selectedBoxArtSize = 25,
  gameTilePadding = 1,
  showCarouselDetails = true,
  showCarouselLogos = true,
  detailsBarSize: propDetailsBarSize = 14,
  onDetailsBarSizeChange,
  carouselLogoSize: propCarouselLogoSize = 100,
  onCarouselLogoSizeChange,
  carouselButtonSize = 14,
  carouselDescriptionSize = 18,
  onEditImages,
  onEditCategories,
  onFixMatch,
  onHide,
  onUnhide,
  isHiddenView = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLogoResizer, setShowLogoResizer] = useState(false);
  const [showDetailsBarResizer, setShowDetailsBarResizer] = useState(false);
  const [logoSize, setLogoSize] = useState(propCarouselLogoSize);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [detailsBarSize, setDetailsBarSize] = useState(propDetailsBarSize);
  const [logoContextMenu, setLogoContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [thumbnailContextMenu, setThumbnailContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);

  // Update local state when props change
  React.useEffect(() => {
    setDetailsBarSize(propDetailsBarSize);
  }, [propDetailsBarSize]);

  React.useEffect(() => {
    setLogoSize(propCarouselLogoSize);
  }, [propCarouselLogoSize]);
  
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

  // Calculate safe padding to prevent text overlap with carousel
  const carouselHeight = Math.max(selectedGameHeight, 150) + 20; // Carousel container height
  const carouselBottomOffset = 32; // bottom-8 = 32px
  const safeBottomPadding = carouselHeight + carouselBottomOffset + 20; // Extra 20px buffer

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

    const handleClickOutside = (e: MouseEvent) => {
      // Hide resizers when clicking outside
      const target = e.target as HTMLElement;
      if (showLogoResizer && !target.closest('.logo-resizer-container')) {
        setShowLogoResizer(false);
      }
      if (showDetailsBarResizer && !target.closest('.details-bar-container')) {
        setShowDetailsBarResizer(false);
      }
      // Close context menus
      if (logoContextMenu && !target.closest('.logo-context-menu')) {
        setLogoContextMenu(null);
      }
      if (thumbnailContextMenu && !target.closest('.thumbnail-context-menu')) {
        setThumbnailContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [games, validSelectedIndex, selectedGame, onGameClick, onPlay, showLogoResizer, showDetailsBarResizer, logoContextMenu, thumbnailContextMenu]);

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-lg">No games to display</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col absolute inset-0">
      {/* Game details across the top - additional details bar */}
      {showCarouselDetails && selectedGame && (
        <div 
          className="w-full bg-black/20 backdrop-blur-sm border-b border-gray-700/50 p-4 relative cursor-pointer details-bar-container"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center gap-8 text-gray-300" style={{ fontSize: `${detailsBarSize}px` }}>
              {selectedGame.platform && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-400">Platform:</span>
                  <span className="font-medium text-white">{selectedGame.platform}</span>
                </span>
              )}
              {selectedGame.releaseDate && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-400">Released:</span>
                  <span className="font-medium text-white">{new Date(selectedGame.releaseDate).getFullYear()}</span>
                </span>
              )}
              {selectedGame.genres && selectedGame.genres.length > 0 && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-400">Genres:</span>
                  <span className="font-medium text-white">{selectedGame.genres.slice(0, 3).join(', ')}</span>
                </span>
              )}
              {selectedGame.developers && selectedGame.developers.length > 0 && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-400">Developer:</span>
                  <span className="font-medium text-white">{selectedGame.developers[0]}</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Details Bar Resizer */}
          {showDetailsBarResizer && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-gray-600">
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={detailsBarSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setDetailsBarSize(newSize);
                  onDetailsBarSizeChange?.(newSize);
                }}
                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-400 text-center mt-1">
                {detailsBarSize}px
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main game display area - always visible */}
      <div className="h-full relative overflow-hidden">
        {selectedGame && (
          <div 
            className="absolute right-0 top-0 flex flex-col items-center justify-center"
            style={{
              width: '50%',
              height: `calc(100vh - 200px)`, // Full height above carousel
              padding: '20px'
            }}
          >
            {/* Logo Section - Fixed above description */}
            <div className="flex justify-center mb-6">
              {showCarouselLogos ? (
                // Show logo if available
                selectedGame.logoUrl ? (
                  <div className="relative logo-resizer-container">
                    <img
                      src={selectedGame.logoUrl}
                      alt={selectedGame.title}
                      className="drop-shadow-lg cursor-pointer hover:drop-shadow-xl transition-all duration-200 hover:scale-105"
                      style={{ 
                        width: `${logoSize}%`,
                        maxWidth: '400px',
                        maxHeight: '80px',
                        height: 'auto'
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setLogoContextMenu({ x: e.clientX, y: e.clientY });
                      }}
                      onError={(e) => {
                        // Fallback to title if logo fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const titleElement = target.parentElement?.nextElementSibling as HTMLElement;
                        if (titleElement) titleElement.style.display = 'block';
                      }}
                    />
                    
                    {/* Logo Resizer */}
                    {showLogoResizer && (
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600">
                        <input
                          type="range"
                          min="50"
                          max="200"
                          step="5"
                          value={logoSize}
                          onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setLogoSize(newSize);
                            onCarouselLogoSizeChange?.(newSize);
                          }}
                          className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="text-xs text-gray-400 text-center mt-1">{logoSize}%</div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Fallback to title if no logo
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg text-center">
                    {selectedGame.title}
                  </h1>
                )
              ) : (
                // Always show title when logos are disabled
                <h1 className="text-3xl font-bold text-white drop-shadow-lg text-center">
                  {selectedGame.title}
                </h1>
              )}
              
              {/* Hidden title element for logo fallback */}
              {showCarouselLogos && selectedGame.logoUrl && (
                <h1 className="text-3xl font-bold text-white drop-shadow-lg text-center" style={{ display: 'none' }}>
                  {selectedGame.title}
                </h1>
              )}
            </div>

            {/* Description Section - Center of the group */}
            <div className="flex justify-center mb-6">
              {selectedGame.description && (
                <div 
                  className="text-gray-200 leading-relaxed carousel-description text-center line-clamp-6"
                  style={{ 
                    fontSize: `${carouselDescriptionSize}px`,
                    maxWidth: '100%',
                    padding: '0 20px'
                  }}
                >
                  {/* Try HTML rendering first, fallback to plain text */}
                  {selectedGame.description.includes('<') ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedGame.description }} />
                  ) : (
                    <p>{selectedGame.description}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Buttons Section - Fixed below description */}
            <div className="flex justify-center">
              <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => onPlay?.(selectedGame)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                style={{ 
                  padding: `${carouselButtonSize * 0.5}px ${carouselButtonSize * 1.5}px`,
                  fontSize: `${carouselButtonSize}px`
                }}
              >
                Play
              </button>
              
              {/* Mod Manager button - only show if game has modManagerUrl */}
              {selectedGame.modManagerUrl && (
                <button
                  onClick={async () => {
                    if (selectedGame.modManagerUrl) {
                      try {
                        await window.electronAPI.openExternal(selectedGame.modManagerUrl);
                      } catch (err) {
                        console.error('Error opening mod manager:', err);
                      }
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                  style={{ 
                    padding: `${carouselButtonSize * 0.5}px ${carouselButtonSize * 1.2}px`,
                    fontSize: `${carouselButtonSize}px`
                  }}
                >
                  <svg 
                    className="flex-shrink-0" 
                    width={carouselButtonSize} 
                    height={carouselButtonSize} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Mod Manager
                </button>
              )}
              
              <button
                onClick={() => onEdit?.(selectedGame)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                style={{ 
                  padding: `${carouselButtonSize * 0.5}px ${carouselButtonSize * 1.2}px`,
                  fontSize: `${carouselButtonSize}px`
                }}
              >
                Edit
              </button>
              
              {/* Favorite button directly after edit */}
              <button
                onClick={() => onFavorite?.(selectedGame)}
                className={`rounded-lg transition-colors flex items-center justify-center shadow-lg ${
                  selectedGame.favorite 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                }`}
                style={{ 
                  padding: `${carouselButtonSize * 0.6}px`,
                }}
                title={selectedGame.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg 
                  width={carouselButtonSize * 1.2} 
                  height={carouselButtonSize * 1.2} 
                  fill={selectedGame.favorite ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Animated flowing carousel */}
      <div 
        className="fixed bottom-8 left-0 right-0 z-50 overflow-visible" 
        style={{ 
          height: '200px', // Fixed height independent of selected game size
          minHeight: '170px' // Ensure minimum space for carousel
        }}
      >
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setThumbnailContextMenu({ x: e.clientX, y: e.clientY, game });
                  }}
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

      {/* Logo Context Menu */}
      {logoContextMenu && selectedGame && createPortal(
        <GameContextMenu
          game={selectedGame}
          x={logoContextMenu.x}
          y={logoContextMenu.y}
          onClose={() => setLogoContextMenu(null)}
          onPlay={onPlay}
          onEdit={onEdit}
          onEditImages={onEditImages}
          onEditCategories={onEditCategories}
          onFavorite={onFavorite}
          onPin={onPin}
          onFixMatch={onFixMatch}
          onHide={onHide}
          onUnhide={onUnhide}
          isHiddenView={isHiddenView}
          onResizeLogo={() => setShowLogoResizer(true)}
        />,
        document.body
      )}

      {/* Thumbnail Context Menu */}
      {thumbnailContextMenu && createPortal(
        <GameContextMenu
          game={thumbnailContextMenu.game}
          x={thumbnailContextMenu.x}
          y={thumbnailContextMenu.y}
          onClose={() => setThumbnailContextMenu(null)}
          onPlay={onPlay}
          onEdit={onEdit}
          onEditImages={onEditImages}
          onEditCategories={onEditCategories}
          onFavorite={onFavorite}
          onPin={onPin}
          onFixMatch={onFixMatch}
          onHide={onHide}
          onUnhide={onUnhide}
          isHiddenView={isHiddenView}
        />,
        document.body
      )}
    </div>
  );
};