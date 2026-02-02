import React, { useState, useRef, useEffect } from 'react';
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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  categoryCounts?: Record<string, number>;
  pinnedCategories?: string[];
  onTogglePinCategory?: (category: string) => void;
  onReorderPinnedCategories?: (categories: string[]) => void;
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
  showCategoriesInGameList?: boolean;
}

interface SortablePinnedCategoryProps {
  id: string;
  isSelected: boolean;
  onClick: () => void;
}

const SortablePinnedCategory: React.FC<SortablePinnedCategoryProps> = ({ id, isSelected, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 60 : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        // Prevent click if we were dragging
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) {
          return;
        }
        onClick();
      }}
      className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap active:scale-95 ${isSelected
        ? 'bg-blue-600/40 text-blue-200 border border-blue-500/40 shadow-sm shadow-blue-500/20'
        : 'bg-gray-700/20 text-gray-300 hover:bg-gray-700/40 hover:text-white border border-gray-600/30'
        }`}
    >
      {id}
    </button>
  );
};

export const MenuBar: React.FC<MenuBarProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  allCategories = [],
  categoryCounts = {},
  pinnedCategories = [],
  onTogglePinCategory,
  onReorderPinnedCategories,
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
  showCategoriesInGameList = false,
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
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pinnedCategories.indexOf(active.id as string);
      const newIndex = pinnedCategories.indexOf(over.id as string);
      const newOrder = arrayMove(pinnedCategories, oldIndex, newIndex);
      onReorderPinnedCategories?.(newOrder);
    }
  };

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
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${sortBy === option
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
          className={`px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm transition-colors ${selectedLauncher
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
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedLauncher === null
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
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${isSelected
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

  const renderCategories = () => {
    const filteredCategories = allCategories.filter(cat =>
      cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );

    return (
      <div className="relative" ref={filterDropdownRef}>
        <button
          onClick={() => {
            setIsFilterDropdownOpen(!isFilterDropdownOpen);
            setIsSortDropdownOpen(false);
            setIsLauncherDropdownOpen(false);
            setCategorySearchQuery('');
          }}
          className={`px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm transition-all flex items-center gap-2 ${selectedCategory && selectedCategory !== 'favorites' && selectedCategory !== 'hidden'
            ? 'bg-blue-600/30 text-blue-300 border-blue-500/30'
            : 'text-gray-300 hover:text-white'
            }`}
          title="Categories"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 12h.01M7 17h.01M17 7h.01M17 12h.01M17 17h.01M12 7h.01M12 12h.01M12 17h.01" />
          </svg>
          <span className="max-w-[120px] truncate">
            {selectedCategory && selectedCategory !== 'favorites' && selectedCategory !== 'hidden' ? selectedCategory : 'Categories'}
          </span>
        </button>
        {isFilterDropdownOpen && (
          <div className="absolute left-0 mt-2 w-72 onyx-glass-panel rounded-xl shadow-2xl z-50 max-h-[80vh] flex flex-col overflow-hidden onyx-dropdown-animate">
            {/* Search header or Title */}
            <div className="p-3 border-b border-white/5 bg-white/5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter By</span>
                <button
                  onClick={() => {
                    onCategoryChange?.(null);
                    setIsFilterDropdownOpen(false);
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              {allCategories.length > 8 && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    autoFocus
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <svg className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
              {/* Core Filters */}
              <div className="space-y-1 mb-3">
                <button
                  onClick={() => {
                    onCategoryChange?.(null);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group/cat ${selectedCategory === null
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>All Games</span>
                  </div>
                  {categoryCounts['all'] !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === null ? 'bg-blue-500/30 text-blue-200' : 'bg-white/5 text-gray-500 group-hover/cat:bg-white/10'}`}>
                      {categoryCounts['all']}
                    </span>
                  )}
                </button>

                {hasFavoriteGames && (
                  <button
                    onClick={() => {
                      const isSelected = selectedCategory === 'favorites';
                      onCategoryChange?.(isSelected ? null : 'favorites');
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group/cat ${selectedCategory === 'favorites'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 shadow-sm shadow-yellow-500/10'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span>Favorites</span>
                    </div>
                    {categoryCounts['favorites'] !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'favorites' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-white/5 text-gray-500 group-hover/cat:bg-white/10'}`}>
                        {categoryCounts['favorites']}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Categories */}
              {filteredCategories.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Categories</div>
                  {filteredCategories.map((category) => {
                    const isPinned = pinnedCategories?.includes(category);
                    const isSelected = selectedCategory === category;
                    return (
                      <div key={category} className="group flex items-center gap-1">
                        <button
                          onClick={() => {
                            onCategoryChange?.(category);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all truncate flex items-center justify-between group/cat ${isSelected
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                            }`}
                        >
                          <span className="truncate">{category}</span>
                          {categoryCounts[category] !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-white/5 text-gray-500 group-hover/cat:text-gray-400 group-hover/cat:bg-white/10'
                              }`}>
                              {categoryCounts[category]}
                            </span>
                          )}
                        </button>
                        {onTogglePinCategory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinCategory(category);
                            }}
                            className={`p-2 rounded-lg transition-all ${isPinned
                              ? 'text-yellow-400 bg-yellow-400/10'
                              : 'text-gray-400 hover:text-yellow-400 hover:bg-white/10 opacity-40 group-hover:opacity-100'
                              }`}
                            title={isPinned ? 'Unpin category' : 'Pin category'}
                          >
                            <svg className="w-3.5 h-3.5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {categorySearchQuery && filteredCategories.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-xs italic">No categories found matching "{categorySearchQuery}"</p>
                </div>
              )}
            </div>

            {/* Footer with Visibility Toggles */}
            <div className="p-2 border-t border-white/5 bg-black/20 space-y-1">
              <div className="px-1 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Visibility</div>
              <div className="grid grid-cols-1 gap-1">
                {hasVRCategory && (
                  <button
                    onClick={() => onToggleHideVRTitles?.()}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-gray-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Hide VR Titles</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${hideVRTitles ? 'bg-blue-600' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideVRTitles ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                )}
                {hasAppsCategory && (
                  <button
                    onClick={() => onToggleHideAppsTitles?.()}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-gray-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span>Hide Apps Titles</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${hideAppsTitles ? 'bg-blue-600' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideAppsTitles ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                )}
                {hasHiddenGames && (
                  <button
                    onClick={() => {
                      const isSelected = selectedCategory === 'hidden';
                      onCategoryChange?.(isSelected ? null : 'hidden');
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 ${selectedCategory === 'hidden'
                      ? 'bg-red-900/40 text-red-300 border border-red-500/20 shadow-sm shadow-red-500/10'
                      : 'text-gray-400 hover:bg-white/5 hover:text-red-400'
                      }`}
                  >
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                        </svg>
                        <span>{selectedCategory === 'hidden' ? 'Showing Hidden Games' : 'Show Hidden Games'}</span>
                      </div>
                      {categoryCounts['hidden'] !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'hidden' ? 'bg-red-500/30 text-red-200' : 'bg-white/5 text-gray-500 hover:text-red-400'}`}>
                          {categoryCounts['hidden']}
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


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

                  {/* Discord */}
                  <button
                    onClick={async () => {
                      try {
                        if (window.electronAPI && window.electronAPI.openExternal) {
                          const result = await window.electronAPI.openExternal('https://discord.gg/m2dgd4ZUPu');
                          if (!result.success) {
                            console.error('Failed to open external URL:', result.error);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to open external URL:', error);
                      }
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="flex-1">Join Discord</span>
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
        {hasFavoriteGames && !showCategoriesInGameList && (
          <button
            onClick={() => {
              const isSelected = selectedCategory === 'favorites';
              onCategoryChange?.(isSelected ? null : 'favorites');
            }}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${selectedCategory === 'favorites'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
              : 'bg-gray-700/20 text-gray-300 hover:bg-gray-700/40 hover:text-white border border-gray-600/30'
              }`}
            title="Favorites"
          >
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363 1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Favorites</span>
          </button>
        )}

        {/* Pinned Categories */}
        {pinnedCategories && pinnedCategories.length > 0 && !showCategoriesInGameList && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pinnedCategories}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                {pinnedCategories.map((pinnedCategory) => (
                  <SortablePinnedCategory
                    key={pinnedCategory}
                    id={pinnedCategory}
                    isSelected={selectedCategory === pinnedCategory}
                    onClick={() => {
                      onCategoryChange?.(selectedCategory === pinnedCategory ? null : pinnedCategory);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
