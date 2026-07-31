import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Game } from '../types/game';

interface UseAppShellLibraryFiltersOptions {
  activeSection: string;
  games: Game[];
  hideAppsTitles: boolean;
  hideVRTitles: boolean;
  pinnedCategories: string[];
  searchQuery: string;
  selectedCategory: string | null;
  selectedLauncher: string | null;
  setPinnedCategories: Dispatch<SetStateAction<string[]>>;
  sortBy: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed';
}

export function useAppShellLibraryFilters({
  activeSection,
  games,
  hideAppsTitles,
  hideVRTitles,
  pinnedCategories,
  searchQuery,
  selectedCategory,
  selectedLauncher,
  setPinnedCategories,
  sortBy,
}: UseAppShellLibraryFiltersOptions) {
  const handleTogglePinCategory = useCallback((category: string) => {
    setPinnedCategories((previous) => {
      if (previous.includes(category)) {
        return previous.filter((value) => value !== category);
      }

      return [...previous, category];
    });
  }, [setPinnedCategories]);

  const { allCategories, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    let favorites = 0;
    let hidden = 0;

    games.forEach((game) => {
      if (game.favorite) favorites += 1;
      if (game.hidden) hidden += 1;

      game.categories?.forEach((category) => {
        counts[category] = (counts[category] || 0) + 1;
      });
    });

    return {
      allCategories: Object.keys(counts).sort(),
      categoryCounts: {
        ...counts,
        all: games.length,
        favorites,
        hidden,
      },
    };
  }, [games]);

  const hasFavoriteGames = useMemo(() => games.some((game) => game.favorite === true), [games]);
  const hasVRCategory = useMemo(() => allCategories.includes('VR'), [allCategories]);
  const hasAppsCategory = useMemo(() => allCategories.includes('Apps'), [allCategories]);
  const hasHiddenGames = useMemo(() => games.some((game) => game.hidden === true), [games]);

  const getGameLauncher = useCallback((game: Game): string => {
    if (game.id.startsWith('steam-')) return 'steam';
    if (game.id.startsWith('epic-')) return 'epic';
    if (game.id.startsWith('gog-')) return 'gog';
    if (game.id.startsWith('xbox-')) return 'xbox';
    if (game.id.startsWith('ubisoft-')) return 'ubisoft';
    if (game.id.startsWith('rockstar-')) return 'rockstar';
    if (game.id.startsWith('ea-') || game.id.startsWith('origin-')) return 'ea';
    if (game.id.startsWith('battle-') || game.id.startsWith('battlenet-')) return 'battle';

    if (game.source) {
      const source = game.source.toLowerCase();
      const validSources = ['steam', 'epic', 'gog', 'xbox', 'ea', 'origin', 'ubisoft', 'battle', 'battlenet', 'humble', 'itch', 'rockstar'];
      if (validSources.includes(source)) {
        if (source === 'origin') return 'ea';
        if (source === 'battlenet') return 'battle';
        return source;
      }
    }

    const platform = game.platform?.toLowerCase();
    if (platform === 'steam') return 'steam';
    if (platform === 'epic' || platform === 'epic games') return 'epic';
    if (platform === 'gog' || platform === 'gog galaxy') return 'gog';
    if (platform === 'xbox' || platform === 'xbox game pass') return 'xbox';
    if (platform === 'ea' || platform === 'ea app' || platform === 'origin') return 'ea';
    if (platform === 'ubisoft' || platform === 'ubisoft connect') return 'ubisoft';
    if (platform === 'battle.net' || platform === 'battlenet' || platform === 'battle') return 'battle';
    if (platform === 'rockstar' || platform === 'rockstar games') return 'rockstar';

    if (game.installationDirectory) {
      const installPath = game.installationDirectory.toLowerCase();
      if (installPath.includes('steam')) return 'steam';
      if (installPath.includes('epic games') || installPath.includes('epicgames')) return 'epic';
      if (installPath.includes('gog galaxy') || installPath.includes('gog\\games')) return 'gog';
      if (installPath.includes('xboxgames') || installPath.includes('windowsapps')) return 'xbox';
      if (installPath.includes('electronic arts') || installPath.includes('ea games') || installPath.includes('origin')) return 'ea';
      if (installPath.includes('ubisoft')) return 'ubisoft';
      if (installPath.includes('battle.net') || installPath.includes('battlenet')) return 'battle';
      if (installPath.includes('rockstar games')) return 'rockstar';
      if (installPath.includes('humble')) return 'humble';
      if (installPath.includes('itch')) return 'itch';
    }

    return 'other';
  }, []);

  const allLaunchers = useMemo(() => {
    const launchers = new Set<string>();

    games.forEach((game) => {
      const launcher = getGameLauncher(game);
      if (launcher) {
        launchers.add(launcher);
      }
    });

    return Array.from(launchers).sort((left, right) => {
      if (left === 'other') return 1;
      if (right === 'other') return -1;
      return left.localeCompare(right);
    });
  }, [games, getGameLauncher]);

  const filteredGames = useMemo(() => {
    let filtered = games;

    if (activeSection === 'favorites') {
      filtered = filtered.filter((game) => game.favorite);
    } else if (activeSection === 'recent') {
      filtered = filtered.filter((game) => game.lastPlayed);
    }

    if (selectedCategory === 'favorites') {
      filtered = filtered.filter((game) => game.favorite === true);
    } else if (selectedCategory === 'hidden') {
      filtered = filtered.filter((game) => game.hidden === true);
    } else if (selectedCategory) {
      filtered = filtered.filter((game) => game.categories?.includes(selectedCategory));
    }

    if (selectedCategory !== 'hidden') {
      filtered = filtered.filter((game) => game.hidden !== true);
    }

    if (selectedLauncher) {
      filtered = filtered.filter((game) => getGameLauncher(game) === selectedLauncher);
    }

    if (hideVRTitles && selectedCategory !== 'VR' && selectedCategory !== 'Apps') {
      filtered = filtered.filter((game) => !game.categories?.includes('VR'));
    }

    if (hideAppsTitles && selectedCategory !== 'Apps' && selectedCategory !== 'VR') {
      filtered = filtered.filter((game) => !game.categories?.includes('Apps'));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((game) =>
        game.title.toLowerCase().includes(query) ||
        game.genres?.some((genre) => genre.toLowerCase().includes(query)) ||
        game.developers?.some((developer) => developer.toLowerCase().includes(query)),
      );
    }

    return [...filtered].sort((left, right) => {
      const leftPinned = left.pinned === true ? 1 : 0;
      const rightPinned = right.pinned === true ? 1 : 0;
      if (leftPinned !== rightPinned) {
        return rightPinned - leftPinned;
      }

      switch (sortBy) {
        case 'title':
          return (left.sortingName || left.title).localeCompare(right.sortingName || right.title);
        case 'releaseDate':
          return (right.releaseDate ? new Date(right.releaseDate).getTime() : 0) - (left.releaseDate ? new Date(left.releaseDate).getTime() : 0);
        case 'playtime':
          return (right.playtime || 0) - (left.playtime || 0);
        case 'lastPlayed':
          return (right.lastPlayed ? new Date(right.lastPlayed).getTime() : 0) - (left.lastPlayed ? new Date(left.lastPlayed).getTime() : 0);
        default:
          return 0;
      }
    });
  }, [
    activeSection,
    games,
    getGameLauncher,
    hideAppsTitles,
    hideVRTitles,
    searchQuery,
    selectedCategory,
    selectedLauncher,
    sortBy,
  ]);

  return {
    allCategories,
    allLaunchers,
    categoryCounts,
    filteredGames,
    getGameLauncher,
    handleTogglePinCategory,
    hasAppsCategory,
    hasFavoriteGames,
    hasHiddenGames,
    hasVRCategory,
    pinnedCategories,
  };
}
