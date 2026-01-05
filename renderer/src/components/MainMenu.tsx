import React from 'react';

interface MainMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame?: () => void;
  onScanFolder?: () => void;
  onUpdateSteamLibrary?: () => void;
  onConfigureSteam?: () => void;
  onSettings?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  isOpen,
  onClose,
  onAddGame,
  onScanFolder,
  onUpdateSteamLibrary,
  onConfigureSteam,
  onSettings,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed left-16 top-0 bottom-0 w-64 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700 z-50 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Menu</h2>
          
          <div className="space-y-1">
            {/* Add Game */}
            <button
              onClick={() => {
                onAddGame?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Game</span>
            </button>

            {/* Library */}
            <div className="flex items-center gap-3 px-4 py-2 text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Library</span>
              <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Update Game Library */}
            <button
              onClick={() => {
                onUpdateSteamLibrary?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Update Game Library</span>
              <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Scan Folder */}
            <button
              onClick={() => {
                onScanFolder?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Scan Folder for Games</span>
            </button>

            <div className="border-t border-gray-700 my-2" />

            {/* Settings */}
            <button
              onClick={() => {
                onSettings?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings...</span>
            </button>

            {/* Configure Steam */}
            <button
              onClick={() => {
                onConfigureSteam?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>Configure Steam...</span>
            </button>

            <div className="border-t border-gray-700 my-2" />

            {/* Show Console - Only in development mode */}
            {import.meta.env.DEV && (
              <button
                onClick={async () => {
                  // Toggle DevTools
                  if (window.electronAPI && (window.electronAPI as any).toggleDevTools) {
                    await (window.electronAPI as any).toggleDevTools();
                  }
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Show Console</span>
              </button>
            )}

            {/* Exit */}
            <button
              onClick={() => {
                window.close();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
