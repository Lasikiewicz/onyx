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
import { SortableCardTile } from './SortableCardTile';
import { computeSmartFillColumns } from '../utils/smartFillColumns';

/**
 * containIntrinsicSize is required alongside contentVisibility. Without it, skipped tiles
 * collapse to zero height, which makes the scrollbar jump and forces repeated layout
 * invalidation while scrolling. `auto` reuses the last rendered size once a tile has been
 * painted, so the placeholder height stays correct across tile sizes.
 */
const CARD_TILE_CONTAINMENT_STYLE: React.CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 220px',
};

interface LibraryCardViewProps {
  games: Game[];
  onReorder: (reorderedGames: Game[]) => Promise<void>;
  onPlay?: (game: Game) => void;
  onGameClick?: (game: Game) => void;
  columns?: number;
  /** When true, renders poster-only tiles instead of wide card/poster tiles. */
  postersOnly?: boolean;
  /** When true, ignores `columns` and auto-shrinks cards so every game fits on screen without scrolling. */
  smartFill?: boolean;
  gameTilePadding?: number;
  onGameContextMenu?: (game: Game, x: number, y: number) => void;
  onEmptySpaceClick?: (x: number, y: number) => void;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedLogos?: boolean;
}

// GameCardWide supports either 2:1 wide cards or 2:3 poster-only tiles.
const WIDE_CARD_ASPECT_HEIGHT_OVER_WIDTH = 0.5;
const POSTER_CARD_ASPECT_HEIGHT_OVER_WIDTH = 1.5;

export const LibraryCardView: React.FC<LibraryCardViewProps> = ({
  games,
  onReorder,
  onPlay,
  onGameClick,
  columns = 4,
  postersOnly = false,
  smartFill = false,
  gameTilePadding = 10,
  onGameContextMenu,
  onEmptySpaceClick,
  disableAnimatedBoxarts,
  disableAnimatedLogos,
}) => {
  const [items, setItems] = useState<Game[]>(games);

  useEffect(() => {
    setItems(games);
  }, [games]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [smartFillColumns, setSmartFillColumns] = useState(columns);

  useEffect(() => {
    if (!smartFill || !gridRef.current) return;

    const container = gridRef.current;
    const recompute = () => {
      setSmartFillColumns(
        computeSmartFillColumns(
          container.clientWidth,
          container.clientHeight,
          items.length,
          gameTilePadding,
          postersOnly ? POSTER_CARD_ASPECT_HEIGHT_OVER_WIDTH : WIDE_CARD_ASPECT_HEIGHT_OVER_WIDTH,
          // Smart Fill only ever shrinks - never fewer columns (bigger tiles) than configured.
          columns,
        ),
      );
    };

    recompute();

    const observer = new ResizeObserver(recompute);
    observer.observe(container);

    // ResizeObserver only fires on container box-size changes; moving the window to a display
    // with a different scale factor can change layout without that, leaving Smart Fill stale.
    window.addEventListener('resize', recompute);
    // matchMedia isn't guaranteed to exist in every environment (e.g. jsdom in tests) - skip
    // the DPI-change listener there rather than throwing.
    const supportsMatchMedia = typeof window.matchMedia === 'function';
    let dprMedia = supportsMatchMedia ? window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`) : null;
    const onDprChange = () => {
      recompute();
      if (!dprMedia) return;
      dprMedia.removeEventListener('change', onDprChange);
      dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprMedia.addEventListener('change', onDprChange);
    };
    dprMedia?.addEventListener('change', onDprChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
      dprMedia?.removeEventListener('change', onDprChange);
    };
  }, [smartFill, items.length, gameTilePadding, postersOnly, columns]);

  const effectiveColumns = smartFill ? smartFillColumns : columns;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const itemIds = useMemo(() => items.map((g) => g.id), [items]);

  const handleFocusItem = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridRef.current || items.length === 0) return;

      const cards = Array.from(gridRef.current.querySelectorAll('[data-game-card]'));
      if (cards.length === 0) return;

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
          newIndex = focusedIndex < 0 ? 0 : Math.min(focusedIndex + effectiveColumns, items.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.max(focusedIndex - effectiveColumns, 0);
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
  }, [items, focusedIndex, effectiveColumns, onGameClick]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      await onReorder(newItems);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto"
        onContextMenu={(e) => {
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
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
                gap: `${gameTilePadding}px`,
              }}
              onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('[data-game-card]')) {
                  e.preventDefault();
                  e.stopPropagation();
                  onEmptySpaceClick?.(e.clientX, e.clientY);
                }
              }}
            >
              {items.map((game, index) => (
                <div key={game.id} style={CARD_TILE_CONTAINMENT_STYLE}>
                  <SortableCardTile
                    game={game}
                    onPlay={onPlay}
                    onClick={onGameClick}
                    onContextMenu={onGameContextMenu}
                    disableAnimatedBoxarts={disableAnimatedBoxarts}
                    disableAnimatedLogos={disableAnimatedLogos}
                    postersOnly={postersOnly}
                    tabIndex={0}
                    isFocused={index === focusedIndex}
                    index={index}
                    onFocusItem={handleFocusItem}
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
