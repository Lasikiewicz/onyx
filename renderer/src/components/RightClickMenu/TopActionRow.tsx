import React from 'react';

interface TopActionRowProps {
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  isViewFlipped?: boolean;
  onViewFlipChange?: (flipped: boolean) => void;
  onClose: () => void;
  onReset: () => void;
  onDefaults: () => void;
}

export const TopActionRow: React.FC<TopActionRowProps> = ({
  viewMode,
  isViewFlipped = false,
  onViewFlipChange,
  onClose,
  onReset,
  onDefaults,
}) => {
  return (
    <div className="px-3 pt-2 pb-1">
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
          <button
            onClick={onReset}
            className="px-2 py-1 text-[11px] rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium"
            title="Reset view settings to defaults for your resolution"
          >
            Reset
          </button>
          <button
            onClick={onDefaults}
            className="px-2 py-1 text-[11px] rounded transition-colors bg-blue-700 text-gray-300 hover:bg-blue-600 border border-blue-600 font-medium"
            title="Save or restore your custom defaults"
          >
            Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
