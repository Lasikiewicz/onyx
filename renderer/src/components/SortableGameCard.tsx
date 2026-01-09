import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Game } from '../types/game';
import { GameCard } from './GameCard';
import { GameContextMenu } from './GameContextMenu';

interface SortableGameCardProps {
  game: Game;
  onPlay?: (game: Game) => void;
  onClick?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onPin?: (game: Game) => void;
  onFixMatch?: (game: Game) => void;
  onHide?: (game: Game) => void;
  onUnhide?: (game: Game) => void;
  isHiddenView?: boolean;
  hideTitle?: boolean;
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
}

export const SortableGameCard: React.FC<SortableGameCardProps> = ({ game, onPlay, onClick, onEdit, onEditImages, onFavorite, onPin, onFixMatch, onHide, onUnhide, isHiddenView = false, hideTitle = false, showLogoOverBoxart = true, logoPosition = 'middle' }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game.id });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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

  // Handle right-click to show context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <>
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className="cursor-pointer"
      >
        <GameCard game={game} onPlay={onPlay} onEdit={onEdit} hideTitle={hideTitle} showLogoOverBoxart={showLogoOverBoxart} logoPosition={logoPosition} />
      </div>
      {contextMenu && (
        <GameContextMenu
          game={game}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onPlay={onPlay}
          onEdit={onEdit}
          onEditImages={onEditImages}
          onFavorite={onFavorite}
          onPin={onPin}
          onFixMatch={onFixMatch}
          onHide={onHide}
          onUnhide={onUnhide}
          isHiddenView={isHiddenView}
        />
      )}
    </>
  );
};
