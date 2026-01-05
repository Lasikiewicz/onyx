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
}

export const GameDetailsPanel: React.FC<GameDetailsPanelProps> = ({ game, onSaveGame }) => {
  const [width, setWidth] = useState(800);
  const [fanartHeight, setFanartHeight] = useState(320);
  const [descriptionHeight, setDescriptionHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingFanart, setIsResizingFanart] = useState(false);
  const [isResizingDescription, setIsResizingDescription] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fanartRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

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

  // Font and style preferences
  const [titleFontSize, setTitleFontSize] = useState(24);
  const [titleFontFamily, setTitleFontFamily] = useState('system-ui');
  const [descriptionFontSize, setDescriptionFontSize] = useState(14);
  const [descriptionFontFamily, setDescriptionFontFamily] = useState('system-ui');
  const [detailsFontSize, setDetailsFontSize] = useState(14);
  const [detailsFontFamily, setDetailsFontFamily] = useState('system-ui');
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
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

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
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [width, fanartHeight, descriptionHeight, titleFontSize, titleFontFamily, descriptionFontSize, descriptionFontFamily, detailsFontSize, detailsFontFamily, visibleDetails]);

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
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsResizingFanart(false);
      setIsResizingDescription(false);
    };

    if (isResizing || isResizingFanart || isResizingDescription) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isResizingFanart, isResizingDescription]);

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
              src={backgroundImageUrl}
              alt={game.title}
              className="w-full h-full object-cover cursor-pointer"
              style={{ height: `${fanartHeight}px` }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
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
                    filter: 'blur(20px)',
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
        {game.logoUrl && (
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
            <img
              src={game.logoUrl}
              alt={game.title}
              className="max-w-full max-h-full object-contain cursor-pointer drop-shadow-2xl"
              style={{ 
                maxHeight: `${titleFontSize * 2}px`,
                ...(game.removeLogoTransparency ? {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: '8px',
                  borderRadius: '4px'
                } : {})
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Box Art - Half overlapping the top image */}
        {game.boxArtUrl && (
          <div className="absolute right-6 bottom-0 z-20" style={{ transform: 'translateY(50%)' }}>
            <img
              src={game.boxArtUrl}
              alt={game.title}
              className="w-32 aspect-[2/3] object-cover rounded border border-gray-600 shadow-lg cursor-pointer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Try banner URL as fallback
                if (game.bannerUrl && target.src !== game.bannerUrl) {
                  target.src = game.bannerUrl;
                } else {
                  target.style.display = 'none';
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Boxart right-click:', e.clientX, e.clientY);
                setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'boxart' });
              }}
            />
          </div>
        )}
        
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
          <div className="flex gap-6 relative">
            {/* Description Content - Left side */}
            <div className="relative flex-1">
              <div 
                ref={descriptionRef}
                className="space-y-6 relative"
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
                    <p 
                      className="text-gray-200 leading-relaxed cursor-pointer"
                      style={{
                        fontSize: `${descriptionFontSize}px`,
                        fontFamily: descriptionFontFamily,
                      }}
                    >
                      {game.description}
                    </p>
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

            {/* Details Section - Right side */}
            <div 
              className="flex-1 border-l border-gray-700 pl-6"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Details right-click:', e.clientX, e.clientY);
                setSimpleContextMenu({ x: e.clientX, y: e.clientY, type: 'details' });
              }}
              style={{
                fontSize: `${detailsFontSize}px`,
                fontFamily: detailsFontFamily,
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
                  <p className="text-gray-200">
                    <span className="px-2 py-1 bg-yellow-600/30 border border-yellow-500/50 rounded text-yellow-300 text-xs font-semibold">
                      {game.ageRating}
                    </span>
                  </p>
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
    </div>
  );
};
