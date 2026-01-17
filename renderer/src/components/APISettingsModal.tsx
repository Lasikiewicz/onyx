import React, { useState, useEffect } from 'react';

interface APISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface APICredentials {
  igdbClientId: string;
  igdbClientSecret: string;
  rawgApiKey: string;
  steamGridDBApiKey: string;
}

export const APISettingsModal: React.FC<APISettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [credentials, setCredentials] = useState<APICredentials>({
    igdbClientId: '',
    igdbClientSecret: '',
    rawgApiKey: '',
    steamGridDBApiKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load credentials on mount
  useEffect(() => {
    if (isOpen) {
      const loadCredentials = async () => {
        try {
          const creds = await window.electronAPI.getAPICredentials();
          setCredentials({
            igdbClientId: creds.igdbClientId || '',
            igdbClientSecret: creds.igdbClientSecret || '',
            rawgApiKey: creds.rawgApiKey || '',
            steamGridDBApiKey: creds.steamGridDBApiKey || '',
          });
        } catch (error) {
          console.error('Error loading API credentials:', error);
        }
      };
      loadCredentials();
    }
  }, [isOpen]);

  const handleInputChange = (key: keyof APICredentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    try {
      await window.electronAPI.saveAPICredentials({
        igdbClientId: credentials.igdbClientId.trim(),
        igdbClientSecret: credentials.igdbClientSecret.trim(),
        rawgApiKey: credentials.rawgApiKey.trim(),
        steamGridDBApiKey: credentials.steamGridDBApiKey.trim(),
      });
      setSaveStatus('success');
      setTimeout(() => {
        onClose();
        setSaveStatus('idle');
      }, 1000);
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenIGDB = async () => {
    try {
      await window.electronAPI.openExternal('https://dev.twitch.tv/console/apps/create');
    } catch (error) {
      console.error('Error opening Twitch Developer Console:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal - Centered */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">API Settings</h2>
            <p className="text-sm text-gray-400 mt-1">
              Configure API credentials for enhanced game metadata
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* IGDB Section */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium text-white">IGDB API</h3>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/50 text-red-300 border border-red-800">MANDATORY</span>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  IGDB (Internet Game Database) is required for game metadata (covers, descriptions, screenshots).
                </p>

                {/* Instructions */}
                <div className="bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2">How to obtain IGDB API credentials:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>
                      Visit the{' '}
                      <button
                        onClick={handleOpenIGDB}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Twitch Developer Console
                      </button>
                      {' '}at https://dev.twitch.tv/console/apps/create
                    </li>
                    <li>Sign in with your Twitch account (create one if needed)</li>
                    <li>Click "Register Your Application" to create a new application</li>
                    <li>Fill in the form:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li><strong>Name:</strong> Enter your application name (e.g., "Onyx")</li>
                        <li><strong>OAuth Redirect URLs:</strong> Enter <code className="bg-gray-800 px-1 rounded">http://localhost</code> and click "Add"</li>
                        <li><strong>Category:</strong> Select "Game Integration" from the dropdown</li>
                        <li><strong>Client Type:</strong> Select "Confidential" (recommended for desktop applications)</li>
                      </ul>
                    </li>
                    <li>Click the "Create" button</li>
                    <li>On the next page, you'll see your <strong>Client ID</strong> and can click "New Secret" to generate a <strong>Client Secret</strong></li>
                    <li>Copy both values and paste them into the fields below</li>
                  </ol>
                </div>

                {/* Client ID Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={credentials.igdbClientId}
                    onChange={(e) => handleInputChange('igdbClientId', e.target.value)}
                    placeholder="Enter your IGDB Client ID"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Client Secret Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={credentials.igdbClientSecret}
                    onChange={(e) => handleInputChange('igdbClientSecret', e.target.value)}
                    placeholder="Enter your IGDB Client Secret"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status Message */}
                {saveStatus === 'success' && (
                  <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
                    Credentials saved successfully! Services will be restarted.
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
                    Failed to save credentials. Please try again.
                  </div>
                )}
              </div>
            </div>

            {/* RAWG Section */}
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium text-white">RAWG API</h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/30 text-blue-300 border border-blue-800">OPTIONAL</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Can be used as a fallback source for metadata. Free key available at <a href="#" onClick={() => window.electronAPI.openExternal('https://rawg.io/apidocs')} className="text-blue-400 hover:underline">rawg.io</a>.
              </p>
              <input
                type="text"
                value={credentials.rawgApiKey}
                onChange={(e) => handleInputChange('rawgApiKey', e.target.value)}
                placeholder="Enter your RAWG API Key"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* SteamGridDB Section */}
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium text-white">SteamGridDB API</h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/30 text-blue-300 border border-blue-800">OPTIONAL</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Provides high-quality grids and heroes. Get a key at <a href="#" onClick={() => window.electronAPI.openExternal('https://www.steamgriddb.com/profile/preferences')} className="text-blue-400 hover:underline">steamgriddb.com</a>.
              </p>
              <input
                type="text"
                value={credentials.steamGridDBApiKey}
                onChange={(e) => handleInputChange('steamGridDBApiKey', e.target.value)}
                placeholder="Enter your SteamGridDB API Key"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !credentials.igdbClientId.trim() || !credentials.igdbClientSecret.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
