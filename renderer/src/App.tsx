import { useState, useEffect, useMemo } from 'react';
import { useGameLibrary } from './hooks/useGameLibrary';
import { LibraryGrid } from './components/LibraryGrid';
import { AddGameModal } from './components/AddGameModal';
import { GameDetailsPanel } from './components/GameDetailsPanel';
import { FileSelectionModal } from './components/FileSelectionModal';
import { GameMetadataEditor } from './components/GameMetadataEditor';
import { SteamConfigModal } from './components/SteamConfigModal';
import { SteamImportModal } from './components/SteamImportModal';
import { GameEditor } from './components/GameEditor';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { MenuBar } from './components/MenuBar';
import { UpdateLibraryModal } from './components/UpdateLibraryModal';
import { OnyxSettingsModal } from './components/OnyxSettingsModal';
import { APISettingsModal } from './components/APISettingsModal';
import { Game, ExecutableFile, GameMetadata } from './types/game';
import { areAPIsConfigured } from './utils/apiValidation';

function App() {
  const { games, loading, error, reorderGames, addCustomGame, loadLibrary, saveGame, deleteGame } = useGameLibrary();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Scanning state
  const [, setIsScanningSteam] = useState(false);
  
  // Folder scan state
  const [isFileSelectionOpen, setIsFileSelectionOpen] = useState(false);
  const [scannedExecutables, setScannedExecutables] = useState<ExecutableFile[]>([]);
  const [scannedFolderPath, setScannedFolderPath] = useState<string>('');
  const [, setIsScanningFolder] = useState(false);
  
  // Metadata editor state
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [selectedExecutable, setSelectedExecutable] = useState<ExecutableFile | null>(null);
  
  // Steam config modal state
  const [isSteamConfigOpen, setIsSteamConfigOpen] = useState(false);
  
  // Steam import modal state
  const [isSteamImportOpen, setIsSteamImportOpen] = useState(false);
  const [scannedSteamGames, setScannedSteamGames] = useState<Array<any>>([]);
  const [importAppType, setImportAppType] = useState<'steam' | 'xbox' | 'other'>('steam');
  
  // Game editor state
  const [isGameEditorOpen, setIsGameEditorOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [initialEditorTab, setInitialEditorTab] = useState<'details' | 'images'>('details');
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSection] = useState('library');
  const [showTopBar] = useState(false);
  const [isUpdateLibraryOpen, setIsUpdateLibraryOpen] = useState(false);
  const [isOnyxSettingsOpen, setIsOnyxSettingsOpen] = useState(false);
  const [onyxSettingsInitialTab, setOnyxSettingsInitialTab] = useState<'general' | 'appearance' | 'apis' | 'apps' | 'about'>('general');
  const [isAPISettingsOpen, setIsAPISettingsOpen] = useState(false);
  const [gridSize, setGridSize] = useState(120);
  const [pinnedCategories, setPinnedCategories] = useState<string[]>([]);
  const [hideVRTitles, setHideVRTitles] = useState(true);
  const [hideGameTitles, setHideGameTitles] = useState(false);
  const [gameTilePadding, setGameTilePadding] = useState(16);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (prefs.gridSize) setGridSize(prefs.gridSize);
        if (prefs.pinnedCategories) setPinnedCategories(prefs.pinnedCategories);
        if (prefs.hideVRTitles !== undefined) setHideVRTitles(prefs.hideVRTitles);
        if (prefs.hideGameTitles !== undefined) setHideGameTitles(prefs.hideGameTitles);
        if (prefs.gameTilePadding !== undefined) setGameTilePadding(prefs.gameTilePadding);
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

  // Save grid size when it changes
  useEffect(() => {
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
  }, [gridSize]);

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

  // Save appearance preferences when they change (but skip initial load)
  useEffect(() => {
    if (isInitialLoad) return; // Skip saving on initial load
    
    const saveAppearancePrefs = async () => {
      try {
        await window.electronAPI.savePreferences({ 
          hideGameTitles,
          gameTilePadding 
        });
      } catch (error) {
        console.error('Error saving appearance preferences:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(saveAppearancePrefs, 500);
    return () => clearTimeout(timeoutId);
  }, [hideGameTitles, gameTilePadding, isInitialLoad]);

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
  const [sortBy, setSortBy] = useState<'title' | 'releaseDate' | 'playtime' | 'lastPlayed'>('title');


  // Listen to menu events
  useEffect(() => {
    const cleanup1 = window.electronAPI.onMenuEvent('menu:addGame', async () => {
      const apisConfigured = await areAPIsConfigured();
      if (!apisConfigured) {
        showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
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

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
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

  // Check if there are any favorite games
  const hasFavoriteGames = useMemo(() => {
    return games.some(g => g.favorite === true);
  }, [games]);

  // Check if VR category exists
  const hasVRCategory = useMemo(() => {
    return allCategories.includes('VR');
  }, [allCategories]);

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
    } else if (selectedCategory) {
      filtered = filtered.filter(g => 
        g.categories?.includes(selectedCategory)
      );
    }
    
    // Filter out VR titles if hideVRTitles is enabled, but not if VR category is selected
    if (hideVRTitles && selectedCategory !== 'VR') {
      filtered = filtered.filter(g => 
        !g.categories?.includes('VR')
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
    
    // Sort games
    filtered = [...filtered].sort((a, b) => {
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
  }, [games, searchQuery, activeSection, selectedCategory, sortBy, hideVRTitles]);

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

  const handleGameClick = (game: Game) => {
    setActiveGameId(game.id);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setInitialEditorTab('details');
    setIsGameEditorOpen(true);
  };

  const handleEditImages = (game: Game) => {
    setEditingGame(game);
    setInitialEditorTab('images');
    setIsGameEditorOpen(true);
  };

  const handleSaveGame = async (game: Game) => {
    try {
      console.log('Saving game from App:', game.title, 'favorite:', game.favorite);
      const success = await saveGame(game);
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

  // Update Library handler - opens update library modal
  const handleUpdateSteamLibrary = async () => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsOnyxSettingsOpen(true);
      setOnyxSettingsInitialTab('apis');
      return;
    }
    setIsUpdateLibraryOpen(true);
  };

  // Handle Steam games import
  const handleSteamGamesImport = async (gamesToImport: Game[], scannedGames: Array<{ appId?: string; id?: string; name: string; installDir?: string; libraryPath?: string; installPath?: string; type?: string }>, selectedGameIds: Set<string>) => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsSteamImportOpen(false);
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

  // Scan Folder handler
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

      setIsScanningFolder(true);
      setScannedFolderPath(folderPath);
      
      const executables = await window.electronAPI.scanFolderForExecutables(folderPath);
      setScannedExecutables(executables);
      
      if (executables.length === 0) {
        showToast('No executables found in selected folder', 'error');
        setIsScanningFolder(false);
      } else {
        setIsFileSelectionOpen(true);
        setIsScanningFolder(false);
      }
    } catch (err) {
      console.error('Error scanning folder:', err);
      showToast('Failed to scan folder', 'error');
      setIsScanningFolder(false);
    }
  };

  // Handle executable selection from file selection modal
  const handleExecutableSelect = async (file: ExecutableFile, metadata?: GameMetadata) => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      setIsFileSelectionOpen(false);
      setIsOnyxSettingsOpen(true);
      setOnyxSettingsInitialTab('apis');
      return;
    }

    // Create game with all metadata if available
    const gameId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGame: Game = {
      id: gameId,
      title: metadata?.title || file.fileName.replace(/\.exe$/i, '').trim(),
      platform: metadata?.platform || 'other',
      exePath: file.fullPath,
      boxArtUrl: metadata?.boxArtUrl || '',
      bannerUrl: metadata?.bannerUrl || '',
      description: metadata?.description,
      releaseDate: metadata?.releaseDate,
      genres: metadata?.genres,
      ageRating: metadata?.ageRating,
      categories: metadata?.categories,
    };
    
    const success = await window.electronAPI.saveGame(newGame);
    if (success) {
      await loadLibrary();
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

  return (
    <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white flex flex-col overflow-hidden relative">
      {/* Blurred background image from selected game */}
      {backgroundImageUrl && (
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.3)',
            transform: 'scale(1.1)', // Slight scale to avoid edges
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
        onAddGame={() => setIsModalOpen(true)}
        onScanFolder={handleScanFolder}
        onUpdateSteamLibrary={handleUpdateSteamLibrary}
        onUpdateLibrary={handleUpdateSteamLibrary}
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
        hideVRTitles={hideVRTitles}
        onToggleHideVRTitles={() => setHideVRTitles(prev => !prev)}
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
          <div className="flex-1 overflow-y-auto p-4 relative z-10">
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
                    <LibraryGrid
                      games={filteredGames}
                      onReorder={handleReorder}
                      onPlay={handlePlay}
                      onGameClick={handleGameClick}
                      onEdit={handleEditGame}
                      onEditImages={handleEditImages}
                      onFavorite={handleToggleFavorite}
                      gridSize={gridSize}
                      gameTilePadding={gameTilePadding}
                      hideGameTitles={hideGameTitles}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="max-w-md mx-auto">
                      <p className="text-gray-100 mb-6 text-base font-medium">No games found.</p>
                      
                      <div className="space-y-4 mb-6">
                        <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 text-left">
                          <p className="text-gray-300 text-sm mb-3">
                            Get started by configuring game launchers or scanning for games:
                          </p>
                          
                          <div className="mb-3 pb-3 border-b border-gray-600">
                            <p className="text-gray-400 text-xs mb-2">
                              💡 <strong>Tip:</strong> For better game metadata and images,{' '}
                              <button
                                onClick={() => {
                                  setOnyxSettingsInitialTab('apis');
                                  setIsOnyxSettingsOpen(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 underline font-medium"
                              >
                                set up API credentials
                              </button>
                              {' '}first.
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            <button
                              onClick={() => {
                                setOnyxSettingsInitialTab('apps');
                                setIsOnyxSettingsOpen(true);
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="text-left">
                                  <p className="text-blue-300 font-medium text-sm">Configure Apps</p>
                                  <p className="text-gray-400 text-xs">Set up Steam, Xbox, and other launchers</p>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={handleScanFolder}
                              className="w-full flex items-center justify-between px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <div className="text-left">
                                  <p className="text-blue-300 font-medium text-sm">Scan Folder for Games</p>
                                  <p className="text-gray-400 text-xs">Browse and import games from a folder</p>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={async () => {
                          const apisConfigured = await areAPIsConfigured();
                          if (!apisConfigured) {
                            showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
                            setIsOnyxSettingsOpen(true);
                            setOnyxSettingsInitialTab('apis');
                            return;
                          }
                          setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        Or Add Game Manually
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Game Details (~2/3 width, resizable) */}
        <GameDetailsPanel game={activeGame} onPlay={handlePlay} />
      </div>

        {/* Bottom Bar */}
        <BottomBar
          game={activeGame}
          onPlay={handlePlay}
          onFavorite={handleToggleFavorite}
          onEdit={handleEditGame}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
        />
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddGame}
      />

      {/* File Selection Modal */}
      <FileSelectionModal
        isOpen={isFileSelectionOpen}
        onClose={() => {
          setIsFileSelectionOpen(false);
          setScannedExecutables([]);
          setScannedFolderPath('');
        }}
        executables={scannedExecutables}
        onSelect={handleExecutableSelect}
        folderPath={scannedFolderPath}
        existingLibrary={games}
        onAPIConfigRequired={() => {
          setIsFileSelectionOpen(false);
          setIsOnyxSettingsOpen(true);
          setOnyxSettingsInitialTab('apis');
          showToast('API credentials must be configured before adding games.', 'error');
        }}
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

      {/* Steam Import Modal */}
      <SteamImportModal
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
      />

      {/* Game Editor Modal */}
      <GameEditor
        isOpen={isGameEditorOpen}
        game={editingGame}
        onClose={() => {
          setIsGameEditorOpen(false);
          setEditingGame(null);
          setInitialEditorTab('details');
        }}
        onSave={handleSaveGame}
        onDelete={handleDeleteGame}
        allCategories={allCategories}
        initialTab={initialEditorTab}
      />


      {/* Onyx Settings Modal */}
      <OnyxSettingsModal
        isOpen={isOnyxSettingsOpen}
        onClose={() => setIsOnyxSettingsOpen(false)}
        initialTab={onyxSettingsInitialTab}
        onShowImportModal={(games, appType) => {
          setIsSteamImportOpen(true);
          setScannedSteamGames(games);
          setImportAppType(appType || 'steam');
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
          setIsSteamImportOpen(true);
          // Store games to pass to modal
          setScannedSteamGames(games);
          setImportAppType(appType);
        }}
      />

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
    </div>
  );
}

export default App;
