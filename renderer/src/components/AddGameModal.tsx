import React, { useState } from 'react';
import { Game } from '../types/game';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (game: Game) => Promise<void>;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [exePath, setExePath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async () => {
    try {
      const path = await window.electronAPI.showOpenDialog();
      if (path) {
        setExePath(path);
        setError(null);
      }
    } catch (err) {
      setError('Failed to select file');
      console.error('Error selecting file:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Game title is required');
      return;
    }
    
    if (!exePath.trim()) {
      setError('Executable path is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newGame = await window.electronAPI.addCustomGame({
        title: title.trim(),
        exePath: exePath.trim(),
      });

      if (newGame) {
        await onAdd(newGame);
        // Reset form
        setTitle('');
        setExePath('');
        onClose();
      } else {
        setError('Failed to add game');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add game');
      console.error('Error adding game:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setExePath('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Add Game</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="game-title" className="block text-sm font-medium text-gray-300 mb-2">
                Game Title
              </label>
              <input
                id="game-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Enter game title"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="exe-path" className="block text-sm font-medium text-gray-300 mb-2">
                Executable Path
              </label>
              <div className="flex gap-2">
                <input
                  id="exe-path"
                  type="text"
                  value={exePath}
                  readOnly
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="No file selected"
                />
                <button
                  type="button"
                  onClick={handleSelectFile}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Browse
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !exePath.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Game'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
