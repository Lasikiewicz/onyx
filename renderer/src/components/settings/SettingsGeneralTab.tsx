import React from 'react';
import { SettingsInput, SettingsSection, SettingsToggle } from './SettingsComponents';

const CONTROLLER_NAVIGATION_AVAILABLE = false;

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
  enableGamepadSupport: boolean;
  gamepadButtonLayout: 'xbox' | 'playstation';
  gamepadNavigationSpeed: number;
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
      | 'confirmGameLaunch'
      | 'enableGamepadSupport',
  ) => void;
  onGamepadButtonLayoutChange: (layout: 'xbox' | 'playstation') => void;
  onGamepadNavigationSpeedChange: (speed: number) => void;
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
  enableGamepadSupport,
  gamepadButtonLayout,
  gamepadNavigationSpeed,
  onToggle,
  onGamepadButtonLayoutChange,
  onGamepadNavigationSpeedChange,
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

      <SettingsSection title="Controller" description="Coming soon: controller navigation is currently disabled">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="md:col-span-2 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-xs text-blue-100">
            Coming soon - controller navigation is disabled while input support is being finalized.
          </div>
          <SettingsToggle
            label="Controller Navigation"
            description="Gamepad navigation for grid, logo, and list views will return in a future update"
            checked={CONTROLLER_NAVIGATION_AVAILABLE && enableGamepadSupport}
            onChange={() => onToggle('enableGamepadSupport')}
            disabled={!CONTROLLER_NAVIGATION_AVAILABLE}
          />
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 space-y-2 opacity-50 pointer-events-none">
            <div>
              <label className="text-gray-200 text-sm font-medium block mb-0.5">
                Button Labels
              </label>
              <p className="text-gray-400 text-xs">
                Choose the controller family used for action mapping copy
              </p>
            </div>
            <select
              value={gamepadButtonLayout}
              onChange={(event) => onGamepadButtonLayoutChange(event.target.value as 'xbox' | 'playstation')}
              disabled={!CONTROLLER_NAVIGATION_AVAILABLE}
              className="w-full px-2.5 py-1.5 bg-gray-900/80 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="playstation">PlayStation</option>
              <option value="xbox">Xbox</option>
            </select>
          </div>
          <SettingsInput
            label="Navigation Repeat"
            description="Lower values repeat held stick/D-pad movement faster"
            type="number"
            value={gamepadNavigationSpeed}
            onChange={(value) => {
              const parsed = Number(value);
              if (Number.isFinite(parsed)) {
                onGamepadNavigationSpeedChange(Math.max(100, Math.min(650, parsed)));
              }
            }}
            step={10}
            suffix="ms"
            disabled={!CONTROLLER_NAVIGATION_AVAILABLE}
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
