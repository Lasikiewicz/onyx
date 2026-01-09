import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Game } from '../types/game';
import { SortableGameCard } from './SortableGameCard';

interface LibraryGridProps {
  games: Game[];
  onReorder: (reorderedGames: Game[]) => Promise<void>;
  onPlay?: (game: Game) => void;
  onGameClick?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onPin?: (game: Game) => void;
  onFixMatch?: (game: Game) => void;
  onHide?: (game: Game) => void;
  onUnhide?: (game: Game) => void;
  isHiddenView?: boolean;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
  gameTilePadding?: number;
  hideGameTitles?: boolean;
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
}

export const LibraryGrid: React.FC<LibraryGridProps> = ({ games, onReorder, onPlay, onGameClick, onEdit, onEditImages, onFavorite, onPin, onFixMatch, onHide, onUnhide, isHiddenView = false, gridSize = 120, onGridSizeChange, gameTilePadding = 16, hideGameTitles = false, showLogoOverBoxart = true, logoPosition = 'middle' }) => {
  const [items, setItems] = useState<Game[]>(games);

  // Update items when games prop changes
  useEffect(() => {
    setItems(games);
  }, [games]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      
      // Save the new order to the backend
      await onReorder(newItems);
    }
  };

  const handleDecreaseSize = () => {
    if (onGridSizeChange && gridSize > 80) {
      onGridSizeChange(gridSize - 1);
    }
  };

  const handleIncreaseSize = () => {
    if (onGridSizeChange && gridSize < 500) {
      onGridSizeChange(gridSize + 1);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((g) => g.id)} strategy={rectSortingStrategy}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))`,
                gap: `${gameTilePadding}px`,
              }}
            >
              {items.map((game) => (
                <SortableGameCard
                  key={game.id}
                  game={game}
                  onPlay={onPlay}
                  onClick={onGameClick}
                  onEdit={onEdit}
                  onEditImages={onEditImages}
                  onFavorite={onFavorite}
                  onPin={onPin}
                  onFixMatch={onFixMatch}
                  onHide={onHide}
                  onUnhide={onUnhide}
                  isHiddenView={isHiddenView}
                  hideTitle={hideGameTitles}
                  showLogoOverBoxart={showLogoOverBoxart}
                  logoPosition={logoPosition}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Grid Size Control - Centered at bottom */}
      {onGridSizeChange && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <button
              onClick={handleDecreaseSize}
              disabled={gridSize <= 80}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Decrease grid size"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="range"
              min="80"
              max="500"
              step="1"
              value={gridSize}
              onChange={(e) => onGridSizeChange(Number(e.target.value))}
              className="w-32 h-2 bg-gray-600/50 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-gray-300 text-sm w-12 text-center">{gridSize}px</span>
            <button
              onClick={handleIncreaseSize}
              disabled={gridSize >= 500}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Increase grid size"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
