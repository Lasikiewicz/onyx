import React, { useState, useEffect } from 'react';

interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnyxSettings {
  minimizeToTray: boolean;
  showSystemTrayIcon: boolean;
  startWithComputer: boolean;
  startClosedToTray: boolean;
  updateLibrariesOnStartup: boolean;
}

export const OnyxSettingsModal: React.FC<OnyxSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<OnyxSettings>({
    minimizeToTray: false,
    showSystemTrayIcon: true,
    startWithComputer: false,
    startClosedToTray: false,
    updateLibrariesOnStartup: false,
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
          });
        } catch (error) {
          console.error('Error loading Onyx settings:', error);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  const handleToggle = (key: keyof OnyxSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  const handleSave = async () => {
    try {
      await window.electronAPI.savePreferences({
        minimizeToTray: settings.minimizeToTray,
        showSystemTrayIcon: settings.showSystemTrayIcon,
        startWithComputer: settings.startWithComputer,
        startClosedToTray: settings.startClosedToTray,
        updateLibrariesOnStartup: settings.updateLibrariesOnStartup,
      });
      
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
      
      onClose();
    } catch (error) {
      console.error('Error saving Onyx settings:', error);
      alert('Failed to save settings');
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
          className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Onyx Settings</h2>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Minimize to tray */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-gray-200 font-medium">
                  Minimize Onyx to system tray when the application window is closed
                </label>
              </div>
              <button
                onClick={() => handleToggle('minimizeToTray')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.minimizeToTray ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.minimizeToTray ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Show system tray icon */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-gray-200 font-medium">
                  Show system tray icon
                </label>
              </div>
              <button
                onClick={() => handleToggle('showSystemTrayIcon')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.showSystemTrayIcon ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.showSystemTrayIcon ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Start with computer */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-gray-200 font-medium">
                  Start with computer
                </label>
              </div>
              <button
                onClick={() => handleToggle('startWithComputer')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.startWithComputer ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.startWithComputer ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Start closed to tray */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-gray-200 font-medium">
                  Start closed to tray
                </label>
              </div>
              <button
                onClick={() => handleToggle('startClosedToTray')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.startClosedToTray ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.startClosedToTray ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Update libraries on startup */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-gray-200 font-medium">
                  Update libraries on start up
                </label>
                <p className="text-gray-400 text-sm mt-1">
                  If new games found go through each selecting metadata, images etc
                </p>
              </div>
              <button
                onClick={() => handleToggle('updateLibrariesOnStartup')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.updateLibrariesOnStartup ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.updateLibrariesOnStartup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
