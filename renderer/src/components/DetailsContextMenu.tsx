import React, { useEffect, useRef } from 'react';

interface VisibleDetails {
  releaseDate: boolean;
  platform: boolean;
  ageRating: boolean;
  genres: boolean;
  developers: boolean;
  publishers: boolean;
  communityScore: boolean;
  userScore: boolean;
  criticScore: boolean;
  installationDirectory: boolean;
}

interface DetailsContextMenuProps {
  x?: number;
  y?: number;
  onClose: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (family: string) => void;
  visibleDetails: VisibleDetails;
  onVisibleDetailsChange: (details: VisibleDetails) => void;
  onOpenInGameManager?: () => void;
  game: {
    releaseDate?: string;
    platform?: string;
    ageRating?: string;
    genres?: string[];
    developers?: string[];
    publishers?: string[];
    communityScore?: number;
    userScore?: number;
    criticScore?: number;
    installationDirectory?: string;
  };
  positionOverGameList?: boolean;
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'system-ui', label: 'System Default' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
];

export const DetailsContextMenu: React.FC<DetailsContextMenuProps> = ({
  x = 0,
  y = 0,
  onClose,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  visibleDetails,
  onVisibleDetailsChange,
  onOpenInGameManager,
  game,
  positionOverGameList = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen or position over game list
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (positionOverGameList) {
        // Position over the game list section (centered vertically, left side)
        const menuX = 20;
        const menuY = Math.max(20, (viewportHeight - rect.height) / 2);
        menuRef.current.style.left = `${menuX}px`;
        menuRef.current.style.top = `${menuY}px`;
      } else {
        // Original positioning logic
        if (x + rect.width > viewportWidth) {
          menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
        } else {
          menuRef.current.style.left = `${x}px`;
        }
        if (y + rect.height > viewportHeight) {
          menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
        } else {
          menuRef.current.style.top = `${y}px`;
        }
      }
    }
  }, [x, y, positionOverGameList]);

  const handleToggleDetail = (key: keyof VisibleDetails) => {
    onVisibleDetailsChange({
      ...visibleDetails,
      [key]: !visibleDetails[key],
    });
  };

  const handleOpenInGameManager = () => {
    onOpenInGameManager?.();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[320px] max-w-[400px] py-3 max-h-[90vh] overflow-y-auto"
      style={{ left: positionOverGameList ? undefined : `${x}px`, top: positionOverGameList ? undefined : `${y}px` }}
    >
      <div className="px-5 py-2">
        <div className="text-xs text-gray-400 mb-3 px-3 font-semibold uppercase tracking-wide">Details Style</div>
        
        {/* Font Size */}
        <div className="px-3 mb-4">
          <label className="block text-xs text-gray-400 mb-2">Font Size</label>
          <input
            type="range"
            min="8"
            max="24"
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>8px</span>
            <span className="font-medium text-gray-300">{fontSize}px</span>
            <span>24px</span>
          </div>
        </div>

        {/* Font Family */}
        <div className="px-3 mb-4">
          <label className="block text-xs text-gray-400 mb-2">Font Family</label>
          <select
            value={fontFamily}
            onChange={(e) => onFontFamilyChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-700 my-2" />

        {/* Visible Details */}
        <div className="px-3">
          <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Visible Details</div>
          <div className="space-y-1">
            {game.releaseDate && (
              <button
                onClick={() => handleToggleDetail('releaseDate')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Release Date</span>
                {visibleDetails.releaseDate && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.platform && (
              <button
                onClick={() => handleToggleDetail('platform')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Platform</span>
                {visibleDetails.platform && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.ageRating && (
              <button
                onClick={() => handleToggleDetail('ageRating')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Age Rating</span>
                {visibleDetails.ageRating && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.genres && game.genres.length > 0 && (
              <button
                onClick={() => handleToggleDetail('genres')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Genres</span>
                {visibleDetails.genres && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.developers && game.developers.length > 0 && (
              <button
                onClick={() => handleToggleDetail('developers')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Developer</span>
                {visibleDetails.developers && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.publishers && game.publishers.length > 0 && (
              <button
                onClick={() => handleToggleDetail('publishers')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Publisher</span>
                {visibleDetails.publishers && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.communityScore !== undefined && (
              <button
                onClick={() => handleToggleDetail('communityScore')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Community Score</span>
                {visibleDetails.communityScore && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.userScore !== undefined && (
              <button
                onClick={() => handleToggleDetail('userScore')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>User Score</span>
                {visibleDetails.userScore && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.criticScore !== undefined && (
              <button
                onClick={() => handleToggleDetail('criticScore')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Critic Score</span>
                {visibleDetails.criticScore && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            {game.installationDirectory && (
              <button
                onClick={() => handleToggleDetail('installationDirectory')}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span>Installation Folder</span>
                {visibleDetails.installationDirectory && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      {onOpenInGameManager && (
        <>
          <div className="border-t border-gray-700 my-2" />
          <div className="px-5">
            <button
              onClick={handleOpenInGameManager}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open in Game Manager
            </button>
          </div>
        </>
      )}
    </div>
  );
};
