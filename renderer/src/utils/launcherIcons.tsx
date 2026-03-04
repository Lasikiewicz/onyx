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

export const normalizeLauncherId = (launcher: string): string => launcher.toLowerCase().trim();

export const getLauncherDisplayName = (launcher: string): string => {
  const normalized = normalizeLauncherId(launcher);
  return LAUNCHER_DISPLAY_NAMES[normalized] || launcher;
};

export const getLauncherIconSrc = (launcher: string): string | undefined => {
  const normalized = normalizeLauncherId(launcher);
  return LAUNCHER_ICON_SOURCES[normalized];
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
