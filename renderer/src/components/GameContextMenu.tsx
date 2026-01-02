import React, { useEffect, useRef } from 'react';
import { Game } from '../types/game';

interface GameContextMenuProps {
  game: Game;
  x: number;
  y: number;
  onClose: () => void;
  onPlay?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
}

export const GameContextMenu: React.FC<GameContextMenuProps> = ({
  game,
  x,
  y,
  onClose,
  onPlay,
  onEdit,
  onFavorite,
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

  const handleFavorite = () => {
    onFavorite?.(game);
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
      <button
        onClick={handleFavorite}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill={game.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1 1 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1 1 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1 1 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1 1 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1 1 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1 1 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
        {game.favorite ? 'Unfavorite' : 'Favorite'}
      </button>
    </div>
  );
};
