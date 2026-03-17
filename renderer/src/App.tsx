import { Suspense, lazy, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useGameLibrary } from './hooks/useGameLibrary';
import { useFullscreen } from './hooks/useFullscreen';
import { useAppShellEvents } from './hooks/useAppShellEvents';
import { useAppPreferences } from './hooks/useAppPreferences';
import { useGameLaunchFlow } from './hooks/useGameLaunchFlow';
import { useAnimatedMediaPolicy } from './hooks/useAnimatedMediaPolicy';
import { useImporterWorkbench } from './hooks/useImporterWorkbench';
import { useAppShellModals } from './hooks/useAppShellModals';
import { useAppShellSystemState } from './hooks/useAppShellSystemState';
import { useSettingsSaveRefresh } from './hooks/useSettingsSaveRefresh';
import { LibraryGrid } from './components/LibraryGrid';
import { LibraryListView } from './components/LibraryListView';
import { RightClickMenu } from './components/RightClickMenu';
import { GameContextMenu } from './components/GameContextMenu';
import { AddGameModal } from './components/AddGameModal';
import { GameDetailsPanel } from './components/GameDetailsPanel';
import { LINK_DISPLAY_ORDER, DEFAULT_VISIBLE_LINK_TYPES } from './components/GameLinks';
import { GameMetadataEditor } from './components/GameMetadataEditor';
import { SteamConfigModal } from './components/SteamConfigModal';
import { CategoriesEditor } from './components/CategoriesEditor';
import { TopBar } from './components/TopBar';
import { MenuBar } from './components/MenuBar';
import { TopBarPositions } from './components/TopBarContextMenu';
import { UpdateLibraryModal } from './components/UpdateLibraryModal';
import { APISettingsModal } from './components/APISettingsModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { AppShellOverlays } from './components/appShell/AppShellOverlays';
import { Game, GameMetadata } from './types/game';
import { areAPIsConfigured } from './utils/apiValidation';

const LibraryCarousel = lazy(() =>
  import('./components/LibraryCarousel').then((module) => ({ default: module.LibraryCarousel })),
);
const LibraryCoverFlow = lazy(() =>
  import('./components/LibraryCoverFlow').then((module) => ({ default: module.LibraryCoverFlow })),
);
const OnyxSettingsModal = lazy(() =>
  import('./components/OnyxSettingsModal').then((module) => ({ default: module.OnyxSettingsModal })),
);
const MetadataSearchModal = lazy(() =>
  import('./components/MetadataSearchModal').then((module) => ({ default: module.MetadataSearchModal })),
);
const ImportWorkbench = lazy(() =>
  import('./components/importer/ImportWorkbenchV2').then((module) => ({ default: module.ImportWorkbenchV2 })),
);
const GameManager = lazy(() =>
  import('./components/GameManager').then((module) => ({ default: module.GameManager })),
);
const BugReportModal = lazy(() =>
  import('./components/BugReportModal').then((module) => ({ default: module.BugReportModal })),
);
const WelcomeScreen = lazy(() =>
  import('./components/WelcomeScreen').then((module) => ({ default: module.WelcomeScreen })),
);

const lazyRenderFallback = null;

function App() {
  // Main App Component
  const { games, loading, error, reorderGames, addCustomGame, loadLibrary, deleteGame, updateGameInState } = useGameLibrary();

  // Initialize fullscreen and gamepad support
  useFullscreen();

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const {
    closeCategoriesEditor,
    closeGameManager,
    closeLibraryTutorial,
    closeMetadataEditor,
    closeMetadataSearch,
    closeOnyxSettings,
    editingCategoriesGame,
    fixingGame,
    forceShowInitialOnboarding,
    gameManagerInitialGameId,
    gameManagerInitialTab,
    isAPISettingsOpen,
    isBugReportOpen,
    isCategoriesEditorOpen,
    isGameManagerOpen,
    isMetadataEditorOpen,
    isMetadataSearchOpen,
    isModalOpen,
    isOnyxSettingsOpen,
    isSteamConfigOpen,
    isUpdateLibraryOpen,
    onyxSettingsInitialTab,
    openCategoriesEditor,
    openGameManager,
    openLibraryTutorial,
    openOnyxSettings,
    selectedExecutable,
    setForceShowInitialOnboarding,
    setIsAPISettingsOpen,
    setIsBugReportOpen,
    setIsModalOpen,
    setIsOnyxSettingsOpen,
    setIsSteamConfigOpen,
    setIsUpdateLibraryOpen,
    setOnyxSettingsInitialTab,
    setShowLibraryTutorial,
    showLibraryTutorial,
    showOptimizerModal,
    setShowOptimizerModal,
  } = useAppShellModals();

  // Scanning state
  const [, setIsScanningSteam] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const {
    changelogError,
    changelogLoading,
    changelogSource,
    crashDumpPaths,
    currentVersion,
    handleDismissCrashDumps,
    handleDismissUpdateNotification,
    handleOpenCrashDumpFolder,
    handleSaveCrashDumps,
    handleUpdateNow,
    isUpdateModalTest,
    openSimulatedUpdateModal,
    setCrashDumpPaths,
    setIsUpdateModalTest,
    setUpdateNotification,
    updateNotification,
  } = useAppShellSystemState();

  // Search and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow'>('grid');
  const [activeSection] = useState('library');
  const [showTopBar] = useState(false);
  const [gridSize, setGridSize] = useState(120);
  const [logoSize, setLogoSize] = useState(100);
  const [pinnedCategories, setPinnedCategories] = useState<string[]>([]);
  const autoPinOptOutRef = useRef<Set<string>>(new Set());
  const [hideVRTitles, setHideVRTitles] = useState(true);
  const [hideAppsTitles, setHideAppsTitles] = useState(true);
  const [hideGameTitles, setHideGameTitles] = useState(false);
  const [gameTilePadding, setGameTilePadding] = useState(3);
  const [selectedBoxArtSize, setSelectedBoxArtSize] = useState(25);
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [logoBackgroundColor, setLogoBackgroundColor] = useState('#374151');
  const [logoBackgroundOpacity, setLogoBackgroundOpacity] = useState(100);
  const [backgroundBlur, setBackgroundBlur] = useState(40);
  const [backgroundBrightnessByView, setBackgroundBrightnessByView] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>>({
    grid: 0.3,
    list: 0.3,
    logo: 0.3,
    carousel: 0.3,
    coverflow: 0.3,
  });
  const [showCarouselDetails, setShowCarouselDetails] = useState(true);
  const [showCarouselLogos, setShowCarouselLogos] = useState(true);
  const [detailsBarSize, setDetailsBarSize] = useState(14);
  const [carouselLogoSize, setCarouselLogoSize] = useState(100);
  const [carouselButtonSize, setCarouselButtonSize] = useState(14);
  const [carouselDescriptionSize, setCarouselDescriptionSize] = useState(18);
  const [startupProgress, setStartupProgress] = useState<{ message: string } | null>(null);
  const [gridDescriptionSize] = useState(14);
  const defaultListViewOptions = {
    showDescription: true,
    showCategories: false,
    showPlaytime: true,
    showReleaseDate: true,
    showGenres: true,
    showPlatform: false,
    showLauncher: true,
    showLogos: false,
    titleTextSize: 18,
  };
  // Link management (source of truth from Settings; respected by all views)
  const [linkDisplayOrder, setLinkDisplayOrder] = useState<string[]>(LINK_DISPLAY_ORDER);
  const [visibleLinkTypes, setVisibleLinkTypes] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_LINK_TYPES);

  // Right panel (GameDetailsPanel) settings
  const [rightPanelLogoSize, setRightPanelLogoSize] = useState(100);
  const [rightPanelBoxartPosition, setRightPanelBoxartPosition] = useState<'left' | 'right' | 'none'>('right');
  const [rightPanelBoxartSize, setRightPanelBoxartSize] = useState(120);
  const [rightPanelTextSize, setRightPanelTextSize] = useState(14);
  const [rightPanelButtonSize, setRightPanelButtonSize] = useState(14);
  const [rightPanelButtonLocation, setRightPanelButtonLocation] = useState<'left' | 'middle' | 'right'>('right');
  const [detailsPanelOpacity, setDetailsPanelOpacity] = useState(80);
  const [isViewFlippedByView, setIsViewFlippedByView] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', boolean>>({
    grid: false,
    list: false,
    logo: false,
    carousel: false,
    coverflow: false,
  });
  // Button colors per view
  const [rightPanelButtonColors, setRightPanelButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [carouselButtonColors, setCarouselButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [gridButtonColors, setGridButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [listButtonColors, setListButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [logoButtonColors, setLogoButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  // Cover Flow (simplified menu)
  const [coverFlowCoverSize, setCoverFlowCoverSize] = useState(300);
  const [coverFlowReflection, setCoverFlowReflection] = useState(60);
  const [coverFlowVerticalOffset, setCoverFlowVerticalOffset] = useState(0);
  const [coverFlowSideOpacity, setCoverFlowSideOpacity] = useState(100);
  const [coverFlowShowButtons, setCoverFlowShowButtons] = useState(true);
  const [coverFlowButtonPosition, setCoverFlowButtonPosition] = useState<'left' | 'middle' | 'right'>('middle');
  const [coverFlowButtonColors, setCoverFlowButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  // Top bar element positions
  const [topBarPositions, setTopBarPositions] = useState<TopBarPositions>({
    searchBar: 'left',
    sortBy: 'left',
    launcher: 'left',
    categories: 'left',
  });
  // Game details panel divider settings per view
  const [fanartHeightByView, setFanartHeightByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 320,
    list: 320,
    logo: 320,
  });
  const [detailsPanelBottomBarHeight, setDetailsPanelBottomBarHeight] = useState(72);
  const [descriptionWidthByView, setDescriptionWidthByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 50,
    list: 50,
    logo: 50,
  });

  // Animation preferences
  const [disableAllAnimations, setDisableAllAnimations] = useState(false);
  const [disableAnimatedBanners, setDisableAnimatedBanners] = useState(false);
  const [disableAnimatedBoxarts, setDisableAnimatedBoxarts] = useState(false);
  const [disableAnimatedBackgrounds, setDisableAnimatedBackgrounds] = useState(false);
  const [disableAnimatedIcons, setDisableAnimatedIcons] = useState(false);
  const [disableAnimatedLogos, setDisableAnimatedLogos] = useState(false);
  const [panelWidthByViewState, setPanelWidthByViewState] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>>({
    grid: 800,
    list: 800,
    logo: 800,
    carousel: 800,
    coverflow: 800,
  });
  const [showCategoriesByView, setShowCategoriesByView] = useState<Record<string, boolean>>({
    grid: false,
    list: false,
    logo: false,
  });
  const [categoriesPositionByView, setCategoriesPositionByView] = useState<Record<string, 'top' | 'bottom'>>({
    grid: 'top',
    list: 'top',
    logo: 'top'
  });
  const [categoriesAlignmentByView, setCategoriesAlignmentByView] = useState<Record<string, 'left' | 'center' | 'right'>>({
    grid: 'left',
    list: 'left',
    logo: 'left'
  });
  const [categoriesSizeByView, setCategoriesSizeByView] = useState<Record<string, number>>({
    grid: 12,
    list: 12,
    logo: 12
  });

  // Launch confirmation state
  const [confirmGameLaunch, setConfirmGameLaunch] = useState(false);

  // Missing games state
  const [missingGames, setMissingGames] = useState<Array<{
    id: string;
    title: string;
    exePath?: string;
    platform?: string;
    source?: string;
  }> | null>(null);

  // Found games state
  const [foundGames, setFoundGames] = useState<Array<any> | null>(null);



  // Get current view's divider settings
  const currentFanartHeight = (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? fanartHeightByView[viewMode] : 320;
  const currentDescriptionWidth = (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? descriptionWidthByView[viewMode] : 50;
  const currentPanelWidth = (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? panelWidthByViewState[viewMode] : 800;
  /** Always true in grid/list/logo so the right panel always has pt-4 and retains its position when "Show categories" is toggled on or off. */
  const rightPanelNeedsTopPadding = viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo';
  const currentBackgroundBrightness = backgroundBrightnessByView[viewMode] ?? 0.3;

  // Set background blur to 0 when switching to carousel/coverflow mode and sync divider widths when view changes
  useEffect(() => {
    if ((viewMode === 'carousel' || viewMode === 'coverflow') && backgroundBlur !== 0) {
      setBackgroundBlur(0);
    }
    // Sync panelWidth to current view's setting
    if (viewMode !== 'carousel' && viewMode !== 'coverflow') {
      const viewSpecificWidth = panelWidthByViewState[viewMode];
      setPanelWidth(viewSpecificWidth);
    }
  }, [backgroundBlur, panelWidthByViewState, viewMode]);
  const [backgroundMode, setBackgroundMode] = useState<'image' | 'color'>('image');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [listViewOptions, setListViewOptions] = useState(defaultListViewOptions);
  const [listViewSize, setListViewSize] = useState(128);
  const [panelWidth, setPanelWidth] = useState(800);
  const [rightClickMenu, setRightClickMenu] = useState<{ x: number; y: number } | null>(null);
  const [gameContextMenu, setGameContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);
  const [displayedBackgroundImageUrl, setDisplayedBackgroundImageUrl] = useState('');
  const [autoSizeToFit, setAutoSizeToFit] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLauncher, setSelectedLauncher] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'releaseDate' | 'playtime' | 'lastPlayed'>('title');

  // Clamp padding in carousel without overwriting the saved preference
  const carouselGameTilePadding = (viewMode === 'carousel' || viewMode === 'coverflow') && gameTilePadding > 3 ? 1 : gameTilePadding;

  const { isInitialLoad, refreshPreferences } = useAppPreferences({
    viewMode,
    defaultListViewOptions,
    defaultTopBarPositions: {
      searchBar: 'left',
      sortBy: 'left',
      launcher: 'left',
      categories: 'left',
    },
    defaultFanartHeightByView: {
      grid: 320,
      list: 320,
      logo: 320,
    },
    defaultDescriptionWidthByView: {
      grid: 50,
      list: 50,
      logo: 50,
    },
    defaultPanelWidthByView: {
      grid: 800,
      list: 800,
      logo: 800,
      carousel: 800,
      coverflow: 800,
    },
    setGridSize,
    setLogoSize,
    setPinnedCategories,
    setHideVRTitles,
    setHideAppsTitles,
    setHideGameTitles,
    setGameTilePadding,
    setShowCategoriesByView,
    setCategoriesPositionByView,
    setCategoriesAlignmentByView,
    setCategoriesSizeByView,
    setShowLogoOverBoxart,
    setLogoPosition,
    setLogoBackgroundColor,
    setLogoBackgroundOpacity,
    setBackgroundBlur,
    setBackgroundBrightnessByView,
    setShowCarouselDetails,
    setShowCarouselLogos,
    setSelectedBoxArtSize,
    setDetailsBarSize,
    setCarouselLogoSize,
    setCarouselButtonSize,
    setCarouselDescriptionSize,
    setRightPanelLogoSize,
    setRightPanelBoxartPosition,
    setRightPanelBoxartSize,
    setRightPanelTextSize,
    setRightPanelButtonSize,
    setRightPanelButtonLocation,
    setDetailsPanelOpacity,
    setRightPanelButtonColors,
    setCarouselButtonColors,
    setGridButtonColors,
    setListButtonColors,
    setLogoButtonColors,
    setCoverFlowCoverSize,
    setCoverFlowReflection,
    setCoverFlowVerticalOffset,
    setCoverFlowSideOpacity,
    setCoverFlowShowButtons,
    setCoverFlowButtonPosition,
    setCoverFlowButtonColors,
    setDisableAllAnimations,
    setDisableAnimatedBanners,
    setDisableAnimatedBoxarts,
    setDisableAnimatedBackgrounds,
    setDisableAnimatedIcons,
    setDisableAnimatedLogos,
    setIsViewFlippedByView,
    setTopBarPositions,
    setViewMode,
    setBackgroundMode,
    setBackgroundColor,
    setListViewOptions,
    setListViewSize,
    setFanartHeightByView,
    setDescriptionWidthByView,
    setDetailsPanelBottomBarHeight,
    setPanelWidthByViewState,
    setPanelWidth,
    setAutoSizeToFit,
    setActiveGameId,
    setConfirmGameLaunch,
    setLinkDisplayOrder,
    setVisibleLinkTypes,
    setSelectedCategory,
    setSortBy,
  });

  // Save grid size when it changes (but not when auto-size is enabled)
  useEffect(() => {
    if (isInitialLoad) return;
    if (autoSizeToFit) return; // Don't save when auto-size is calculating

    const saveGridSize = async () => {
      try {
        await window.electronAPI.savePreferences({ gridSize });
      } catch (error) {
        console.error('Error saving grid size:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveGridSize, 500);
    return () => clearTimeout(timeoutId);
  }, [gridSize, autoSizeToFit, isInitialLoad]);

  // Save logo size when it changes
  useEffect(() => {
    if (isInitialLoad) return;
    const saveLogoSize = async () => {
      try {
        await window.electronAPI.savePreferences({ logoSize });
      } catch (error) {
        console.error('Error saving logo size:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveLogoSize, 500);
    return () => clearTimeout(timeoutId);
  }, [logoSize, isInitialLoad]);

  // Save pinned categories when they change
  useEffect(() => {
    if (isInitialLoad) return;
    const savePinnedCategories = async () => {
      try {
        await window.electronAPI.savePreferences({ pinnedCategories });
      } catch (error) {
        console.error('Error saving pinned categories:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(savePinnedCategories, 300);
    return () => clearTimeout(timeoutId);
  }, [pinnedCategories, isInitialLoad]);

  // Save hideVRTitles when it changes
  useEffect(() => {
    if (isInitialLoad) return;
    const saveHideVRTitles = async () => {
      try {
        await window.electronAPI.savePreferences({ hideVRTitles });
      } catch (error) {
        console.error('Error saving hide VR titles preference:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveHideVRTitles, 300);
    return () => clearTimeout(timeoutId);
  }, [hideVRTitles, isInitialLoad]);

  // Save hideAppsTitles when it changes
  useEffect(() => {
    if (isInitialLoad) return;
    const saveHideAppsTitles = async () => {
      try {
        await window.electronAPI.savePreferences({ hideAppsTitles });
      } catch (error) {
        console.error('Error saving hide Apps titles preference:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveHideAppsTitles, 300);
    return () => clearTimeout(timeoutId);
  }, [hideAppsTitles, isInitialLoad]);

  // Save appearance preferences when they change (but skip initial load)
  useEffect(() => {
    if (isInitialLoad) return; // Skip saving on initial load

    const saveAppearancePrefs = async () => {
      try {
        await window.electronAPI.savePreferences({
          hideGameTitles,
          gameTilePadding,
          backgroundBlur,
          backgroundBrightnessByView,
          viewMode,
          backgroundMode,
          backgroundColor,
          listViewOptions,
          listViewSize
        });
      } catch (error) {
        console.error('Error saving appearance preferences:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveAppearancePrefs, 500);
    return () => clearTimeout(timeoutId);
  }, [hideGameTitles, gameTilePadding, backgroundBlur, backgroundBrightnessByView, viewMode, backgroundMode, backgroundColor, listViewOptions, listViewSize, isInitialLoad]);

  // Save activeGameId when it changes
  useEffect(() => {
    if (isInitialLoad) return;
    const saveActiveGameId = async () => {
      try {
        await window.electronAPI.savePreferences({ activeGameId });
      } catch (error) {
        console.error('Error saving active game ID:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveActiveGameId, 300);
    return () => clearTimeout(timeoutId);
  }, [activeGameId, isInitialLoad]);

  // Restore active game selection after games are loaded
  useEffect(() => {
    if (!loading && games.length > 0 && activeGameId) {
      // Verify the saved game still exists in the library
      const gameExists = games.some(g => g.id === activeGameId);
      if (!gameExists) {
        // Game no longer exists, clear the selection
        setActiveGameId(null);
      }
    }
  }, [loading, games, activeGameId]);

  // Toggle pin category
  const handleTogglePinCategory = (category: string) => {
    setPinnedCategories(prev => {
      if (prev.includes(category)) {
        autoPinOptOutRef.current.add(category);
        return prev.filter(c => c !== category);
      } else {
        autoPinOptOutRef.current.delete(category);
        return [...prev, category];
      }
    });
  };

  // Get all unique categories and their counts from games
  const { allCategories, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    let favorites = 0;
    let hidden = 0;
    games.forEach(game => {
      if (game.favorite) favorites++;
      if (game.hidden) hidden++;
      game.categories?.forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });

    return {
      allCategories: Object.keys(counts).sort(),
      categoryCounts: {
        ...counts,
        favorites,
        hidden,
        all: games.length
      }
    };
  }, [games]);

  // Automatically pin all categories when they appear (default behavior)
  useEffect(() => {
    setPinnedCategories(prev => {
      const updated = [...prev];
      let changed = false;

      for (const category of allCategories) {
        if (!prev.includes(category) && !autoPinOptOutRef.current.has(category)) {
          updated.push(category);
          changed = true;
        }
      }

      for (const category of Array.from(autoPinOptOutRef.current)) {
        if (!allCategories.includes(category)) {
          autoPinOptOutRef.current.delete(category);
        }
      }

      return changed ? updated : prev;
    });
  }, [allCategories]);

  // Check if there are any favorite games
  const hasFavoriteGames = useMemo(() => {
    return games.some(g => g.favorite === true);
  }, [games]);

  // Check if VR category exists
  const hasVRCategory = useMemo(() => {
    return allCategories.includes('VR');
  }, [allCategories]);

  // Check if Apps category exists
  const hasAppsCategory = useMemo(() => {
    return allCategories.includes('Apps');
  }, [allCategories]);

  // Check if there are any hidden games
  const hasHiddenGames = useMemo(() => {
    return games.some(g => g.hidden === true);
  }, [games]);

  // Get launcher from game (check ID format, then source, then platform, then installation directory)
  const getGameLauncher = useCallback((game: Game): string => {
    // Check ID format first (most reliable)
    if (game.id.startsWith('steam-')) {
      return 'steam';
    }
    if (game.id.startsWith('epic-')) {
      return 'epic';
    }
    if (game.id.startsWith('gog-')) {
      return 'gog';
    }
    if (game.id.startsWith('xbox-')) {
      return 'xbox';
    }
    if (game.id.startsWith('ubisoft-')) {
      return 'ubisoft';
    }
    if (game.id.startsWith('rockstar-')) {
      return 'rockstar';
    }
    if (game.id.startsWith('ea-') || game.id.startsWith('origin-')) {
      return 'ea';
    }
    if (game.id.startsWith('battle-') || game.id.startsWith('battlenet-')) {
      return 'battle';
    }

    // Check source field
    if (game.source) {
      const source = game.source.toLowerCase();
      const validSources = ['steam', 'epic', 'gog', 'xbox', 'ea', 'origin', 'ubisoft', 'battle', 'battlenet', 'humble', 'itch', 'rockstar'];
      if (validSources.includes(source)) {
        // Normalize some source names
        if (source === 'origin') return 'ea';
        if (source === 'battlenet') return 'battle';
        return source;
      }
    }

    // Check platform field (fallback)
    const platform = game.platform?.toLowerCase();
    if (platform === 'steam') {
      return 'steam';
    }
    if (platform === 'epic' || platform === 'epic games') {
      return 'epic';
    }
    if (platform === 'gog' || platform === 'gog galaxy') {
      return 'gog';
    }
    if (platform === 'xbox' || platform === 'xbox game pass') {
      return 'xbox';
    }
    if (platform === 'ea' || platform === 'ea app' || platform === 'origin') {
      return 'ea';
    }
    if (platform === 'ubisoft' || platform === 'ubisoft connect') {
      return 'ubisoft';
    }
    if (platform === 'battle.net' || platform === 'battlenet' || platform === 'battle') {
      return 'battle';
    }
    if (platform === 'rockstar' || platform === 'rockstar games') {
      return 'rockstar';
    }

    // Check installation directory as last resort
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

  // Get all unique launchers from games
  const allLaunchers = useMemo(() => {
    const launchers = new Set<string>();
    games.forEach(game => {
      const launcher = getGameLauncher(game);
      if (launcher) {
        launchers.add(launcher);
      }
    });
    return Array.from(launchers).sort((a, b) => {
      // Sort with 'other' at the end
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return a.localeCompare(b);
    });
  }, [games, getGameLauncher]);

  // Filter games based on search, section, and category
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Filter by section
    if (activeSection === 'favorites') {
      filtered = filtered.filter(g => g.favorite);
    } else if (activeSection === 'recent') {
      filtered = filtered.filter(g => g.lastPlayed);
    }

    // Filter by category or favorites
    if (selectedCategory === 'favorites') {
      filtered = filtered.filter(g => g.favorite === true);
    } else if (selectedCategory === 'hidden') {
      // Show only hidden games when "Hidden" category is selected
      filtered = filtered.filter(g => g.hidden === true);
    } else if (selectedCategory) {
      filtered = filtered.filter(g =>
        g.categories?.includes(selectedCategory)
      );
    }

    // Filter out hidden games by default (unless "Hidden" category is selected)
    if (selectedCategory !== 'hidden') {
      filtered = filtered.filter(g => g.hidden !== true);
    }

    // Filter by launcher
    if (selectedLauncher) {
      filtered = filtered.filter(g => {
        const gameLauncher = getGameLauncher(g);
        return gameLauncher === selectedLauncher;
      });
    }

    // Filter out VR titles if hideVRTitles is enabled, but not if VR category is selected
    if (hideVRTitles && selectedCategory !== 'VR' && selectedCategory !== 'Apps') {
      filtered = filtered.filter(g =>
        !g.categories?.includes('VR')
      );
    }

    // Filter out Apps titles if hideAppsTitles is enabled, but not if Apps category is selected
    if (hideAppsTitles && selectedCategory !== 'Apps' && selectedCategory !== 'VR') {
      filtered = filtered.filter(g =>
        !g.categories?.includes('Apps')
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(query) ||
        g.genres?.some(genre => genre.toLowerCase().includes(query)) ||
        g.developers?.some(dev => dev.toLowerCase().includes(query))
      );
    }

    // Sort games - pinned games always appear first
    filtered = [...filtered].sort((a, b) => {
      // First, sort by pinned status (pinned games first)
      const aPinned = a.pinned === true ? 1 : 0;
      const bPinned = b.pinned === true ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned; // Pinned games first
      }

      // Then sort by the selected criteria
      switch (sortBy) {
        case 'title':
          return (a.sortingName || a.title).localeCompare(b.sortingName || b.title);
        case 'releaseDate':
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA; // Newest first
        case 'playtime':
          const playtimeA = a.playtime || 0;
          const playtimeB = b.playtime || 0;
          return playtimeB - playtimeA; // Most played first
        case 'lastPlayed':
          const lastA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const lastB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          return lastB - lastA; // Most recent first
        default:
          return 0;
      }
    });

    return filtered;
  }, [games, searchQuery, activeSection, selectedCategory, selectedLauncher, sortBy, hideVRTitles, hideAppsTitles, getGameLauncher]);

  const activeGame = useMemo(() => {
    if (!activeGameId) return null;

    return (
      filteredGames.find((game) => game.id === activeGameId) ??
      games.find((game) => game.id === activeGameId) ??
      null
    );
  }, [activeGameId, filteredGames, games]);

  // Keep the active selection aligned to the currently visible library set.
  useEffect(() => {
    if (loading || filteredGames.length === 0) return;

    const hasVisibleSelection = activeGameId
      ? filteredGames.some((game) => game.id === activeGameId)
      : false;

    if (!hasVisibleSelection) {
      setActiveGameId(filteredGames[0].id);
    }
  }, [loading, filteredGames, activeGameId]);

  const handleReorder = async (reorderedGames: Game[]) => {
    await reorderGames(reorderedGames);
  };

  const calculateAutoSize = useCallback(() => {
    if (!gridContainerRef.current || viewMode !== 'grid' || filteredGames.length === 0) {
      return;
    }

    const container = gridContainerRef.current;
    // Use the actual container width (left panel) to ensure we fill it properly
    const containerWidth = container.clientWidth;
    // Use the visible viewport height, not the scrollable container height
    const containerHeight = container.clientHeight; // This is the visible height

    // Account for padding (p-4 = 16px on each side = 32px total)
    const horizontalPadding = 32;
    const verticalPadding = 32; // Top and bottom padding
    const availableWidth = containerWidth - horizontalPadding;
    const availableHeight = containerHeight - verticalPadding;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    const totalGames = filteredGames.length;
    const gap = gameTilePadding;

    // GameCard uses aspect-[2/3], so height = width * 1.5
    // We need to find the grid size that maximizes tile size while ensuring
    // the rightmost boxart gets as close as possible to the divider

    let bestSize = 0;

    let bestRemainingWidth = Infinity;

    // Try different column counts to find the one that fills the width best
    for (let columns = 1; columns <= 20; columns++) {
      // Calculate tile width based on available width
      const totalGapWidth = gap * (columns - 1);
      const tileWidth = (availableWidth - totalGapWidth) / columns;

      if (tileWidth < 50) continue; // Too small, skip

      // Calculate tile height (2:3 aspect ratio)
      const tileHeight = tileWidth * 1.5;

      // Calculate how many rows we need to fit all games
      const rowsNeeded = Math.ceil(totalGames / columns);

      // Calculate total height needed for all rows
      const totalHeightNeeded = (tileHeight * rowsNeeded) + (gap * (rowsNeeded - 1));

      // Check if this configuration fits ALL games in the visible height
      if (totalHeightNeeded <= availableHeight) {
        // Calculate how much space this configuration uses
        const usedWidth = (tileWidth * columns) + (gap * (columns - 1));
        const remainingWidth = availableWidth - usedWidth;

        // Prioritize configurations that minimize remaining width (fill more space)
        // Among those, prefer larger tile sizes
        if (bestSize === 0 ||
          remainingWidth < bestRemainingWidth ||
          (Math.abs(remainingWidth - bestRemainingWidth) < 5 && tileWidth > bestSize)) {
          bestSize = tileWidth;

          bestRemainingWidth = remainingWidth;
        }
      }
    }

    // If we found a solution, use it
    if (bestSize > 0) {
      setGridSize(Math.round(bestSize));
    } else {
      // No solution found - try to fit as many as possible
      // Start with a reasonable tile size and work backwards
      for (let testSize = 200; testSize >= 50; testSize -= 10) {
        const tileHeight = testSize * 1.5;

        for (let columns = 1; columns <= 20; columns++) {
          const totalGapWidth = gap * (columns - 1);
          const tileWidth = (availableWidth - totalGapWidth) / columns;

          if (Math.abs(tileWidth - testSize) < 10) { // Close match
            const rowsNeeded = Math.ceil(totalGames / columns);
            const totalHeightNeeded = (tileHeight * rowsNeeded) + (gap * (rowsNeeded - 1));

            if (totalHeightNeeded <= availableHeight) {
              setGridSize(Math.round(tileWidth));
              return;
            }
          }
        }
      }

      // Last resort: use a small size that should fit
      const minColumns = Math.ceil(Math.sqrt(totalGames));
      const totalGapWidth = gap * (minColumns - 1);
      const fallbackSize = Math.round((availableWidth - totalGapWidth) / minColumns);
      setGridSize(Math.max(50, Math.min(500, fallbackSize)));
    }
  }, [viewMode, filteredGames.length, gameTilePadding]);

  // Auto-recalculate when auto-size is enabled and dependencies change
  useEffect(() => {
    if (!autoSizeToFit || viewMode !== 'grid' || filteredGames.length === 0) {
      return;
    }

    // Recalculate after a short delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      calculateAutoSize();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [autoSizeToFit, filteredGames.length, gameTilePadding, hideGameTitles, viewMode, calculateAutoSize, panelWidth]);

  // Watch for container size changes using ResizeObserver (handles window resize and panel resize)
  useEffect(() => {
    if (!autoSizeToFit || viewMode !== 'grid' || !gridContainerRef.current) {
      return;
    }

    const container = gridContainerRef.current;
    let resizeTimeout: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calculations
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (filteredGames.length > 0) {
          calculateAutoSize();
        }
      }, 150);
    });

    resizeObserver.observe(container);

    // Also listen to window resize as a fallback
    const handleWindowResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (filteredGames.length > 0) {
          calculateAutoSize();
        }
      }, 150);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      clearTimeout(resizeTimeout);
    };
  }, [autoSizeToFit, viewMode, filteredGames.length, calculateAutoSize]);


  const handleGameClick = useCallback((game: Game) => {
    setActiveGameId(game.id);
  }, []);

  const handleEditGame = (game: Game) => {
    openGameManager({ gameId: game.id, tab: 'metadata' });
  };

  const handleEditCategories = (game: Game) => {
    openCategoriesEditor(game);
  };

  const handleEditImages = (game: Game) => {
    openGameManager({ gameId: game.id, tab: 'images' });
  };

  const handleFixMatch = (game: Game) => {
    openGameManager({ gameId: game.id, tab: 'metadata' });
  };

  const handleSelectMetadataMatch = async (result: { id: string; source: string }) => {
    if (!fixingGame) return;

    try {
      const response = await window.electronAPI.fetchAndUpdateByProviderId(
        fixingGame.id,
        result.id,
        result.source
      );

      if (response.success) {
        showToast('Metadata updated successfully!', 'success');
        // Reload library to show updated metadata
        await loadLibrary();
      } else {
        showToast(response.error || 'Failed to update metadata', 'error');
      }
    } catch (error) {
      console.error('Error updating metadata:', error);
      showToast('An error occurred while updating metadata', 'error');
    }
  };

  const handleSaveGame = async (game: Game, oldGame?: Game) => {
    try {
      console.log('Saving game from App:', game.title, 'favorite:', game.favorite);
      // Get old game if not provided
      if (!oldGame) {
        oldGame = games.find((g: Game) => g.id === game.id);
      }
      const success = await window.electronAPI.saveGame(game, oldGame);
      if (success) {
        await loadLibrary();
        // Verify the game was saved correctly
        const updatedGames = await window.electronAPI.getLibrary();
        const savedGame = updatedGames.find((g: Game) => g.id === game.id);
        console.log('Game after save - favorite:', savedGame?.favorite, 'Full game:', savedGame);
        showToast(`Game "${game.title}" updated successfully`, 'success');
      } else {
        showToast('Failed to save game', 'error');
      }
    } catch (err) {
      console.error('Error in handleSaveGame:', err);
      showToast('Failed to save game', 'error');
    }
  };

  const handleAddFolder = async (path: string, categories: string[], icon?: string) => {
    try {
      // Create config with default name (folder basename)
      const folderName = path.split(/[/\\]/).pop() || 'Manual Folder';
      // Generate a simple ID from the path
      const pathHash = btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
      const folderId = `manual-${pathHash}`;

      const newConfig = {
        id: folderId,
        name: folderName,
        path: path,
        enabled: true,
        autoCategory: categories,
        icon
      };

      if (window.electronAPI.saveManualFolderConfig) {
        await window.electronAPI.saveManualFolderConfig(newConfig);
        showToast(`Successfully added folder: ${folderName}`, 'success');
        // Refresh library to pick up any games in the new folder
        loadLibrary();
      }
    } catch (err) {
      console.error('Error adding manual folder:', err);
      showToast('Failed to add folder', 'error');
    }
  };


  const handleAddGame = async (game: Game) => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsModalOpen(false);
      openOnyxSettings('apis');
      return;
    }
    await addCustomGame(game);
  };

  // Toast notification helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const {
    autoStartScan,
    closeImportWorkbench,
    handleImport,
    handleOpenImporterWithGames,
    handleScanFolder,
    handleUpdateSteamLibrary,
    importWorkbenchInitialMode,
    isImportWorkbenchOpen,
    openImportWorkbench,
    openImportWorkbenchWithGames,
    preScannedGames,
  } = useImporterWorkbench({
    loadLibrary,
    showToast,
    setIsOnyxSettingsOpen,
    setOnyxSettingsInitialTab,
    setStartupProgress,
    setFoundGames,
    setShowLibraryTutorial,
  });

  const { refreshAfterSettingsSave } = useSettingsSaveRefresh({
    loadLibrary,
    setHideGameTitles,
    setGameTilePadding,
    setShowLogoOverBoxart,
    setLogoPosition,
    setConfirmGameLaunch,
    setDisableAllAnimations,
    setDisableAnimatedBanners,
    setDisableAnimatedBoxarts,
    setDisableAnimatedBackgrounds,
    setDisableAnimatedIcons,
    setDisableAnimatedLogos,
    setLinkDisplayOrder,
    setVisibleLinkTypes,
  });

  // Whether any major overlay or context menu is open (settings, game manager, right-click menu, etc.)
  const overlaysOpen =
    isOnyxSettingsOpen ||
    isGameManagerOpen ||
    isImportWorkbenchOpen ||
    showOptimizerModal ||
    isUpdateLibraryOpen ||
    showLibraryTutorial ||
    isAPISettingsOpen ||
    isBugReportOpen ||
    rightClickMenu !== null ||
    gameContextMenu !== null;

  const { displayGames } = useAnimatedMediaPolicy({
    filteredGames,
    overlaysOpen,
    disableAllAnimations,
    disableAnimatedBackgrounds,
    disableAnimatedBanners,
    disableAnimatedBoxarts,
    disableAnimatedIcons,
    disableAnimatedLogos,
  });

  // Missing games handlers
  const handleRemoveMissingGames = async (gameIds: string[]) => {
    try {
      const result = await window.electronAPI.removeMissingGames(gameIds);
      if (result.success) {
        showToast(`Successfully removed ${result.removedCount} missing game(s)`, 'success');
        // Reload library to reflect changes
        await loadLibrary();
      } else {
        showToast('Failed to remove missing games', 'error');
      }
    } catch (error) {
      console.error('Error removing missing games:', error);
      showToast('Failed to remove missing games', 'error');
    } finally {
      setMissingGames(null);
    }
  };

  const handleCancelMissingGames = () => {
    setMissingGames(null);
  };

  // Hide confirmation dialog state
  const [hideConfirmation, setHideConfirmation] = useState<{ game: Game } | null>(null);

  // Handle Steam games import

  // Handle Steam configuration scan
  const handleSteamConfigScan = async (steamPath?: string) => {
    setIsScanningSteam(true);

    try {
      const beforeCount = games.length;
      const result = await window.electronAPI.scanGamesWithPath(steamPath);

      if (result.success) {
        const updatedGames = await window.electronAPI.getLibrary();
        const afterCount = updatedGames.length;
        const newGamesCount = afterCount - beforeCount;

        // Reload library to update UI
        await loadLibrary();

        if (newGamesCount > 0) {
          showToast(`Library updated: ${newGamesCount} new ${newGamesCount === 1 ? 'game' : 'games'} found`, 'success');
        } else {
          showToast('Steam library is up to date', 'success');
        }
      } else {
        throw new Error(result.error || 'Failed to scan Steam library');
      }
    } catch (err) {
      console.error('Error scanning Steam library:', err);
      throw err; // Re-throw to let modal handle it
    } finally {
      setIsScanningSteam(false);
    }
  };

  useAppShellEvents({
    showToast,
    handleScanFolder,
    handleUpdateSteamLibrary,
    handleOpenImporterWithGames,
    setIsOnyxSettingsOpen,
    setOnyxSettingsInitialTab,
    setIsModalOpen,
    setIsSteamConfigOpen,
    setFoundGames,
    setStartupProgress,
    setMissingGames,
    setIsUpdateModalTest,
    setUpdateNotification,
    setCrashDumpPaths,
  });

  const {
    handlePlay,
    launchingGameId,
    runningGames,
    launchConfirmation,
    confirmLaunch,
    cancelLaunchConfirmation,
  } = useGameLaunchFlow({
    confirmGameLaunch,
  });


  // Handle save from metadata editor
  const handleSaveGameWithMetadata = async (title: string, exePath: string, metadata: GameMetadata) => {
    try {
      // Create game with all metadata
      const gameId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newGame: Game = {
        id: gameId,
        title: metadata.title || title,
        platform: metadata.platform || 'other',
        exePath,
        boxArtUrl: metadata.boxArtUrl || '',
        bannerUrl: metadata.bannerUrl || '',
        description: metadata.description,
        releaseDate: metadata.releaseDate,
        genres: metadata.genres,
        ageRating: metadata.ageRating,
        categories: metadata.categories,
        useAlternativeBackground: true,
      };

      // Save the game
      const success = await window.electronAPI.saveGame(newGame);
      if (success) {
        await loadLibrary();
        showToast(`Game "${metadata.title || title}" added successfully`, 'success');
        closeMetadataEditor();
      } else {
        showToast('Failed to save game', 'error');
      }
    } catch (err) {
      console.error('Error saving game with metadata:', err);
      showToast('Failed to save game', 'error');
    }
  };

  const handleToggleFavorite = async (game: Game) => {
    const newFavoriteValue = game.favorite !== true; // Explicitly set to true or false
    const updatedGame = { ...game, favorite: newFavoriteValue };
    console.log('Toggling favorite for game:', game.title, 'Current favorite:', game.favorite, 'New favorite value:', newFavoriteValue);
    await handleSaveGame(updatedGame);
  };

  const handleTogglePin = async (game: Game) => {
    const newPinnedValue = game.pinned !== true; // Explicitly set to true or false
    const updatedGame = { ...game, pinned: newPinnedValue };
    await handleSaveGame(updatedGame);
  };

  const handleHideGame = (game: Game) => {
    setHideConfirmation({ game });
  };

  const handleConfirmHide = async () => {
    if (hideConfirmation) {
      const { game } = hideConfirmation;
      const updatedGame = { ...game, hidden: true };
      await handleSaveGame(updatedGame);
      showToast(`"${game.title}" has been hidden`, 'success');
      setHideConfirmation(null);
    }
  };

  const handleCancelHide = () => {
    setHideConfirmation(null);
  };

  const handleUnhideGame = async (game: Game) => {
    const updatedGame = { ...game, hidden: false };
    await handleSaveGame(updatedGame);
    showToast(`"${game.title}" has been unhidden`, 'success');
  };

  const handleUninstallGame = async (game: Game) => {
    setGameContextMenu(null);
    try {
      const result = await window.electronAPI.openGameUninstaller(game.id);
      if (result.success) {
        if (result.openedUninstaller) {
          showToast('Uninstaller opened', 'success');
        } else {
          showToast('Opened Windows Settings > Apps', 'success');
        }
      } else if (result.error) {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('Failed to open uninstaller', 'error');
    }
  };

  // Handle exit with confirmation
  const handleExit = async () => {
    try {
      const exitInfo = await window.electronAPI.requestExit();

      if (exitInfo.shouldMinimizeToTray && exitInfo.canMinimizeToTray) {
        // Show confirmation dialog asking if user wants to minimize to tray instead
        const shouldMinimize = window.confirm(
          'Do you want to minimize Onyx to the system tray instead of exiting?\n\n' +
          'Click OK to minimize to tray, or Cancel to exit.'
        );

        if (shouldMinimize) {
          await window.electronAPI.minimizeToTray();
        } else {
          await window.electronAPI.exit();
        }
      } else {
        // Show confirmation dialog
        const shouldExit = window.confirm('Are you sure you want to exit Onyx?');
        if (shouldExit) {
          await window.electronAPI.exit();
        }
      }
    } catch (error) {
      console.error('Error handling exit:', error);
      // Fallback to simple confirmation
      const shouldExit = window.confirm('Are you sure you want to exit Onyx?');
      if (shouldExit) {
        await window.electronAPI.exit();
      }
    }
  };

  // Get background image from active game - use alternative banner if enabled
  const backgroundImageUrl = (activeGame?.useAlternativeBackground && activeGame?.alternativeBannerUrl)
    ? activeGame.alternativeBannerUrl
    : activeGame?.heroUrl || activeGame?.bannerUrl || activeGame?.boxArtUrl || '';
  const backgroundFromAltBanner = !!(activeGame?.useAlternativeBackground && activeGame?.alternativeBannerUrl === backgroundImageUrl);
  const backgroundFromHero = !!(activeGame?.heroUrl === backgroundImageUrl);
  const backgroundFromBanner = !!(activeGame?.bannerUrl === backgroundImageUrl);
  const backgroundFromBoxart = !!(activeGame?.boxArtUrl === backgroundImageUrl);
  const backgroundVideoKind: 'background' | 'banner' | 'boxart' = backgroundFromAltBanner
    ? 'background'
    : (backgroundFromHero || backgroundFromBanner)
      ? 'banner'
      : 'boxart';
  const isBackgroundVideo = !!(activeGame && backgroundImageUrl && (
    (backgroundFromAltBanner && activeGame.alternativeBannerIsVideo) ||
    (backgroundFromHero && activeGame.heroIsVideo) ||
    (backgroundFromBanner && activeGame.bannerIsVideo) ||
    (backgroundFromBoxart && activeGame.boxArtIsVideo)
  ));

  // Keep previous background visible until the next background is loaded to avoid flicker
  // for static images. For animated backgrounds (GIF/WebP/APNG), switch immediately so
  // the old image is not shown for several seconds while large animations load.
  useEffect(() => {
    if (!backgroundImageUrl) {
      setDisplayedBackgroundImageUrl('');
      return;
    }

    const isAnimated = isBackgroundVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(backgroundImageUrl);
    const blockAnimatedBackground =
      overlaysOpen || disableAllAnimations || (disableAnimatedBackgrounds && backgroundFromAltBanner);

    // If we should not run animated backgrounds, keep video backgrounds visible (they are paused via global controller)
    // and only replace animated image formats.
    if (blockAnimatedBackground) {
      if (isAnimated) {
        if (isBackgroundVideo) {
          setDisplayedBackgroundImageUrl(backgroundImageUrl);
          return;
        }
        const staticFallback = activeGame?.boxArtUrl && !activeGame.boxArtIsVideo && !/\.(gif|webp|apng|webm)(\?|$)/i.test(activeGame.boxArtUrl)
          ? activeGame.boxArtUrl
          : '';
        setDisplayedBackgroundImageUrl(staticFallback);
        return;
      }
    } else if (isAnimated) {
      // Animated backgrounds allowed and no overlays: show the animated art.
      setDisplayedBackgroundImageUrl(backgroundImageUrl);
      return;
    }

    let cancelled = false;
    let committed = false;
    const img = new Image();
    const commit = () => {
      if (cancelled || committed) return;
      committed = true;
      setDisplayedBackgroundImageUrl(backgroundImageUrl);
    };

    img.onload = commit;
    img.onerror = commit;
    img.src = backgroundImageUrl;

    if (img.decode) {
      img.decode().then(commit).catch(() => {
        // Fallback to onload/onerror paths.
      });
    }

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }, [backgroundImageUrl, disableAllAnimations, disableAnimatedBackgrounds, overlaysOpen, activeGame?.boxArtUrl, activeGame?.boxArtIsVideo, isBackgroundVideo, backgroundFromAltBanner]);

  // Detect if background image is animated (GIF, WebP, APNG)
  const isAnimatedBackground = useMemo(() => {
    if (!displayedBackgroundImageUrl) return false;
    return isBackgroundVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(displayedBackgroundImageUrl);
  }, [displayedBackgroundImageUrl, isBackgroundVideo]);

  // Optimize blur for animated backgrounds to reduce compositing cost
  const optimizedBackgroundBlur = isAnimatedBackground ? Math.min(backgroundBlur, 10) : backgroundBlur;

  // Preload images for adjacent games so switching is instant
  useEffect(() => {
    if (!activeGameId || filteredGames.length === 0) return;
    const idx = filteredGames.findIndex((g) => g.id === activeGameId);
    if (idx < 0) return;
    const prevGame = idx > 0 ? filteredGames[idx - 1] : null;
    const nextGame = idx < filteredGames.length - 1 ? filteredGames[idx + 1] : null;
    const toPreload: Array<{ url: string; isAnimated: boolean }> = [];
    for (const game of [prevGame, nextGame]) {
      if (!game) continue;
      const bgUrl = (game.useAlternativeBackground && game.alternativeBannerUrl) ? game.alternativeBannerUrl : game.heroUrl || game.bannerUrl || game.boxArtUrl || '';
      if (bgUrl) {
        const bgIsVideo =
          (game.useAlternativeBackground && game.alternativeBannerUrl === bgUrl && game.alternativeBannerIsVideo) ||
          (game.heroUrl === bgUrl && game.heroIsVideo) ||
          (game.bannerUrl === bgUrl && game.bannerIsVideo) ||
          (game.boxArtUrl === bgUrl && game.boxArtIsVideo);
        toPreload.push({ url: bgUrl, isAnimated: !!bgIsVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(bgUrl) });
      }
      if (game.logoUrl) toPreload.push({ url: game.logoUrl, isAnimated: !!game.logoIsVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(game.logoUrl) });
      if (game.boxArtUrl) toPreload.push({ url: game.boxArtUrl, isAnimated: !!game.boxArtIsVideo || /\.(gif|webp|apng|webm)(\?|$)/i.test(game.boxArtUrl) });
    }
    const images: HTMLImageElement[] = [];
    for (const { url, isAnimated } of toPreload) {
      if (!url) continue;
      const img = new Image();
      images.push(img);
      img.src = url;
      if (!isAnimated && img.decode) {
        img.decode().catch(() => {});
      }
    }
    return () => {
      for (const img of images) {
        img.src = '';
      }
    };
  }, [activeGameId, filteredGames]);

  // Check if this is an Alpha build
  const isAlphaBuild = __BUILD_PROFILE__ === 'alpha' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

  const handleCancelFoundGames = () => {
    setFoundGames(null);
    setStartupProgress(null);
  };

  const handleReviewFoundGames = (gamesToReview: Array<any>) => {
    setStartupProgress(null);
    setTimeout(() => {
      handleOpenImporterWithGames(gamesToReview);
    }, 200);
  };

  return (
    <div
      className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white flex flex-col overflow-hidden relative"
      data-overlays-open={overlaysOpen ? 'true' : 'false'}
    >
      {/* Background - Image/Video or Color */}
      {backgroundMode === 'image' && displayedBackgroundImageUrl ? (
        isBackgroundVideo ? (
          <video
            key={displayedBackgroundImageUrl}
            src={displayedBackgroundImageUrl}
            data-animation-kind={backgroundVideoKind}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            className="fixed inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              filter: `blur(${optimizedBackgroundBlur}px) brightness(${currentBackgroundBrightness})`,
              transform: optimizedBackgroundBlur > 0 ? `scale(${1 + (optimizedBackgroundBlur * 0.002)})` : 'none',
              zIndex: 0,
              transition: 'opacity 300ms linear',
              ...(isAnimatedBackground && {
                willChange: 'transform',
                contain: 'layout style paint',
              }),
            }}
          />
        ) : (
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${displayedBackgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: `blur(${optimizedBackgroundBlur}px) brightness(${currentBackgroundBrightness})`,
              transform: optimizedBackgroundBlur > 0 ? `scale(${1 + (optimizedBackgroundBlur * 0.002)})` : 'none',
              zIndex: 0,
              transition: 'opacity 300ms linear',
              ...(isAnimatedBackground && {
                willChange: 'transform',
                contain: 'layout style paint',
              }),
            }}
          />
        )
      ) : (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundColor: backgroundColor,
            zIndex: 0,
          }}
        />
      )}

      {/* Aurora glow effect behind the top area */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-blue-500/10 blur-[100px] pointer-events-none" style={{ zIndex: 1 }} />

      {/* Content wrapper with proper z-index */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Menu Bar - Fixed at top */}
        <MenuBar
          onScanFolder={handleScanFolder}
          onUpdateSteamLibrary={handleUpdateSteamLibrary}
          onUpdateLibrary={handleUpdateSteamLibrary}
          onGameManager={() => openGameManager()}
          onConfigureSteam={() => setIsSteamConfigOpen(true)}
          onOnyxSettings={() => openOnyxSettings('general')}
          onAPISettings={() => openOnyxSettings('apis')}
          onAbout={() => openOnyxSettings('about')}
          onShowLibraryTutorial={openLibraryTutorial}
          onExit={handleExit}
          onBugReport={isAlphaBuild ? () => setIsBugReportOpen(true) : undefined}
          onForceOpenUpdateFound={openSimulatedUpdateModal}
          onForceOpenOnboarding={() => setForceShowInitialOnboarding(true)}
          onForceCloseOnboarding={() => setForceShowInitialOnboarding(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          allCategories={allCategories}
          categoryCounts={categoryCounts}
          pinnedCategories={pinnedCategories}
          onTogglePinCategory={handleTogglePinCategory}
          onReorderPinnedCategories={setPinnedCategories}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasFavoriteGames={hasFavoriteGames}
          hasVRCategory={hasVRCategory}
          hasAppsCategory={hasAppsCategory}
          hasHiddenGames={hasHiddenGames}
          hideVRTitles={hideVRTitles}
          hideAppsTitles={hideAppsTitles}
          showCategoriesInGameList={showCategoriesByView[viewMode] ?? false}
          onToggleHideVRTitles={() => setHideVRTitles(prev => !prev)}
          onToggleHideAppsTitles={() => setHideAppsTitles(prev => !prev)}
          launchers={allLaunchers}
          selectedLauncher={selectedLauncher}
          onLauncherChange={setSelectedLauncher}
          showImageQueueDetail={showOptimizerModal}
          setShowImageQueueDetail={setShowOptimizerModal}
          topBarPositions={topBarPositions}
          onTopBarPositionsChange={async (positions) => {
            setTopBarPositions(positions);
            try {
              await window.electronAPI.savePreferences({ topBarPositions: positions });
            } catch (error) {
              console.error('Error saving top bar positions:', error);
            }
          }}
        />

        {/* Top Bar - Hidden by default, shown when menu is open */}
        {showTopBar && (
          <TopBar
            onSearch={setSearchQuery}
            onRefresh={loadLibrary}
            onFolder={() => handleScanFolder()}
            onGridToggle={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            onSettings={() => setIsSteamConfigOpen(true)}
            viewMode={viewMode}
            notificationCount={0}
          />
        )}

        {/* Main Content Area: games list (left) and game details (right). Categories live inside the games list only. */}
        <div className={`flex-1 flex overflow-hidden relative pt-10 ${isViewFlippedByView[viewMode] ? 'flex-row-reverse' : ''}`}>
          {/* Left Panel - Game Library (flexible width, full width in carousel/coverflow mode). Categories bar is inside this panel only. */}
          <div className={`flex flex-col overflow-hidden ${viewMode === 'carousel' || viewMode === 'coverflow' ? 'w-full' : 'flex-1'}`}>
            {/* Game Grid */}
            <div
              ref={gridContainerRef}
              className={`flex-1 overflow-y-auto relative z-10 ${viewMode === 'carousel' || viewMode === 'coverflow' ? '' : (showCategoriesByView[viewMode] && (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? 'p-0' : 'p-4')}`}
              onContextMenuCapture={(e) => {
                // Capture-phase fallback: open menu on any non-card area before children stop propagation
                const target = e.target as HTMLElement;
                if (!target.closest('[data-game-card]')) {
                  e.preventDefault();
                  e.stopPropagation();
                  setGameContextMenu(null);
                  setRightClickMenu({ x: e.clientX, y: e.clientY });
                }
              }}
              onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('[data-game-card]')) {
                  e.preventDefault();
                  e.stopPropagation();
                  setGameContextMenu(null);
                  setRightClickMenu({ x: e.clientX, y: e.clientY });
                }
              }}
            >
              {loading && (
                <div className="text-center py-8">
                  <p className="text-gray-100">Loading game library...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-500 rounded p-4 mb-4">
                  <p className="text-red-300">Error: {error}</p>
                </div>
              )}

              {!loading && !error && (
                <div className="h-full flex flex-col">
                  {showCategoriesByView[viewMode] && viewMode !== 'carousel' && viewMode !== 'coverflow' && pinnedCategories.length > 0 && (categoriesPositionByView[viewMode] ?? 'top') === 'top' && (
                    <div
                      className={`flex items-center gap-2 px-6 py-4 overflow-x-auto no-scrollbar flex-shrink-0 ${(categoriesAlignmentByView[viewMode] ?? 'left') === 'center' ? 'justify-center' : (categoriesAlignmentByView[viewMode] ?? 'left') === 'right' ? 'justify-end' : 'justify-start'
                        }`}
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                      <button
                        onClick={() => setSelectedCategory(null)}
                        style={{ fontSize: `${categoriesSizeByView[viewMode] ?? 12}px` }}
                        className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === null
                          ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                          : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                          }`}
                      >
                        All Games
                      </button>
                      {hasFavoriteGames && (
                        <button
                          onClick={() => setSelectedCategory(selectedCategory === 'favorites' ? null : 'favorites')}
                          style={{ fontSize: `${categoriesSizeByView[viewMode] ?? 12}px` }}
                          className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === 'favorites'
                            ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                            }`}
                        >
                          Favorites
                        </button>
                      )}
                      {pinnedCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                          style={{ fontSize: `${categoriesSizeByView[viewMode] ?? 12}px` }}
                          className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === cat
                            ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  {displayGames.length > 0 && !forceShowInitialOnboarding ? (
                    <div className={`flex-1 overflow-y-auto animate-onyx-grid-fade min-h-0 ${showCategoriesByView[viewMode] && viewMode !== 'carousel' && viewMode !== 'coverflow' ? ((categoriesPositionByView[viewMode] ?? 'top') === 'top' ? 'px-4 pb-4 pt-0' : 'px-4 pt-4 pb-0') : ''}`}>
                      {viewMode === 'grid' || viewMode === 'logo' ? (
                        <LibraryGrid
                          games={displayGames}
                          onReorder={handleReorder}
                          onPlay={handlePlay}
                          onGameClick={handleGameClick}
                          onEdit={handleEditGame}
                          onEditImages={handleEditImages}
                          onEditCategories={handleEditCategories}
                          onFavorite={handleToggleFavorite}
                          onPin={handleTogglePin}
                          onFixMatch={handleFixMatch}
                          onHide={handleHideGame}
                          onUnhide={handleUnhideGame}
                          isHiddenView={selectedCategory === 'hidden'}
                          gridSize={gridSize}
                          logoSize={logoSize}
                          onGridSizeChange={setGridSize}
                          gameTilePadding={gameTilePadding}
                          hideGameTitles={hideGameTitles}
                          showLogoOverBoxart={showLogoOverBoxart}
                          logoPosition={logoPosition}
                          useLogosInsteadOfBoxart={viewMode === 'logo'}
                          autoSizeToFit={autoSizeToFit}
                          logoBackgroundColor={logoBackgroundColor}
                          logoBackgroundOpacity={logoBackgroundOpacity}
                          descriptionSize={gridDescriptionSize}
                          disableAnimatedBoxarts={disableAllAnimations || disableAnimatedBoxarts}
                          disableAnimatedLogos={disableAllAnimations || disableAnimatedLogos}
                          onGameContextMenu={(game: Game, x: number, y: number) => {
                            setRightClickMenu(null);
                            setGameContextMenu({ game, x, y });
                          }}
                          onEmptySpaceClick={(x: number, y: number) => {
                            setGameContextMenu(null);
                            setRightClickMenu({ x, y });
                          }}
                          viewMode={viewMode as 'grid' | 'logo'}
                        />
                      ) : viewMode === 'coverflow' ? (
                        <Suspense fallback={lazyRenderFallback}>
                          <LibraryCoverFlow
                            games={displayGames}
                            onPlay={handlePlay}
                            onGameClick={handleGameClick}
                            onEdit={handleEditGame}
                            onEditImages={handleEditImages}
                            onEditCategories={handleEditCategories}
                            onFavorite={handleToggleFavorite}
                            onPin={handleTogglePin}
                            onFixMatch={handleFixMatch}
                            onHide={handleHideGame}
                            onUnhide={handleUnhideGame}
                            onUninstall={handleUninstallGame}
                            isHiddenView={selectedCategory === 'hidden'}
                            activeGameId={activeGameId}
                            coverSize={coverFlowCoverSize}
                            reflectionStrength={coverFlowReflection / 100}
                            verticalOffset={coverFlowVerticalOffset}
                            sideOpacity={coverFlowSideOpacity}
                            showButtons={coverFlowShowButtons}
                            buttonPosition={coverFlowButtonPosition}
                            buttonColors={coverFlowButtonColors}
                            onEmptySpaceRightClick={(x, y) => {
                              setGameContextMenu(null);
                              setRightClickMenu({ x, y });
                            }}
                          />
                        </Suspense>
                      ) : viewMode === 'carousel' ? (
                        <Suspense fallback={lazyRenderFallback}>
                          <LibraryCarousel
                            games={displayGames}
                            onPlay={handlePlay}
                            onGameClick={handleGameClick}
                            onEdit={handleEditGame}
                            onEditImages={handleEditImages}
                            onEditCategories={handleEditCategories}
                            onFavorite={handleToggleFavorite}
                            onPin={handleTogglePin}
                            onFixMatch={handleFixMatch}
                            onHide={handleHideGame}
                            onUnhide={handleUnhideGame}
                            onUninstall={handleUninstallGame}
                            isHiddenView={selectedCategory === 'hidden'}
                            activeGameId={activeGameId}
                            selectedBoxArtSize={selectedBoxArtSize}
                            gameTilePadding={carouselGameTilePadding}
                            showCarouselDetails={showCarouselDetails}
                            showCarouselLogos={showCarouselLogos}
                            detailsBarSize={detailsBarSize}
                            onDetailsBarSizeChange={(size) => {
                              setDetailsBarSize(size);
                              window.electronAPI.savePreferences({ detailsBarSize: size });
                            }}
                            carouselLogoSize={carouselLogoSize}
                            onCarouselLogoSizeChange={(size) => {
                              setCarouselLogoSize(size);
                              window.electronAPI.savePreferences({ carouselLogoSize: size });
                            }}
                            carouselButtonSize={carouselButtonSize}
                            onCarouselButtonSizeChange={(size) => {
                              setCarouselButtonSize(size);
                              window.electronAPI.savePreferences({ carouselButtonSize: size });
                            }}
                            carouselDescriptionSize={carouselDescriptionSize}
                            onCarouselDescriptionSizeChange={(size) => {
                              setCarouselDescriptionSize(size);
                              window.electronAPI.savePreferences({ carouselDescriptionSize: size });
                            }}
                            onEmptySpaceRightClick={(x, y) => {
                              setGameContextMenu(null);
                              setRightClickMenu({ x, y });
                            }}
                            isViewFlipped={isViewFlippedByView[viewMode]}
                            carouselButtonColors={carouselButtonColors}
                          />
                        </Suspense>
                      ) : (
                        <LibraryListView
                          games={displayGames}
                          onPlay={handlePlay}
                          onGameClick={handleGameClick}
                          onEdit={handleEditGame}
                          onEditImages={handleEditImages}
                          onEditCategories={handleEditCategories}
                          onFavorite={handleToggleFavorite}
                          onPin={handleTogglePin}
                          onFixMatch={handleFixMatch}
                          onHide={handleHideGame}
                          onUnhide={handleUnhideGame}
                          onUninstall={handleUninstallGame}
                          isHiddenView={selectedCategory === 'hidden'}
                          hideGameTitles={hideGameTitles}
                          listViewOptions={listViewOptions}
                          listViewSize={listViewSize}
                          onEmptySpaceClick={(x, y) => {
                            setGameContextMenu(null);
                            setRightClickMenu({ x, y });
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <Suspense fallback={lazyRenderFallback}>
                      <WelcomeScreen
                        onScanGames={() => {
                          setForceShowInitialOnboarding(false);
                          window.electronAPI.cancelStartupScan?.();
                          openImportWorkbench({ autoStartScan: true });
                        }}
                        onAddFolder={(path, categories, icon) => {
                          setForceShowInitialOnboarding(false);
                          handleAddFolder(path, categories, icon);
                        }}
                        onOpenSettings={() => {
                          setForceShowInitialOnboarding(false);
                          setIsAPISettingsOpen(true);
                        }}
                      />
                    </Suspense>
                  )}
                  {showCategoriesByView[viewMode] && viewMode !== 'carousel' && viewMode !== 'coverflow' && pinnedCategories.length > 0 && (categoriesPositionByView[viewMode] ?? 'top') === 'bottom' && (
                    <div
                      className={`flex items-center gap-2 px-6 py-4 overflow-x-auto no-scrollbar ${(categoriesAlignmentByView[viewMode] ?? 'left') === 'center' ? 'justify-center' : (categoriesAlignmentByView[viewMode] ?? 'left') === 'right' ? 'justify-end' : 'justify-start'
                        }`}
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                      <button
                        onClick={() => setSelectedCategory(null)}
                        style={{ fontSize: `${categoriesSizeByView[viewMode] ?? 12}px` }}
                        className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === null
                          ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                          : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                          }`}
                      >
                        All Games
                      </button>
                      {hasFavoriteGames && (
                        <button
                          onClick={() => setSelectedCategory(selectedCategory === 'favorites' ? null : 'favorites')}
                          style={{ fontSize: `${categoriesSizeByView[viewMode] ?? 12}px` }}
                          className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === 'favorites'
                            ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                            }`}
                        >
                          Favorites
                        </button>
                      )}
                      {pinnedCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                          style={{ fontSize: `${categoriesSizeByView[viewMode] ?? 12}px` }}
                          className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${selectedCategory === cat
                            ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Game Details (hidden in carousel/coverflow mode and when no games exist) */}
          {viewMode !== 'carousel' && viewMode !== 'coverflow' && filteredGames.length > 0 && !forceShowInitialOnboarding && (
            <div className={rightPanelNeedsTopPadding ? 'pt-4 flex-1 flex flex-col min-h-0' : 'flex-1 flex flex-col min-h-0'}>
              <div className="flex-1 min-h-0">
            <GameDetailsPanel
              game={activeGame}
              isLaunching={launchingGameId === activeGame?.id}
              isRunning={activeGame ? runningGames.has(activeGame.id) : false}
              onPlay={handlePlay}
              onSaveGame={handleSaveGame}
              onUpdateGameInState={updateGameInState}
              viewMode={viewMode}
            disableAnimatedBackgrounds={disableAllAnimations || disableAnimatedBackgrounds || overlaysOpen}
            disableAnimatedBanners={disableAllAnimations || disableAnimatedBanners || overlaysOpen}
            disableAnimatedBoxarts={disableAllAnimations || disableAnimatedBoxarts || overlaysOpen}
            disableAnimatedIcons={disableAllAnimations || disableAnimatedIcons || overlaysOpen}
            disableAnimatedLogos={disableAllAnimations || disableAnimatedLogos || overlaysOpen}
            overlaysOpen={overlaysOpen}
              onOpenInGameManager={(game, tab) => {
                openGameManager({ gameId: game.id, tab });
              }}
              onFavorite={handleToggleFavorite}
              onEdit={handleEditGame}
              onEditImages={handleEditImages}
              onEditCategories={handleEditCategories}
              onPin={handleTogglePin}
              onFixMatch={handleFixMatch}
              onHide={handleHideGame}
              onUnhide={handleUnhideGame}
              onUninstall={handleUninstallGame}
              isHiddenView={selectedCategory === 'hidden'}
              onRightClick={(x, y) => {
                setGameContextMenu(null);
                setRightClickMenu({ x, y });
              }}
              panelWidth={currentPanelWidth}
              onPanelWidthChange={(width) => {
                setPanelWidth(width);
                const newByView = { ...panelWidthByViewState, [viewMode]: width };
                setPanelWidthByViewState(newByView);
                window.electronAPI.savePreferences({ panelWidthByView: newByView });
              }}
              rightPanelLogoSize={rightPanelLogoSize}
              rightPanelBoxartPosition={rightPanelBoxartPosition}
              rightPanelBoxartSize={rightPanelBoxartSize}
              rightPanelTextSize={rightPanelTextSize}
              rightPanelButtonSize={rightPanelButtonSize}
              rightPanelButtonLocation={rightPanelButtonLocation}
              detailsPanelOpacity={detailsPanelOpacity}
              fanartHeight={currentFanartHeight}
              onFanartHeightChange={(height) => {
                const newByView = { ...fanartHeightByView, [viewMode]: height };
                setFanartHeightByView(newByView);
                window.electronAPI.savePreferences({ fanartHeightByView: newByView });
              }}
              descriptionWidth={currentDescriptionWidth}
              onDescriptionWidthChange={(width) => {
                const newByView = { ...descriptionWidthByView, [viewMode]: width };
                setDescriptionWidthByView(newByView);
                window.electronAPI.savePreferences({ descriptionWidthByView: newByView });
              }}
              detailsPanelBottomBarHeight={detailsPanelBottomBarHeight}
              onDetailsPanelBottomBarHeightChange={(height) => {
                setDetailsPanelBottomBarHeight(height);
                window.electronAPI.savePreferences({ detailsPanelBottomBarHeight: height });
              }}
              isViewFlipped={isViewFlippedByView[viewMode]}
              rightPanelButtonColors={
                viewMode === 'grid' ? gridButtonColors :
                  viewMode === 'list' ? listButtonColors :
                    viewMode === 'logo' ? logoButtonColors :
                      rightPanelButtonColors
              }
              linkDisplayOrder={linkDisplayOrder}
              visibleLinkTypes={visibleLinkTypes}
            />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddGame}
      />


      {/* Game Metadata Editor */}
      {selectedExecutable && (
        <GameMetadataEditor
          isOpen={isMetadataEditorOpen}
          onClose={closeMetadataEditor}
          executable={selectedExecutable}
          onSave={handleSaveGameWithMetadata}
        />
      )}

      {/* Steam Configuration Modal */}
      <SteamConfigModal
        isOpen={isSteamConfigOpen}
        onClose={() => setIsSteamConfigOpen(false)}
        onScan={handleSteamConfigScan}
      />


      {/* Categories Editor Modal */}
      <CategoriesEditor
        isOpen={isCategoriesEditorOpen}
        game={editingCategoriesGame}
        onClose={closeCategoriesEditor}
        onSave={async (game) => {
          await handleSaveGame(game);
        }}
        allCategories={allCategories}
      />


      {/* Onyx Settings Modal */}
      <Suspense fallback={lazyRenderFallback}>
        <OnyxSettingsModal
          isOpen={isOnyxSettingsOpen}
          onClose={closeOnyxSettings}
          initialTab={onyxSettingsInitialTab}
          onShowImportModal={(games, appType) => {
            openImportWorkbenchWithGames(games, { autoStartScan: appType === 'steam' });
          }}
          onSave={refreshAfterSettingsSave}
        />
      </Suspense>

      {/* API Settings Modal */}
      <APISettingsModal
        isOpen={isAPISettingsOpen}
        onClose={() => setIsAPISettingsOpen(false)}
      />


      {/* Update Library Modal */}
      <UpdateLibraryModal
        isOpen={isUpdateLibraryOpen}
        onClose={() => setIsUpdateLibraryOpen(false)}
        onUpdate={() => {
          loadLibrary();
        }}
        onShowImportModal={(games, appType = 'steam') => {
          openImportWorkbenchWithGames(games, { autoStartScan: appType === 'steam' });
        }}
      />

      {/* Game Importer */}
      <Suspense fallback={lazyRenderFallback}>
        <ImportWorkbench
          isOpen={isImportWorkbenchOpen}
          autoStartScan={autoStartScan}
          initialMode={importWorkbenchInitialMode}
          onRefreshComplete={loadLibrary}
          onClose={closeImportWorkbench}
          existingLibrary={games}
          preScannedGames={preScannedGames.length > 0 ? preScannedGames : undefined}
          onImport={handleImport}
        />
      </Suspense>

      {/* Game Manager */}
      <Suspense fallback={lazyRenderFallback}>
        <GameManager
          isOpen={isGameManagerOpen}
          onClose={closeGameManager}
          games={games}
          initialGameId={gameManagerInitialGameId}
          initialTab={gameManagerInitialTab}
          onOpenImporterWithMode={async (mode) => {
            closeGameManager();
            if (mode === 'nuclear') {
              const result = await window.electronAPI.clearLibrary?.();
              if (!result?.success) {
                console.error('Failed to clear library:', result?.error);
                return;
              }
              await loadLibrary();
              openImportWorkbench({ initialMode: 'nuclear', autoStartScan: true });
            } else if (mode === 'images') {
              const result = await window.electronAPI.clearAllImages?.();
              if (!result?.success) {
                console.error('Failed to clear images:', result?.error);
                return;
              }
              await loadLibrary();
              openImportWorkbench({ initialMode: 'images' });
            } else if (mode === 'links') {
              const result = await window.electronAPI.clearAllLinks?.();
              if (!result?.success) {
                console.error('Failed to clear links:', result?.error);
                return;
              }
              await loadLibrary();
              openImportWorkbench({ initialMode: 'links' });
            }
          }}
          onRequestOptimizer={() => setShowOptimizerModal(true)}
          onSaveGame={async (game, oldGame) => {
          // Get old game if not provided
          if (!oldGame) {
            oldGame = games.find(g => g.id === game.id);
          }
          await window.electronAPI.saveGame(game, oldGame);
          // Check if it's just an image update
          const isImageUpdate = oldGame && (
            game.boxArtUrl !== oldGame.boxArtUrl ||
            game.bannerUrl !== oldGame.bannerUrl ||
            game.alternativeBannerUrl !== oldGame.alternativeBannerUrl ||
            game.logoUrl !== oldGame.logoUrl ||
            game.heroUrl !== oldGame.heroUrl ||
            game.iconUrl !== oldGame.iconUrl
          );

          if (isImageUpdate) {
            // Update the game in state without reloading - this updates the main app immediately
            updateGameInState(game);
          } else {
            // For non-image updates, reload the library
            await loadLibrary();
          }
        }}
          onDeleteGame={async (gameId) => {
            await deleteGame(gameId);
            await loadLibrary();
          }}
          onReloadLibrary={loadLibrary}
        />
      </Suspense>

      {/* Right Click Menu */}
      {rightClickMenu && (
        <RightClickMenu
          x={rightClickMenu.x}
          y={rightClickMenu.y}
          onClose={() => setRightClickMenu(null)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeGame={activeGame || undefined}
          onActiveGameChange={(game) => {
            setActiveGameId(game.id);
            updateGameInState(game);
            // Note: Do NOT save here - let RightClickMenu handle saves with debouncing
            // This prevents duplicate saves and flickering on logo size changes
          }}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
          logoSize={logoSize}
          onLogoSizeChange={setLogoSize}
          listSize={listViewSize}
          onListSizeChange={setListViewSize}
          listViewOptions={listViewOptions}
          onListViewOptionsChange={(options) => {
            setListViewOptions({
              ...defaultListViewOptions,
              ...options,
              showLauncher: options.showLauncher ?? true,
              showLogos: options.showLogos ?? false,
            });
            window.electronAPI.savePreferences({ listViewOptions: options });
          }}
          gameTilePadding={gameTilePadding}
          onGameTilePaddingChange={setGameTilePadding}
          backgroundBlur={backgroundBlur}
          onBackgroundBlurChange={setBackgroundBlur}
          backgroundBrightness={currentBackgroundBrightness}
          onBackgroundBrightnessChange={(brightness: number) => {
            const newByView = { ...backgroundBrightnessByView, [viewMode]: brightness };
            setBackgroundBrightnessByView(newByView);
            window.electronAPI.savePreferences({ backgroundBrightnessByView: newByView });
          }}
          selectedBoxArtSize={selectedBoxArtSize}
          onSelectedBoxArtSizeChange={setSelectedBoxArtSize}
          panelWidth={currentPanelWidth}
          onPanelWidthChange={(width) => {
            setPanelWidth(width);
            const newByView = { ...panelWidthByViewState, [viewMode]: width };
            setPanelWidthByViewState(newByView);
            window.electronAPI.savePreferences({ panelWidthByView: newByView });
          }}
          carouselLogoSize={carouselLogoSize}
          onCarouselLogoSizeChange={(size) => {
            setCarouselLogoSize(size);
            window.electronAPI.savePreferences({ carouselLogoSize: size });
          }}
          detailsBarSize={detailsBarSize}
          onDetailsBarSizeChange={(size) => {
            setDetailsBarSize(size);
            window.electronAPI.savePreferences({ detailsBarSize: size });
          }}
          showCarouselDetails={showCarouselDetails}
          onShowCarouselDetailsChange={(show) => {
            setShowCarouselDetails(show);
            window.electronAPI.savePreferences({ showCarouselDetails: show });
          }}
          showCarouselLogos={showCarouselLogos}
          onShowCarouselLogosChange={(show) => {
            setShowCarouselLogos(show);
            window.electronAPI.savePreferences({ showCarouselLogos: show });
          }}
          carouselButtonSize={carouselButtonSize}
          onCarouselButtonSizeChange={(size) => {
            setCarouselButtonSize(size);
            window.electronAPI.savePreferences({ carouselButtonSize: size });
          }}
          carouselDescriptionSize={carouselDescriptionSize}
          onCarouselDescriptionSizeChange={(size) => {
            setCarouselDescriptionSize(size);
            window.electronAPI.savePreferences({ carouselDescriptionSize: size });
          }}
          showCategoriesInGameList={showCategoriesByView[viewMode] ?? false}
          onShowCategoriesInGameListChange={(show) => {
            const newByView = { ...showCategoriesByView, [viewMode]: show };
            setShowCategoriesByView(newByView);
            window.electronAPI.savePreferences({ showCategoriesInGameListByView: newByView });
          }}
          categoriesPosition={categoriesPositionByView[viewMode] ?? 'top'}
          onCategoriesPositionChange={(position: 'top' | 'bottom') => {
            const newByView = { ...categoriesPositionByView, [viewMode]: position };
            setCategoriesPositionByView(newByView);
            window.electronAPI.savePreferences({ categoriesPositionByView: newByView });
          }}
          categoriesTopAlignment={categoriesAlignmentByView[viewMode] ?? 'left'}
          onCategoriesTopAlignmentChange={(alignment: 'left' | 'center' | 'right') => {
            const newByView = { ...categoriesAlignmentByView, [viewMode]: alignment };
            setCategoriesAlignmentByView(newByView);
            window.electronAPI.savePreferences({ categoriesAlignmentByView: newByView });
          }}
          categoriesTopSize={categoriesSizeByView[viewMode] ?? 12}
          onCategoriesTopSizeChange={(size: number) => {
            const newByView = { ...categoriesSizeByView, [viewMode]: size };
            setCategoriesSizeByView(newByView);
            window.electronAPI.savePreferences({ categoriesSizeByView: newByView });
          }}
          showLogoOverBoxart={showLogoOverBoxart}
          onShowLogoOverBoxartChange={(show) => {
            setShowLogoOverBoxart(show);
            window.electronAPI.savePreferences({ showLogoOverBoxart: show });
          }}
          logoPosition={logoPosition}
          onLogoPositionChange={(position) => {
            setLogoPosition(position);
            window.electronAPI.savePreferences({ logoPosition: position });
          }}
          logoBackgroundColor={logoBackgroundColor}
          onLogoBackgroundColorChange={(color: string) => {
            setLogoBackgroundColor(color);
            window.electronAPI.savePreferences({ logoBackgroundColor: color });
          }}
          logoBackgroundOpacity={logoBackgroundOpacity}
          onLogoBackgroundOpacityChange={(opacity: number) => {
            setLogoBackgroundOpacity(opacity);
            window.electronAPI.savePreferences({ logoBackgroundOpacity: opacity });
          }}
          rightPanelLogoSize={rightPanelLogoSize}
          onRightPanelLogoSizeChange={(size) => {
            setRightPanelLogoSize(size);
            window.electronAPI.savePreferences({ rightPanelLogoSize: size });
          }}
          rightPanelBoxartPosition={rightPanelBoxartPosition}
          onRightPanelBoxartPositionChange={(position) => {
            setRightPanelBoxartPosition(position);
            window.electronAPI.savePreferences({ rightPanelBoxartPosition: position });
          }}
          rightPanelBoxartSize={rightPanelBoxartSize}
          onRightPanelBoxartSizeChange={(size) => {
            setRightPanelBoxartSize(size);
            window.electronAPI.savePreferences({ rightPanelBoxartSize: size });
          }}
          rightPanelTextSize={rightPanelTextSize}
          onRightPanelTextSizeChange={(size) => {
            setRightPanelTextSize(size);
            window.electronAPI.savePreferences({ rightPanelTextSize: size });
          }}
          rightPanelButtonSize={rightPanelButtonSize}
          onRightPanelButtonSizeChange={(size) => {
            setRightPanelButtonSize(size);
            window.electronAPI.savePreferences({ rightPanelButtonSize: size });
          }}
          rightPanelButtonLocation={rightPanelButtonLocation}
          onRightPanelButtonLocationChange={(location) => {
            setRightPanelButtonLocation(location);
            window.electronAPI.savePreferences({ rightPanelButtonLocation: location });
          }}
          isViewFlipped={isViewFlippedByView[viewMode]}
          onViewFlipChange={(flipped) => {
            const newByView = { ...isViewFlippedByView, [viewMode]: flipped };
            setIsViewFlippedByView(newByView);
            window.electronAPI.savePreferences({ isViewFlippedByView: newByView });
          }}
          detailsPanelOpacity={detailsPanelOpacity}
          onDetailsPanelOpacityChange={(opacity) => {
            setDetailsPanelOpacity(opacity);
            window.electronAPI.savePreferences({ detailsPanelOpacity: opacity });
          }}
          fanartHeight={currentFanartHeight}
          onFanartHeightChange={(height) => {
            const newByView = { ...fanartHeightByView, [viewMode]: height };
            setFanartHeightByView(newByView);
            window.electronAPI.savePreferences({ fanartHeightByView: newByView });
          }}
          descriptionWidth={currentDescriptionWidth}
          onDescriptionWidthChange={(width) => {
            const newByView = { ...descriptionWidthByView, [viewMode]: width };
            setDescriptionWidthByView(newByView);
            window.electronAPI.savePreferences({ descriptionWidthByView: newByView });
          }}
          detailsPanelBottomBarHeight={detailsPanelBottomBarHeight}
          onDetailsPanelBottomBarHeightChange={(height: number) => {
            setDetailsPanelBottomBarHeight(height);
            window.electronAPI.savePreferences({ detailsPanelBottomBarHeight: height });
          }}
          rightPanelButtonColors={rightPanelButtonColors}
          onRightPanelButtonColorsChange={(colors) => {
            setRightPanelButtonColors(colors);
            window.electronAPI.savePreferences({ rightPanelButtonColors: colors });
          }}
          carouselButtonColors={carouselButtonColors}
          onCarouselButtonColorsChange={(colors) => {
            setCarouselButtonColors(colors);
            window.electronAPI.savePreferences({ carouselButtonColors: colors });
          }}
          gridButtonColors={gridButtonColors}
          onGridButtonColorsChange={(colors) => {
            setGridButtonColors(colors);
            window.electronAPI.savePreferences({ gridButtonColors: colors });
          }}
          listButtonColors={listButtonColors}
          onListButtonColorsChange={(colors) => {
            setListButtonColors(colors);
            window.electronAPI.savePreferences({ listButtonColors: colors });
          }}
          logoButtonColors={logoButtonColors}
          onLogoButtonColorsChange={(colors) => {
            setLogoButtonColors(colors);
            window.electronAPI.savePreferences({ logoButtonColors: colors });
          }}
          coverFlowCoverSize={coverFlowCoverSize}
          onCoverFlowCoverSizeChange={(size) => {
            setCoverFlowCoverSize(size);
            window.electronAPI.savePreferences({ coverFlowCoverSize: size });
          }}
          coverFlowReflection={coverFlowReflection}
          onCoverFlowReflectionChange={(value) => {
            setCoverFlowReflection(value);
            window.electronAPI.savePreferences({ coverFlowReflection: value });
          }}
          coverFlowVerticalOffset={coverFlowVerticalOffset}
          onCoverFlowVerticalOffsetChange={(value: number) => {
            setCoverFlowVerticalOffset(value);
            window.electronAPI.savePreferences({ coverFlowVerticalOffset: value } as any);
          }}
          coverFlowSideOpacity={coverFlowSideOpacity}
          onCoverFlowSideOpacityChange={(value: number) => {
            setCoverFlowSideOpacity(value);
            window.electronAPI.savePreferences({ coverFlowSideOpacity: value } as any);
          }}
          coverFlowShowButtons={coverFlowShowButtons}
          onCoverFlowShowButtonsChange={(show) => {
            setCoverFlowShowButtons(show);
            window.electronAPI.savePreferences({ coverFlowShowButtons: show });
          }}
          coverFlowButtonPosition={coverFlowButtonPosition}
          onCoverFlowButtonPositionChange={(pos) => {
            setCoverFlowButtonPosition(pos);
            window.electronAPI.savePreferences({ coverFlowButtonPosition: pos });
          }}
          coverFlowButtonColors={coverFlowButtonColors}
          onCoverFlowButtonColorsChange={(colors) => {
            setCoverFlowButtonColors(colors);
            window.electronAPI.savePreferences({ coverFlowButtonColors: colors });
          }}
          onSettingsImported={refreshPreferences}
        />
      )}

      {/* Game Context Menu */}
      {gameContextMenu && (
        <GameContextMenu
          game={gameContextMenu.game}
          x={gameContextMenu.x}
          y={gameContextMenu.y}
          onClose={() => setGameContextMenu(null)}
          onPlay={handlePlay}
          onEdit={handleEditGame}
          onEditImages={handleEditImages}
          onEditCategories={handleEditCategories}
          onFavorite={handleToggleFavorite}
          onPin={handleTogglePin}
          onFixMatch={handleFixMatch}
          onHide={handleHideGame}
          onUnhide={handleUnhideGame}
          onUninstall={handleUninstallGame}
          isHiddenView={selectedCategory === 'hidden'}
        />
      )}

      {/* Metadata Search Modal */}
      {fixingGame && (
        <Suspense fallback={lazyRenderFallback}>
          <MetadataSearchModal
            isOpen={isMetadataSearchOpen}
            onClose={closeMetadataSearch}
            game={fixingGame}
            onSelect={handleSelectMetadataMatch}
          />
        </Suspense>
      )}

      {/* Bug Report Modal */}
      <Suspense fallback={lazyRenderFallback}>
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={() => setIsBugReportOpen(false)}
        />
      </Suspense>

      {/* Hide Game Confirmation Dialog */}
      {hideConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Hide "${hideConfirmation.game.title}"?`}
          message="This game will be hidden from your library view."
          note="You can find hidden games by selecting the 'Hidden' category from the Categories dropdown."
          confirmText="Hide"
          cancelText="Cancel"
          onConfirm={handleConfirmHide}
          onCancel={handleCancelHide}
        />
      )}

      {/* Launch Confirmation Dialog */}
      {launchConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Launch "${launchConfirmation.game.title}"?`}
          message="Are you sure you want to launch this game?"
          confirmText="Launch"
          cancelText="Cancel"
          onConfirm={confirmLaunch}
          onCancel={cancelLaunchConfirmation}
        />
      )}

      <AppShellOverlays
        updateNotification={updateNotification}
        currentVersion={currentVersion}
        changelogSource={changelogSource}
        changelogLoading={changelogLoading}
        changelogError={changelogError}
        isUpdateModalTest={isUpdateModalTest}
        onUpdateNow={handleUpdateNow}
        onDismissUpdate={handleDismissUpdateNotification}
        onInstallUpdate={() => {
          window.electronAPI.quitAndInstall?.();
        }}
        crashDumpPaths={crashDumpPaths}
        onSaveCrashDumps={handleSaveCrashDumps}
        onOpenCrashDumpFolder={handleOpenCrashDumpFolder}
        onDismissCrashDumps={handleDismissCrashDumps}
        showLibraryTutorial={showLibraryTutorial}
        onCloseLibraryTutorial={closeLibraryTutorial}
        onOpenSettings={() => openOnyxSettings('general')}
        onOpenUpdateLibrary={handleUpdateSteamLibrary}
        toast={toast}
        onDismissToast={() => setToast(null)}
        missingGames={missingGames}
        onRemoveMissingGames={handleRemoveMissingGames}
        onCancelMissingGames={handleCancelMissingGames}
        startupProgress={startupProgress}
        foundGames={foundGames}
        onCancelFoundGames={handleCancelFoundGames}
        onReviewFoundGames={handleReviewFoundGames}
      />
    </div>
  );
}

export default App;


