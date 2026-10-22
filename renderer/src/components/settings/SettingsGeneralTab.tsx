import React, { useEffect, useState } from 'react';
import type { BigScreenDisplayInfo } from '../../types/bigScreen';
import { SettingsInput, SettingsSection, SettingsToggle } from './SettingsComponents';
import { SettingsSunshineSection } from './SettingsSunshineSection';

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
  enableBringToFrontShortcut: boolean;
  bringToFrontShortcut: string;
  enableGuideButtonWake: boolean;
  startInBigScreen: boolean;
  bigScreenDisplay: 'current' | 'primary' | number;
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
      | 'enableGamepadSupport'
      | 'enableBringToFrontShortcut'
      | 'enableGuideButtonWake'
      | 'startInBigScreen',
  ) => void;
  onGamepadButtonLayoutChange: (layout: 'xbox' | 'playstation') => void;
  onGamepadNavigationSpeedChange: (speed: number) => void;
  onBringToFrontShortcutChange: (shortcut: string) => void;
  onBigScreenDisplayChange: (display: 'current' | 'primary' | number) => void;
  onEnterBigScreen: (display: 'current' | 'primary' | number) => void;
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
  enableBringToFrontShortcut,
  bringToFrontShortcut,
  enableGuideButtonWake,
  startInBigScreen,
  bigScreenDisplay,
  onToggle,
  onGamepadButtonLayoutChange,
  onGamepadNavigationSpeedChange,
  onBringToFrontShortcutChange,
  onBigScreenDisplayChange,
  onEnterBigScreen,
}) => {
  const [displays, setDisplays] = useState<BigScreenDisplayInfo[]>([]);
  useEffect(() => {
    let cancelled = false;
    window.electronAPI.bigScreen?.listDisplays?.()
      .then((next: BigScreenDisplayInfo[]) => {
        if (!cancelled && Array.isArray(next)) setDisplays(next);
      })
      .catch(() => {
        if (!cancelled) setDisplays([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
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

      <SettingsSection title="Controller" description="Move the library with a gamepad. The desktop layout stays the same.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <SettingsToggle
            label="Controller Navigation"
            description="D-pad and left stick move the highlight. A confirms, B goes back, X opens the game menu, Y favorites, View focuses search, Menu opens the app menu."
            checked={enableGamepadSupport}
            onChange={() => onToggle('enableGamepadSupport')}
          />
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 space-y-2">
            <div>
              <label className="text-gray-200 text-sm font-medium block mb-0.5">
                Button Labels
              </label>
              <p className="text-gray-400 text-xs">
                Xbox and PlayStation controllers both use the standard button layout. This only changes the hint text.
              </p>
            </div>
            <select
              value={gamepadButtonLayout}
              onChange={(event) => onGamepadButtonLayoutChange(event.target.value as 'xbox' | 'playstation')}
              className="w-full px-2.5 py-1.5 bg-gray-900/80 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="playstation">PlayStation</option>
              <option value="xbox">Xbox</option>
            </select>
          </div>
          <SettingsInput
            label="Navigation Repeat"
            description="Lower values repeat held stick or D-pad movement faster"
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
          />
          <SettingsToggle
            label="Bring Onyx to Front"
            description="Global shortcut raises Onyx when another window is focused. It is refused if it matches the Suspend/Resume shortcut."
            checked={enableBringToFrontShortcut}
            onChange={() => onToggle('enableBringToFrontShortcut')}
          />
          <SettingsInput
            label="Bring-to-Front Shortcut"
            description="Default is Ctrl+Shift+G. Suspend/Resume stays Ctrl+Shift+S unless you change it."
            type="text"
            value={bringToFrontShortcut}
            onChange={onBringToFrontShortcutChange}
          />
          <SettingsToggle
            label="Xbox Guide Button"
            description="On Windows, the Xbox Guide button also raises Onyx. It does not suspend or resume a game."
            checked={enableGuideButtonWake}
            onChange={() => onToggle('enableGuideButtonWake')}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Big Screen" description="A fullscreen TV layout for a controller. Launch it from Moonlight with --big-screen.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <SettingsToggle
            label="Start in Big Screen"
            description="Open the TV layout on the next launch. --big-screen does this for one launch without changing the setting."
            checked={startInBigScreen}
            onChange={() => onToggle('startInBigScreen')}
          />
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 space-y-2">
            <div>
              <label className="text-gray-200 text-sm font-medium block mb-0.5">Display</label>
              <p className="text-gray-400 text-xs">Fullscreen uses this display. Current means the display Onyx is already on.</p>
            </div>
            <select
              value={String(bigScreenDisplay)}
              onChange={(event) => {
                const value = event.target.value;
                onBigScreenDisplayChange(value === 'current' || value === 'primary' ? value : Number(value));
              }}
              className="w-full px-2.5 py-1.5 bg-gray-900/80 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="current">Current display</option>
              <option value="primary">Primary display</option>
              {displays.map((display) => (
                <option key={display.id} value={display.id}>
                  {display.primary ? 'Primary' : 'Display'} {display.id} ({display.width}x{display.height})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => onEnterBigScreen(bigScreenDisplay)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Enter Big Screen
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSunshineSection />

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
