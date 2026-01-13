import React, { useState } from 'react';
import { Game } from '../types/game';
import { GameContextMenu } from './GameContextMenu';

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
  const formatPlaytime = (minutes?: number) => {
    if (!minutes) return 'Not Played';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  const formatLauncher = (launcher?: string) => {
    if (!launcher) return '';
    const normalized = launcher.toLowerCase();
    const lookup: Record<string, string> = {
      steam: 'Steam',
      epic: 'Epic Games',
      gog: 'GOG',
      xbox: 'Xbox',
      ubisoft: 'Ubisoft Connect',
      uplay: 'Ubisoft Connect',
      rockstar: 'Rockstar',
      battlenet: 'Battle.net',
      blizzard: 'Battle.net',
      ea: 'EA App',
      origin: 'Origin',
      amazon: 'Amazon Games',
      itch: 'itch.io',
    };
    if (lookup[normalized]) return lookup[normalized];
    return launcher.charAt(0).toUpperCase() + launcher.slice(1);
  };

  const showLogoInsteadOfTitle = listViewOptions.showLogos ?? false;
  const titleTextSize = listViewOptions.titleTextSize ?? 18;

  const [contextMenu, setContextMenu] = useState<{ game: Game; x: number; y: number } | null>(null);

  // Handle right-click on game boxart/logo (opens game context menu)
  const handleGameElementContextMenu = (e: React.MouseEvent, game: Game) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ game, x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="w-full h-full flex flex-col"
      onContextMenu={(e) => {
        // Right click on empty space opens library context menu
        e.preventDefault();
        onEmptySpaceClick?.(e.clientX, e.clientY);
      }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-2">
          {games.map((game) => {
            const launcherLabel = formatLauncher(game.source || game.platform);
            return (
              <div
                key={game.id}
                onClick={() => onGameClick?.(game)}
                onContextMenu={(e) => {
                  // Right click anywhere except boxart opens library context menu
                  e.preventDefault();
                  onEmptySpaceClick?.(e.clientX, e.clientY);
                }}
                className="flex items-center gap-4 p-3 bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-xl transition-all duration-300 hover:bg-gray-700/60 hover:border-cyan-400/30 cursor-pointer group"
              >
              {/* Game Image */}
              <div 
                className="flex-shrink-0 overflow-hidden rounded-lg"
                style={{ 
                  width: `${Math.round(listViewSize * 0.75)}px`, 
                  height: `${listViewSize}px` 
                }}
              >
                {game.boxArtUrl ? (
                  <img
                    src={game.boxArtUrl}
                    alt={game.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    onContextMenu={(e) => handleGameElementContextMenu(e, game)}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700/50 flex items-center justify-center">
                    <span className="text-gray-300 text-xs">No Image</span>
                  </div>
                )}
              </div>

              {/* Game Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 min-h-[28px]">
                  {showLogoInsteadOfTitle && game.logoUrl ? (
                    <img
                      src={game.logoUrl}
                      alt={game.title}
                      className="max-h-10 object-contain"
                      style={{ maxWidth: `${Math.round(listViewSize)}px` }}
                      onContextMenu={(e) => handleGameElementContextMenu(e, game)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <h3
                      className="font-semibold text-white truncate leading-tight"
                      style={{ fontSize: `${titleTextSize}px` }}
                    >
                      {game.title}
                    </h3>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  {listViewOptions.showPlaytime && game.playtime !== undefined && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatPlaytime(game.playtime)}
                    </span>
                  )}
                  {listViewOptions.showReleaseDate && game.releaseDate && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(game.releaseDate)}
                    </span>
                  )}
                  {listViewOptions.showGenres && game.genres && game.genres.length > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {game.genres.slice(0, 2).join(', ')}
                    </span>
                  )}
                  {listViewOptions.showCategories && game.categories && game.categories.length > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {game.categories.slice(0, 2).join(', ')}
                    </span>
                  )}
                  {listViewOptions.showPlatform && game.platform && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {game.platform === 'steam' ? 'PC (Windows)' : game.platform}
                    </span>
                  )}
                  {listViewOptions.showLauncher && launcherLabel && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-6 5v5m-4 0h8a2 2 0 002-2V7H5v8a2 2 0 002 2z" />
                      </svg>
                      {launcherLabel}
                    </span>
                  )}
                </div>
                {listViewOptions.showDescription && game.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {game.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {onPlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(game);
                    }}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                    title="Play"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(game);
                    }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {onFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavorite(game);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      game.favorite
                        ? 'bg-yellow-600 hover:bg-yellow-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={game.favorite ? 'Unfavorite' : 'Favorite'}
                  >
                    <svg className="w-5 h-5 text-white" fill={game.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            );
          })}
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
