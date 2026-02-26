import React, { memo } from 'react';
import { Game } from '../types/game';
import { formatLauncher, formatPlaytime, formatDate } from '../utils/formatters';

interface LibraryListItemProps {
  game: Game;
  index: number;
  isActive: boolean;
  displayMode: 'boxart-title' | 'logo-title' | 'logo-only' | 'title-only' | 'icon-title';
  showDescription: boolean;
  showCategories: boolean;
  showPlaytime: boolean;
  showReleaseDate: boolean;
  showGenres: boolean;
  showPlatform: boolean;
  showLauncher: boolean;
  titleTextSize: number;
  sectionTextSize: number;
  tileHeight: number;
  boxartSize: number;
  logoSize: number;
  onGameClick?: (game: Game) => void;
  onContextMenu: (e: React.MouseEvent, game: Game) => void;
  onFocus: (index: number) => void;
}

const LibraryListItem = memo(({
  game,
  index,
  isActive,
  displayMode,
  showDescription,
  showCategories,
  showPlaytime,
  showReleaseDate,
  showGenres,
  showPlatform,
  showLauncher,
  titleTextSize,
  sectionTextSize,
  tileHeight,
  boxartSize,
  logoSize,
  onGameClick,
  onContextMenu,
  onFocus,
}: LibraryListItemProps) => {
  const launcherLabel = formatLauncher(game.source || game.platform);
  const showBoxart = displayMode === 'boxart-title';
  const showLogo = displayMode === 'logo-title' || displayMode === 'logo-only';
  const showTitle = displayMode !== 'logo-only';

  // Estimate height for contain-intrinsic-size
  let estimatedHeight = 0;
  if (displayMode === 'logo-only') {
     estimatedHeight = Math.round(tileHeight * 0.6) + 60;
  } else if (displayMode === 'icon-title') {
     estimatedHeight = tileHeight + 20;
  } else if (displayMode === 'title-only') {
     estimatedHeight = 100;
  } else {
     estimatedHeight = Math.round(boxartSize * (4/3)) + 24; // + padding
  }

  // Ensure strict minimum
  if (estimatedHeight < 64) estimatedHeight = 64;

  return (
    <div
      onClick={() => onGameClick?.(game)}
      data-game-card="true"
      onContextMenu={(e) => onContextMenu(e, game)}
      tabIndex={0}
      onFocus={() => onFocus(index)}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${estimatedHeight}px`
      }}
      className={`p-3 bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-xl transition-all duration-300 hover:bg-gray-700/60 hover:border-cyan-400/30 cursor-pointer group outline-none ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''
        } ${displayMode === 'logo-only' || displayMode === 'title-only' ? 'flex flex-col items-center' : 'flex items-center gap-4'
        }`}
    >
      {displayMode === 'title-only' ? (
        <>
          {/* Title Only Mode - Title with sections below, no image */}
          <div className="w-full text-center mb-2">
            <h3
              className="font-semibold text-white leading-tight"
              style={{ fontSize: `${titleTextSize}px` }}
            >
              {game.title}
            </h3>
          </div>

          {/* Game Sections Below Title */}
          <div className="w-full">
            <div className="flex flex-wrap gap-4 justify-center" style={{ fontSize: `${sectionTextSize}px` }}>
              {showPlaytime && game.playtime !== undefined && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatPlaytime(game.playtime)}
                </span>
              )}
              {showReleaseDate && game.releaseDate && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(game.releaseDate)}
                </span>
              )}
              {showGenres && game.genres && game.genres.length > 0 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.genres.slice(0, 2).join(', ')}
                </span>
              )}
              {showCategories && game.categories && game.categories.length > 0 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.categories.slice(0, 2).join(', ')}
                </span>
              )}
              {showPlatform && game.platform && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {game.platform === 'steam' ? 'PC (Windows)' : game.platform}
                </span>
              )}
              {showLauncher && launcherLabel && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-6 5v5m-4 0h8a2 2 0 002-2V7H5v8a2 2 0 002 2z" />
                  </svg>
                  {launcherLabel}
                </span>
              )}
            </div>
            {showDescription && game.description && (
              <p className="text-center text-gray-500 mt-2 line-clamp-2" style={{ fontSize: `${sectionTextSize}px` }}>
                {game.description}
              </p>
            )}
          </div>
        </>
      ) : displayMode === 'logo-only' ? (
        <>
          {/* Logo Only Mode - Centered logo with sections below */}
          <div
            className="flex items-center justify-center overflow-hidden rounded-lg mb-3"
            style={{
              width: `${tileHeight}px`,
              height: `${Math.round(tileHeight * 0.6)}px`
            }}
          >
            {game.logoUrl ? (
              <img
                src={game.logoUrl}
                alt={game.title}
                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
                onContextMenu={(e) => onContextMenu(e, game)}
              />
            ) : (
              <div className="w-full h-full bg-gray-700/50 flex items-center justify-center">
                <span className="text-gray-300 text-xs">No Logo</span>
              </div>
            )}
          </div>

          {/* Game Sections Below Logo */}
          <div className="w-full">
            <div className="flex flex-wrap gap-4 justify-center" style={{ fontSize: `${sectionTextSize}px` }}>
              {showPlaytime && game.playtime !== undefined && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatPlaytime(game.playtime)}
                </span>
              )}
              {showReleaseDate && game.releaseDate && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(game.releaseDate)}
                </span>
              )}
              {showGenres && game.genres && game.genres.length > 0 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.genres.slice(0, 2).join(', ')}
                </span>
              )}
              {showCategories && game.categories && game.categories.length > 0 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.categories.slice(0, 2).join(', ')}
                </span>
              )}
              {showPlatform && game.platform && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {game.platform === 'steam' ? 'PC (Windows)' : game.platform}
                </span>
              )}
              {showLauncher && launcherLabel && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-6 5v5m-4 0h8a2 2 0 002-2V7H5v8a2 2 0 002 2z" />
                  </svg>
                  {launcherLabel}
                </span>
              )}
            </div>
            {showDescription && game.description && (
              <p className="text-center text-gray-500 mt-2 line-clamp-2" style={{ fontSize: `${sectionTextSize}px` }}>
                {game.description}
              </p>
            )}
          </div>
        </>
      ) : displayMode === 'icon-title' ? (
        <>
          {/* Icon + Title Mode */}
          <div
            className="flex-shrink-0 overflow-hidden rounded-lg flex items-center justify-center p-2 transition-transform duration-300 group-hover:scale-105"
            style={{
              width: `${tileHeight}px`,
              height: `${tileHeight}px`,
              backgroundColor: 'transparent',
            }}
          >
            {game.iconUrl ? (
              <img
                src={game.iconUrl}
                alt={game.title}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Show letter if image fails (no background)
                  if (target.parentElement) {
                    const letter = document.createElement('span');
                    letter.className = 'text-white font-bold text-4xl select-none';
                    letter.innerText = game.title.charAt(0).toUpperCase();
                    target.parentElement.appendChild(letter);
                  }
                }}
                onContextMenu={(e) => onContextMenu(e, game)}
              />
            ) : (
              <span className="text-white font-bold text-4xl select-none">
                {game.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Game Info - Simpler vertical alignment for Icon View */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-1">
              <h3
                className="font-semibold text-white truncate leading-tight"
                style={{ fontSize: `${titleTextSize}px` }}
              >
                {game.title}
              </h3>
            </div>
            {/* Consistent Section Display */}
            <div className="flex flex-wrap gap-4 text-gray-400" style={{ fontSize: `${sectionTextSize}px` }}>
              {showPlaytime && game.playtime !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatPlaytime(game.playtime)}
                </span>
              )}
              {showReleaseDate && game.releaseDate && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(game.releaseDate)}
                </span>
              )}
              {showGenres && game.genres && game.genres.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.genres.slice(0, 2).join(', ')}
                </span>
              )}
              {showCategories && game.categories && game.categories.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.categories.slice(0, 2).join(', ')}
                </span>
              )}
              {showPlatform && game.platform && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {game.platform === 'steam' ? 'PC (Windows)' : game.platform}
                </span>
              )}
              {showLauncher && launcherLabel && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-6 5v5m-4 0h8a2 2 0 002-2V7H5v8a2 2 0 002 2z" />
                  </svg>
                  {launcherLabel}
                </span>
              )}
            </div>
            {showDescription && game.description && (
              <p className="text-gray-500 mt-2 line-clamp-2" style={{ fontSize: `${sectionTextSize}px` }}>
                {game.description}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Game Image */}
          <div
            className="flex-shrink-0 overflow-hidden rounded-lg"
            style={{
              width: `${boxartSize}px`,
              height: `${Math.round(boxartSize * (4 / 3))}px`
            }}
          >
            {showBoxart && game.boxArtUrl ? (
              <img
                src={game.boxArtUrl}
                alt={game.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
                onContextMenu={(e) => onContextMenu(e, game)}
              />
            ) : showLogo && game.logoUrl ? (
              <img
                src={game.logoUrl}
                alt={game.title}
                className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                style={{ width: `${logoSize}px`, height: `${Math.round(logoSize * (4 / 3))}px` }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
                onContextMenu={(e) => onContextMenu(e, game)}
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
              {showTitle && (
                <h3
                  className="font-semibold text-white truncate leading-tight"
                  style={{ fontSize: `${titleTextSize}px` }}
                >
                  {game.title}
                </h3>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-gray-400" style={{ fontSize: `${sectionTextSize}px` }}>
              {showPlaytime && game.playtime !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatPlaytime(game.playtime)}
                </span>
              )}
              {showReleaseDate && game.releaseDate && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(game.releaseDate)}
                </span>
              )}
              {showGenres && game.genres && game.genres.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.genres.slice(0, 2).join(', ')}
                </span>
              )}
              {showCategories && game.categories && game.categories.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {game.categories.slice(0, 2).join(', ')}
                </span>
              )}
              {showPlatform && game.platform && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {game.platform === 'steam' ? 'PC (Windows)' : game.platform}
                </span>
              )}
              {showLauncher && launcherLabel && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-6 5v5m-4 0h8a2 2 0 002-2V7H5v8a2 2 0 002 2z" />
                  </svg>
                  {launcherLabel}
                </span>
              )}
            </div>
            {showDescription && game.description && (
              <p className="text-gray-500 mt-2 line-clamp-2" style={{ fontSize: `${sectionTextSize}px` }}>
                {game.description}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
});

LibraryListItem.displayName = 'LibraryListItem';

export default LibraryListItem;
