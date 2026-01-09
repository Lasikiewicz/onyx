import React, { useEffect, useRef } from 'react';

interface SimpleContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEditAppearance: () => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
}

export const SimpleContextMenu: React.FC<SimpleContextMenuProps> = ({
  x,
  y,
  onClose,
  onEditAppearance,
  gridSize = 120,
  onGridSizeChange,
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

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (y + rect.height > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
  }, [x, y]);

  const handleEditAppearance = () => {
    onEditAppearance();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[280px] py-1"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {/* Grid Size Resizer */}
      {onGridSizeChange && (
        <div className="px-4 py-3">
          <label className="block text-xs text-gray-400 mb-2">Grid Size</label>
          <input
            type="range"
            min="80"
            max="500"
            step="1"
            value={gridSize}
            onChange={(e) => onGridSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>80px</span>
            <span className="font-medium text-gray-300">{gridSize}px</span>
            <span>500px</span>
          </div>
        </div>
      )}

      {onGridSizeChange && <div className="border-t border-gray-700 my-1" />}

      <button
        onClick={handleEditAppearance}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        Edit Appearance
      </button>
    </div>
  );
};
