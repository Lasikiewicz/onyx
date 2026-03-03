import React, { useState } from 'react';

interface TopBarProps {
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onFolder?: () => void;
  onGridToggle?: () => void;
  onSettings?: () => void;
  viewMode?: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  notificationCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSearch,
  onRefresh,
  onFolder,
  onGridToggle,
  onSettings,
  viewMode = 'grid',
  notificationCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <div className="onyx-glass-panel rounded-2xl mx-4 mt-4 h-12 flex items-center justify-between px-4 flex-shrink-0 z-20">
      {/* Left side - Search */}
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Q Search"
            aria-label="Search library"
            className="w-full px-4 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Right side - Icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          type="button"
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Refresh"
          aria-label="Refresh library"
        >
          <svg className="w-5 h-5 text-gray-300 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={onFolder}
          type="button"
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Open Folder"
          aria-label="Open games folder"
        >
          <svg className="w-5 h-5 text-gray-300 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>

        <button
          onClick={onGridToggle}
          type="button"
          className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          title="Grid View"
          aria-pressed={viewMode === 'grid'}
          aria-label="Grid view"
        >
          <svg className="w-5 h-5 text-gray-300 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>

        <button
          onClick={onGridToggle}
          type="button"
          className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          title="List View"
          aria-pressed={viewMode === 'list'}
          aria-label="List view"
        >
          <svg className="w-5 h-5 text-gray-300 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          onClick={onSettings}
          type="button"
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <svg className="w-5 h-5 text-gray-300 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {notificationCount > 0 && (
          <button
            type="button"
            className="p-2 hover:bg-gray-700 rounded transition-colors relative"
            title="Notifications"
            aria-label={`Notifications (${notificationCount})`}
          >
            <svg className="w-5 h-5 text-gray-300 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notificationCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
