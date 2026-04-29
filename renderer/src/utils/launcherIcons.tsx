import React from 'react';
import steamIcon from '../assets/launcher-icons/steam.svg';
import epicGamesIcon from '../assets/launcher-icons/epic-games.svg';
import gogGalaxyIcon from '../assets/launcher-icons/gog-galaxy.svg';
import xboxGamePassIcon from '../assets/launcher-icons/xbox-game-pass.svg';
import ubisoftIcon from '../assets/launcher-icons/ubisoft.svg';
import rockstarGamesIcon from '../assets/launcher-icons/rockstar-games.svg';
import eaAppOriginIcon from '../assets/launcher-icons/ea-app-origin.svg';
import battleNetIcon from '../assets/launcher-icons/battle-net.svg';
import humbleBundleIcon from '../assets/launcher-icons/humble-bundle.svg';
import itchIoIcon from '../assets/launcher-icons/itch-io.svg';
import manualBaselineGamesIcon from '../assets/manual-folder-icons/baseline-games.svg';
import manualGamesVariant1Icon from '../assets/manual-folder-icons/games-variant-1.svg';
import manualGamesVariant2Icon from '../assets/manual-folder-icons/games-variant-2.svg';
import manualGamesVariant3Icon from '../assets/manual-folder-icons/games-variant-3.svg';
import manualApps16FilledIcon from '../assets/manual-folder-icons/apps-16-filled.svg';
import manualAppsFilledIcon from '../assets/manual-folder-icons/apps-filled.svg';
import manualAppsOutlineIcon from '../assets/manual-folder-icons/apps-outline.svg';
import manualBadgeVrFillIcon from '../assets/manual-folder-icons/badge-vr-fill.svg';
import manualBadgeVrOutlineIcon from '../assets/manual-folder-icons/badge-vr-outline.svg';
import manualVrCompactIcon from '../assets/manual-folder-icons/vr-compact.svg';
import manualVrBadgeIcon from '../assets/manual-folder-icons/vr-badge.svg';
import manualVrGogglesFilledIcon from '../assets/manual-folder-icons/vr-goggles-filled.svg';
import manualVrGogglesOutlineIcon from '../assets/manual-folder-icons/vr-goggles-outline.svg';
import manualVrSquareIcon from '../assets/manual-folder-icons/vr-square.svg';

const LAUNCHER_DISPLAY_NAMES: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  gog: 'GOG Galaxy',
  xbox: 'Xbox Game Pass',
  ea: 'EA App / Origin',
  origin: 'EA App / Origin',
  ubisoft: 'Ubisoft Connect',
  battle: 'Battle.net',
  humble: 'Humble',
  itch: 'itch.io',
  rockstar: 'Rockstar Games',
  hardcoded: 'Official Launcher',
  other: 'Other',
};

const LAUNCHER_ICON_SOURCES: Record<string, string> = {
  steam: steamIcon,
  epic: epicGamesIcon,
  gog: gogGalaxyIcon,
  xbox: xboxGamePassIcon,
  ea: eaAppOriginIcon,
  origin: eaAppOriginIcon,
  ubisoft: ubisoftIcon,
  battle: battleNetIcon,
  humble: humbleBundleIcon,
  itch: itchIoIcon,
  rockstar: rockstarGamesIcon,
};

const MANUAL_FOLDER_ICON_SOURCES_BY_ID: Record<string, string> = {
  'baseline-games': manualBaselineGamesIcon,
  'games-variant-1': manualGamesVariant1Icon,
  'games-variant-2': manualGamesVariant2Icon,
  'games-variant-3': manualGamesVariant3Icon,
  'apps-16-filled': manualApps16FilledIcon,
  'apps-filled': manualAppsFilledIcon,
  'apps-outline': manualAppsOutlineIcon,
  'badge-vr-fill': manualBadgeVrFillIcon,
  'badge-vr-outline': manualBadgeVrOutlineIcon,
  'vr-compact': manualVrCompactIcon,
  'vr-badge': manualVrBadgeIcon,
  'vr-goggles-filled': manualVrGogglesFilledIcon,
  'vr-goggles-outline': manualVrGogglesOutlineIcon,
  'vr-square': manualVrSquareIcon,
};

let manualFolderIconMapByLauncher: Record<string, string> = {};
let manualFolderIconMapLoaded = false;
let manualFolderIconSyncPromise: Promise<boolean> | null = null;

const LAUNCHER_ALIASES: Record<string, string> = {
  'steam': 'steam',
  'epic': 'epic',
  'epic games': 'epic',
  'gog': 'gog',
  'gog galaxy': 'gog',
  'xbox': 'xbox',
  'xbox game pass': 'xbox',
  'ea': 'ea',
  'ea app': 'ea',
  'origin': 'ea',
  'ea app / origin': 'ea',
  'ubisoft': 'ubisoft',
  'uplay': 'ubisoft',
  'ubisoft connect': 'ubisoft',
  'battle': 'battle',
  'battle.net': 'battle',
  'battlenet': 'battle',
  'humble': 'humble',
  'humble bundle': 'humble',
  'itch': 'itch',
  'itch.io': 'itch',
  'rockstar': 'rockstar',
  'rockstar games': 'rockstar',
  'hardcoded': 'hardcoded',
  'official launcher': 'hardcoded',
  'other': 'other',
};

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const normalizeLauncherId = (launcher: string): string => {
  const normalized = launcher.toLowerCase().trim().replace(/[_-]+/g, ' ');
  return LAUNCHER_ALIASES[normalized] || normalized;
};

const syncManualFolderIconMap = async (force: boolean = false): Promise<boolean> => {
  if (!force && manualFolderIconMapLoaded) return false;
  if (manualFolderIconSyncPromise) return manualFolderIconSyncPromise;

  manualFolderIconSyncPromise = (async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.getManualFolderConfigs) {
      manualFolderIconMapLoaded = true;
      return false;
    }

    try {
      const configs = await window.electronAPI.getManualFolderConfigs();
      const nextMap: Record<string, string> = {};

      Object.values(configs || {}).forEach((config: any) => {
        if (!config?.name || !config?.icon) return;
        const iconSource = MANUAL_FOLDER_ICON_SOURCES_BY_ID[config.icon];
        if (!iconSource) return;
        nextMap[normalizeLauncherId(config.name)] = iconSource;
      });

      const previousSerialized = JSON.stringify(manualFolderIconMapByLauncher);
      const nextSerialized = JSON.stringify(nextMap);
      const changed = previousSerialized !== nextSerialized;

      manualFolderIconMapByLauncher = nextMap;
      manualFolderIconMapLoaded = true;
      return changed;
    } catch {
      manualFolderIconMapLoaded = true;
      return false;
    }
  })().finally(() => {
    manualFolderIconSyncPromise = null;
  });

  return manualFolderIconSyncPromise;
};

export const getLauncherDisplayName = (launcher: string): string => {
  const normalized = normalizeLauncherId(launcher);
  return LAUNCHER_DISPLAY_NAMES[normalized] || toTitleCase(launcher);
};

export const getLauncherIconSrc = (launcher: string): string | undefined => {
  const normalized = normalizeLauncherId(launcher);
  return LAUNCHER_ICON_SOURCES[normalized] || manualFolderIconMapByLauncher[normalized];
};

interface LauncherIconProps {
  launcher: string;
  className?: string;
  alt?: string;
  tone?: 'themed' | 'original';
}

export const LauncherIcon: React.FC<LauncherIconProps> = ({
  launcher,
  className = 'w-4 h-4',
  alt,
  tone = 'themed',
}) => {
  const [, forceRerender] = React.useState(0);

  React.useEffect(() => {
    let isDisposed = false;

    const refresh = async (force: boolean) => {
      const changed = await syncManualFolderIconMap(force);
      if (changed && !isDisposed) {
        forceRerender((value) => value + 1);
      }
    };

    void refresh(false);

    const handleManualFolderIconUpdate = () => {
      void refresh(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('onyx:manual-folder-icons-updated', handleManualFolderIconUpdate);
    }

    return () => {
      isDisposed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('onyx:manual-folder-icons-updated', handleManualFolderIconUpdate);
      }
    };
  }, []);

  const iconSrc = getLauncherIconSrc(launcher);
  if (!iconSrc) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    );
  }

  const toneClass = tone === 'themed' ? ' brightness-0 invert opacity-90' : '';
  return <img src={iconSrc} alt={alt ?? `${getLauncherDisplayName(launcher)} icon`} className={`${className}${toneClass}`} />;
};
