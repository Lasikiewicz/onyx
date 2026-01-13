import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPos, setMenuPos] = useState({ x, y });
  const dragRef = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  });

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close on left click, not right click
      if (event.button !== 0) return;
      
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Small delay to avoid closing immediately after opening
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current.isDragging = true;
    dragRef.current.offsetX = e.clientX - menuPos.x;
    dragRef.current.offsetY = e.clientY - menuPos.y;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      
      setMenuPos({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[10000] p-4 w-64"
      style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
    >
      <div
        className="text-sm font-semibold text-white mb-4 cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        Resize Logo
      </div>
      <div className="space-y-4">
        <input
          type="range"
          min="50"
          max="400"
          step="10"
          value={logoSize}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          disabled={isSaving}
          className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>50px</span>
          <span className="font-medium text-gray-300">{logoSize}px</span>
          <span>400px</span>
        </div>
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
};
