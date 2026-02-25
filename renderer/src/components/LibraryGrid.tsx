import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Grid, GridImperativeAPI, CellComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { Game } from '../types/game';
import { SortableGameCard } from './SortableGameCard';
import { GameCard } from './GameCard';

interface LibraryGridProps {
  games: Game[];
  onReorder: (reorderedGames: Game[]) => Promise<void>;
  onPlay?: (game: Game) => void;
  onGameClick?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onEditCategories?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onPin?: (game: Game) => void;
  onFixMatch?: (game: Game) => void;
  onHide?: (game: Game) => void;
  onUnhide?: (game: Game) => void;
  isHiddenView?: boolean;
  gridSize?: number;
  logoSize?: number;
  onGridSizeChange?: (size: number) => void;
  gameTilePadding?: number;
  hideGameTitles?: boolean;
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  useLogosInsteadOfBoxart?: boolean;
  autoSizeToFit?: boolean;
  logoBackgroundColor?: string;
  logoBackgroundOpacity?: number;
  onGameContextMenu?: (game: Game, x: number, y: number) => void;
  onEmptySpaceClick?: (x: number, y: number) => void;
  descriptionSize?: number;
  viewMode?: 'grid' | 'logo';
}

interface ItemData {
  items: Game[];
  columnCount: number;
  cardWidth: number;
  cardHeight: number;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  [key: string]: any;
}

const CellComponent = (props: CellComponentProps<ItemData> & ItemData) => {
  const {
    columnIndex,
    rowIndex,
    style,
    items,
    columnCount,
    cardWidth,
    cardHeight,
    focusedIndex,
    setFocusedIndex,
    ...otherProps
  } = props;

  const index = rowIndex * columnCount + columnIndex;

  // Don't render if index is out of bounds
  if (index >= items.length) {
    return null;
  }

  const game = items[index];

  return (
    <div style={style}>
      <div style={{ width: cardWidth, height: cardHeight }}>
        <SortableGameCard
          key={game.id}
          game={game}
          isFocused={index === focusedIndex}
          onFocus={() => setFocusedIndex(index)}
          {...otherProps}
        />
      </div>
    </div>
  );
};

export const LibraryGrid: React.FC<LibraryGridProps> = ({
  games,
  onReorder,
  onPlay,
  onGameClick,
  onEdit,
  gridSize = 120,
  logoSize = 100,
  gameTilePadding = 3,
  hideGameTitles = false,
  showLogoOverBoxart = true,
  logoPosition = 'middle',
  useLogosInsteadOfBoxart = false,
  descriptionSize = 14,
  onGameContextMenu,
  onEmptySpaceClick,
  viewMode = 'grid',
  logoBackgroundColor = '#374151',
  logoBackgroundOpacity = 100,
}) => {
  const [items, setItems] = useState<Game[]>(games);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Update items when games prop changes
  useEffect(() => {
    setItems(games);
  }, [games]);

  const gridRef = useRef<GridImperativeAPI>(null);
  const columnCountRef = useRef<number>(1);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    })
  );

  // Handle keyboard navigation for gamepad support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridRef.current || items.length === 0) return;

      const columns = columnCountRef.current;
      let newIndex = focusedIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.min(focusedIndex + 1, items.length - 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.max(focusedIndex - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.min(focusedIndex + columns, items.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.max(focusedIndex - columns, 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length && onGameClick) {
            onGameClick(items[focusedIndex]);
          }
          break;
        default:
          return;
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
        const rowIndex = Math.floor(newIndex / columns);
        const columnIndex = newIndex % columns;
        gridRef.current.scrollToCell({ rowIndex, columnIndex });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onGameClick]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
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

  const activeGame = activeId ? items.find((item) => item.id === activeId) : null;

  // Calculate dimensions for DragOverlay
  const cardWidth = useLogosInsteadOfBoxart ? logoSize : gridSize;
  const aspectRatio = useLogosInsteadOfBoxart ? (9/16) : 1.5;
  const cardHeight = cardWidth * aspectRatio;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Grid Container */}
      <div
        className="flex-1 w-full h-full overflow-hidden"
        onContextMenu={(e) => {
          // Right click on empty space in grid - check if target is not a game card
          const target = e.target as HTMLElement;
          if (!target.closest('[data-game-card]')) {
            e.preventDefault();
            e.stopPropagation();
            onEmptySpaceClick?.(e.clientX, e.clientY);
          }
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <AutoSizer renderProp={({ height, width }) => {
              if (width === undefined || height === undefined) {
                return null;
              }

              const columnWidth = cardWidth + gameTilePadding;
              const rowHeight = cardHeight + gameTilePadding;

              // Ensure we have at least 1 column
              const columnCount = Math.max(1, Math.floor(width / columnWidth));
              const rowCount = Math.ceil(items.length / columnCount);

              columnCountRef.current = columnCount;

              return (
                <SortableContext items={items.map((g) => g.id)} strategy={rectSortingStrategy}>
                  <Grid
                    gridRef={gridRef}
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    style={{ height, width }}
                    cellProps={{
                      items,
                      columnCount,
                      cardWidth,
                      cardHeight,
                      focusedIndex,
                      setFocusedIndex,
                      onPlay,
                      onClick: onGameClick,
                      onEdit,
                      hideTitle: hideGameTitles,
                      showLogoOverBoxart,
                      logoPosition,
                      useLogoInsteadOfBoxart: useLogosInsteadOfBoxart,
                      descriptionSize,
                      onContextMenu: onGameContextMenu,
                      viewMode,
                      logoBackgroundColor,
                      logoBackgroundOpacity,
                      tabIndex: 0,
                    }}
                    cellComponent={CellComponent}
                  />
                </SortableContext>
              );
            }}
          />

          <DragOverlay>
            {activeGame ? (
              <div style={{ width: cardWidth, height: cardHeight }}>
                <GameCard
                    game={activeGame}
                    hideTitle={hideGameTitles}
                    showLogoOverBoxart={showLogoOverBoxart}
                    logoPosition={logoPosition}
                    useLogoInsteadOfBoxart={useLogosInsteadOfBoxart}
                    descriptionSize={descriptionSize}
                    viewMode={viewMode}
                    logoBackgroundColor={logoBackgroundColor}
                    logoBackgroundOpacity={logoBackgroundOpacity}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
