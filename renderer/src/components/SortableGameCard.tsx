import React, { useCallback } from 'react';
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
  index?: number;
  onFocusItem?: (index: number) => void;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedLogos?: boolean;
}

const SortableGameCardComponent: React.FC<SortableGameCardProps> = ({
  game,
  onPlay,
  onClick,
  onEdit,
  hideTitle = false,
  showLogoOverBoxart = true,
  logoPosition = 'middle',
  useLogoInsteadOfBoxart = false,
  descriptionSize = 14,
  onContextMenu,
  viewMode,
  logoBackgroundColor,
  logoBackgroundOpacity,
  tabIndex,
  isFocused,
  onFocus,
  index,
  onFocusItem,
  disableAnimatedBoxarts,
  disableAnimatedLogos,
}) => {
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
  const handleClick = useCallback(() => {
    // Prevent click if we're dragging
    if (!isDragging && onClick) {
      onClick(game);
    }
  }, [isDragging, onClick, game]);

  // Handle double-click to launch game
  const handleDoubleClick = useCallback(() => {
    if (!isDragging && onPlay) {
      onPlay(game);
    }
  }, [isDragging, onPlay, game]);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (onFocus) onFocus();
    if (index !== undefined && onFocusItem) {
      onFocusItem(index);
    }
  }, [onFocus, onFocusItem, index]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(game, e.clientX, e.clientY);
    }
  }, [onContextMenu, game]);

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
      onFocus={handleFocus}
      tabIndex={tabIndex}
      className="cursor-pointer outline-none overflow-hidden rounded-xl transition-all duration-200"
      data-game-card
      data-controller-game-card={game.id}
    >
      <div className={`${isFocused ? 'animate-breathing-scale z-10 will-change-transform' : ''}`} style={isFocused ? { willChange: 'transform', perspective: '1000px' } : {}}>
        <GameCard
          game={game}
          onPlay={onPlay}
          onEdit={onEdit}
          hideTitle={hideTitle}
          showLogoOverBoxart={showLogoOverBoxart}
          logoPosition={logoPosition}
          useLogoInsteadOfBoxart={useLogoInsteadOfBoxart}
          descriptionSize={descriptionSize}
          viewMode={viewMode}
          logoBackgroundColor={logoBackgroundColor}
          logoBackgroundOpacity={logoBackgroundOpacity}
          disableAnimatedBoxarts={disableAnimatedBoxarts}
          disableAnimatedLogos={disableAnimatedLogos}
        />
      </div>
    </div>
  );
};

export const SortableGameCard = React.memo(SortableGameCardComponent);
