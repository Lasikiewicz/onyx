import { useRef } from 'react';
import { getLinkIconSearchQuery } from '../GameLinks';

interface LinkIconPickerDialogProps {
  linkName: string;
  hasCustomIcon: boolean;
  onUploadIcon: (dataUrl: string) => void;
  onRemoveCustomIcon: () => void;
  onClose: () => void;
}

export function LinkIconPickerDialog({
  linkName,
  hasCustomIcon,
  onUploadIcon,
  onRemoveCustomIcon,
  onClose,
}: LinkIconPickerDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 w-[320px] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Change icon for &quot;{linkName || 'Link'}&quot;</h3>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                const query = getLinkIconSearchQuery(linkName);
                window.electronAPI.openExternal(`https://www.google.com/search?q=${query}`);
                onClose();
              }}
              className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search for icon in browser
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload SVG icon
            </button>
            {hasCustomIcon && (
              <button
                type="button"
                onClick={() => {
                  onRemoveCustomIcon();
                  onClose();
                }}
                className="w-full px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Remove custom icon
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            event.target.value = '';
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            onUploadIcon(reader.result as string);
            onClose();
          };
          reader.readAsDataURL(file);
          event.target.value = '';
        }}
      />
    </>
  );
}
