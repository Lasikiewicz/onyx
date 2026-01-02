import React from 'react';
import { ExecutableFile } from '../types/game';

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  executables: ExecutableFile[];
  onSelect: (file: ExecutableFile) => void;
  folderPath: string;
}

export const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
  isOpen,
  onClose,
  executables,
  onSelect,
  folderPath,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-700 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Select Game Executable</h2>
              <p className="text-sm text-gray-400 mt-1">Found in: {folderPath}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {executables.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No executables found in this folder.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {executables.map((file, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(file)}
                  className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.fileName}</p>
                      <p className="text-sm text-gray-400 truncate mt-1">{file.fullPath}</p>
                    </div>
                    <svg
                      className="w-5 h-5 text-blue-500 ml-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
