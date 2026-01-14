import React, { useState, useRef, useEffect } from 'react';
import iconPng from '../../../resources/icon.png';
import iconSvg from '../../../resources/icon.svg';
import { TopBarContextMenu, TopBarPositions } from './TopBarContextMenu';

interface MenuBarProps {
  onScanFolder?: () => void;
  onUpdateSteamLibrary?: () => void;
  onUpdateLibrary?: () => void;
  onGameManager?: () => void;
  onConfigureSteam?: () => void;
  onOnyxSettings?: () => void;
  onAPISettings?: () => void;
  onAbout?: () => void;
  onExit?: () => void;
  onBugReport?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  allCategories?: string[];
  pinnedCategories?: string[];
  onTogglePinCategory?: (category: string) => void;
  sortBy?: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed';
  onSortChange?: (sort: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed') => void;
  hasFavoriteGames?: boolean;
  hasVRCategory?: boolean;
  hasAppsCategory?: boolean;
  hasHiddenGames?: boolean;
  hideVRTitles?: boolean;
  hideAppsTitles?: boolean;
  onToggleHideVRTitles?: () => void;
  onToggleHideAppsTitles?: () => void;
  launchers?: string[];
  selectedLauncher?: string | null;
  onLauncherChange?: (launcher: string | null) => void;
  topBarPositions?: TopBarPositions;
  onTopBarPositionsChange?: (positions: TopBarPositions) => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  allCategories = [],
  pinnedCategories = [],
  onTogglePinCategory,
  sortBy = 'title',
  onSortChange,
  hasFavoriteGames = false,
  hasVRCategory = false,
  hasAppsCategory = false,
  hasHiddenGames = false,
  hideVRTitles = true,
  hideAppsTitles = true,
  onToggleHideVRTitles,
  onToggleHideAppsTitles,
  launchers = [],
  selectedLauncher,
  onLauncherChange,
  topBarPositions = { searchBar: 'left', sortBy: 'left', launcher: 'left', categories: 'left' },
  onTopBarPositionsChange,
  // onScanFolder, // Unused
  onUpdateLibrary,
  onGameManager,
  onOnyxSettings,
  // onAPISettings, // Unused
  onAbout,
  onExit,
  onBugReport,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isLauncherDropdownOpen, setIsLauncherDropdownOpen] = useState(false);
  const [isOnyxSettingsMenuOpen, setIsOnyxSettingsMenuOpen] = useState(false);
  const [topBarContextMenu, setTopBarContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // Check if this is an alpha build using build-time constant
  // __BUILD_PROFILE__ is set by Vite during the build process
  const isAlphaBuild = __BUILD_PROFILE__ === 'alpha' || import.meta.env.DEV;
  
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const launcherDropdownRef = useRef<HTMLDivElement>(null);
  const onyxSettingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (launcherDropdownRef.current && !launcherDropdownRef.current.contains(event.target as Node)) {
        setIsLauncherDropdownOpen(false);
      }
      if (onyxSettingsMenuRef.current && !onyxSettingsMenuRef.current.contains(event.target as Node)) {
        setIsOnyxSettingsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Create element renderers for configurable items
  const renderSearchBar = () => (
    <div className="relative w-64">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder="Q Search"
        className="w-full px-3 py-1 bg-gray-700/20 border border-gray-600/30 rounded text-sm text-gray-300 placeholder-gray-500 hover:bg-gray-700/30 hover:border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:bg-gray-700/40 focus:text-white transition-colors"
      />
    </div>
  );

  const renderSortBy = () => (
    <div className="relative" ref={sortDropdownRef}>
      <button
        onClick={() => {
          setIsSortDropdownOpen(!isSortDropdownOpen);
          setIsFilterDropdownOpen(false);
          setIsLauncherDropdownOpen(false);
        }}
        className="px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm text-gray-300 hover:text-white transition-colors"
        title="Sort by"
      >
        Sort by
      </button>
      {isSortDropdownOpen && (
        <div className="absolute left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            {(['title', 'releaseDate', 'playtime', 'lastPlayed'] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  onSortChange?.(option);
                  setIsSortDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  sortBy === option
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {option === 'title' && 'Title'}
                {option === 'releaseDate' && 'Release Date'}
                {option === 'playtime' && 'Playtime'}
                {option === 'lastPlayed' && 'Last Played'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLauncher = () => {
    if (launchers.length === 0) return null;
    return (
      <div className="relative" ref={launcherDropdownRef}>
        <button
          onClick={() => {
            setIsLauncherDropdownOpen(!isLauncherDropdownOpen);
            setIsFilterDropdownOpen(false);
            setIsSortDropdownOpen(false);
          }}
          className={`px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm transition-colors ${
            selectedLauncher
              ? 'bg-blue-600/30 text-blue-300 border-blue-500/30'
              : 'text-gray-300 hover:text-white'
          }`}
          title="Launcher"
        >
          {selectedLauncher 
            ? (selectedLauncher === 'steam' ? 'Steam' :
               selectedLauncher === 'epic' ? 'Epic Games' :
               selectedLauncher === 'gog' ? 'GOG Galaxy' :
               selectedLauncher === 'xbox' ? 'Xbox Game Pass' :
               selectedLauncher === 'ea' ? 'EA App' :
               selectedLauncher === 'ubisoft' ? 'Ubisoft Connect' :
               selectedLauncher === 'battle' ? 'Battle.net' :
               selectedLauncher === 'humble' ? 'Humble' :
               selectedLauncher === 'itch' ? 'itch.io' :
               selectedLauncher === 'rockstar' ? 'Rockstar Games' :
               selectedLauncher === 'other' ? 'Other' : selectedLauncher)
            : 'Launcher'}
        </button>
        {isLauncherDropdownOpen && (
          <div className="absolute left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-2">
              <button
                onClick={() => {
                  onLauncherChange?.(null);
                  setIsLauncherDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedLauncher === null
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                All Launchers
              </button>
              {launchers.map((launcher) => {
                const displayName = launcher === 'steam' ? 'Steam' :
                                  launcher === 'epic' ? 'Epic Games' :
                                  launcher === 'gog' ? 'GOG Galaxy' :
                                  launcher === 'xbox' ? 'Xbox Game Pass' :
                                  launcher === 'ea' ? 'EA App' :
                                  launcher === 'ubisoft' ? 'Ubisoft Connect' :
                                  launcher === 'battle' ? 'Battle.net' :
                                  launcher === 'humble' ? 'Humble' :
                                  launcher === 'itch' ? 'itch.io' :
                                  launcher === 'rockstar' ? 'Rockstar Games' :
                                  launcher === 'other' ? 'Other' : launcher;
                const isSelected = selectedLauncher === launcher;
                return (
                  <button
                    key={launcher}
                    onClick={() => {
                      onLauncherChange?.(isSelected ? null : launcher);
                      setIsLauncherDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategories = () => (
    <div className="relative" ref={filterDropdownRef}>
      <button
        onClick={() => {
          setIsFilterDropdownOpen(!isFilterDropdownOpen);
          setIsSortDropdownOpen(false);
          setIsLauncherDropdownOpen(false);
        }}
        className={`px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm transition-colors ${
          selectedCategory && selectedCategory !== 'favorites'
            ? 'bg-blue-600/30 text-blue-300 border-blue-500/30'
            : 'text-gray-300 hover:text-white'
        }`}
        title="Categories"
      >
        Categories
      </button>
      {isFilterDropdownOpen && (
        <div className="absolute left-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => {
                onCategoryChange?.(null);
                setIsFilterDropdownOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Categories
            </button>
            {hasFavoriteGames && (
              <>
                <div className="border-t border-gray-700 my-1" />
                <button
                  onClick={() => {
                    const isSelected = selectedCategory === 'favorites';
                    onCategoryChange?.(isSelected ? null : 'favorites');
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                    selectedCategory === 'favorites'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Favorites
                </button>
              </>
            )}
            {hasHiddenGames && (
              <>
                <div className="border-t border-gray-700 my-1" />
                <button
                  onClick={() => {
                    const isSelected = selectedCategory === 'hidden';
                    onCategoryChange?.(isSelected ? null : 'hidden');
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                    selectedCategory === 'hidden'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                  </svg>
                  Hidden
                </button>
              </>
            )}
            {allCategories.length > 0 && (
              <>
                <div className="border-t border-gray-700 my-1" />
                {allCategories.map((category) => {
                  const isPinned = pinnedCategories?.includes(category);
                  const isVR = category === 'VR';
                  const isApps = category === 'Apps';
                  return (
                    <React.Fragment key={category}>
                      <div className="flex items-center gap-2 group">
                        <button
                          onClick={() => {
                            onCategoryChange?.(category);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded text-sm transition-colors ${
                            selectedCategory === category
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {category}
                        </button>
                        {onTogglePinCategory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinCategory(category);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              isPinned
                                ? 'text-yellow-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-yellow-400 hover:bg-gray-700'
                            }`}
                            title={isPinned ? 'Unpin category' : 'Pin category'}
                          >
                            <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {isVR && hasVRCategory && (
                        <label className="w-full px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 text-gray-300 hover:bg-gray-700 cursor-pointer ml-0">
                          <input
                            type="checkbox"
                            checked={hideVRTitles}
                            onChange={() => {
                              onToggleHideVRTitles?.();
                            }}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                          <span>Hide VR Titles</span>
                        </label>
                      )}
                      {isApps && hasAppsCategory && (
                        <label className="w-full px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 text-gray-300 hover:bg-gray-700 cursor-pointer ml-0">
                          <input
                            type="checkbox"
                            checked={hideAppsTitles}
                            onChange={() => {
                              onToggleHideAppsTitles?.();
                            }}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                          <span>Hide Apps Titles</span>
                        </label>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Group elements by position
  const elementsByPosition = { left: [] as React.ReactNode[], middle: [] as React.ReactNode[], right: [] as React.ReactNode[] };
  
  // Add elements to their configured positions
  if (topBarPositions.searchBar === 'left') elementsByPosition.left.push(<React.Fragment key="search">{renderSearchBar()}</React.Fragment>);
  else if (topBarPositions.searchBar === 'middle') elementsByPosition.middle.push(<React.Fragment key="search">{renderSearchBar()}</React.Fragment>);
  else elementsByPosition.right.push(<React.Fragment key="search">{renderSearchBar()}</React.Fragment>);

  if (topBarPositions.sortBy === 'left') elementsByPosition.left.push(<React.Fragment key="sort">{renderSortBy()}</React.Fragment>);
  else if (topBarPositions.sortBy === 'middle') elementsByPosition.middle.push(<React.Fragment key="sort">{renderSortBy()}</React.Fragment>);
  else elementsByPosition.right.push(<React.Fragment key="sort">{renderSortBy()}</React.Fragment>);

  if (topBarPositions.launcher === 'left') elementsByPosition.left.push(<React.Fragment key="launcher">{renderLauncher()}</React.Fragment>);
  else if (topBarPositions.launcher === 'middle') elementsByPosition.middle.push(<React.Fragment key="launcher">{renderLauncher()}</React.Fragment>);
  else elementsByPosition.right.push(<React.Fragment key="launcher">{renderLauncher()}</React.Fragment>);

  if (topBarPositions.categories === 'left') elementsByPosition.left.push(<React.Fragment key="categories">{renderCategories()}</React.Fragment>);
  else if (topBarPositions.categories === 'middle') elementsByPosition.middle.push(<React.Fragment key="categories">{renderCategories()}</React.Fragment>);
  else elementsByPosition.right.push(<React.Fragment key="categories">{renderCategories()}</React.Fragment>);

  return (
    <div
      className="h-10 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-gradient-to-b from-black/60 to-transparent"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onContextMenu={(e) => {
        e.preventDefault();
        setTopBarContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {/* Left section - System buttons + configurable elements */}
      <div 
        className="flex items-center gap-2" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTopBarContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* Console toggle (development mode only) */}
        {import.meta.env.DEV && (
          <button
            onClick={async () => {
              try {
                await window.electronAPI.toggleDevTools();
              } catch (error) {
                console.error('Error toggling DevTools:', error);
              }
            }}
            className="p-1.5 hover:bg-gray-700/40 rounded transition-colors flex items-center justify-center"
            title="Toggle Console"
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        )}
        {/* Bug Report Button (development and alpha builds) */}
        {(import.meta.env.DEV || isAlphaBuild) && onBugReport && (
          <button
            onClick={() => {
              onBugReport();
            }}
            className="p-1.5 hover:bg-gray-700/40 rounded transition-colors flex items-center justify-center"
            title="Report a Bug"
          >
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>
        )}
        {/* Onyx Settings Button with Dropdown */}
        {onOnyxSettings && (
          <div className="relative" ref={onyxSettingsMenuRef}>
            <button
              onClick={() => {
                setIsOnyxSettingsMenuOpen(!isOnyxSettingsMenuOpen);
                setIsFilterDropdownOpen(false);
                setIsSortDropdownOpen(false);
              }}
              className="p-1.5 hover:bg-gray-700/40 rounded transition-colors flex items-center justify-center"
              title="Onyx Settings"
            >
              <img 
                src={iconPng} 
                alt="Onyx Settings" 
                className="w-6 h-6"
                onError={(e) => {
                  // Fallback to SVG if PNG fails
                  const target = e.target as HTMLImageElement;
                  target.src = iconSvg;
                }}
              />
            </button>
            
            {/* Dropdown Menu */}
            {isOnyxSettingsMenuOpen && (
              <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[240px]">
                <div className="p-1">
                  {onUpdateLibrary && (
                    <button
                      onClick={() => {
                        onUpdateLibrary();
                        setIsOnyxSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="flex-1">Game Importer</span>
                    </button>
                  )}

                  {onGameManager && (
                    <button
                      onClick={() => {
                        onGameManager();
                        setIsOnyxSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="flex-1">Game Manager</span>
                    </button>
                  )}

                  {onOnyxSettings && (
                    <button
                      onClick={() => {
                        onOnyxSettings();
                        setIsOnyxSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                    >
                      <img 
                        src={iconPng} 
                        alt="Onyx" 
                        className="w-5 h-5 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = iconSvg;
                        }}
                      />
                      <span className="flex-1">Onyx Settings</span>
                    </button>
                  )}

                  <hr className="border-white/10 my-2" />

                  <button
                    onClick={async () => {
                      try {
                        if (window.electronAPI && window.electronAPI.openExternal) {
                          const result = await window.electronAPI.openExternal('https://ko-fi.com/oynxgilga');
                          if (!result.success) {
                            console.error('Failed to open external URL:', result.error);
                          }
                        } else {
                          console.error('window.electronAPI.openExternal is not available');
                        }
                      } catch (error) {
                        console.error('Failed to open external URL:', error);
                      }
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="flex-1">Support Onyx</span>
                  </button>

                  {onAbout && (
                    <button
                      onClick={() => {
                        onAbout();
                        setIsOnyxSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="flex-1">About</span>
                    </button>
                  )}

                  {onExit && (
                    <button
                      onClick={() => {
                        onExit();
                        setIsOnyxSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="flex-1">Exit</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Configurable elements on the left */}
        {elementsByPosition.left}

        {/* Favorites Button */}
        {hasFavoriteGames && (
          <button
            onClick={() => {
              const isSelected = selectedCategory === 'favorites';
              onCategoryChange?.(isSelected ? null : 'favorites');
            }}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              selectedCategory === 'favorites'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                : 'bg-gray-700/20 text-gray-300 hover:bg-gray-700/40 hover:text-white border border-gray-600/30'
            }`}
            title="Favorites"
          >
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Favorites</span>
          </button>
        )}

        {/* Pinned Categories */}
        {pinnedCategories && pinnedCategories.length > 0 && (
          <div className="flex items-center gap-1.5">
            {pinnedCategories.map((pinnedCategory) => {
              const isSelected = selectedCategory === pinnedCategory;
              return (
                <button
                  key={pinnedCategory}
                  onClick={() => {
                    onCategoryChange?.(isSelected ? null : pinnedCategory);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                      : 'bg-gray-700/20 text-gray-300 hover:bg-gray-700/40 hover:text-white border border-gray-600/30'
                  }`}
                >
                  {pinnedCategory}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle section */}
      {elementsByPosition.middle.length > 0 && (
        <div 
          className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2" 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setTopBarContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {elementsByPosition.middle}
        </div>
      )}

      {/* Right section - with spacing to avoid window controls */}
      {elementsByPosition.right.length > 0 && (
        <div 
          className="flex items-center gap-2 mr-32" 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setTopBarContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {elementsByPosition.right}
        </div>
      )}

      {/* Top Bar Context Menu */}
      {topBarContextMenu && (
        <TopBarContextMenu
          x={topBarContextMenu.x}
          y={topBarContextMenu.y}
          onClose={() => setTopBarContextMenu(null)}
          positions={topBarPositions}
          onPositionsChange={(positions) => {
            onTopBarPositionsChange?.(positions);
            setTopBarContextMenu(null);
          }}
        />
      )}

    </div>
  );
};
