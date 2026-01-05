import React, { useEffect, useRef } from 'react';
import { Game } from '../types/game';

interface GameContextMenuProps {
  game: Game;
  x: number;
  y: number;
  onClose: () => void;
  onPlay?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onPin?: (game: Game) => void;
}

export const GameContextMenu: React.FC<GameContextMenuProps> = ({
  game,
  x,
  y,
  onClose,
  onPlay,
  onEdit,
  onEditImages,
  onFavorite,
  onPin,
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

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (y + rect.height > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
  }, [x, y]);

  const handlePlay = () => {
    onPlay?.(game);
    onClose();
  };

  const handleEdit = () => {
    onEdit?.(game);
    onClose();
  };

  const handleEditImages = () => {
    onEditImages?.(game);
    onClose();
  };

  const handleFavorite = () => {
    onFavorite?.(game);
    onClose();
  };

  const handlePin = () => {
    onPin?.(game);
    onClose();
  };

  const handleModManager = async () => {
    if (game.modManagerUrl) {
      try {
        await window.electronAPI.openExternal(game.modManagerUrl);
      } catch (err) {
        console.error('Error opening mod manager:', err);
      }
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] py-1"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <button
        onClick={handlePlay}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Play
      </button>
      <button
        onClick={handleEdit}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
      {onEditImages && (
        <button
          onClick={handleEditImages}
          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Edit Images
        </button>
      )}
      {game.modManagerUrl && (
        <button
          onClick={handleModManager}
          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Mod Manager
        </button>
      )}
      <button
        onClick={handlePin}
        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${
          game.pinned ? 'text-blue-400' : 'text-gray-300'
        }`}
      >
        <svg className="w-4 h-4" fill={game.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {game.pinned ? 'Unpin' : 'Pin'}
      </button>
      <button
        onClick={handleFavorite}
        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${
          game.favorite ? 'text-yellow-400' : 'text-gray-300'
        }`}
      >
        <svg className="w-4 h-4" fill={game.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        {game.favorite ? 'Unfavorite' : 'Favorite'}
      </button>
    </div>
  );
};
