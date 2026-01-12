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
}

export const SortableGameCard: React.FC<SortableGameCardProps> = ({ game, onPlay, onClick, onEdit, hideTitle = false, showLogoOverBoxart = true, logoPosition = 'middle', useLogoInsteadOfBoxart = false, descriptionSize = 14 }) => {
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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer"
    >
      <GameCard game={game} onPlay={onPlay} onEdit={onEdit} hideTitle={hideTitle} showLogoOverBoxart={showLogoOverBoxart} logoPosition={logoPosition} useLogoInsteadOfBoxart={useLogoInsteadOfBoxart} descriptionSize={descriptionSize} />
    </div>
  );
};
