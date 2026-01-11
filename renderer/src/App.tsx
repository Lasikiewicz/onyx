import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useGameLibrary } from './hooks/useGameLibrary';
import { LibraryGrid } from './components/LibraryGrid';
import { LibraryListView } from './components/LibraryListView';
import { LibraryContextMenu } from './components/LibraryContextMenu';
import { SimpleContextMenu } from './components/SimpleContextMenu';
import { AddGameModal } from './components/AddGameModal';
import { GameDetailsPanel } from './components/GameDetailsPanel';
import { GameMetadataEditor } from './components/GameMetadataEditor';
import { SteamConfigModal } from './components/SteamConfigModal';
// REMOVED: SteamImportModal - All imports now use ImportWorkbench
// import { SteamImportModal } from './components/SteamImportModal';
import { CategoriesEditor } from './components/CategoriesEditor';
import { TopBar } from './components/TopBar';
import { MenuBar } from './components/MenuBar';
import { UpdateLibraryModal } from './components/UpdateLibraryModal';
import { OnyxSettingsModal } from './components/OnyxSettingsModal';
import { APISettingsModal } from './components/APISettingsModal';
import { MetadataSearchModal } from './components/MetadataSearchModal';
import { ImportWorkbench } from './components/importer/ImportWorkbench';
import { GameManager } from './components/GameManager';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { BugReportModal } from './components/BugReportModal';
import { Game, ExecutableFile, GameMetadata } from './types/game';
import { areAPIsConfigured } from './utils/apiValidation';

function App() {
  const { games, loading, error, reorderGames, addCustomGame, loadLibrary, deleteGame, updateGameInState } = useGameLibrary();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Scanning state
  const [, setIsScanningSteam] = useState(false);
  
  // Folder scan state (for ImportWorkbench)
  const [importWorkbenchFolderPath, setImportWorkbenchFolderPath] = useState<string | undefined>(undefined);
  
  // Metadata editor state
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [selectedExecutable, setSelectedExecutable] = useState<ExecutableFile | null>(null);
  
  // Steam config modal state
  const [isSteamConfigOpen, setIsSteamConfigOpen] = useState(false);
  
  // REMOVED: Steam import modal state - All imports now use ImportWorkbench
  // const [isSteamImportOpen, setIsSteamImportOpen] = useState(false);
  const [scannedSteamGames, setScannedSteamGames] = useState<Array<any>>([]);
  const [importAppType, setImportAppType] = useState<'steam' | 'xbox' | 'other'>('steam');
  
  
  // Categories editor state
  const [isCategoriesEditorOpen, setIsCategoriesEditorOpen] = useState(false);
  const [editingCategoriesGame, setEditingCategoriesGame] = useState<Game | null>(null);
  
  // Metadata search modal state
  const [isMetadataSearchOpen, setIsMetadataSearchOpen] = useState(false);
  const [fixingGame, setFixingGame] = useState<Game | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'logo'>('grid');
  const [activeSection] = useState('library');
  const [showTopBar] = useState(false);
  const [isUpdateLibraryOpen, setIsUpdateLibraryOpen] = useState(false);
  const [isOnyxSettingsOpen, setIsOnyxSettingsOpen] = useState(false);
  const [isImportWorkbenchOpen, setIsImportWorkbenchOpen] = useState(false);
  const [isGameManagerOpen, setIsGameManagerOpen] = useState(false);
  const [gameManagerInitialGameId, setGameManagerInitialGameId] = useState<string | null>(null);
  const [gameManagerInitialTab, setGameManagerInitialTab] = useState<'images' | 'metadata' | 'modManager'>('images');
  const [onyxSettingsInitialTab, setOnyxSettingsInitialTab] = useState<'general' | 'appearance' | 'apis' | 'apps' | 'about'>('general');
  const [isAPISettingsOpen, setIsAPISettingsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [gridSize, setGridSize] = useState(120);
  const [pinnedCategories, setPinnedCategories] = useState<string[]>([]);
  const [newGamesNotification, setNewGamesNotification] = useState<{ count: number; games: Array<any> } | null>(null);
  const [hideVRTitles, setHideVRTitles] = useState(true);
  const [hideAppsTitles, setHideAppsTitles] = useState(true);
  const [hideGameTitles, setHideGameTitles] = useState(false);
  const [gameTilePadding, setGameTilePadding] = useState(16);
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [backgroundBlur, setBackgroundBlur] = useState(40);
  const [backgroundMode, setBackgroundMode] = useState<'image' | 'color'>('image');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [listViewOptions, setListViewOptions] = useState({
    showDescription: true,
    showCategories: false,
    showPlaytime: true,
    showReleaseDate: true,
    showGenres: true,
    showPlatform: false,
  });
  const [listViewSize, setListViewSize] = useState(128);
  const [panelWidth, setPanelWidth] = useState(800);
  const [simpleContextMenu, setSimpleContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [autoSizeToFit, setAutoSizeToFit] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (prefs.gridSize) setGridSize(prefs.gridSize);
        if (prefs.pinnedCategories) setPinnedCategories(prefs.pinnedCategories);
        if (prefs.hideVRTitles !== undefined) setHideVRTitles(prefs.hideVRTitles);
        if (prefs.hideAppsTitles !== undefined) setHideAppsTitles(prefs.hideAppsTitles);
        if (prefs.hideGameTitles !== undefined) setHideGameTitles(prefs.hideGameTitles);
        if (prefs.gameTilePadding !== undefined) setGameTilePadding(prefs.gameTilePadding);
        if (prefs.showLogoOverBoxart !== undefined) setShowLogoOverBoxart(prefs.showLogoOverBoxart);
        if (prefs.logoPosition !== undefined) setLogoPosition(prefs.logoPosition);
        if (prefs.backgroundBlur !== undefined) setBackgroundBlur(prefs.backgroundBlur);
        if (prefs.viewMode) setViewMode(prefs.viewMode as 'grid' | 'list' | 'logo');
        if (prefs.backgroundMode) setBackgroundMode(prefs.backgroundMode as 'image' | 'color');
        if (prefs.backgroundColor) setBackgroundColor(prefs.backgroundColor);
        if (prefs.listViewOptions) setListViewOptions(prefs.listViewOptions);
        if (prefs.listViewSize) setListViewSize(prefs.listViewSize);
        if (prefs.panelWidth) setPanelWidth(prefs.panelWidth);
        if (prefs.autoSizeToFit !== undefined) setAutoSizeToFit(prefs.autoSizeToFit);
        // Restore active game selection if it exists
        if (prefs.activeGameId) {
          setActiveGameId(prefs.activeGameId);
        }
        setIsInitialLoad(false);
      } catch (error) {
        console.error('Error loading preferences:', error);
        setIsInitialLoad(false);
      }
    };
    loadPreferences();
  }, []);

  // Save grid size when it changes (but not when auto-size is enabled)
  useEffect(() => {
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
  }, [gridSize, autoSizeToFit]);

  // Save pinned categories when they change
  useEffect(() => {
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
  }, [pinnedCategories]);

  // Save hideVRTitles when it changes
  useEffect(() => {
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
  }, [hideVRTitles]);

  // Save hideAppsTitles when it changes
  useEffect(() => {
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
  }, [hideAppsTitles]);

  // Save appearance preferences when they change (but skip initial load)
  useEffect(() => {
    if (isInitialLoad) return; // Skip saving on initial load
    
    const saveAppearancePrefs = async () => {
      try {
        await window.electronAPI.savePreferences({ 
          hideGameTitles,
          gameTilePadding,
          backgroundBlur,
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
  }, [hideGameTitles, gameTilePadding, backgroundBlur, viewMode, isInitialLoad]);

  // Save activeGameId when it changes
  useEffect(() => {
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
  }, [activeGameId]);

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
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  // Filter and sort state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLauncher, setSelectedLauncher] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'releaseDate' | 'playtime' | 'lastPlayed'>('title');


  // Listen to menu events
  useEffect(() => {
    const cleanup1 = window.electronAPI.onMenuEvent('menu:addGame', async () => {
      const apisConfigured = await areAPIsConfigured();
      if (!apisConfigured) {
        showToast('Both IGDB (Client ID + Secret) and SteamGridDB (API Key) are required before adding games. Please configure them in Settings > APIs.', 'error');
        setIsOnyxSettingsOpen(true);
        setOnyxSettingsInitialTab('apis');
        return;
      }
      setIsModalOpen(true);
    });
    const cleanup2 = window.electronAPI.onMenuEvent('menu:scanFolder', () => {
      handleScanFolder();
    });
    const cleanup3 = window.electronAPI.onMenuEvent('menu:updateSteamLibrary', () => {
      handleUpdateSteamLibrary();
    });
    const cleanup4 = window.electronAPI.onMenuEvent('menu:configureSteam', () => {
      setIsSteamConfigOpen(true);
    });

    // Listen for new Steam games found notification
    const newGamesHandler = (_event: any, data: { count: number; games: Array<any> }) => {
      setNewGamesNotification({ count: data.count, games: data.games });
    };
    
    // Listen for new games found from background scan (all sources)
    const backgroundNewGamesHandler = (_event: any, data: { count: number; games: Array<any>; bySource?: Record<string, Array<any>> }) => {
      console.log('[App] Background scan found new games:', data);
      setNewGamesNotification({ count: data.count, games: data.games });
    };
    
    if (window.ipcRenderer) {
      window.ipcRenderer.on('steam:newGamesFound', newGamesHandler);
      window.ipcRenderer.on('background:newGamesFound', backgroundNewGamesHandler);
    }

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      if (window.ipcRenderer) {
        window.ipcRenderer.off('steam:newGamesFound', newGamesHandler);
        window.ipcRenderer.off('background:newGamesFound', backgroundNewGamesHandler);
      }
    };
  }, []);

  // Get all unique categories from games
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    games.forEach(game => {
      game.categories?.forEach(cat => categories.add(cat));
    });
    return Array.from(categories).sort();
  }, [games]);

  // Automatically pin VR and Apps categories when they exist
  useEffect(() => {
    const categoriesToAutoPin = ['VR', 'Apps'];
    setPinnedCategories(prev => {
      const updated = [...prev];
      let changed = false;
      
      categoriesToAutoPin.forEach(category => {
        if (allCategories.includes(category) && !prev.includes(category)) {
          updated.push(category);
          changed = true;
        }
      });
      
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
    if (hideVRTitles && selectedCategory !== 'VR') {
      filtered = filtered.filter(g => 
        !g.categories?.includes('VR')
      );
    }
    
    // Filter out Apps titles if hideAppsTitles is enabled, but not if Apps category is selected
    if (hideAppsTitles && selectedCategory !== 'Apps') {
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
  }, [games, searchQuery, activeSection, selectedCategory, selectedLauncher, sortBy, hideVRTitles]);

  const activeGame = activeGameId ? games.find(g => g.id === activeGameId) || null : null;

  const handlePlay = async (game: Game) => {
    try {
      const result = await window.electronAPI.launchGame(game.id);
      if (!result.success) {
        console.error('Failed to launch game:', result.error);
        // You could show a toast notification here
        alert(`Failed to launch game: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error launching game:', error);
      alert(`Error launching game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
    let bestColumns = 0;
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
          bestColumns = columns;
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
  }, [viewMode, filteredGames.length, gameTilePadding, hideGameTitles]);

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

  const handleAutoSizeToFit = () => {
    const newValue = !autoSizeToFit;
    setAutoSizeToFit(newValue);
    window.electronAPI.savePreferences({ autoSizeToFit: newValue });
    
    if (newValue) {
      // Calculate immediately when enabled
      calculateAutoSize();
    }
  };

  const handleGameClick = (game: Game) => {
    setActiveGameId(game.id);
  };

  const handleEditGame = (game: Game) => {
    setGameManagerInitialGameId(game.id);
    setGameManagerInitialTab('metadata');
    setIsGameManagerOpen(true);
  };

  const handleEditCategories = (game: Game) => {
    setEditingCategoriesGame(game);
    setIsCategoriesEditorOpen(true);
  };

  const handleEditImages = (game: Game) => {
    setGameManagerInitialGameId(game.id);
    setGameManagerInitialTab('images');
    setIsGameManagerOpen(true);
  };

  const handleFixMatch = (game: Game) => {
    setGameManagerInitialGameId(game.id);
    setGameManagerInitialTab('metadata');
    setIsGameManagerOpen(true);
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
        oldGame = games.find(g => g.id === game.id);
      }
      const success = await window.electronAPI.saveGame(game, oldGame);
      if (success) {
        await loadLibrary();
        // Verify the game was saved correctly
        const updatedGames = await window.electronAPI.getLibrary();
        const savedGame = updatedGames.find(g => g.id === game.id);
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

  const handleDeleteGame = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      const success = await deleteGame(gameId);
      if (success) {
        await loadLibrary();
        showToast(`Game "${game?.title || 'Unknown'}" deleted successfully`, 'success');
        if (activeGameId === gameId) {
          setActiveGameId(null);
        }
      } else {
        showToast('Failed to delete game', 'error');
      }
    } catch (err) {
      console.error('Error in handleDeleteGame:', err);
      showToast('Failed to delete game', 'error');
    }
  };

  const handleAddGame = async (game: Game) => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsModalOpen(false);
      setIsOnyxSettingsOpen(true);
      setOnyxSettingsInitialTab('apis');
      return;
    }
    await addCustomGame(game);
  };

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Hide confirmation dialog state
  const [hideConfirmation, setHideConfirmation] = useState<{ game: Game } | null>(null);

  // Update Library handler - opens game importer
  const handleUpdateSteamLibrary = async () => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsOnyxSettingsOpen(true);
      setOnyxSettingsInitialTab('apis');
      return;
    }
    setIsImportWorkbenchOpen(true);
  };

  // Handle Steam games import
  const handleSteamGamesImport = async (gamesToImport: Game[], scannedGames: Array<{ appId?: string; id?: string; name: string; installDir?: string; libraryPath?: string; installPath?: string; type?: string }>, selectedGameIds: Set<string>) => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      // setIsSteamImportOpen(false); // REMOVED: No longer using SteamImportModal
      setIsOnyxSettingsOpen(true);
      setOnyxSettingsInitialTab('apis');
      return;
    }

    try {
      // Get current library to find games that should be removed
      const currentLibrary = await window.electronAPI.getLibrary();
      
      // Create a map of scanned game IDs to their library IDs
      // For Steam: library ID is `steam-${appId}`, scanned ID is `appId`
      // For Xbox: library ID is the same as scanned ID
      const scannedGameIdToLibraryId = new Map<string, string>();
      
      scannedGames.forEach(scannedGame => {
        let libraryId: string;
        if ('appId' in scannedGame) {
          // Steam game
          const appId = scannedGame.appId;
          if (appId) {
            libraryId = `steam-${appId}`;
            scannedGameIdToLibraryId.set(appId, libraryId);
          }
        } else if ('installPath' in scannedGame && 'type' in scannedGame && (scannedGame.type === 'uwp' || scannedGame.type === 'pc')) {
          // Xbox game
          const xboxId = scannedGame.id;
          if (xboxId) {
            libraryId = xboxId;
            scannedGameIdToLibraryId.set(xboxId, libraryId);
          }
        } else {
          // Other game (Epic, EA, GOG, Ubisoft, Battle.net)
          const otherId = scannedGame.id;
          if (otherId) {
            libraryId = otherId;
            scannedGameIdToLibraryId.set(otherId, libraryId);
          }
        }
      });
      
      // Find games in library that match scanned games but are not selected
      const gamesToRemove: string[] = [];
      currentLibrary.forEach(libraryGame => {
        // Check if this library game matches any scanned game
        for (const [scannedId, libraryId] of scannedGameIdToLibraryId.entries()) {
          if (libraryGame.id === libraryId && !selectedGameIds.has(scannedId)) {
            gamesToRemove.push(libraryGame.id);
            break;
          }
        }
      });
      
      // Remove unchecked games from library
      for (const gameId of gamesToRemove) {
        await window.electronAPI.deleteGame(gameId);
      }
      
      // Save/update selected games
      for (const game of gamesToImport) {
        await window.electronAPI.saveGame(game);
      }
      
      // Reload library
      await loadLibrary();
      
      const addedCount = gamesToImport.length;
      const removedCount = gamesToRemove.length;
      let message = '';
      if (addedCount > 0 && removedCount > 0) {
        message = `Imported ${addedCount} ${addedCount === 1 ? 'game' : 'games'} and removed ${removedCount} ${removedCount === 1 ? 'game' : 'games'}`;
      } else if (addedCount > 0) {
        message = `Successfully imported ${addedCount} ${addedCount === 1 ? 'game' : 'games'}`;
      } else if (removedCount > 0) {
        message = `Removed ${removedCount} ${removedCount === 1 ? 'game' : 'games'}`;
      }
      
      if (message) {
        showToast(message, 'success');
      }
    } catch (err) {
      console.error('Error importing games:', err);
      showToast('Failed to import games', 'error');
      throw err;
    }
  };

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

  // Scan Folder handler - now uses ImportWorkbench
  const handleScanFolder = async () => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsOnyxSettingsOpen(true);
      setOnyxSettingsInitialTab('apis');
      return;
    }

    try {
      const folderPath = await window.electronAPI.showFolderDialog();
      if (!folderPath) {
        return; // User cancelled
      }

      // Open ImportWorkbench with the selected folder path
      setImportWorkbenchFolderPath(folderPath);
      setIsImportWorkbenchOpen(true);
    } catch (err) {
      console.error('Error selecting folder:', err);
      showToast('Failed to select folder', 'error');
    }
  };


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
      };

      // Save the game
      const success = await window.electronAPI.saveGame(newGame);
      if (success) {
        await loadLibrary();
        showToast(`Game "${metadata.title || title}" added successfully`, 'success');
        setIsMetadataEditorOpen(false);
        setSelectedExecutable(null);
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

  // Get background image from active game
  const backgroundImageUrl = activeGame?.bannerUrl || activeGame?.boxArtUrl || '';

  // Check if this is an Alpha build
  const [isAlphaBuild, setIsAlphaBuild] = useState(false);

  useEffect(() => {
    const checkAlpha = async () => {
      try {
        // Check document title first (fastest)
        if (document.title.includes('Alpha')) {
          setIsAlphaBuild(true);
          return;
        }
        // Check app name via electronAPI (more reliable)
        if (window.electronAPI?.getName) {
          const appName = await window.electronAPI.getName();
          setIsAlphaBuild(appName.includes('Alpha'));
        }
      } catch (error) {
        console.error('Error checking Alpha build:', error);
      }
    };
    checkAlpha();
  }, []);

  return (
    <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white flex flex-col overflow-hidden relative">
      {/* Alpha Banner */}
      {isAlphaBuild && (
        <div className="fixed top-0 right-0 z-50 m-4 pointer-events-none">
          <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg font-bold text-sm uppercase tracking-wider">
            ALPHA
          </div>
        </div>
      )}
      {/* Background - Image or Color */}
      {backgroundMode === 'image' && backgroundImageUrl ? (
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: `blur(${backgroundBlur}px) brightness(0.3)`,
            transform: 'scale(1.1)', // Slight scale to avoid edges
            zIndex: 0,
          }}
        />
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
        onGameManager={() => setIsGameManagerOpen(true)}
        onConfigureSteam={() => setIsSteamConfigOpen(true)}
        onOnyxSettings={() => {
          setOnyxSettingsInitialTab('general');
          setIsOnyxSettingsOpen(true);
        }}
        onAPISettings={() => {
          setOnyxSettingsInitialTab('apis');
          setIsOnyxSettingsOpen(true);
        }}
        onAbout={() => {
          setOnyxSettingsInitialTab('about');
          setIsOnyxSettingsOpen(true);
        }}
        onExit={handleExit}
        onBugReport={() => setIsBugReportOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        allCategories={allCategories}
        pinnedCategories={pinnedCategories}
        onTogglePinCategory={handleTogglePinCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        hasFavoriteGames={hasFavoriteGames}
        hasVRCategory={hasVRCategory}
        hasAppsCategory={hasAppsCategory}
        hasHiddenGames={hasHiddenGames}
        hideVRTitles={hideVRTitles}
        hideAppsTitles={hideAppsTitles}
        onToggleHideVRTitles={() => setHideVRTitles(prev => !prev)}
        onToggleHideAppsTitles={() => setHideAppsTitles(prev => !prev)}
        launchers={allLaunchers}
        selectedLauncher={selectedLauncher}
        onLauncherChange={setSelectedLauncher}
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative pt-10">
        {/* Left Panel - Game Library (flexible width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Game Grid */}
          <div 
            ref={gridContainerRef}
            className="flex-1 overflow-y-auto p-4 relative z-10"
            onContextMenu={(e) => {
              e.preventDefault();
              setSimpleContextMenu({ x: e.clientX, y: e.clientY });
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
                {filteredGames.length > 0 ? (
                  <div className="flex-1 overflow-y-auto">
                    {viewMode === 'grid' || viewMode === 'logo' ? (
                      <LibraryGrid
                        games={filteredGames}
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
                        onGridSizeChange={setGridSize}
                        gameTilePadding={gameTilePadding}
                        hideGameTitles={hideGameTitles}
                        showLogoOverBoxart={showLogoOverBoxart}
                        logoPosition={logoPosition}
                        useLogosInsteadOfBoxart={viewMode === 'logo'}
                        autoSizeToFit={autoSizeToFit}
                      />
                    ) : (
                      <LibraryListView
                        games={filteredGames}
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
                        hideGameTitles={hideGameTitles}
                        listViewOptions={listViewOptions}
                        listViewSize={listViewSize}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="max-w-2xl mx-auto">
                      <p className="text-gray-100 mb-8 text-xl font-semibold">No games found.</p>
                      
                      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-6 text-left">
                        <p className="text-gray-300 text-sm mb-6 text-center">
                          Get started by following these steps:
                        </p>
                        
                        {/* Step Process */}
                        <div className="space-y-4">
                          {/* Step 1: APIs */}
                          <button
                            onClick={() => {
                              setOnyxSettingsInitialTab('apis');
                              setIsOnyxSettingsOpen(true);
                            }}
                            className="w-full flex items-center gap-4 px-4 py-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg transition-colors group"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/30 border-2 border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold">
                              1
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-blue-300 font-medium text-sm mb-1">Step 1: APIs</p>
                              <p className="text-gray-400 text-xs">Configure API credentials for better game metadata and images</p>
                            </div>
                            <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {/* Step 2: Configure Apps */}
                          <button
                            onClick={() => {
                              setOnyxSettingsInitialTab('apps');
                              setIsOnyxSettingsOpen(true);
                            }}
                            className="w-full flex items-center gap-4 px-4 py-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg transition-colors group"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/30 border-2 border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold">
                              2
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-blue-300 font-medium text-sm mb-1">Step 2: Configure Apps</p>
                              <p className="text-gray-400 text-xs">Set up Steam, Xbox, and other game launchers</p>
                            </div>
                            <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {/* Step 3: Game Importer */}
                          <button
                            onClick={() => {
                              setIsImportWorkbenchOpen(true);
                            }}
                            className="w-full flex items-center gap-4 px-4 py-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg transition-colors group"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/30 border-2 border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold">
                              3
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-blue-300 font-medium text-sm mb-1">Step 3: Game Importer</p>
                              <p className="text-gray-400 text-xs">Import and manage your games from various sources</p>
                            </div>
                            <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Game Details (~2/3 width, resizable) */}
        <GameDetailsPanel 
          game={activeGame} 
          onPlay={handlePlay} 
          onSaveGame={handleSaveGame}
          onUpdateGameInState={updateGameInState}
          onOpenInGameManager={(game, tab) => {
            setGameManagerInitialGameId(game.id);
            setGameManagerInitialTab(tab);
            setIsGameManagerOpen(true);
          }}
          onFavorite={handleToggleFavorite}
          onEdit={handleEditGame}
        />
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
          onClose={() => {
            setIsMetadataEditorOpen(false);
            setSelectedExecutable(null);
          }}
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

      {/* REMOVED: Steam Import Modal - All imports now use ImportWorkbench */}
      {/* <SteamImportModal
        isOpen={isSteamImportOpen}
        onClose={() => {
          setIsSteamImportOpen(false);
          setScannedSteamGames([]);
          setImportAppType('steam');
        }}
        onImport={handleSteamGamesImport}
        preScannedGames={scannedSteamGames}
        appType={importAppType}
        existingLibrary={games}
      /> */}


      {/* Categories Editor Modal */}
      <CategoriesEditor
        isOpen={isCategoriesEditorOpen}
        game={editingCategoriesGame}
        onClose={() => {
          setIsCategoriesEditorOpen(false);
          setEditingCategoriesGame(null);
        }}
        onSave={async (game) => {
          await handleSaveGame(game);
        }}
        allCategories={allCategories}
      />


      {/* Onyx Settings Modal */}
      <OnyxSettingsModal
        isOpen={isOnyxSettingsOpen}
        onClose={() => setIsOnyxSettingsOpen(false)}
        initialTab={onyxSettingsInitialTab}
        onShowImportModal={(games, appType) => {
          // Use ImportWorkbench instead of SteamImportModal
          setScannedSteamGames(games);
          setImportAppType(appType || 'steam');
          setIsImportWorkbenchOpen(true);
        }}
        onSave={async () => {
          // Reload preferences after saving to update UI immediately
          try {
            const prefs = await window.electronAPI.getPreferences();
            if (prefs.hideGameTitles !== undefined) {
              setHideGameTitles(prefs.hideGameTitles);
            }
            if (prefs.gameTilePadding !== undefined) {
              setGameTilePadding(prefs.gameTilePadding);
            }
            if (prefs.showLogoOverBoxart !== undefined) {
              setShowLogoOverBoxart(prefs.showLogoOverBoxart);
            }
            if (prefs.logoPosition !== undefined) {
              setLogoPosition(prefs.logoPosition);
            }
            if (prefs.showLogoOverBoxart !== undefined) {
              setShowLogoOverBoxart(prefs.showLogoOverBoxart);
            }
            if (prefs.logoPosition !== undefined) {
              setLogoPosition(prefs.logoPosition);
            }
            // Also update other settings that might have changed
            if (prefs.minimizeToTray !== undefined) {
              // These are handled by the modal, but we can reload them too if needed
            }
            // Reload library if app configs were saved
            await loadLibrary();
          } catch (error) {
            console.error('Error reloading preferences after save:', error);
          }
        }}
      />

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
          // Use ImportWorkbench instead of SteamImportModal
          setScannedSteamGames(games);
          setImportAppType(appType);
          setIsImportWorkbenchOpen(true);
        }}
      />

      {/* Game Importer */}
      <ImportWorkbench
        isOpen={isImportWorkbenchOpen}
        onClose={() => {
          setIsImportWorkbenchOpen(false);
          setImportWorkbenchFolderPath(undefined); // Clear folder path on close
          setScannedSteamGames([]); // Clear pre-scanned games
          setImportAppType('steam');
        }}
        existingLibrary={games}
        initialFolderPath={importWorkbenchFolderPath}
        preScannedGames={scannedSteamGames && scannedSteamGames.length > 0 ? scannedSteamGames : undefined}
        appType={importAppType}
        onImport={async (games) => {
          try {
            // Save all games
            for (const game of games) {
              await window.electronAPI.saveGame(game);
            }
            await loadLibrary();
            showToast(`Successfully imported ${games.length} ${games.length === 1 ? 'game' : 'games'}`, 'success');
            setIsImportWorkbenchOpen(false);
            setImportWorkbenchFolderPath(undefined);
            setScannedSteamGames([]);
            setImportAppType('steam');
          } catch (err) {
            console.error('Error importing games:', err);
            showToast('Failed to import games', 'error');
          }
        }}
      />

      {/* Game Manager */}
      <GameManager
        isOpen={isGameManagerOpen}
        onClose={() => {
          setIsGameManagerOpen(false);
          setGameManagerInitialGameId(null);
          setGameManagerInitialTab('images');
        }}
        games={games}
        initialGameId={gameManagerInitialGameId}
        initialTab={gameManagerInitialTab}
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
            game.logoUrl !== oldGame.logoUrl ||
            game.heroUrl !== oldGame.heroUrl
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

      {/* Simple Context Menu */}
      {simpleContextMenu && (
        <SimpleContextMenu
          x={simpleContextMenu.x}
          y={simpleContextMenu.y}
          onClose={() => setSimpleContextMenu(null)}
          onEditAppearance={() => setShowAppearanceMenu(true)}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
        />
      )}

      {/* Appearance Settings Menu */}
      {showAppearanceMenu && (
        <LibraryContextMenu
          onClose={() => setShowAppearanceMenu(false)}
          positionOverRightPanel={true}
          rightPanelWidth={panelWidth}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          backgroundBlur={backgroundBlur}
          onBackgroundBlurChange={setBackgroundBlur}
          gameTilePadding={gameTilePadding}
          onGameTilePaddingChange={setGameTilePadding}
          hideGameTitles={hideGameTitles}
          onHideGameTitlesChange={setHideGameTitles}
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
          backgroundMode={backgroundMode}
          onBackgroundModeChange={setBackgroundMode}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          listViewOptions={listViewOptions}
          onListViewOptionsChange={setListViewOptions}
          listViewSize={listViewSize}
          onListViewSizeChange={setListViewSize}
          autoSizeToFit={autoSizeToFit}
          onAutoSizeToFit={handleAutoSizeToFit}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
        />
      )}

      {/* Metadata Search Modal */}
      {fixingGame && (
        <MetadataSearchModal
          isOpen={isMetadataSearchOpen}
          onClose={() => {
            setIsMetadataSearchOpen(false);
            setFixingGame(null);
          }}
          game={fixingGame}
          onSelect={handleSelectMetadataMatch}
        />
      )}

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />

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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex-1">{toast.message}</div>
            <button
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* New Games Notification Dialog */}
      {newGamesNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">New Games Found</h3>
                <p className="text-sm text-gray-400">
                  {newGamesNotification.count} new {newGamesNotification.count === 1 ? 'game' : 'games'} found
                </p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Would you like to import {newGamesNotification.count === 1 ? 'this game' : 'these games'}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setNewGamesNotification(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={() => {
                  // Open ImportWorkbench with the new games
                  // Determine app type from the games (use 'other' for mixed sources)
                  const sources = new Set(newGamesNotification.games.map((g: any) => g.source));
                  const appType = sources.size === 1 && sources.has('steam') ? 'steam' : 
                                 sources.size === 1 && sources.has('xbox') ? 'xbox' : 'other';
                  setScannedSteamGames(newGamesNotification.games);
                  setImportAppType(appType);
                  setIsImportWorkbenchOpen(true);
                  setNewGamesNotification(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Yes, Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
