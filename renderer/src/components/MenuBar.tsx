import React, { useState, useRef, useEffect } from 'react';

interface MenuBarProps {
  onAddGame?: () => void;
  onScanFolder?: () => void;
  onUpdateSteamLibrary?: () => void;
  onConfigureSteam?: () => void;
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
  hideVRTitles?: boolean;
  onToggleHideVRTitles?: () => void;
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
  hideVRTitles = true,
  onToggleHideVRTitles,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      className="h-10 fixed top-0 left-0 right-0 z-50 flex items-center px-4 bg-gradient-to-b from-black/60 to-transparent"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left section - Search, Sort by, Categories, Favorites, Pinned Categories */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Search */}
        <div className="relative w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Q Search"
            className="w-full px-3 py-1 bg-gray-700/20 border border-gray-600/30 rounded text-sm text-gray-300 placeholder-gray-500 hover:bg-gray-700/30 hover:border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:bg-gray-700/40 focus:text-white transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => {
              setIsSortDropdownOpen(!isSortDropdownOpen);
              setIsFilterDropdownOpen(false);
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

        {/* Categories Dropdown */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            onClick={() => {
              setIsFilterDropdownOpen(!isFilterDropdownOpen);
              setIsSortDropdownOpen(false);
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
                {allCategories.length > 0 && (
                  <>
                    <div className="border-t border-gray-700 my-1" />
                    {allCategories.map((category) => {
                  const isPinned = pinnedCategories?.includes(category);
                  const isVR = category === 'VR';
                  return (
                    <React.Fragment key={category}>
                      <div
                        className="flex items-center gap-2 group"
                      >
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
                        <label
                          className="w-full px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 text-gray-300 hover:bg-gray-700 cursor-pointer ml-0"
                        >
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
                    </React.Fragment>
                  );
                })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
};
