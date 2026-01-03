import React, { useState, useEffect } from 'react';

interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialTab?: 'general' | 'appearance' | 'apis';
}

interface OnyxSettings {
  minimizeToTray: boolean;
  showSystemTrayIcon: boolean;
  startWithComputer: boolean;
  startClosedToTray: boolean;
  updateLibrariesOnStartup: boolean;
  hideGameTitles: boolean;
  gameTilePadding: number;
}

type TabType = 'general' | 'appearance' | 'apis';

interface APICredentials {
  igdbClientId: string;
  igdbClientSecret: string;
}

export const OnyxSettingsModal: React.FC<OnyxSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [apiCredentials, setApiCredentials] = useState<APICredentials>({
    igdbClientId: '',
    igdbClientSecret: '',
  });
  const [isLoadingAPI, setIsLoadingAPI] = useState(false);
  const [apiSaveStatus, setApiSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState<OnyxSettings>({
    minimizeToTray: false,
    showSystemTrayIcon: true,
    startWithComputer: false,
    startClosedToTray: false,
    updateLibrariesOnStartup: false,
    hideGameTitles: false,
    gameTilePadding: 16,
  });

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      const loadSettings = async () => {
        try {
          const prefs = await window.electronAPI.getPreferences();
          setSettings({
            minimizeToTray: prefs.minimizeToTray ?? false,
            showSystemTrayIcon: prefs.showSystemTrayIcon ?? true,
            startWithComputer: prefs.startWithComputer ?? false,
            startClosedToTray: prefs.startClosedToTray ?? false,
            updateLibrariesOnStartup: prefs.updateLibrariesOnStartup ?? false,
            hideGameTitles: prefs.hideGameTitles ?? false,
            gameTilePadding: prefs.gameTilePadding ?? 16,
          });
        } catch (error) {
          console.error('Error loading Onyx settings:', error);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  // Load API credentials on mount
  useEffect(() => {
    if (isOpen) {
      const loadAPICredentials = async () => {
        try {
          const creds = await window.electronAPI.getAPICredentials();
          setApiCredentials({
            igdbClientId: creds.igdbClientId || '',
            igdbClientSecret: creds.igdbClientSecret || '',
          });
        } catch (error) {
          console.error('Error loading API credentials:', error);
        }
      };
      loadAPICredentials();
    }
  }, [isOpen]);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleToggle = (key: keyof OnyxSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  const handlePaddingChange = (value: number) => {
    setSettings({ ...settings, gameTilePadding: value });
  };

  const handleRestoreDefaults = () => {
    setSettings({
      ...settings,
      hideGameTitles: false,
      gameTilePadding: 16,
    });
  };

  const handleAPIInputChange = (key: keyof APICredentials, value: string) => {
    setApiCredentials((prev) => ({ ...prev, [key]: value }));
    setApiSaveStatus('idle');
  };

  const handleAPISave = async () => {
    setIsLoadingAPI(true);
    setApiSaveStatus('saving');
    try {
      await window.electronAPI.saveAPICredentials({
        igdbClientId: apiCredentials.igdbClientId.trim(),
        igdbClientSecret: apiCredentials.igdbClientSecret.trim(),
      });
      setApiSaveStatus('success');
      setTimeout(() => {
        setApiSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setApiSaveStatus('error');
    } finally {
      setIsLoadingAPI(false);
    }
  };

  const handleOpenIGDB = async () => {
    try {
      await window.electronAPI.openExternal('https://dev.twitch.tv/console/apps/create');
    } catch (error) {
      console.error('Error opening Twitch Developer Console:', error);
    }
  };

  const handleSave = async () => {
    try {
      const result = await window.electronAPI.savePreferences({
        minimizeToTray: settings.minimizeToTray,
        showSystemTrayIcon: settings.showSystemTrayIcon,
        startWithComputer: settings.startWithComputer,
        startClosedToTray: settings.startClosedToTray,
        updateLibrariesOnStartup: settings.updateLibrariesOnStartup,
        hideGameTitles: settings.hideGameTitles,
        gameTilePadding: settings.gameTilePadding,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save preferences');
      }
      
      // Apply system tray settings
      await window.electronAPI.applySystemTraySettings({
        showSystemTrayIcon: settings.showSystemTrayIcon,
        minimizeToTray: settings.minimizeToTray,
      });
      
      // Apply startup settings
      await window.electronAPI.applyStartupSettings({
        startWithComputer: settings.startWithComputer,
        startClosedToTray: settings.startClosedToTray,
      });
      
      // Notify parent component to reload preferences
      if (onSave) {
        await onSave();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving Onyx settings:', error);
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: JSX.Element }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: 'apis',
      label: "API's",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700/50 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-700/50 bg-gray-800/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Onyx Settings
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-gray-700/50 bg-gray-800/50">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">System Behavior</h3>
                  
                  {/* Settings Grid - 2 columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Minimize to tray */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Minimize to System Tray
                      </label>
                      <p className="text-gray-400 text-sm">
                        Minimize Onyx to system tray when the application window is closed
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('minimizeToTray')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.minimizeToTray ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.minimizeToTray ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show system tray icon */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Show System Tray Icon
                      </label>
                      <p className="text-gray-400 text-sm">
                        Display Onyx icon in the system tray
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('showSystemTrayIcon')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.showSystemTrayIcon ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.showSystemTrayIcon ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Start with computer */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Start with Computer
                      </label>
                      <p className="text-gray-400 text-sm">
                        Launch Onyx automatically when your computer starts
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('startWithComputer')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.startWithComputer ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.startWithComputer ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Start closed to tray */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Start Minimized to Tray
                      </label>
                      <p className="text-gray-400 text-sm">
                        Start Onyx minimized to the system tray
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('startClosedToTray')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.startClosedToTray ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.startClosedToTray ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Update libraries on startup */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Update Libraries on Startup
                      </label>
                      <p className="text-gray-400 text-sm">
                        Automatically scan for new games when Onyx starts. If new games are found, you'll be prompted to configure metadata and images.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('updateLibrariesOnStartup')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.updateLibrariesOnStartup ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.updateLibrariesOnStartup ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">Library Display</h3>
                  
                  {/* Settings Grid - 2 columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Hide game titles */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Hide Game Titles
                      </label>
                      <p className="text-gray-400 text-sm">
                        Hide game titles on game tiles for a cleaner, image-focused view
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('hideGameTitles')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.hideGameTitles ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.hideGameTitles ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Game tile padding - Full width */}
                  <div className="lg:col-span-2 p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Game Tile Padding
                        </label>
                        <p className="text-gray-400 text-sm">
                          Adjust the spacing between game tiles (in pixels)
                        </p>
                      </div>
                      <div className="text-blue-400 font-semibold min-w-[3rem] text-right">
                        {settings.gameTilePadding}px
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="4"
                        max="32"
                        step="2"
                        value={settings.gameTilePadding}
                        onChange={(e) => handlePaddingChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaddingChange(Math.max(4, settings.gameTilePadding - 2))}
                          className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handlePaddingChange(Math.min(32, settings.gameTilePadding + 2))}
                          className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Compact</span>
                      <span>Spacious</span>
                    </div>
                  </div>
                  </div>

                  {/* Restore Defaults Button */}
                  <div className="pt-4 border-t border-gray-700/50">
                    <button
                      onClick={handleRestoreDefaults}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Restore Defaults
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apis' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">API Credentials</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Configure API credentials for enhanced game metadata
                  </p>
                  
                  {/* IGDB Section - 2 Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Instructions */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-base font-medium text-white mb-2">IGDB API</h4>
                        <p className="text-sm text-gray-400 mb-4">
                          IGDB (Internet Game Database) provides comprehensive game metadata including covers, screenshots, descriptions, and more.
                        </p>
                        
                        {/* Instructions */}
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <h5 className="text-sm font-medium text-white mb-2">How to obtain IGDB API credentials:</h5>
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
                      </div>
                    </div>

                    {/* Right Column - Input Fields */}
                    <div className="space-y-4">
                      {/* Client ID Input */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-200">
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={apiCredentials.igdbClientId}
                          onChange={(e) => handleAPIInputChange('igdbClientId', e.target.value)}
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
                          value={apiCredentials.igdbClientSecret}
                          onChange={(e) => handleAPIInputChange('igdbClientSecret', e.target.value)}
                          placeholder="Enter your IGDB Client Secret"
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Status Message */}
                      {apiSaveStatus === 'success' && (
                        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
                          Credentials saved successfully! IGDB service will be restarted.
                        </div>
                      )}
                      {apiSaveStatus === 'error' && (
                        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
                          Failed to save credentials. Please try again.
                        </div>
                      )}

                      {/* Save API Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleAPISave}
                          disabled={isLoadingAPI || !apiCredentials.igdbClientId.trim() || !apiCredentials.igdbClientSecret.trim()}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingAPI ? 'Saving...' : 'Save API Credentials'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-sm flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-600/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
