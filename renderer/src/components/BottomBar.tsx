import React, { useState, useRef, useEffect } from 'react';
import { Game } from '../types/game';

interface BottomBarProps {
  game: Game | null;
  onPlay?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ game, onPlay, onFavorite, onEdit, gridSize = 120, onGridSizeChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(gridSize.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when gridSize changes externally
  useEffect(() => {
    if (!isEditing) {
      setInputValue(gridSize.toString());
    }
  }, [gridSize, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = Number(inputValue);
    if (!isNaN(numValue) && numValue >= 80 && numValue <= 500) {
      onGridSizeChange?.(numValue);
    } else {
      setInputValue(gridSize.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInputValue(gridSize.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="onyx-glass-panel h-16 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left side - Empty (grid size moved to grid view) */}
      <div className="flex items-center gap-4">
      </div>

      {/* Right side - Actions and Play */}
      {game ? (
        <div className="flex items-center gap-3">
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
      ) : null}
    </div>
  );
};
