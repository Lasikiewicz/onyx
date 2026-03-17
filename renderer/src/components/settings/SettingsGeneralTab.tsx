import React from 'react';
import { SettingsSection, SettingsToggle } from './SettingsComponents';

interface SettingsGeneralTabProps {
  startWithComputer: boolean;
  startMinimized: boolean;
  showSystemTrayIcon: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  startClosedToTray: boolean;
  enableHardwareAcceleration: boolean;
  minimizeOnGameLaunch: boolean;
  restoreAfterLaunch: boolean;
  confirmGameLaunch: boolean;
  onToggle: (
    key:
      | 'startWithComputer'
      | 'startMinimized'
      | 'showSystemTrayIcon'
      | 'minimizeToTray'
      | 'closeToTray'
      | 'startClosedToTray'
      | 'enableHardwareAcceleration'
      | 'minimizeOnGameLaunch'
      | 'restoreAfterLaunch'
      | 'confirmGameLaunch',
  ) => void;
}

export const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  startWithComputer,
  startMinimized,
  showSystemTrayIcon,
  minimizeToTray,
  closeToTray,
  startClosedToTray,
  enableHardwareAcceleration,
  minimizeOnGameLaunch,
  restoreAfterLaunch,
  confirmGameLaunch,
  onToggle,
}) => {
  return (
    <div className="space-y-6 p-6">
      <SettingsSection title="System" description="Configure how Onyx integrates with your system">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <SettingsToggle
            label="Start with Windows"
            description="Automatically start Onyx when you log into Windows"
            checked={startWithComputer}
            onChange={() => onToggle('startWithComputer')}
          />
          <SettingsToggle
            label="Start Minimized"
            description="Start Onyx minimized on launch"
            checked={startMinimized}
            onChange={() => onToggle('startMinimized')}
          />
          <SettingsToggle
            label="System Tray Icon"
            description="Show Onyx in the system tray"
            checked={showSystemTrayIcon}
            onChange={() => onToggle('showSystemTrayIcon')}
          />
          <SettingsToggle
            label="Minimize to Tray"
            description="Minimize to the system tray instead of the taskbar"
            checked={minimizeToTray}
            onChange={() => onToggle('minimizeToTray')}
          />
          <SettingsToggle
            label="Close to Tray"
            description="Close button minimizes to tray instead of quitting"
            checked={closeToTray}
            onChange={() => onToggle('closeToTray')}
          />
          <SettingsToggle
            label="Start Closed to Tray"
            description="Launch Onyx in the background"
            checked={startClosedToTray}
            onChange={() => onToggle('startClosedToTray')}
          />
          <SettingsToggle
            label="Hardware Acceleration"
            description="Use GPU for rendering (Requires Restart)"
            checked={enableHardwareAcceleration}
            onChange={() => onToggle('enableHardwareAcceleration')}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Window Behavior">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <SettingsToggle
            label="Minimize on Game Launch"
            description="Automatically minimize Onyx when a game starts"
            checked={minimizeOnGameLaunch}
            onChange={() => onToggle('minimizeOnGameLaunch')}
          />
          <SettingsToggle
            label="Restore Window on Game Exit"
            description="Automatically restore Onyx when you close a game"
            checked={restoreAfterLaunch}
            onChange={() => onToggle('restoreAfterLaunch')}
          />
          <SettingsToggle
            label="Confirm Game Launch"
            description="Show a confirmation dialog before launching games"
            checked={confirmGameLaunch}
            onChange={() => onToggle('confirmGameLaunch')}
          />
        </div>
      </SettingsSection>
    </div>
  );
};
