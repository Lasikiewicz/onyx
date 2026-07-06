import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Game } from '../types/game';
import { GameCardWide } from './GameCardWide';

interface SortableCardTileProps {
  game: Game;
  onPlay?: (game: Game) => void;
  onClick?: (game: Game) => void;
  onContextMenu?: (game: Game, x: number, y: number) => void;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedLogos?: boolean;
  postersOnly?: boolean;
  tabIndex?: number;
  isFocused?: boolean;
  index?: number;
  onFocusItem?: (index: number) => void;
}

const SortableCardTileComponent: React.FC<SortableCardTileProps> = ({
  game,
  onPlay,
  onClick,
  onContextMenu,
  disableAnimatedBoxarts,
  disableAnimatedLogos,
  postersOnly = false,
  tabIndex,
  isFocused,
  index,
  onFocusItem,
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

  const handleClick = useCallback(() => {
    if (!isDragging && onClick) {
      onClick(game);
    }
  }, [isDragging, onClick, game]);

  const handleDoubleClick = useCallback(() => {
    if (!isDragging && onPlay) {
      onPlay(game);
    }
  }, [isDragging, onPlay, game]);

  const handleFocus = useCallback(() => {
    if (index !== undefined && onFocusItem) {
      onFocusItem(index);
    }
  }, [onFocusItem, index]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(game, e.clientX, e.clientY);
  }, [onContextMenu, game]);

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
        <GameCardWide
          game={game}
          disableAnimatedBoxarts={disableAnimatedBoxarts}
          disableAnimatedLogos={disableAnimatedLogos}
          postersOnly={postersOnly}
        />
      </div>
    </div>
  );
};

export const SortableCardTile = React.memo(SortableCardTileComponent);
