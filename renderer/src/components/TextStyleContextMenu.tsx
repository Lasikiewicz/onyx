import React, { useEffect, useRef } from 'react';

interface TextStyleContextMenuProps {
  x?: number;
  y?: number;
  onClose: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (family: string) => void;
  label: string;
  positionOverGameList?: boolean;
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'system-ui', label: 'System Default' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
];

export const TextStyleContextMenu: React.FC<TextStyleContextMenuProps> = ({
  x = 0,
  y = 0,
  onClose,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  label,
  positionOverGameList = false,
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

  // Adjust position if menu would go off screen or position over game list
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (positionOverGameList) {
        // Position over the game list section (centered vertically, left side)
        const menuX = 20;
        const menuY = Math.max(20, (viewportHeight - rect.height) / 2);
        menuRef.current.style.left = `${menuX}px`;
        menuRef.current.style.top = `${menuY}px`;
      } else {
        // Original positioning logic
        if (x + rect.width > viewportWidth) {
          menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
        } else {
          menuRef.current.style.left = `${x}px`;
        }
        if (y + rect.height > viewportHeight) {
          menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
        } else {
          menuRef.current.style.top = `${y}px`;
        }
      }
    }
  }, [x, y, positionOverGameList]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[280px] max-w-[320px] py-3 max-h-[90vh] overflow-y-auto"
      style={{ left: positionOverGameList ? undefined : `${x}px`, top: positionOverGameList ? undefined : `${y}px` }}
    >
      <div className="px-5 py-2">
        <div className="text-xs text-gray-400 mb-3 px-3 font-semibold uppercase tracking-wide">{label} Style</div>
        
        {/* Font Size */}
        <div className="px-3 mb-4">
          <label className="block text-xs text-gray-400 mb-2">Font Size</label>
          <input
            type="range"
            min="8"
            max="48"
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>8px</span>
            <span className="font-medium text-gray-300">{fontSize}px</span>
            <span>48px</span>
          </div>
        </div>

        {/* Font Family */}
        <div className="px-3">
          <label className="block text-xs text-gray-400 mb-2">Font Family</label>
          <select
            value={fontFamily}
            onChange={(e) => onFontFamilyChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
