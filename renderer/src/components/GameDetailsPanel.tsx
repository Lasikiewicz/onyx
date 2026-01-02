import React, { useState, useEffect, useRef } from 'react';
import { Game } from '../types/game';

interface GameDetailsPanelProps {
  game: Game | null;
  onPlay?: (game: Game) => void;
}

export const GameDetailsPanel: React.FC<GameDetailsPanelProps> = ({ game }) => {
  const [width, setWidth] = useState(800);
  const [fanartHeight, setFanartHeight] = useState(320);
  const [descriptionHeight, setDescriptionHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingFanart, setIsResizingFanart] = useState(false);
  const [isResizingDescription, setIsResizingDescription] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fanartRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (prefs.panelWidth) setWidth(prefs.panelWidth);
        if (prefs.fanartHeight) setFanartHeight(prefs.fanartHeight);
        if (prefs.descriptionHeight) setDescriptionHeight(prefs.descriptionHeight);
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
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [width, fanartHeight, descriptionHeight]);

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
          <img
            src={backgroundImageUrl}
            alt={game.title}
            className="w-full h-full object-cover"
            style={{ height: `${fanartHeight}px` }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        
        {/* Box Art - Half overlapping the top image */}
        {game.boxArtUrl && (
          <div className="absolute right-6 bottom-0 z-20" style={{ transform: 'translateY(50%)' }}>
            <img
              src={game.boxArtUrl}
              alt={game.title}
              className="w-32 aspect-[2/3] object-cover rounded border border-gray-600 shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Try banner URL as fallback
                if (game.bannerUrl && target.src !== game.bannerUrl) {
                  target.src = game.bannerUrl;
                } else {
                  target.style.display = 'none';
                }
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
        <div className="p-6 space-y-6">
          {/* Upper Section: Title - positioned to avoid overlapping box art */}
          <div className="relative">
            {/* Title - wraps to avoid box art on the right */}
            <div className="pr-40">
              <h1 className="text-2xl font-bold text-white onyx-text-glow tracking-wide break-words">{game.title}</h1>
            </div>
          </div>
          
          {/* Description Content - Always below upper section */}
          <div className="relative">
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
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <p className="text-gray-200 leading-relaxed text-sm">{game.description}</p>
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

          {/* Details Section - Full Width */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {game.releaseDate && (
                <div>
                  <p className="text-gray-400 mb-1">Release Date</p>
                  <p className="text-gray-200">{formatDate(game.releaseDate)}</p>
                </div>
              )}
              {platformDisplay && (
                <div>
                  <p className="text-gray-400 mb-1">Platform</p>
                  <p className="text-gray-200">{platformDisplay}</p>
                </div>
              )}
              {game.ageRating && (
                <div>
                  <p className="text-gray-400 mb-1">Age Rating</p>
                  <p className="text-gray-200">
                    <span className="px-2 py-1 bg-yellow-600/30 border border-yellow-500/50 rounded text-yellow-300 text-xs font-semibold">
                      {game.ageRating}
                    </span>
                  </p>
                </div>
              )}
              {game.genres && game.genres.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Genres</p>
                  <p className="text-gray-200">{game.genres.join(', ')}</p>
                </div>
              )}
              {game.developers && game.developers.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Developer</p>
                  <p className="text-gray-200">{game.developers.join(', ')}</p>
                </div>
              )}
              {game.publishers && game.publishers.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Publisher</p>
                  <p className="text-gray-200">{game.publishers.join(', ')}</p>
                </div>
              )}
              {game.communityScore !== undefined && (
                <div>
                  <p className="text-gray-400 mb-1">Community Score</p>
                  <p className="text-gray-200">{game.communityScore}/100</p>
                </div>
              )}
              {game.userScore !== undefined && (
                <div>
                  <p className="text-gray-400 mb-1">User Score</p>
                  <p className="text-gray-200">{game.userScore}/100</p>
                </div>
              )}
              {game.criticScore !== undefined && (
                <div>
                  <p className="text-gray-400 mb-1">Critic Score</p>
                  <p className="text-gray-200">{game.criticScore}/100</p>
                </div>
              )}
              {game.installationDirectory && (
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
  );
};
