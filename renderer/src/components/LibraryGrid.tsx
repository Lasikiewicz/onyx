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
import { computeSmartFillColumns, computeMaximizeSpaceLayout } from '../utils/smartFillColumns';

// Tile aspect ratios used to compute smart-fill column counts.
// Must match the aspect-[2/3] (boxart) / aspect-[16/9] (logo) classes in GameCard.tsx.
const BOXART_TILE_ASPECT_HEIGHT_OVER_WIDTH = 1.5;
const LOGO_TILE_ASPECT_HEIGHT_OVER_WIDTH = 9 / 16;

// Default details panel share of the row width when no preference is set.
const MAXIMIZE_SPACE_DEFAULT_MIN_PANEL_WIDTH_PERCENT = 40;
// Bounds the preference is clamped to, mirroring the slider range in the right-click menu.
const MAXIMIZE_SPACE_MIN_PANEL_PERCENT_FLOOR = 25;
const MAXIMIZE_SPACE_MIN_PANEL_PERCENT_CEILING = 50;
const MAXIMIZE_SPACE_MIN_PANEL_WIDTH_PX = 400;
// Ignore sub-pixel differences so we don't churn onPanelWidthChange/persistence forever.
const PANEL_WIDTH_CHANGE_TOLERANCE_PX = 2;

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
  /** When true (and smartFill is on), also resizes the details panel so tiles are as large as
   * possible with no leftover vertical space, keeping the panel at least 25% of the total width. */
  maximizeSpace?: boolean;
  /** Floor for the details panel width under Maximize Space, as a percent of the row (25-50). */
  minPanelWidthPercent?: number;
  /** Current details-panel width in px - required to compute Maximize Space layouts. */
  panelWidth?: number;
  /** Called with the new panel width when Maximize Space wants to resize the details panel. */
  onPanelWidthChange?: (width: number) => void;
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
  maximizeSpace = false,
  minPanelWidthPercent = 40,
  panelWidth = 0,
  onPanelWidthChange,
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

  // Read via refs inside the recompute effect below so panel-width churn (including the
  // Maximize Space feedback loop itself) doesn't force the ResizeObserver/listeners to
  // tear down and re-subscribe on every tick.
  const panelWidthRef = useRef(panelWidth);
  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);
  const onPanelWidthChangeRef = useRef(onPanelWidthChange);
  useEffect(() => {
    onPanelWidthChangeRef.current = onPanelWidthChange;
  }, [onPanelWidthChange]);

  useEffect(() => {
    if (!smartFill || !gridRef.current) return;

    const container = gridRef.current;
    const baseTileSize = useLogosInsteadOfBoxart ? logoSize : gridSize;
    const aspectRatio = useLogosInsteadOfBoxart ? LOGO_TILE_ASPECT_HEIGHT_OVER_WIDTH : BOXART_TILE_ASPECT_HEIGHT_OVER_WIDTH;
    const recompute = () => {
      // Natural (non-smart-fill) column count for the configured tile size, mirroring the
      // `repeat(auto-fit, Npx)` layout used when Smart Fill is off - Smart Fill must never
      // produce fewer columns (i.e. bigger tiles) than this.
      const baseColumns = Math.max(
        1,
        Math.floor((container.clientWidth + gameTilePadding) / (baseTileSize + gameTilePadding)),
      );

      if (maximizeSpace) {
        const currentPanelWidth = panelWidthRef.current;
        const totalWidth = container.clientWidth + currentPanelWidth;
        // Clamped rather than trusted: the value round-trips through persisted preferences.
        const panelPercent = Math.min(
          MAXIMIZE_SPACE_MIN_PANEL_PERCENT_CEILING,
          Math.max(
            MAXIMIZE_SPACE_MIN_PANEL_PERCENT_FLOOR,
            Number.isFinite(minPanelWidthPercent) ? minPanelWidthPercent : MAXIMIZE_SPACE_DEFAULT_MIN_PANEL_WIDTH_PERCENT,
          ),
        );
        // The setting bounds the panel from BOTH sides, which is why the same value is passed
        // as floor and cap.
        //
        // Passing only a floor (and a loose 75% cap) made the setting behave as two or three
        // discrete states: the floor merely selects which column count wins, and the panel
        // then takes whatever width that column count's exact vertical fit demands. With a
        // typical library that lands nowhere near the floor and jumps in large steps — at
        // 1920x1080 with 50 games, 25-32% all produced 32%, 33-48% produced 49%, and 49-50%
        // produced 61%, i.e. above the slider's own maximum.
        //
        // Binding both ends makes the panel track the slider linearly and never exceed it;
        // the games view then shrink-to-fits in whatever width is left, which is Smart Fill's
        // normal job.
        const panelWidthTarget = Math.max(MAXIMIZE_SPACE_MIN_PANEL_WIDTH_PX, totalWidth * (panelPercent / 100));
        const minPanelWidth = panelWidthTarget;
        const maxPanelWidth = panelWidthTarget;
        // Maximize Space deliberately overrides the "never grow past configured size" floor
        // (baseColumns) that plain Smart Fill respects - forcing at least baseColumns columns
        // while also solving for the exact-fit tile size demands far more width than is ever
        // available, which made this fail immediately and silently fall back to the old
        // waste-tolerant layout. Search the full column range instead.
        const layout = computeMaximizeSpaceLayout(
          totalWidth,
          container.clientHeight,
          items.length,
          gameTilePadding,
          aspectRatio,
          minPanelWidth,
          maxPanelWidth,
          1,
        );
        setSmartFillColumns(layout.columns);
        if (Math.abs(layout.panelWidth - currentPanelWidth) > PANEL_WIDTH_CHANGE_TOLERANCE_PX) {
          onPanelWidthChangeRef.current?.(Math.round(layout.panelWidth));
        }
        return;
      }

      setSmartFillColumns(
        computeSmartFillColumns(
          container.clientWidth,
          container.clientHeight,
          items.length,
          gameTilePadding,
          aspectRatio,
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
  }, [smartFill, maximizeSpace, minPanelWidthPercent, items.length, gameTilePadding, useLogosInsteadOfBoxart, gridSize, logoSize]);

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

  // The keydown listener below reads these through a ref. `focusedIndex` changes on every
  // arrow press and `items`/`onGameClick` change on every App render, so keeping them in the
  // dep array tore the document listener down and re-added it continuously.
  const keyNavRef = useRef({ items, focusedIndex, gameTilePadding, onGameClick });
  keyNavRef.current = { items, focusedIndex, gameTilePadding, onGameClick };

  // Handle keyboard navigation for gamepad support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { items, focusedIndex, gameTilePadding, onGameClick } = keyNavRef.current;
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
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const current = keyNavRef.current.items;
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(current, oldIndex, newIndex);
      setItems(newItems);

      // Save the new order to the backend
      await onReorder(newItems);
    }
  }, [onReorder]);

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
