import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Game } from '../types/game';
import { GameCard } from './GameCard';

interface SortableGameCardProps {
  game: Game;
  onPlay?: (game: Game) => void;
  onClick?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  hideTitle?: boolean;
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  useLogoInsteadOfBoxart?: boolean;
  descriptionSize?: number;
  onContextMenu?: (game: Game, x: number, y: number) => void;
  viewMode?: 'grid' | 'logo' | 'list' | 'carousel';
  logoBackgroundColor?: string;
  logoBackgroundOpacity?: number;
  tabIndex?: number;
  isFocused?: boolean;
  onFocus?: () => void;
}

export const SortableGameCard: React.FC<SortableGameCardProps> = ({ game, onPlay, onClick, onEdit, hideTitle = false, showLogoOverBoxart = true, logoPosition = 'middle', useLogoInsteadOfBoxart = false, descriptionSize = 14, onContextMenu, viewMode, logoBackgroundColor, logoBackgroundOpacity, tabIndex, isFocused, onFocus }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle click - only fire if not currently dragging
  // The activationConstraint (8px) in LibraryGrid ensures clicks without movement work
  const handleClick = () => {
    // Prevent click if we're dragging
    if (!isDragging && onClick) {
      onClick(game);
    }
  };

  // Handle double-click to launch game
  const handleDoubleClick = () => {
    if (!isDragging && onPlay) {
      onPlay(game);
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(game, e.clientX, e.clientY);
    }
  };

  // Merge listeners with context menu handler
  const mergedListeners = {
    ...listeners,
    onContextMenu: handleContextMenu,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      {...mergedListeners}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onFocus={onFocus}
      tabIndex={tabIndex}
      className={`cursor-pointer outline-none ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 rounded' : ''}`}
      data-game-card
    >
      <GameCard game={game} onPlay={onPlay} onEdit={onEdit} hideTitle={hideTitle} showLogoOverBoxart={showLogoOverBoxart} logoPosition={logoPosition} useLogoInsteadOfBoxart={useLogoInsteadOfBoxart} descriptionSize={descriptionSize} viewMode={viewMode} logoBackgroundColor={logoBackgroundColor} logoBackgroundOpacity={logoBackgroundOpacity} />
    </div>
  );
};
