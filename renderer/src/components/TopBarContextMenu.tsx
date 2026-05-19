import React, { useEffect, useRef } from 'react';

export type TopBarElementPosition = 'left' | 'middle' | 'right' | 'hidden';

export interface TopBarPositions {
  searchBar: TopBarElementPosition;
  sortBy: TopBarElementPosition;
  launcher: TopBarElementPosition;
  categories: TopBarElementPosition;
  pinnedCategories: TopBarElementPosition;
  removeButtonBackgrounds?: boolean;
}

interface TopBarContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  positions: TopBarPositions;
  onPositionsChange: (positions: TopBarPositions) => void;
}

export const TopBarContextMenu: React.FC<TopBarContextMenuProps> = ({
  x,
  y,
  onClose,
  positions,
  onPositionsChange,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handlePositionChange = (element: keyof TopBarPositions, position: TopBarElementPosition) => {
    onPositionsChange({
      ...positions,
      [element]: position,
    });
  };

  const handleAllPositionChange = (position: Exclude<TopBarElementPosition, 'hidden'>) => {
    onPositionsChange({
      searchBar: position,
      sortBy: position,
      launcher: position,
      categories: position,
      pinnedCategories: position,
    });
  };

  const handleHideAll = () => {
    onPositionsChange({
      searchBar: 'hidden',
      sortBy: 'hidden',
      launcher: 'hidden',
      categories: 'hidden',
      pinnedCategories: 'hidden',
    });
  };

  const handleShowAll = () => {
    onPositionsChange({
      searchBar: positions.searchBar === 'hidden' ? 'left' : positions.searchBar,
      sortBy: positions.sortBy === 'hidden' ? 'left' : positions.sortBy,
      launcher: positions.launcher === 'hidden' ? 'left' : positions.launcher,
      categories: positions.categories === 'hidden' ? 'left' : positions.categories,
      pinnedCategories: positions.pinnedCategories === 'hidden' ? 'left' : positions.pinnedCategories,
    });
  };

  const renderPositionButtons = (element: keyof TopBarPositions, label: string) => {
    return (
      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <label className="block text-xs text-gray-400 mb-2 font-semibold">{label}</label>
        <div className="grid grid-cols-4 gap-1">
          {(['left', 'middle', 'right', 'hidden'] as const).map((position) => (
            <button
              key={position}
              onClick={() => handlePositionChange(element, position)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                positions[element] === position
                  ? 'bg-blue-600/40 text-white border border-blue-500'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
              }`}
            >
              {position === 'middle' ? 'Middle' : position === 'hidden' ? 'Hide' : position.charAt(0).toUpperCase() + position.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMoveAllButtons = () => (
    <div className="px-3 py-2 bg-gray-700/30 rounded-md">
      <label className="block text-xs text-gray-400 mb-2 font-semibold">Move All</label>
      <div className="grid grid-cols-3 gap-1">
        {(['left', 'middle', 'right'] as const).map((position) => (
          <button
            key={position}
            onClick={() => handleAllPositionChange(position)}
            className="px-2 py-1 text-xs rounded transition-colors bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500"
          >
            {position === 'middle' ? 'Middle' : position.charAt(0).toUpperCase() + position.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 mt-2">
        <button
          onClick={handleHideAll}
          className="px-2 py-1 text-xs rounded transition-colors bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500"
        >
          Hide All
        </button>
        <button
          onClick={handleShowAll}
          className="px-2 py-1 text-xs rounded transition-colors bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500"
        >
          Show All
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        minWidth: '320px',
      }}
    >
      <div className="px-3 py-2 border-b border-gray-700 mb-2">
        <h3 className="text-sm font-semibold text-white">Top Bar Layout</h3>
        <p className="text-xs text-gray-400 mt-0.5">Configure element positions</p>
      </div>

      <div className="space-y-2 px-2">
        {renderMoveAllButtons()}
        {renderPositionButtons('searchBar', 'Search Bar Position')}
        {renderPositionButtons('sortBy', 'Sort By Position')}
        {renderPositionButtons('launcher', 'Launcher Position')}
        {renderPositionButtons('categories', 'Category Menu Position')}
        {renderPositionButtons('pinnedCategories', 'Pinned Categories Position')}
        
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={positions.removeButtonBackgrounds ?? false}
              onChange={(e) => onPositionsChange({ ...positions, removeButtonBackgrounds: e.target.checked })}
              className="w-3.5 h-3.5 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-xs text-gray-300 font-semibold">Remove Button Backgrounds</span>
          </label>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-gray-700 mt-2">
        <button
          onClick={onClose}
          className="w-full px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
