import { useState, useRef, useEffect } from 'react';

export type RightClickMenuEditorSection = 'games-view' | 'dividers' | 'details-view';

// ---------------------------------------------------------------------------
// Transparency Button – a compact toggle that reveals a slider popover
// ---------------------------------------------------------------------------

interface TransparencyButtonProps {
  menuTransparency: number;
  menuTransparencyPercent: number;
  onSetMenuTransparency: (value: number) => void;
}

function TransparencyButton({ menuTransparency, menuTransparencyPercent, onSetMenuTransparency }: TransparencyButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 text-[11px] rounded transition-colors border font-medium flex items-center gap-1.5 ${
          open
            ? 'bg-blue-700 text-white border-blue-600'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
        }`}
        title="Adjust menu transparency"
      >
        {/* Layers icon */}
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3L2 9l10 6 10-6-10-6zM2 15l10 6 10-6M2 12l10 6 10-6" />
        </svg>
        Transparency
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2.5 flex flex-col gap-1.5"
          style={{ minWidth: 200 }}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Menu Transparency</span>
            <span className="text-[10px] text-blue-400 font-semibold tabular-nums">{menuTransparency}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="75"
            step="1"
            value={menuTransparency}
            onChange={(e) => onSetMenuTransparency(Number(e.target.value))}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(59,130,246,0.95) 0%, rgba(59,130,246,0.95) ${menuTransparencyPercent}%, rgba(255,255,255,0.18) ${menuTransparencyPercent}%, rgba(255,255,255,0.18) 100%)`,
              backgroundSize: '100% 2px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            className="w-full accent-blue-500 slider h-1 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
            <span>Solid</span>
            <span>Transparent</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main header component
// ---------------------------------------------------------------------------

interface RightClickMenuHeaderProps {
  activeEditorSection: RightClickMenuEditorSection | null;
  isFocusedEditorSection: boolean;
  isSectionedEditor: boolean;
  isViewFlipped: boolean;
  menuBackground: string;
  menuBackdropBlur: string;
  menuTransparency: number;
  menuTransparencyPercent: number;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  onClose: () => void;
  onOpenCustomDefaults: () => void;
  onResetToDefaults: () => void;
  onSetActiveEditorSection: (updater: (current: RightClickMenuEditorSection | null) => RightClickMenuEditorSection | null) => void;
  onSetMenuTransparency: (value: number) => void;
  onViewFlipChange?: (flipped: boolean) => void;
}

export function RightClickMenuHeader({
  activeEditorSection,
  isFocusedEditorSection,
  isSectionedEditor,
  isViewFlipped,
  menuBackground,
  menuBackdropBlur,
  menuTransparency,
  menuTransparencyPercent,
  viewMode,
  onClose,
  onOpenCustomDefaults,
  onResetToDefaults,
  onSetActiveEditorSection,
  onSetMenuTransparency,
  onViewFlipChange,
}: RightClickMenuHeaderProps) {
  return (
    <div
      className={`px-3 pt-2 pb-1 ${isFocusedEditorSection ? 'sticky top-0 z-10' : ''}`}
      style={
        isFocusedEditorSection
          ? {
              backgroundColor: menuBackground,
              backdropFilter: `blur(${menuBackdropBlur})`,
              WebkitBackdropFilter: `blur(${menuBackdropBlur})`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        {/* Left – Flip View */}
        <div>
          {viewMode !== 'coverflow' && (
            <button
              onClick={() => {
                onViewFlipChange?.(!isViewFlipped);
                onClose();
              }}
              className="px-2 py-1 text-[11px] rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium flex items-center gap-1"
              title={viewMode === 'carousel' ? 'Flip the view - swap carousel and details sections' : 'Flip the view - swap left and right sections'}
            >
              <svg className="w-3 h-3 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Flip View
            </button>
          )}
        </div>

        {/* Centre – section buttons */}
        <div className="flex items-center gap-1.5">
          {isSectionedEditor &&
            ([
              ['games-view', 'Games View'],
              ['dividers', 'Dividers'],
              ['top-bar', 'Top Bar'],
              ['details-view', 'Game Details'],
            ] as const).map(([sectionKey, label]) => (
              <button
                key={sectionKey}
                onClick={(e) => {
                  if (sectionKey === 'top-bar') {
                    onClose();
                    window.dispatchEvent(
                      new CustomEvent('open-top-bar-menu', {
                        detail: { x: e.clientX, y: e.clientY },
                      })
                    );
                  } else {
                    onSetActiveEditorSection((current) =>
                      current === sectionKey ? null : (sectionKey as RightClickMenuEditorSection)
                    );
                  }
                }}
                className={`px-2 py-1 text-[11px] rounded transition-colors border font-medium ${
                  activeEditorSection === sectionKey
                    ? 'bg-blue-700 text-white border-blue-600'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
        </div>

        {/* Right – Transparency, Reset, Defaults */}
        <div className="flex items-center gap-2">
          {isSectionedEditor && (
            <TransparencyButton
              menuTransparency={menuTransparency}
              menuTransparencyPercent={menuTransparencyPercent}
              onSetMenuTransparency={onSetMenuTransparency}
            />
          )}
          <button
            onClick={onResetToDefaults}
            className="px-2 py-1 text-[11px] rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium"
            title="Reset view settings to defaults for your resolution"
          >
            Reset
          </button>
          <button
            onClick={onOpenCustomDefaults}
            className="px-2 py-1 text-[11px] rounded transition-colors bg-blue-700 text-gray-300 hover:bg-blue-600 border border-blue-600 font-medium"
            title="Save or restore your custom defaults"
          >
            Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
