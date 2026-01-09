import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface GameDetailsSimpleContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  type: 'artwork' | 'boxart' | 'title' | 'description' | 'details';
  onEdit: () => void;
  onOpenInGameManager?: () => void;
  onRemoveLogoTransparency?: () => void;
  hasLogo?: boolean;
  removeLogoTransparency?: boolean;
}

export const GameDetailsSimpleContextMenu: React.FC<GameDetailsSimpleContextMenuProps> = ({
  x,
  y,
  onClose,
  type,
  onEdit,
  onOpenInGameManager,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('GameDetailsSimpleContextMenu mounted:', { x, y, type });
    return () => {
      console.log('GameDetailsSimpleContextMenu unmounted');
    };
  }, [x, y, type]);

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

    // Small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position menu
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      // Adjust if would go off right edge
      if (x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }
      // Adjust if would go off bottom edge
      if (y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }
      // Ensure it doesn't go off left edge
      if (newX < 10) newX = 10;
      // Ensure it doesn't go off top edge
      if (newY < 10) newY = 10;

      menuRef.current.style.left = `${newX}px`;
      menuRef.current.style.top = `${newY}px`;
    }
  }, [x, y]);

  const getLabel = () => {
    switch (type) {
      case 'artwork':
        return 'Edit Artwork';
      case 'boxart':
        return 'Edit Boxart';
      case 'title':
        return 'Edit Title';
      case 'description':
        return 'Edit Description';
      case 'details':
        return 'Edit Details';
      default:
        return 'Edit';
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
    onClose();
  };

  const handleOpenInGameManager = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenInGameManager?.();
    onClose();
  };

  // For artwork, boxart, and title (logo), only show "Edit Image in Game Manager"
  const isImageType = type === 'artwork' || type === 'boxart' || type === 'title';

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[10000] min-w-[180px] py-1"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isImageType ? (
        // For image types, only show "Edit Image in Game Manager"
        onOpenInGameManager ? (
          <button
            onClick={handleOpenInGameManager}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Edit Image in Game Manager
          </button>
        ) : null
      ) : (
        // For description and details, show Edit and Open in Game Manager
        <>
          <button
            onClick={handleEdit}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {getLabel()}
          </button>
          {onOpenInGameManager && (
            <>
              <div className="border-t border-gray-700 my-1" />
              <button
                onClick={handleOpenInGameManager}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open in Game Manager
              </button>
            </>
          )}
        </>
      )}
    </div>
  );

  // Render using portal to ensure it's at the root level
  return createPortal(menuContent, document.body);
};
