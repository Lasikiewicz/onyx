export const LAUNCHER_LOOKUP: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  gog: 'GOG',
  xbox: 'Xbox',
  ubisoft: 'Ubisoft Connect',
  uplay: 'Ubisoft Connect',
  rockstar: 'Rockstar',
  battlenet: 'Battle.net',
  blizzard: 'Battle.net',
  ea: 'EA App',
  origin: 'Origin',
  amazon: 'Amazon Games',
  itch: 'itch.io',
};

export const formatLauncher = (launcher?: string): string => {
  if (!launcher) return '';
  const normalized = launcher.toLowerCase();
  if (LAUNCHER_LOOKUP[normalized]) return LAUNCHER_LOOKUP[normalized];
  return launcher.charAt(0).toUpperCase() + launcher.slice(1);
};

export const formatPlaytime = (minutes?: number): string => {
  if (!minutes) return 'Not Played';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Unknown';
  }
};
