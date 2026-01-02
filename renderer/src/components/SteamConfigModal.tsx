import React, { useState, useEffect } from 'react';

interface SteamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (path?: string) => Promise<void>;
}

export const SteamConfigModal: React.FC<SteamConfigModalProps> = ({ isOpen, onClose, onScan }) => {
  const [steamPath, setSteamPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSteamPath();
    }
  }, [isOpen]);

  const loadSteamPath = async () => {
    try {
      setIsLoading(true);
      const path = await window.electronAPI.getSteamPath();
      if (path) {
        setSteamPath(path);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load Steam path');
      console.error('Error loading Steam path:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const path = await window.electronAPI.showFolderDialog();
      if (path) {
        setSteamPath(path);
        setError(null);
        setSuccess(null);
      }
    } catch (err) {
      setError('Failed to select folder');
      console.error('Error selecting folder:', err);
    }
  };

  const handleSave = async () => {
    if (!steamPath.trim()) {
      setError('Steam path is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.setSteamPath(steamPath.trim());
      if (result.success) {
        setSuccess('Steam path saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to save Steam path');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Steam path');
      console.error('Error saving Steam path:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setSuccess(null);

    try {
      await onScan(steamPath.trim() || undefined);
      setSuccess('Steam library scanned successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan Steam library');
      console.error('Error scanning Steam library:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isScanning) {
      setSteamPath('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Configure Steam</h2>
            <button
              onClick={handleClose}
              disabled={isLoading || isScanning}
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

          <div className="space-y-4">
            <div>
              <label htmlFor="steam-path" className="block text-sm font-medium text-gray-300 mb-2">
                Steam Library Path
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Select the Steam installation directory (e.g., C:\Program Files (x86)\Steam)
              </p>
              <div className="flex gap-2">
                <input
                  id="steam-path"
                  type="text"
                  value={steamPath}
                  onChange={(e) => setSteamPath(e.target.value)}
                  disabled={isLoading || isScanning}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="C:\Program Files (x86)\Steam"
                />
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  disabled={isLoading || isScanning}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {success && (
              <div className="bg-green-900/20 border border-green-500 rounded p-3">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading || isScanning}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading || isScanning || !steamPath.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Path'}
              </button>
              <button
                type="button"
                onClick={handleScan}
                disabled={isLoading || isScanning}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? 'Scanning...' : 'Scan & Import'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
