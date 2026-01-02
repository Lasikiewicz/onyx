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
  gridSize?: number;
}

export const LibraryGrid: React.FC<LibraryGridProps> = ({ games, onReorder, onPlay, onGameClick, onEdit, onEditImages, onFavorite, gridSize = 120 }) => {
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
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))`,
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

    </div>
  );
};
