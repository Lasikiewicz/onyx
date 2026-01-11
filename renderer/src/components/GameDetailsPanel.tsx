import React, { useState, useEffect, useRef } from 'react';
import { Game } from '../types/game';
import { ImageContextMenu } from './ImageContextMenu';
import { TextStyleContextMenu } from './TextStyleContextMenu';
import { DetailsContextMenu } from './DetailsContextMenu';
import { ImageSearchModal } from './ImageSearchModal';
import { GameDetailsSimpleContextMenu } from './GameDetailsSimpleContextMenu';

interface GameDetailsPanelProps {
  game: Game | null;
  onPlay?: (game: Game) => void;
  onSaveGame?: (game: Game) => Promise<void>;
  onOpenInGameManager?: (game: Game, tab: 'images' | 'metadata') => void;
  onFavorite?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onUpdateGameInState?: (game: Game) => void;
}

export const GameDetailsPanel: React.FC<GameDetailsPanelProps> = ({ game, onPlay, onSaveGame, onOpenInGameManager, onFavorite, onEdit, onUpdateGameInState }) => {
  const [width, setWidth] = useState(800);
  const [fanartHeight, setFanartHeight] = useState(320);
  const [descriptionHeight, setDescriptionHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingFanart, setIsResizingFanart] = useState(false);
  const [isResizingDescription, setIsResizingDescription] = useState(false);
  const [isResizingDescriptionWidth, setIsResizingDescriptionWidth] = useState(false);
  const [descriptionWidth, setDescriptionWidth] = useState(50); // Percentage
  const panelRef = useRef<HTMLDivElement>(null);
  const fanartRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const descriptionContainerRef = useRef<HTMLDivElement>(null);

  // Simple context menu states (appears at right-click location)
  const [simpleContextMenu, setSimpleContextMenu] = useState<{ x: number; y: number; type: 'artwork' | 'boxart' | 'title' | 'description' | 'details' } | null>(null);

  // Full settings menu states (appears over game list)
  const [showArtworkMenu, setShowArtworkMenu] = useState(false);
  const [showBoxartMenu, setShowBoxartMenu] = useState(false);
  const [showTitleMenu, setShowTitleMenu] = useState(false);
  const [showDescriptionMenu, setShowDescriptionMenu] = useState(false);
  const [showDetailsMenu, setShowDetailsMenu] = useState(false);

  // Image search modal
  const [imageSearchModal, setImageSearchModal] = useState<{ type: 'artwork' | 'boxart' } | null>(null);
  const [showLogoResizeDialog, setShowLogoResizeDialog] = useState(false);
  const [showBoxartResizeDialog, setShowBoxartResizeDialog] = useState(false);
  const [localLogoSize, setLocalLogoSize] = useState<number | undefined>(undefined);
  const [isSavingLogoSize, setIsSavingLogoSize] = useState(false);

  // Font and style preferences
  const [titleFontSize, setTitleFontSize] = useState(24);
  const [titleFontFamily, setTitleFontFamily] = useState('system-ui');
  const [descriptionFontSize, setDescriptionFontSize] = useState(14);
  const [descriptionFontFamily, setDescriptionFontFamily] = useState('system-ui');
  const [detailsFontSize, setDetailsFontSize] = useState(14);
  const [detailsFontFamily, setDetailsFontFamily] = useState('system-ui');
  const [boxartWidth, setBoxartWidth] = useState(128);
  const [visibleDetails, setVisibleDetails] = useState({
    releaseDate: true,
    platform: true,
    ageRating: true,
    genres: true,
    developers: true,
    publishers: true,
    communityScore: true,
    userScore: true,
    criticScore: true,
    installationDirectory: true,
  });
  const [steamSyncPlaytimeEnabled, setSteamSyncPlaytimeEnabled] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (prefs.panelWidth) setWidth(prefs.panelWidth);
        if (prefs.fanartHeight) setFanartHeight(prefs.fanartHeight);
        if (prefs.descriptionHeight) setDescriptionHeight(prefs.descriptionHeight);
        if (prefs.titleFontSize) setTitleFontSize(prefs.titleFontSize);
        if (prefs.titleFontFamily) setTitleFontFamily(prefs.titleFontFamily);
        if (prefs.descriptionFontSize) setDescriptionFontSize(prefs.descriptionFontSize);
        if (prefs.descriptionFontFamily) setDescriptionFontFamily(prefs.descriptionFontFamily);
        if (prefs.detailsFontSize) setDetailsFontSize(prefs.detailsFontSize);
        if (prefs.detailsFontFamily) setDetailsFontFamily(prefs.detailsFontFamily);
        if (prefs.visibleDetails) setVisibleDetails(prefs.visibleDetails);
        if (prefs.boxartWidth) setBoxartWidth(prefs.boxartWidth);
        if (prefs.descriptionWidth !== undefined) setDescriptionWidth(prefs.descriptionWidth);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Load Steam syncPlaytime setting
  useEffect(() => {
    const loadSteamConfig = async () => {
      try {
        if (window.electronAPI.getAppConfig) {
          const steamConfig = await window.electronAPI.getAppConfig('steam');
          if (steamConfig && 'syncPlaytime' in steamConfig) {
            setSteamSyncPlaytimeEnabled(steamConfig.syncPlaytime || false);
          } else {
            setSteamSyncPlaytimeEnabled(false);
          }
        }
      } catch (error) {
        console.error('Error loading Steam config:', error);
        setSteamSyncPlaytimeEnabled(false);
      }
    };
    loadSteamConfig();
  }, [game]); // Reload when game changes

  // Initialize local logo size when dialog opens, reset when it closes
  useEffect(() => {
    if (showLogoResizeDialog && game) {
      setLocalLogoSize(game.logoSize);
    } else if (!showLogoResizeDialog) {
      setLocalLogoSize(undefined);
      setIsSavingLogoSize(false);
    }
  }, [showLogoResizeDialog, game?.logoSize]);

  // Save preferences when they change
  useEffect(() => {
    const savePreferences = async () => {
      try {
        await window.electronAPI.savePreferences({
          panelWidth: width,
          fanartHeight,
          descriptionHeight,
          titleFontSize,
          titleFontFamily,
          descriptionFontSize,
          descriptionFontFamily,
          detailsFontSize,
          detailsFontFamily,
          visibleDetails,
          boxartWidth,
          descriptionWidth,
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [width, fanartHeight, descriptionHeight, titleFontSize, titleFontFamily, descriptionFontSize, descriptionFontFamily, detailsFontSize, detailsFontFamily, visibleDetails, boxartWidth, descriptionWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && panelRef.current) {
        // Calculate width from the right edge (mouse position from right)
        const newWidth = window.innerWidth - e.clientX;
        const minWidth = 400;
        const maxWidth = window.innerWidth * 0.75;
        setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      } else if (isResizingFanart && fanartRef.current) {
        const rect = fanartRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        const minHeight = 200;
        const maxHeight = 600;
        setFanartHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
      } else if (isResizingDescription && descriptionRef.current) {
        const rect = descriptionRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        const minHeight = 200;
        const maxHeight = 800;
        setDescriptionHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
      } else if (isResizingDescriptionWidth && descriptionContainerRef.current) {
        const rect = descriptionContainerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
        const minWidth = 30;
        const maxWidth = 70;
        setDescriptionWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsResizingFanart(false);
      setIsResizingDescription(false);
      setIsResizingDescriptionWidth(false);
    };

    if (isResizing || isResizingFanart || isResizingDescription || isResizingDescriptionWidth) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isResizingFanart, isResizingDescription, isResizingDescriptionWidth]);

  if (!game) {
    return (
      <div 
        ref={panelRef}
        className="onyx-glass-panel rounded-l-3xl flex items-center justify-center p-8 relative"
        style={{ width: `${width}px`, minWidth: '400px' }}
      >
        <div className="text-center">
          <p className="text-gray-100 text-lg">Select a game</p>
          <p className="text-gray-300 text-sm mt-2">Click on a game card to view details</p>
        </div>
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />
      </div>
    );
  }

  // Banner should be the background, box art goes on the right side
  const backgroundImageUrl = game.bannerUrl || game.boxArtUrl || '';
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const platformDisplay = game.platform === 'steam' ? 'PC (Windows)' : game.platform;

  return (
    <div 
      ref={panelRef}
      className="onyx-glass-panel rounded-l-3xl flex flex-col h-full overflow-hidden relative ml-auto"
      style={{ width: `${width}px`, minWidth: '400px' }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />

      {/* Background Image - Resizable */}
      <div 
        ref={fanartRef}
        className="relative flex-shrink-0 overflow-visible"
        style={{ height: backgroundImageUrl ? `${fanartHeight}px` : 'auto', minHeight: backgroundImageUrl ? `${fanartHeight}px` : '120px' }}
      >
        {backgroundImageUrl && (
          <>
            <img
              key={backgroundImageUrl}
              src={backgroundImageUrl}
              alt={game.title}
              className="w-full h-full object-cover cursor-pointer"
              style={{ height: `${fanartHeight}px` }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Prevent infinite retry loop
                if (target.dataset.errorHandled === 'true') return;
                target.dataset.errorHandled = 'true';
                target.style.display = 'none';
                target.src = ''; // Clear src to prevent retries
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Artwork right-click:', e.clientX, e.clientY);
                setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'artwork' });
              }}
            />
            {/* Blurred background for logo area */}
            {game.logoUrl && (
              <div 
                className="absolute left-6 bottom-0 z-10"
                style={{ 
                  width: 'calc(100% - 11rem)', // Space to the left of boxart (right-6 = 1.5rem, boxart w-32 = 8rem, plus some spacing)
                  height: '60%',
                  transform: 'translateY(50%)',
                  pointerEvents: 'none'
                }}
              >
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${backgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(40px)',
                    opacity: 0.6,
                    position: 'absolute',
                    inset: 0
                  }}
                ></div>
              </div>
            )}
          </>
        )}
        
        {/* Logo - Centered to the left of boxart, overlapping banner, same row as boxart */}
        <div 
          className="absolute left-6 bottom-0 z-20 flex items-center justify-center"
          style={{ 
            width: 'calc(100% - 11rem)', // Space to the left of boxart
            transform: 'translateY(50%)',
            maxHeight: '60%'
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Title right-click:', e.clientX, e.clientY);
            setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'title' });
          }}
        >
          {game.logoUrl ? (
            <img
              key={game.logoUrl}
              src={game.logoUrl}
              alt={game.title}
              className="max-w-full max-h-full object-contain cursor-pointer drop-shadow-2xl"
              style={{ 
                maxHeight: `${showLogoResizeDialog && localLogoSize !== undefined ? localLogoSize : (game.logoSize || 100)}px`,
                ...(game.removeLogoTransparency ? {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: '8px',
                  borderRadius: '4px'
                } : {})
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Prevent infinite retry loop
                if (target.dataset.errorHandled === 'true') return;
                target.dataset.errorHandled = 'true';
                target.style.display = 'none';
                target.src = ''; // Clear src to prevent retries
              }}
            />
          ) : (
            <div 
              className="px-4 py-2 bg-gray-800/80 rounded border border-gray-600 text-gray-400 text-xs cursor-pointer hover:bg-gray-700/80 transition-colors"
              onClick={() => onOpenInGameManager?.(game, 'images')}
            >
              Click to add logo
            </div>
          )}
        </div>
        
        {/* Box Art - Half overlapping the top image */}
        <div className="absolute right-6 bottom-0 z-20" style={{ transform: 'translateY(50%)' }}>
          {game.boxArtUrl ? (
            <img
              key={game.boxArtUrl}
              src={game.boxArtUrl}
              alt={game.title}
              className="aspect-[2/3] object-cover rounded border border-gray-600 shadow-lg cursor-pointer"
              style={{ width: `${boxartWidth}px` }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Prevent infinite retry loop
                if (target.dataset.errorHandled === 'true') return;
                
                // Try banner URL as fallback (only once)
                if (game.bannerUrl && target.src !== game.bannerUrl && !target.dataset.fallbackAttempted) {
                  target.dataset.fallbackAttempted = 'true';
                  target.src = game.bannerUrl;
                } else {
                  target.dataset.errorHandled = 'true';
                  target.style.display = 'none';
                  target.src = ''; // Clear src to prevent retries
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Boxart right-click:', e.clientX, e.clientY);
                setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'boxart' });
              }}
            />
          ) : (
            <div 
              className="aspect-[2/3] bg-gray-800 rounded border border-gray-600 flex items-center justify-center text-gray-400 text-xs text-center px-2 cursor-pointer hover:bg-gray-700 transition-colors"
              style={{ width: `${boxartWidth}px` }}
              onClick={() => onOpenInGameManager?.(game, 'images')}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'boxart' });
              }}
            >
              Click to add boxart
            </div>
          )}
        </div>
        
        {/* Resize handle */}
        {backgroundImageUrl && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingFanart(true);
            }}
          />
        )}
      </div>

      {/* Social Media Links */}
      {game.links && game.links.length > 0 && (
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-700 flex-shrink-0 flex-wrap">
          {game.links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white text-xs"
              title={link.name}
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1" style={{ overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        <div 
          className="p-6 space-y-6"
          style={{
            paddingTop: (game.logoUrl || game.boxArtUrl) ? '7rem' : '1.5rem' // Add extra padding when logo/boxart overlap
          }}
        >
          {/* Upper Section: Title - only shown when no logo */}
          {!game.logoUrl && (
            <div className="relative">
              <div 
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Title right-click:', e.clientX, e.clientY);
                  setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'title' });
                }}
              >
                <h1 
                  className="title-fallback font-bold text-white onyx-text-glow tracking-wide break-words cursor-pointer"
                  style={{ 
                    fontSize: `${titleFontSize}px`,
                    fontFamily: titleFontFamily,
                  }}
                >
                  {game.title}
                </h1>
              </div>
            </div>
          )}
          
          {/* Description and Details in a row */}
          <div ref={descriptionContainerRef} className="flex gap-0 relative">
            {/* Description Content - Left side */}
            <div className="relative" style={{ width: `${descriptionWidth}%` }}>
              <div 
                ref={descriptionRef}
                className="space-y-6 relative pr-3"
                style={{ 
                  height: `${descriptionHeight}px`,
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {/* Game Description */}
                {game.description && (
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Description right-click:', e.clientX, e.clientY);
                      setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'description' });
                    }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <div 
                      className="text-gray-200 leading-relaxed cursor-pointer"
                      style={{
                        fontSize: `${descriptionFontSize}px`,
                        fontFamily: descriptionFontFamily,
                      }}
                      dangerouslySetInnerHTML={{ __html: game.description }}
                    />
                  </div>
                )}

                {/* Features */}
                {game.features && game.features.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Features</h3>
                    <ul className="space-y-2 text-gray-200 text-sm">
                      {game.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {/* Resize handle for description */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingDescription(true);
                }}
              />
            </div>

            {/* Vertical divider */}
            <div
              className="w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-gray-700 flex-shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingDescriptionWidth(true);
              }}
            />

            {/* Details Section - Right side */}
            <div 
              className="pl-6"
              style={{ 
                width: `${100 - descriptionWidth}%`,
                fontSize: `${detailsFontSize}px`,
                fontFamily: detailsFontFamily,
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Details right-click:', e.clientX, e.clientY);
                setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'details' });
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
              <div className="grid grid-cols-1 gap-4">
              {visibleDetails.releaseDate && game.releaseDate && (
                <div>
                  <p className="text-gray-400 mb-1">Release Date</p>
                  <p className="text-gray-200">{formatDate(game.releaseDate)}</p>
                </div>
              )}
              {visibleDetails.platform && platformDisplay && (
                <div>
                  <p className="text-gray-400 mb-1">Platform</p>
                  <p className="text-gray-200">{platformDisplay}</p>
                </div>
              )}
              {visibleDetails.ageRating && game.ageRating && (
                <div>
                  <p className="text-gray-400 mb-1">Age Rating</p>
                  <p className="text-gray-200">{game.ageRating}</p>
                </div>
              )}
              {visibleDetails.genres && game.genres && game.genres.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Genres</p>
                  <p className="text-gray-200">{game.genres.join(', ')}</p>
                </div>
              )}
              {visibleDetails.developers && game.developers && game.developers.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Developer</p>
                  <p className="text-gray-200">{game.developers.join(', ')}</p>
                </div>
              )}
              {visibleDetails.publishers && game.publishers && game.publishers.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Publisher</p>
                  <p className="text-gray-200">{game.publishers.join(', ')}</p>
                </div>
              )}
              {visibleDetails.communityScore && game.communityScore !== undefined && (
                <div>
                  <p className="text-gray-400 mb-1">Community Score</p>
                  <p className="text-gray-200">{game.communityScore}/100</p>
                </div>
              )}
              {visibleDetails.userScore && game.userScore !== undefined && (
                <div>
                  <p className="text-gray-400 mb-1">User Score</p>
                  <p className="text-gray-200">{game.userScore}/100</p>
                </div>
              )}
              {visibleDetails.criticScore && game.criticScore !== undefined && (
                <div>
                  <p className="text-gray-400 mb-1">Critic Score</p>
                  <p className="text-gray-200">{game.criticScore}/100</p>
                </div>
              )}
              {visibleDetails.installationDirectory && game.installationDirectory && (
                <div>
                  <p className="text-gray-400 mb-1">Installation Folder</p>
                  <p className="text-gray-200 text-xs break-all">{game.installationDirectory}</p>
                  {game.installSize && (
                    <p className="text-gray-400 text-xs mt-1">
                      {(game.installSize / 1024).toFixed(3)} GB
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Simple Context Menu (appears at right-click location) */}
      {simpleContextMenu && (() => {
        console.log('Rendering simple context menu:', simpleContextMenu);
        return (
          <GameDetailsSimpleContextMenu
            x={simpleContextMenu.x}
            y={simpleContextMenu.y}
            onClose={() => {
              console.log('Closing simple context menu');
              setSimpleContextMenu(null);
            }}
            type={simpleContextMenu.type}
            hasLogo={simpleContextMenu.type === 'title' && !!game?.logoUrl}
            removeLogoTransparency={game?.removeLogoTransparency ?? false}
            onRemoveLogoTransparency={async () => {
              if (game && onSaveGame) {
                const updatedGame = { ...game, removeLogoTransparency: !game.removeLogoTransparency };
                await onSaveGame(updatedGame);
              }
            }}
            onEdit={() => {
              console.log('Edit clicked for type:', simpleContextMenu.type);
              switch (simpleContextMenu.type) {
                case 'artwork':
                  setShowArtworkMenu(true);
                  break;
                case 'boxart':
                  setShowBoxartMenu(true);
                  break;
                case 'title':
                  setShowTitleMenu(true);
                  break;
                case 'description':
                  setShowDescriptionMenu(true);
                  break;
                case 'details':
                  setShowDetailsMenu(true);
                  break;
              }
            }}
            onResize={() => {
              console.log('Resize clicked for type:', simpleContextMenu.type);
              if (simpleContextMenu.type === 'title') {
                setShowLogoResizeDialog(true);
              } else if (simpleContextMenu.type === 'boxart') {
                setShowBoxartResizeDialog(true);
              }
            }}
            onOpenInGameManager={game && onOpenInGameManager ? () => {
              const tab = (simpleContextMenu.type === 'artwork' || simpleContextMenu.type === 'boxart' || simpleContextMenu.type === 'title') 
                ? 'images' 
                : 'metadata';
              onOpenInGameManager(game, tab);
            } : undefined}
          />
        );
      })()}

      {/* Full Settings Menus (appear over game list section) */}
      {showArtworkMenu && game && (
        <ImageContextMenu
          onClose={() => setShowArtworkMenu(false)}
          positionOverGameList={true}
          imageType="artwork"
          onSelectFromFile={async () => {
            try {
              const imagePath = await window.electronAPI.showImageDialog();
              if (imagePath && onSaveGame && game) {
                // Convert file path to file:// URL for display
                const fileUrl = imagePath.startsWith('file://') ? imagePath : `file:///${imagePath.replace(/\\/g, '/')}`;
                const updatedGame = { ...game, bannerUrl: fileUrl };
                await onSaveGame(updatedGame);
              }
            } catch (error) {
              console.error('Error selecting image:', error);
            }
          }}
          onSearchImages={() => {
            setImageSearchModal({ type: 'artwork' });
          }}
          onOpenInGameManager={onOpenInGameManager ? () => onOpenInGameManager(game, 'images') : undefined}
        />
      )}

      {showBoxartMenu && game && (
        <ImageContextMenu
          onClose={() => setShowBoxartMenu(false)}
          positionOverGameList={true}
          imageType="boxart"
          onSelectFromFile={async () => {
            try {
              const imagePath = await window.electronAPI.showImageDialog();
              if (imagePath && onSaveGame && game) {
                // Convert file path to file:// URL for display
                const fileUrl = imagePath.startsWith('file://') ? imagePath : `file:///${imagePath.replace(/\\/g, '/')}`;
                const updatedGame = { ...game, boxArtUrl: fileUrl };
                await onSaveGame(updatedGame);
              }
            } catch (error) {
              console.error('Error selecting image:', error);
            }
          }}
          onSearchImages={() => {
            setImageSearchModal({ type: 'boxart' });
          }}
          onOpenInGameManager={onOpenInGameManager ? () => onOpenInGameManager(game, 'images') : undefined}
        />
      )}

      {showTitleMenu && (
        <TextStyleContextMenu
          onClose={() => setShowTitleMenu(false)}
          positionOverGameList={true}
          fontSize={titleFontSize}
          onFontSizeChange={setTitleFontSize}
          fontFamily={titleFontFamily}
          onFontFamilyChange={setTitleFontFamily}
          label="Title"
          onOpenInGameManager={game && onOpenInGameManager ? () => onOpenInGameManager(game, 'images') : undefined}
        />
      )}

      {showDescriptionMenu && (
        <TextStyleContextMenu
          onClose={() => setShowDescriptionMenu(false)}
          positionOverGameList={true}
          fontSize={descriptionFontSize}
          onFontSizeChange={setDescriptionFontSize}
          fontFamily={descriptionFontFamily}
          onFontFamilyChange={setDescriptionFontFamily}
          label="Description"
          onOpenInGameManager={game && onOpenInGameManager ? () => onOpenInGameManager(game, 'metadata') : undefined}
        />
      )}

      {showDetailsMenu && game && (
        <DetailsContextMenu
          onClose={() => setShowDetailsMenu(false)}
          positionOverGameList={true}
          fontSize={detailsFontSize}
          onFontSizeChange={setDetailsFontSize}
          fontFamily={detailsFontFamily}
          onFontFamilyChange={setDetailsFontFamily}
          visibleDetails={visibleDetails}
          onVisibleDetailsChange={setVisibleDetails}
          onOpenInGameManager={onOpenInGameManager ? () => onOpenInGameManager(game, 'metadata') : undefined}
          game={game}
        />
      )}

      {/* Image Search Modal */}
      {imageSearchModal && game && (
        <ImageSearchModal
          isOpen={!!imageSearchModal}
          onClose={() => setImageSearchModal(null)}
          gameTitle={game.title}
          imageType={imageSearchModal.type}
          onSelectImage={async (imageUrl) => {
            if (onSaveGame) {
              const updatedGame = imageSearchModal.type === 'artwork'
                ? { ...game, bannerUrl: imageUrl }
                : { ...game, boxArtUrl: imageUrl };
              await onSaveGame(updatedGame);
            }
          }}
        />
      )}

      {/* Logo Resize Dialog */}
      {showLogoResizeDialog && game && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Resize Logo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Logo Height: {localLogoSize !== undefined ? localLogoSize : (game.logoSize || 48)}px</label>
                <input
                  type="range"
                  min="24"
                  max="200"
                  value={localLogoSize !== undefined ? localLogoSize : (game.logoSize || 48)}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setLocalLogoSize(newSize);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={async () => {
                    if (isSavingLogoSize || !game || localLogoSize === undefined) {
                      return;
                    }
                    
                    setIsSavingLogoSize(true);
                    try {
                      // Ensure we have the latest game data with all properties preserved
                      const updatedGame = { 
                        ...game, 
                        logoSize: localLogoSize,
                        // Explicitly preserve all image URLs to prevent them from being lost
                        bannerUrl: game.bannerUrl,
                        boxArtUrl: game.boxArtUrl,
                        logoUrl: game.logoUrl,
                        heroUrl: game.heroUrl
                      };
                      
                      // Update UI immediately without full reload to prevent banner from disappearing
                      if (onUpdateGameInState) {
                        onUpdateGameInState(updatedGame);
                      }
                      
                      // Save to disk in the background
                      if (onSaveGame) {
                        await onSaveGame(updatedGame);
                      }
                    } catch (error) {
                      console.error('Error saving logo size:', error);
                    } finally {
                      setIsSavingLogoSize(false);
                      setShowLogoResizeDialog(false);
                    }
                  }}
                  disabled={isSavingLogoSize || localLogoSize === undefined}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingLogoSize ? 'Saving...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boxart Resize Dialog */}
      {showBoxartResizeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Resize Boxart</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Boxart Width: {boxartWidth}px</label>
                <input
                  type="range"
                  min="64"
                  max="256"
                  value={boxartWidth}
                  onChange={(e) => setBoxartWidth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowBoxartResizeDialog(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons at Bottom */}
      {game && (
        <div className="border-t border-gray-700 p-4 flex items-center justify-end gap-3 flex-shrink-0">
          {/* Playtime display - DISABLED (Future Feature) */}
          {/* {steamSyncPlaytimeEnabled && game.id.startsWith('steam-') && game.playtime !== undefined && game.playtime > 0 && (
            <div className="absolute left-4 bottom-4 text-sm text-gray-400">
              <span className="font-medium text-gray-300">
                {Math.floor(game.playtime / 60)}h {game.playtime % 60}m
              </span>
            </div>
          )} */}
          
          <button
            onClick={() => onFavorite?.(game)}
            className={`p-2 rounded transition-colors ${
              game.favorite ? 'text-yellow-400' : 'text-gray-300 hover:bg-gray-700'
            }`}
            title="Favorite"
          >
            <svg className="w-5 h-5" fill={game.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(game)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Edit Game"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}

          {game.modManagerUrl && (
            <button
              onClick={async () => {
                if (game.modManagerUrl) {
                  try {
                    await window.electronAPI.openExternal(game.modManagerUrl);
                  } catch (err) {
                    console.error('Error opening mod manager:', err);
                  }
                }
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Open Mod Manager"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Mod Manager
            </button>
          )}

          <button
            onClick={() => onPlay?.(game)}
            className="onyx-btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>
        </div>
      )}
    </div>
  );
};
