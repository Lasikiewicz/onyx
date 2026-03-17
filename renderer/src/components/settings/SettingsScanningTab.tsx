import React from 'react';
import { SettingsInput, SettingsSection, SettingsToggle } from './SettingsComponents';

interface SettingsScanningTabProps {
  backgroundScanEnabled: boolean;
  backgroundScanIntervalMinutes: number;
  updateLibrariesOnStartup: boolean;
  checkForUpdatesOnStartup: boolean;
  onSetBackgroundScanEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onSetBackgroundScanIntervalMinutes: React.Dispatch<React.SetStateAction<number>>;
  onToggleUpdateLibrariesOnStartup: () => void;
  onToggleCheckForUpdatesOnStartup: () => void;
}

export const SettingsScanningTab: React.FC<SettingsScanningTabProps> = ({
  backgroundScanEnabled,
  backgroundScanIntervalMinutes,
  updateLibrariesOnStartup,
  checkForUpdatesOnStartup,
  onSetBackgroundScanEnabled,
  onSetBackgroundScanIntervalMinutes,
  onToggleUpdateLibrariesOnStartup,
  onToggleCheckForUpdatesOnStartup,
}) => {
  return (
    <div className="space-y-6 p-6">
      <SettingsSection title="Automatic Scanning" description="Configure how Onyx detects new games">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <SettingsToggle
            label="Background Scanning"
            description="Automatically scan for new games periodically"
            checked={backgroundScanEnabled}
            onChange={(checked) => {
              onSetBackgroundScanEnabled(checked);
              if (window.electronAPI.setBackgroundScanEnabled) {
                window.electronAPI.setBackgroundScanEnabled(checked);
              }
            }}
          />
          {backgroundScanEnabled && (
            <SettingsInput
              label="Scan Interval (Minutes)"
              value={backgroundScanIntervalMinutes}
              onChange={(value) => {
                const next = parseInt(value) || 30;
                onSetBackgroundScanIntervalMinutes(next);
                if (window.electronAPI.setBackgroundScanIntervalMinutes) {
                  window.electronAPI.setBackgroundScanIntervalMinutes(next);
                }
              }}
              type="number"
              description="How often to check for new games (1-1440 minutes)"
            />
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Startup Behavior" description="Configure scanning behavior on application start">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <SettingsToggle
            label="Update Libraries on Startup"
            description="Automatically scan for new games when Onyx starts"
            checked={updateLibrariesOnStartup}
            onChange={onToggleUpdateLibrariesOnStartup}
          />
          <SettingsToggle
            label="Check for Updates on Startup"
            description="Check for app updates when Onyx starts"
            checked={checkForUpdatesOnStartup}
            onChange={onToggleCheckForUpdatesOnStartup}
          />
        </div>
      </SettingsSection>
    </div>
  );
};
