import React, { useState, useRef, useEffect } from 'react';
import { Game } from '../types/game';
import { GameContextMenu } from './GameContextMenu';
import LibraryListItem from './LibraryListItem';

export interface ListViewOptions {
  showDescription: boolean;
  showCategories: boolean;
  showPlaytime: boolean;
  showReleaseDate: boolean;
  showGenres: boolean;
  showPlatform: boolean;
  showLauncher?: boolean;
  showLogos?: boolean;
  titleTextSize?: number;
  displayMode?: 'boxart-title' | 'logo-title' | 'logo-only' | 'title-only' | 'icon-title';
  sectionTextSize?: number;
  tileHeight?: number;
  boxartSize?: number;
  logoSize?: number;
}

interface LibraryListViewProps {
  games: Game[];
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
  hideGameTitles?: boolean;
  listViewOptions?: ListViewOptions;
  listViewSize?: number;
  onEmptySpaceClick?: (x: number, y: number) => void;
}

export const LibraryListView: React.FC<LibraryListViewProps> = ({
  games,
  onPlay,
  onGameClick,
  onEdit,
  onEditImages,
  onEditCategories,
  onFavorite,
  onPin,
  onFixMatch,
  onHide,
  onUnhide,
  isHiddenView = false,
  listViewOptions = {
    showDescription: true,
    showCategories: false,
    showPlaytime: true,
    showReleaseDate: true,
    showGenres: true,
    showPlatform: false,
    showLauncher: true,
    showLogos: false,
    titleTextSize: 18,
  },
  listViewSize = 128,
  onEmptySpaceClick,
}) => {
  const displayMode = listViewOptions.displayMode || 'boxart-title';
  const titleTextSize = listViewOptions.titleTextSize ?? 18;
  const sectionTextSize = listViewOptions.sectionTextSize ?? 14;
  const tileHeight = listViewOptions.tileHeight ?? listViewSize; // Use tileHeight or fallback to listViewSize
  const boxartSize = listViewOptions.boxartSize ?? 96;
  const logoSizeForList = listViewOptions.logoSize ?? 100;

  const [contextMenu, setContextMenu] = useState<{ game: Game; x: number; y: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Handle right-click on game boxart/logo (opens game context menu)
  const handleGameElementContextMenu = (e: React.MouseEvent, game: Game) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ game, x: e.clientX, y: e.clientY });
  };

  // Handle keyboard navigation for gamepad support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listRef.current || games.length === 0) return;

      const items = Array.from(listRef.current.querySelectorAll('[data-game-card]'));
      if (items.length === 0) return;

      let newIndex = focusedIndex;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.min(focusedIndex + 1, games.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = focusedIndex < 0 ? 0 : Math.max(focusedIndex - 1, 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < games.length && onGameClick) {
            onGameClick(games[focusedIndex]);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          // Allow horizontal navigation to pass through for other components
          return;
        default:
          return;
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
        (items[newIndex] as HTMLElement)?.focus();
        // Scroll into view if needed
        (items[newIndex] as HTMLElement)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [games, focusedIndex, onGameClick]);

  return (
    <div
      className="w-full h-full flex flex-col"
      onContextMenu={(e) => {
        // Right click on empty space opens library context menu
        e.preventDefault();
        onEmptySpaceClick?.(e.clientX, e.clientY);
      }}
    >
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-2">
          {games.map((game, index) => (
            <LibraryListItem
              key={game.id}
              game={game}
              index={index}
              isActive={index === focusedIndex}
              displayMode={displayMode}
              showDescription={listViewOptions.showDescription}
              showCategories={listViewOptions.showCategories}
              showPlaytime={listViewOptions.showPlaytime}
              showReleaseDate={listViewOptions.showReleaseDate}
              showGenres={listViewOptions.showGenres}
              showPlatform={listViewOptions.showPlatform}
              showLauncher={listViewOptions.showLauncher ?? true}
              titleTextSize={titleTextSize}
              sectionTextSize={sectionTextSize}
              tileHeight={tileHeight}
              boxartSize={boxartSize}
              logoSize={logoSizeForList}
              onGameClick={onGameClick}
              onContextMenu={handleGameElementContextMenu}
              onFocus={setFocusedIndex}
            />
          ))}
        </div>
      </div>
      {contextMenu && (
        <GameContextMenu
          game={contextMenu.game}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onPlay={onPlay}
          onEdit={onEdit}
          onEditImages={onEditImages}
          onEditCategories={onEditCategories}
          onFavorite={onFavorite}
          onPin={onPin}
          onFixMatch={onFixMatch}
          onHide={onHide}
          onUnhide={onUnhide}
          isHiddenView={isHiddenView}
        />
      )}
    </div>
  );
};
