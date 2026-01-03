import React from 'react';
import iconPng from '../../../resources/icon.png';
import iconSvg from '../../../resources/icon.svg';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame?: () => void;
  onScanFolder?: () => void;
  onUpdateLibrary?: () => void;
  onOnyxSettings?: () => void;
  onAPISettings?: () => void;
  onExit?: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
  onScanFolder,
  onUpdateLibrary,
  onOnyxSettings,
  onAPISettings,
  onExit,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal - Positioned at bottom left, menu style */}
      <div className="fixed bottom-20 left-6 z-50">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 min-w-[200px]">
          {/* Content - Menu style like TopBar */}
          <div className="p-1">
            <button
              onClick={() => {
                onAddGame?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Game Manually</span>
            </button>

            <button
              onClick={() => {
                onScanFolder?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Scan Folder for Games</span>
            </button>

            <button
              onClick={() => {
                onUpdateLibrary?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Update Library</span>
            </button>


            <button
              onClick={() => {
                onOnyxSettings?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <img 
                src={iconPng} 
                alt="Onyx" 
                className="w-5 h-5"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = iconSvg;
                }}
              />
              <span>Onyx Settings</span>
            </button>

            <button
              onClick={() => {
                onAPISettings?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>APIs</span>
            </button>

            <hr className="border-white/10 my-2" />

            <button
              onClick={async () => {
                try {
                  if (window.electronAPI && window.electronAPI.openExternal) {
                    const result = await window.electronAPI.openExternal('https://ko-fi.com/oynxgilga');
                    if (!result.success) {
                      console.error('Failed to open external URL:', result.error);
                    }
                  } else {
                    console.error('window.electronAPI.openExternal is not available');
                  }
                } catch (error) {
                  console.error('Failed to open external URL:', error);
                }
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Support Onyx</span>
            </button>

            <button
              onClick={() => {
                onExit?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 rounded transition-colors"
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
