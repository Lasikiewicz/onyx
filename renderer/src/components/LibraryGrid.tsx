import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Game } from '../types/game';
import { SortableGameCard } from './SortableGameCard';
import { computeSmartFillColumns } from '../utils/smartFillColumns';

// Tile aspect ratios used to compute smart-fill column counts.
// Must match the aspect-[2/3] (boxart) / aspect-[16/9] (logo) classes in GameCard.tsx.
const BOXART_TILE_ASPECT_HEIGHT_OVER_WIDTH = 1.5;
const LOGO_TILE_ASPECT_HEIGHT_OVER_WIDTH = 9 / 16;

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
  smartFill?: boolean;
  logoBackgroundColor?: string;
  logoBackgroundOpacity?: number;
  onGameContextMenu?: (game: Game, x: number, y: number) => void;
  onEmptySpaceClick?: (x: number, y: number) => void;
  descriptionSize?: number;
  viewMode?: 'grid' | 'logo';
  // Effective animation disable flags (already combined with Disable all animations in App)
  disableAnimatedBoxarts?: boolean;
  disableAnimatedLogos?: boolean;
}

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
  smartFill = false,
  descriptionSize = 14,
  onGameContextMenu,
  onEmptySpaceClick,
  viewMode = 'grid',
  logoBackgroundColor = '#374151',
  logoBackgroundOpacity = 100,
  disableAnimatedBoxarts,
  disableAnimatedLogos,
}) => {
  const [items, setItems] = useState<Game[]>(games);

  // Update items when games prop changes
  useEffect(() => {
    setItems(games);
  }, [games]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [smartFillColumns, setSmartFillColumns] = useState(1);

  useEffect(() => {
    if (!smartFill || !gridRef.current) return;

    const container = gridRef.current;
    const baseTileSize = useLogosInsteadOfBoxart ? logoSize : gridSize;
    const recompute = () => {
      // Natural (non-smart-fill) column count for the configured tile size, mirroring the
      // `repeat(auto-fit, Npx)` layout used when Smart Fill is off - Smart Fill must never
      // produce fewer columns (i.e. bigger tiles) than this.
      const baseColumns = Math.max(
        1,
        Math.floor((container.clientWidth + gameTilePadding) / (baseTileSize + gameTilePadding)),
      );
      setSmartFillColumns(
        computeSmartFillColumns(
          container.clientWidth,
          container.clientHeight,
          items.length,
          gameTilePadding,
          useLogosInsteadOfBoxart ? LOGO_TILE_ASPECT_HEIGHT_OVER_WIDTH : BOXART_TILE_ASPECT_HEIGHT_OVER_WIDTH,
          baseColumns,
        ),
      );
    };

    recompute();

    const observer = new ResizeObserver(recompute);
    observer.observe(container);

    // ResizeObserver only fires when the container's CSS-pixel box size changes. Moving the
    // window to a display with a different scale factor (DPI) can change the effective layout
    // without changing that box size, which otherwise leaves Smart Fill stuck on a stale column
    // count. A `matchMedia(resolution)` query only fires once as the DPR drifts away from its
    // initial value, so re-subscribe at the new DPR each time it changes.
    window.addEventListener('resize', recompute);
    let dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDprChange = () => {
      recompute();
      dprMedia.removeEventListener('change', onDprChange);
      dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprMedia.addEventListener('change', onDprChange);
    };
    dprMedia.addEventListener('change', onDprChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
      dprMedia.removeEventListener('change', onDprChange);
    };
  }, [smartFill, items.length, gameTilePadding, useLogosInsteadOfBoxart, gridSize, logoSize]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    })
  );

  // Memoize item IDs for SortableContext to prevent unnecessary re-renders
  const itemIds = useMemo(() => items.map((g) => g.id), [items]);

  // Memoize focus callback to keep child props stable
  const handleFocusItem = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  // Handle keyboard navigation for gamepad support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridRef.current || items.length === 0) return;

      const cards = Array.from(gridRef.current.querySelectorAll('[data-game-card]'));
      if (cards.length === 0) return;

      // Calculate grid columns based on current layout
      const gridElement = gridRef.current.querySelector('.grid') as HTMLElement;
      if (!gridElement) return;

      const firstCard = cards[0] as HTMLElement;
      const gridWidth = gridElement.offsetWidth;
      const cardWidth = firstCard.offsetWidth;
      const gap = gameTilePadding;
      const columns = Math.floor((gridWidth + gap) / (cardWidth + gap));

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
        (cards[newIndex] as HTMLElement)?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, gameTilePadding, onGameClick]);

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
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto"
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
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: smartFill
                  ? `repeat(${smartFillColumns}, 1fr)`
                  : `repeat(auto-fit, ${useLogosInsteadOfBoxart ? logoSize : gridSize}px)`,
                gap: `${gameTilePadding}px`,
                justifyContent: 'start',
              }}
              onContextMenu={(e) => {
                // Right click on empty space in grid itself
                const target = e.target as HTMLElement;
                if (!target.closest('[data-game-card]')) {
                  e.preventDefault();
                  e.stopPropagation();
                  onEmptySpaceClick?.(e.clientX, e.clientY);
                }
              }}
            >
              {items.map((game, index) => (
                <div
                  key={game.id}
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: `${useLogosInsteadOfBoxart ? logoSize : gridSize}px ${useLogosInsteadOfBoxart ? logoSize : (gridSize * 1.5)}px`
                  }}
                >
                  <SortableGameCard
                    game={game}
                    onPlay={onPlay}
                    onClick={onGameClick}
                    onEdit={onEdit}
                    hideTitle={hideGameTitles}
                    showLogoOverBoxart={showLogoOverBoxart}
                    logoPosition={logoPosition}
                    useLogoInsteadOfBoxart={useLogosInsteadOfBoxart}
                    descriptionSize={descriptionSize}
                    onContextMenu={onGameContextMenu}
                    viewMode={viewMode}
                    logoBackgroundColor={logoBackgroundColor}
                    logoBackgroundOpacity={logoBackgroundOpacity}
                    tabIndex={0}
                    isFocused={index === focusedIndex}
                    index={index}
                    onFocusItem={handleFocusItem}
                    disableAnimatedBoxarts={disableAnimatedBoxarts}
                    disableAnimatedLogos={disableAnimatedLogos}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
