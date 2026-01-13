import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../types/game';

interface LogoResizeMenuProps {
  game: Game;
  x: number;
  y: number;
  onClose: () => void;
  onSizeChange: (size: number) => Promise<void>;
  rightPanelLogoSize: number;
}

export const LogoResizeMenu: React.FC<LogoResizeMenuProps> = ({
  game,
  x,
  y,
  onClose,
  onSizeChange,
  rightPanelLogoSize,
}) => {
  console.log('LogoResizeMenu rendering at', x, y);
  const menuRef = useRef<HTMLDivElement>(null);
  const [logoSize, setLogoSize] = useState<number>(game.logoSizePerViewMode?.carousel || rightPanelLogoSize);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('Escape pressed, closing logo menu');
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
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

  const handleSliderChange = async (newSize: number) => {
    setLogoSize(newSize);
    setIsSaving(true);
    try {
      await onSizeChange(newSize);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-red-900 border-2 border-red-500 rounded-lg shadow-xl z-[10000] p-4 w-64"
      style={{ left: `${x}px`, top: `${y}px` }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <h3 className="text-sm font-semibold text-white mb-3">Resize Logo</h3>
      <div className="space-y-3">
        <input
          type="range"
          min="50"
          max="400"
          step="10"
          value={logoSize}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          disabled={isSaving}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>50px</span>
          <span className="font-medium text-gray-300">{logoSize}px</span>
          <span>400px</span>
        </div>
      </div>
    </div>
  );
};
