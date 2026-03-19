export type RightClickMenuEditorSection = 'games-view' | 'dividers' | 'details-view';

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
              <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Flip View
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isSectionedEditor &&
            ([
              ['games-view', 'Games View'],
              ['dividers', 'Dividers'],
              ['details-view', 'Game Details'],
            ] as const).map(([sectionKey, label]) => (
              <button
                key={sectionKey}
                onClick={() => onSetActiveEditorSection((current) => (current === sectionKey ? null : sectionKey))}
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

        <div className="flex items-center gap-2">
          {isSectionedEditor && (
            <div className="flex min-w-[190px] items-center gap-2 rounded text-[11px] transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium px-2 py-1">
              <span className="shrink-0 text-[10px] text-gray-300 whitespace-nowrap">Menu Transparency</span>
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
                className="min-w-[88px] flex-1 accent-blue-500 slider h-1"
              />
            </div>
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
