import React, { useEffect, useRef } from 'react';

interface ImageContextMenuProps {
  x?: number;
  y?: number;
  onClose: () => void;
  onSelectFromFile: () => void;
  onSearchImages: () => void;
  onOpenInGameManager?: () => void;
  onResizeImage?: () => void;
  imageType: 'artwork' | 'boxart' | 'logo';
  positionOverGameList?: boolean;
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({
  x = 0,
  y = 0,
  onClose,
  onSelectFromFile,
  onSearchImages,
  onOpenInGameManager,
  onResizeImage,
  imageType,
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

  const handleSelectFromFile = () => {
    onSelectFromFile();
    onClose();
  };

  const handleSearchImages = () => {
    onSearchImages();
    onClose();
  };

  const handleOpenInGameManager = () => {
    onOpenInGameManager?.();
    onClose();
  };

  const handleResizeImage = () => {
    onResizeImage?.();
    onClose();
  };

  const imageTypeLabel = imageType === 'artwork' ? 'Artwork/Screenshots' : imageType === 'logo' ? 'Logo' : 'Boxart';

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] py-1"
      style={{ left: positionOverGameList ? undefined : `${x}px`, top: positionOverGameList ? undefined : `${y}px` }}
    >
      <button
        onClick={handleSelectFromFile}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Select from File
      </button>
      <button
        onClick={handleSearchImages}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search for {imageTypeLabel}
      </button>
      {onResizeImage && (
        <button
          onClick={handleResizeImage}
          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Resize Image
        </button>
      )}
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
    </div>
  );
};
