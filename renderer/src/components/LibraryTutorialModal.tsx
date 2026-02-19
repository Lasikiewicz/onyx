import React from 'react';

interface LibraryTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  onOpenUpdateLibrary?: () => void;
}

export const LibraryTutorialModal: React.FC<LibraryTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenUpdateLibrary,
}) => {
  if (!isOpen) return null;

  const handleOpenSettings = () => {
    onOpenSettings?.();
    onClose();
  };

  const handleOpenUpdateLibrary = () => {
    onOpenUpdateLibrary?.();
    onClose();
  };

  return (
    <>
      {/* Very light dim so underlying UI is still clear */}
      <div className="fixed inset-0 bg-black/15 backdrop-blur-[1px] z-[999]" />

      {/* Overlay with callouts that point at real UI areas */}
      <div className="fixed inset-0 z-[1000] pointer-events-none">
        {/* Title chip near top centre */}
        <div className="pointer-events-auto absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-500/40 rounded-full px-5 py-2 flex items-center gap-2 shadow-xl">
          <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-slate-100">
            Quick tour of your library
          </div>
        </div>

        {/* Onyx menu callout – top left, pointing at the app icon */}
        <div className="pointer-events-auto absolute top-10 left-16 max-w-xs bg-slate-900/95 border border-slate-700/70 rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-semibold text-cyan-300 tracking-wide uppercase mb-1">
            Onyx menu
          </div>
          <p className="text-slate-200 text-sm mb-2">
            Click the Onyx icon in the very top-left corner to open the main menu. 
            From here you can open <span className="font-semibold">Settings</span>, run <span className="font-semibold">Update Library</span>,
            and access other app options.
          </p>
          <div className="absolute -left-2 top-5 w-4 h-4 bg-slate-900/95 border-l border-t border-slate-700/70 rotate-45" />
        </div>

        {/* Library area / right-click callout – lower centre over game area */}
        <div className="pointer-events-auto absolute bottom-28 left-1/2 -translate-x-1/2 max-w-xl bg-slate-900/95 border border-slate-700/70 rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-semibold text-cyan-300 tracking-wide uppercase mb-1">
            Working with your library
          </div>
          <ul className="space-y-2 text-slate-200 text-sm">
            <li>
              <span className="font-semibold">Scan for games</span> – Open the Onyx menu (top-left icon) and choose 
              <span className="font-semibold"> Update Library</span> to scan for newly installed or removed games.
            </li>
            <li>
              <span className="font-semibold">Right-click anywhere that isn’t a game tile</span> – Opens the context menu where you can change view (grid, list, logo, carousel), set sorting, and adjust filters.
            </li>
            <li>
              <span className="font-semibold">Right-click a game tile</span> – Brings up game-specific options (launch, edit, hide, categories, and more).
            </li>
          </ul>
        </div>

        {/* Bottom controls */}
        <div className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-3">
          {onOpenSettings && (
            <button
              onClick={handleOpenSettings}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-slate-200 text-sm font-medium transition-colors border border-gray-700/70"
            >
              Open Settings
            </button>
          )}
          {onOpenUpdateLibrary && (
            <button
              onClick={handleOpenUpdateLibrary}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-slate-200 text-sm font-medium transition-colors border border-gray-700/70"
            >
              Update Library
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors shadow-lg"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
};
