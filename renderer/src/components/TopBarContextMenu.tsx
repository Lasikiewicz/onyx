import React, { useEffect, useRef } from 'react';

export type TopBarElementPosition = 'left' | 'middle' | 'right';

export interface TopBarPositions {
  searchBar: TopBarElementPosition;
  sortBy: TopBarElementPosition;
  launcher: TopBarElementPosition;
  categories: TopBarElementPosition;
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

  const renderPositionButtons = (element: keyof TopBarPositions, label: string) => {
    return (
      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <label className="block text-xs text-gray-400 mb-2 font-semibold">{label}</label>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => handlePositionChange(element, 'left')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              positions[element] === 'left'
                ? 'bg-blue-600/40 text-white border border-blue-500'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
            }`}
          >
            Left
          </button>
          <button
            onClick={() => handlePositionChange(element, 'middle')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              positions[element] === 'middle'
                ? 'bg-blue-600/40 text-white border border-blue-500'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
            }`}
          >
            Middle
          </button>
          <button
            onClick={() => handlePositionChange(element, 'right')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              positions[element] === 'right'
                ? 'bg-blue-600/40 text-white border border-blue-500'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
            }`}
          >
            Right
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        minWidth: '280px',
      }}
    >
      <div className="px-3 py-2 border-b border-gray-700 mb-2">
        <h3 className="text-sm font-semibold text-white">Top Bar Layout</h3>
        <p className="text-xs text-gray-400 mt-0.5">Configure element positions</p>
      </div>

      <div className="space-y-2 px-2">
        {renderPositionButtons('searchBar', 'Search Bar Position')}
        {renderPositionButtons('sortBy', 'Sort By Position')}
        {renderPositionButtons('launcher', 'Launcher Position')}
        {renderPositionButtons('categories', 'Categories Position')}
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
