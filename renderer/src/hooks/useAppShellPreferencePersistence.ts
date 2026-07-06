import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Game } from '../types/game';

type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';

type ListViewOptions = {
  showDescription: boolean;
  showCategories: boolean;
  showPlaytime: boolean;
  showReleaseDate: boolean;
  showGenres: boolean;
  showPlatform: boolean;
  showLauncher: boolean;
  showLogos: boolean;
  titleTextSize: number;
};

type UseAppShellPreferencePersistenceArgs = {
  activeGameId: string | null;
  autoSizeToFit: boolean;
  backgroundBlur: number;
  backgroundBrightnessByView: Record<ViewMode, number>;
  backgroundColor: string;
  backgroundMode: 'image' | 'color';
  cardColumns: number;
  cardPostersOnly: boolean;
  cardSmartFill: boolean;
  gameTilePadding: number;
  games: Game[];
  gridSize: number;
  hideAppsTitles: boolean;
  hideGameTitles: boolean;
  hideVRTitles: boolean;
  isInitialLoad: boolean;
  listViewOptions: ListViewOptions;
  listViewSize: number;
  loading: boolean;
  logoSize: number;
  pinnedCategories: string[];
  setActiveGameId: Dispatch<SetStateAction<string | null>>;
  viewMode: ViewMode;
};

type DebouncedPatchArgs = {
  delay: number;
  enabled: boolean;
  errorLabel: string;
  patch: Record<string, unknown>;
};

function useDebouncedPreferencePatch({ delay, enabled, errorLabel, patch }: DebouncedPatchArgs) {
  useEffect(() => {
    if (!enabled) return;

    const savePatch = async () => {
      try {
        await window.electronAPI.savePreferences(patch as any);
      } catch (error) {
        console.error(`Error saving ${errorLabel}:`, error);
      }
    };

    const timeoutId = window.setTimeout(savePatch, delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, enabled, errorLabel, patch]);
}

export function useAppShellPreferencePersistence({
  activeGameId,
  autoSizeToFit,
  backgroundBlur,
  backgroundBrightnessByView,
  backgroundColor,
  backgroundMode,
  cardColumns,
  cardPostersOnly,
  cardSmartFill,
  gameTilePadding,
  games,
  gridSize,
  hideAppsTitles,
  hideGameTitles,
  hideVRTitles,
  isInitialLoad,
  listViewOptions,
  listViewSize,
  loading,
  logoSize,
  pinnedCategories,
  setActiveGameId,
  viewMode,
}: UseAppShellPreferencePersistenceArgs) {
  const persistenceEnabled = !isInitialLoad;
  const gridSizePatch = useMemo(() => ({ gridSize }), [gridSize]);
  const cardColumnsPatch = useMemo(() => ({ cardColumns }), [cardColumns]);
  const cardPostersOnlyPatch = useMemo(() => ({ cardPostersOnly }), [cardPostersOnly]);
  const cardSmartFillPatch = useMemo(() => ({ cardSmartFill }), [cardSmartFill]);
  const logoSizePatch = useMemo(() => ({ logoSize }), [logoSize]);
  const pinnedCategoriesPatch = useMemo(() => ({ pinnedCategories }), [pinnedCategories]);
  const hideVRTitlesPatch = useMemo(() => ({ hideVRTitles }), [hideVRTitles]);
  const hideAppsTitlesPatch = useMemo(() => ({ hideAppsTitles }), [hideAppsTitles]);
  const appearancePatch = useMemo(
    () => ({
      backgroundBlur,
      backgroundBrightnessByView,
      backgroundColor,
      backgroundMode,
      gameTilePadding,
      hideGameTitles,
      listViewOptions,
      listViewSize,
      viewMode,
    }),
    [
      backgroundBlur,
      backgroundBrightnessByView,
      backgroundColor,
      backgroundMode,
      gameTilePadding,
      hideGameTitles,
      listViewOptions,
      listViewSize,
      viewMode,
    ],
  );
  const activeGamePatch = useMemo(() => ({ activeGameId }), [activeGameId]);

  useDebouncedPreferencePatch({
    delay: 500,
    enabled: persistenceEnabled && !autoSizeToFit,
    errorLabel: 'grid size',
    patch: gridSizePatch,
  });

  useDebouncedPreferencePatch({
    delay: 500,
    enabled: persistenceEnabled,
    errorLabel: 'logo size',
    patch: logoSizePatch,
  });

  useDebouncedPreferencePatch({
    delay: 500,
    enabled: persistenceEnabled,
    errorLabel: 'card columns',
    patch: cardColumnsPatch,
  });

  useDebouncedPreferencePatch({
    delay: 300,
    enabled: persistenceEnabled,
    errorLabel: 'card posters only',
    patch: cardPostersOnlyPatch,
  });

  useDebouncedPreferencePatch({
    delay: 300,
    enabled: persistenceEnabled,
    errorLabel: 'card smart fill',
    patch: cardSmartFillPatch,
  });

  useDebouncedPreferencePatch({
    delay: 300,
    enabled: persistenceEnabled,
    errorLabel: 'pinned categories',
    patch: pinnedCategoriesPatch,
  });

  useDebouncedPreferencePatch({
    delay: 300,
    enabled: persistenceEnabled,
    errorLabel: 'hide VR titles preference',
    patch: hideVRTitlesPatch,
  });

  useDebouncedPreferencePatch({
    delay: 300,
    enabled: persistenceEnabled,
    errorLabel: 'hide Apps titles preference',
    patch: hideAppsTitlesPatch,
  });

  useDebouncedPreferencePatch({
    delay: 500,
    enabled: persistenceEnabled,
    errorLabel: 'appearance preferences',
    patch: appearancePatch,
  });

  useDebouncedPreferencePatch({
    delay: 300,
    enabled: persistenceEnabled,
    errorLabel: 'active game ID',
    patch: activeGamePatch,
  });

  useEffect(() => {
    if (!loading && games.length > 0 && activeGameId) {
      const gameExists = games.some((game) => game.id === activeGameId);
      if (!gameExists) {
        setActiveGameId(null);
      }
    }
  }, [activeGameId, games, loading, setActiveGameId]);
}
