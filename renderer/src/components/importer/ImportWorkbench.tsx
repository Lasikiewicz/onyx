import React, { useState, useEffect, useMemo } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game, GameMetadata } from '../../types/game';
import { areAPIsConfigured } from '../../utils/apiValidation';

interface ImportWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (games: Game[]) => Promise<void>;
  existingLibrary?: Game[];
  initialFolderPath?: string; // Optional: folder path to scan on open
}

export const ImportWorkbench: React.FC<ImportWorkbenchProps> = ({
  isOpen,
  onClose,
  onImport,
  existingLibrary = [],
  initialFolderPath,
}) => {
  const [queue, setQueue] = useState<StagedGame[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignoredGames, setIgnoredGames] = useState<Set<string>>(new Set());
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState<{ type: 'boxart' | 'banner' | 'logo'; gameId: string } | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [showMetadataSearch, setShowMetadataSearch] = useState(false);
  const [metadataSearchQuery, setMetadataSearchQuery] = useState('');
  const [metadataSearchResults, setMetadataSearchResults] = useState<any[]>([]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);

  // Load ignored games on mount
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getPreferences().then(prefs => {
        const ignored = prefs.ignoredGames ? new Set(prefs.ignoredGames) : new Set<string>();
        setIgnoredGames(ignored);
      });
    }
  }, [isOpen]);

  const selectedGame = useMemo(() => {
    return queue.find(g => g.uuid === selectedId) || null;
  }, [queue, selectedId]);

  // Filter games based on showIgnored state
  const visibleGames = useMemo(() => {
    if (showIgnored) {
      return queue.filter(g => g.isIgnored);
    }
    return queue.filter(g => !g.isIgnored);
  }, [queue, showIgnored]);

  // Group games by source
  const groupedGames = useMemo(() => {
    const groups: Record<ImportSource, StagedGame[]> = {
      steam: [],
      epic: [],
      gog: [],
      xbox: [],
      ubisoft: [],
      rockstar: [],
      ea: [],
      battle: [],
      manual_file: [],
      manual_folder: [],
    };

    visibleGames.forEach(game => {
      // Safety check: ensure the source exists in groups before pushing
      if (groups[game.source]) {
        groups[game.source].push(game);
      } else {
        // Fallback: if source is unknown, add to manual_folder group
        console.warn(`Unknown game source: ${game.source}, defaulting to manual_folder`);
        groups.manual_folder.push(game);
      }
    });

    return groups;
  }, [visibleGames]);

  // Get status color
  const getStatusColor = (status: ImportStatus): string => {
    switch (status) {
      case 'ready':
        return 'text-green-400';
      case 'ambiguous':
      case 'matched':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'scanning':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ImportStatus): string => {
    switch (status) {
      case 'ready':
        return '✓';
      case 'ambiguous':
        return '?';
      case 'error':
        return '✗';
      case 'scanning':
        return '⟳';
      default:
        return '○';
    }
  };

  // Get game ID for ignore functionality
  const getGameId = (game: StagedGame): string => {
    if (game.source === 'steam' && game.appId) {
      return `steam-${game.appId}`;
    }
    return game.uuid;
  };

  // Handle ignore game
  const handleIgnoreGame = async (game: StagedGame) => {
    const gameId = getGameId(game);
    const newIgnoredGames = new Set(ignoredGames);
    newIgnoredGames.add(gameId);
    setIgnoredGames(newIgnoredGames);
    
    // Mark as ignored in queue
    updateGame(game.uuid, { isIgnored: true });
    
    // Games are auto-selected, so we don't need to manage selection state
    
    // Save to preferences
    try {
      const prefs = await window.electronAPI.getPreferences();
      await window.electronAPI.savePreferences({
        ...prefs,
        ignoredGames: Array.from(newIgnoredGames),
      });
    } catch (err) {
      console.error('Error saving ignored games:', err);
    }
  };

  // Handle unignore game
  const handleUnignoreGame = async (game: StagedGame) => {
    const gameId = getGameId(game);
    const newIgnoredGames = new Set(ignoredGames);
    newIgnoredGames.delete(gameId);
    setIgnoredGames(newIgnoredGames);
    
    // Remove ignore flag
    updateGame(game.uuid, { isIgnored: false });
    
    // Save to preferences
    try {
      const prefs = await window.electronAPI.getPreferences();
      await window.electronAPI.savePreferences({
        ...prefs,
        ignoredGames: Array.from(newIgnoredGames),
      });
    } catch (err) {
      console.error('Error removing ignore:', err);
    }
  };

  // Scan a specific folder
  const handleScanFolder = async (folderPath: string) => {
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      setError('API credentials must be configured before scanning. Please configure them in Settings.');
      return;
    }

    setIsScanning(true);
    setError(null);
    setQueue([]); // Clear existing queue

    try {
      const result = await window.electronAPI.scanFolder(folderPath);
      
      if (!result.success) {
        setError(result.error || 'Failed to scan folder');
        setIsScanning(false);
        return;
      }

      if (result.games.length === 0) {
        setError('No games found in selected folder');
        setIsScanning(false);
        return;
      }

      // Pre-filter games that already exist in library to avoid fetching metadata
      const existingGameIds = new Set(existingLibrary.map(g => g.id));
      const existingExePaths = new Set(
        existingLibrary
          .map(g => g.exePath)
          .filter((path): path is string => !!path)
          .map(path => path.toLowerCase().replace(/\\/g, '/'))
      );
      const existingInstallPaths = new Set(
        existingLibrary
          .map(g => g.installationDirectory)
          .filter((path): path is string => !!path)
          .map(path => path.toLowerCase().replace(/\\/g, '/'))
      );

      // Filter out games that already exist before processing
      const gamesToProcess = result.games.filter(scanned => {
        // Check by game ID first
        const gameId = scanned.source === 'steam' && scanned.appId
          ? `steam-${scanned.appId}`
          : scanned.uuid;
        if (existingGameIds.has(gameId)) {
          return false;
        }
        
        // Check by exePath
        if (scanned.exePath) {
          const normalizedExePath = scanned.exePath.toLowerCase().replace(/\\/g, '/');
          if (existingExePaths.has(normalizedExePath)) {
            return false;
          }
        }
        
        // Check by installPath
        if (scanned.installPath) {
          const normalizedInstallPath = scanned.installPath.toLowerCase().replace(/\\/g, '/');
          if (existingInstallPaths.has(normalizedInstallPath)) {
            return false;
          }
        }
        
        return true;
      });

      // Convert scanned results to StagedGame objects - process progressively
      const stagedGames: StagedGame[] = [];
      
      // Process games one by one and add them to queue as they're found
      for (const scanned of gamesToProcess) {
        const stagedGame = await (async (): Promise<StagedGame> => {
          // Try to find match for games to get Steam App ID
          let steamAppId = scanned.appId;
          let matchedTitle = scanned.title;
          let matchedResult: any = null;
          
          try {
            // Step 1: Search with the provided name
            const searchResponse = await window.electronAPI.searchGames(scanned.title);
            
            if (searchResponse && (searchResponse.success !== false) && searchResponse.results && searchResponse.results.length > 0) {
              // Step 2: Find first Steam result with an App ID (preferred)
              const steamResult = searchResponse.results.find((r: any) => r.steamAppId);
              
              if (steamResult && steamResult.steamAppId) {
                steamAppId = steamResult.steamAppId.toString();
                matchedTitle = steamResult.title || scanned.title;
                matchedResult = steamResult;
              }
            }
          } catch (err) {
            // Ignore search errors during staging - will search again later
          }
          
          // Check if game is ignored
          // If we found a Steam App ID, use it for the game ID (even if source isn't 'steam')
          const hasSteamAppId = steamAppId && steamAppId.match(/^\d+$/);
          const gameId = (scanned.source === 'steam' && scanned.appId)
            ? `steam-${scanned.appId}`
            : (hasSteamAppId ? `steam-${steamAppId}` : scanned.uuid);
          const isIgnored = ignoredGames.has(gameId);

          // For folder scans, games need metadata matching
          let metadata: GameMetadata | null = null;
          let status: ImportStatus = scanned.status as ImportStatus;
          let boxArtUrl = '';
          let bannerUrl = '';
          let logoUrl = '';
          let heroUrl = '';
          let description = '';
          let releaseDate = '';
          let genres: string[] = [];
          let developers: string[] = [];
          let publishers: string[] = [];
          let categories: string[] = [];
          let ageRating = '';
          let rating = 0;
          let platform = '';

          // steamAppId and matchedTitle are already set above if found

          if (steamAppId || matchedResult) {
            // Game has a found match - fetch complete metadata from searchArtwork
            // searchArtwork now returns full metadata (images + text) from Steam Store API when Steam App ID is available
            try {
              const artworkResult = await window.electronAPI.searchArtwork(matchedTitle, steamAppId);

              if (artworkResult) {
                metadata = artworkResult;
                
                // Extract all fields from the metadata
                boxArtUrl = metadata.boxArtUrl || '';
                bannerUrl = metadata.bannerUrl || '';
                logoUrl = metadata.logoUrl || '';
                heroUrl = metadata.heroUrl || '';
                description = (metadata.description || metadata.summary || '').trim();
                releaseDate = (metadata.releaseDate || '').trim();
                genres = metadata.genres || [];
                categories = metadata.categories || [];
                ageRating = (metadata.ageRating || '').trim();
                rating = metadata.rating || 0;
                platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                developers = metadata.developers || [];
                publishers = metadata.publishers || [];

                metadata = {
                  ...metadata,
                  boxArtUrl,
                  bannerUrl,
                  logoUrl,
                  heroUrl,
                  description,
                  releaseDate,
                  genres,
                  categories,
                  ageRating,
                  rating,
                  platform: platform,
                };
                
                status = 'ready';
              } else {
                status = 'ambiguous';
              }
            } catch (err) {
              console.error(`Error fetching metadata for game with match:`, err);
              status = 'ambiguous';
            }
          } else {
            // No match found - try one more time with just the title
            try {
              const artworkResult = await window.electronAPI.searchArtwork(scanned.title);

              if (artworkResult) {
                metadata = artworkResult;
                boxArtUrl = metadata.boxArtUrl || '';
                bannerUrl = metadata.bannerUrl || '';
                logoUrl = metadata.logoUrl || '';
                heroUrl = metadata.heroUrl || '';
                description = (metadata.description || metadata.summary || '').trim();
                releaseDate = (metadata.releaseDate || '').trim();
                genres = metadata.genres || [];
                categories = metadata.categories || [];
                ageRating = (metadata.ageRating || '').trim();
                rating = metadata.rating || 0;
                platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                developers = metadata.developers || [];
                publishers = metadata.publishers || [];
                
                if (metadata.boxArtUrl || metadata.bannerUrl || description) {
                  status = 'ready';
                } else {
                  status = 'ambiguous';
                }
              } else {
                status = 'ambiguous';
              }
            } catch (err) {
              console.error(`Error fetching metadata for game "${scanned.title}":`, err);
              status = 'ambiguous';
            }
          }

          return {
            uuid: scanned.uuid,
            source: scanned.source,
            originalName: scanned.originalName,
            installPath: scanned.installPath,
            exePath: scanned.exePath,
            appId: scanned.appId || steamAppId,
            title: matchedTitle,
            description,
            releaseDate,
            genres,
            developers,
            publishers,
            categories,
            ageRating,
            rating,
            platform,
            scrapedMetadata: metadata,
            boxArtUrl,
            bannerUrl,
            logoUrl,
            heroUrl,
            screenshots: metadata?.screenshots,
            status,
            isSelected: !isIgnored,
            isIgnored,
          };
        })();
        
        stagedGames.push(stagedGame);
        setQueue([...stagedGames]);
        
        if (stagedGames.length === 1 && !selectedId) {
          setSelectedId(stagedGame.uuid);
        }
      }

      setQueue(stagedGames);
      
      const firstVisible = stagedGames.find(g => !g.isIgnored);
      if (firstVisible && !selectedId) {
        setSelectedId(firstVisible.uuid);
      }
    } catch (err) {
      console.error('Error scanning folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan folder');
    } finally {
      setIsScanning(false);
    }
  };

  // Scan all sources
  const handleScanAll = async () => {
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      setError('API credentials must be configured before scanning. Please configure them in Settings.');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanProgressMessage('Preparing scan...');
    
    // Small delay to ensure UI updates and listener is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      console.log('[ImportWorkbench] Calling scanAllSources...');
      const result = await window.electronAPI.scanAllSources();
      console.log('[ImportWorkbench] scanAllSources returned:', result);
      
      if (!result.success) {
        setError(result.error || 'Failed to scan sources');
        setIsScanning(false);
        return;
      }

      // Pre-filter games that already exist in library to avoid fetching metadata
      const existingGameIds = new Set(existingLibrary.map(g => g.id));
      const existingExePaths = new Set(
        existingLibrary
          .map(g => g.exePath)
          .filter((path): path is string => !!path)
          .map(path => path.toLowerCase().replace(/\\/g, '/'))
      );
      const existingInstallPaths = new Set(
        existingLibrary
          .map(g => g.installationDirectory)
          .filter((path): path is string => !!path)
          .map(path => path.toLowerCase().replace(/\\/g, '/'))
      );

      // Filter out games that already exist before processing
      const gamesToProcess = result.games.filter(scanned => {
        // Check by game ID first
        const gameId = scanned.source === 'steam' && scanned.appId
          ? `steam-${scanned.appId}`
          : scanned.uuid;
        if (existingGameIds.has(gameId)) {
          return false;
        }
        
        // Check by exePath
        if (scanned.exePath) {
          const normalizedExePath = scanned.exePath.toLowerCase().replace(/\\/g, '/');
          if (existingExePaths.has(normalizedExePath)) {
            return false;
          }
        }
        
        // Check by installPath
        if (scanned.installPath) {
          const normalizedInstallPath = scanned.installPath.toLowerCase().replace(/\\/g, '/');
          if (existingInstallPaths.has(normalizedInstallPath)) {
            return false;
          }
        }
        
        return true;
      });

      // Convert scanned results to StagedGame objects - process progressively
      const stagedGames: StagedGame[] = [];
      const totalGames = gamesToProcess.length;
      let processedCount = 0;
      let skippedCount = 0;
      
      if (totalGames > 0) {
        setScanProgressMessage(`Processing ${totalGames} game${totalGames !== 1 ? 's' : ''} and fetching metadata...`);
      }
      
      // Process games one by one and add them to queue as they're found
      for (let i = 0; i < gamesToProcess.length; i++) {
        let stagedGame: StagedGame;
        
        try {
          const scanned = gamesToProcess[i];
          // const currentIndex = i + 1; // Unused
          
          // Double-check if game already exists in library (skip if it does to avoid unnecessary API calls)
          const gameId = scanned.source === 'steam' && scanned.appId
            ? `steam-${scanned.appId}`
            : scanned.uuid;
          
          if (existingGameIds.has(gameId)) {
            console.log(`[ImportWorkbench] Skipping ${scanned.title} - already in library (by gameId)`);
            skippedCount++;
            continue;
          }
          
          // Check by exePath
          if (scanned.exePath) {
            const normalizedExePath = scanned.exePath.toLowerCase().replace(/\\/g, '/');
            if (existingExePaths.has(normalizedExePath)) {
              console.log(`[ImportWorkbench] Skipping ${scanned.title} - already in library (by exePath)`);
              skippedCount++;
              continue;
            }
          }
          
          // Check by installPath
          if (scanned.installPath) {
            const normalizedInstallPath = scanned.installPath.toLowerCase().replace(/\\/g, '/');
            if (existingInstallPaths.has(normalizedInstallPath)) {
              console.log(`[ImportWorkbench] Skipping ${scanned.title} - already in library (by installPath)`);
              skippedCount++;
              continue;
            }
          }
          
          processedCount++;
          const newGamesCount = totalGames - skippedCount;
          setScanProgressMessage(`Fetching metadata for ${scanned.title} (${processedCount}/${newGamesCount} new games)...`);
          
          stagedGame = await (async (): Promise<StagedGame> => {
            try {
          // Check if game is ignored
          const isIgnored = ignoredGames.has(gameId);

          // For Steam games with AppID, fetch full metadata immediately
          let metadata: GameMetadata | null = null;
          let status: ImportStatus = scanned.status as ImportStatus;
          let boxArtUrl = '';
          let bannerUrl = '';
          let logoUrl = '';
          let heroUrl = '';
          let description = '';
          let releaseDate = '';
          let genres: string[] = [];
          let developers: string[] = [];
          let publishers: string[] = [];
          let categories: string[] = [];
          let ageRating = '';
          let rating = 0;
          let platform = '';

          // Try to find match for games without Steam App ID - SIMPLE APPROACH
          let steamAppId = scanned.appId;
          let matchedTitle = scanned.title; // Use matched title for better metadata fetching
          let matchedResult: any = null;
          
          if (!steamAppId && scanned.source !== 'steam') {
            try {
              // Helper function to add timeout to promises
              const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
                return Promise.race([
                  promise,
                  new Promise<T>((_, reject) => 
                    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
                  ),
                ]);
              };

              // Step 1: Search with the provided name (with timeout)
              const searchResponse = await withTimeout(window.electronAPI.searchGames(scanned.title), 30000);
              
              if (searchResponse && (searchResponse.success !== false) && searchResponse.results && searchResponse.results.length > 0) {
                // Step 2: Find first Steam result with an App ID (preferred)
                const steamResult = searchResponse.results.find((r: any) => r.steamAppId);
                
                if (steamResult && steamResult.steamAppId) {
                  steamAppId = steamResult.steamAppId.toString();
                  matchedTitle = steamResult.title || scanned.title;
                  matchedResult = steamResult;
                  console.log(`[ImportWorkbench] Found Steam App ID ${steamAppId} for "${scanned.title}" (matched with "${matchedTitle}")`);
                } else {
                  // Step 2b: If no Steam result, use first IGDB result (for non-Steam games)
                  const igdbResult = searchResponse.results.find((r: any) => r.source === 'igdb');
                  if (igdbResult) {
                    matchedTitle = igdbResult.title || scanned.title;
                    matchedResult = igdbResult;
                    console.log(`[ImportWorkbench] Found IGDB match for "${scanned.title}" (matched with "${matchedTitle}")`);
                  } else {
                    // Step 2c: Use first result of any type
                    const firstResult = searchResponse.results[0];
                    if (firstResult) {
                      matchedTitle = firstResult.title || scanned.title;
                      matchedResult = firstResult;
                      console.log(`[ImportWorkbench] Found match for "${scanned.title}" (matched with "${matchedTitle}")`);
                    } else {
                      console.log(`[ImportWorkbench] No match found for "${scanned.title}"`);
                    }
                  }
                }
              }
            } catch (err) {
              console.warn(`[ImportWorkbench] Error searching for match for "${scanned.title}":`, err);
            }
          }

          if (scanned.source === 'steam' && scanned.appId) {
            try {
              // Helper function to add timeout to promises
              const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
                return Promise.race([
                  promise,
                  new Promise<T>((_, reject) => 
                    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
                  ),
                ]);
              };

              // Always fetch metadata - searchArtwork now returns complete metadata (images + text)
              const artworkResult = await withTimeout(window.electronAPI.searchArtwork(scanned.title, scanned.appId), 30000).catch(err => {
                console.warn(`[ImportWorkbench] searchArtwork timeout/error for "${scanned.title}":`, err);
                return null;
              });

              // Get artwork metadata (this includes full metadata: images + text from Steam Store API)
              if (artworkResult) {
                metadata = artworkResult;
                
                // Extract all fields from the metadata
                boxArtUrl = metadata.boxArtUrl || '';
                bannerUrl = metadata.bannerUrl || '';
                logoUrl = metadata.logoUrl || '';
                heroUrl = metadata.heroUrl || '';
                description = (metadata.description || metadata.summary || '').trim();
                releaseDate = (metadata.releaseDate || '').trim();
                genres = metadata.genres || [];
                categories = metadata.categories || [];
                ageRating = (metadata.ageRating || '').trim();
                rating = metadata.rating || 0;
                platform = metadata.platforms?.join(', ') || metadata.platform || 'steam';
                developers = metadata.developers || [];
                publishers = metadata.publishers || [];

                // Update metadata object with all extracted values
                metadata = {
                  ...metadata,
                  boxArtUrl,
                  bannerUrl,
                  logoUrl,
                  heroUrl,
                  description,
                  releaseDate,
                  genres,
                  categories,
                  ageRating,
                  rating,
                  platform: platform,
                };
                
                status = 'ready';
              } else {
                status = 'ambiguous';
              }
            } catch (err) {
              console.error('Error fetching metadata for Steam game:', err);
              status = 'ambiguous';
            }
          } else if (steamAppId || matchedResult) {
            // Game has a found match (Steam App ID or IGDB result)
            try {
              // Helper function to add timeout to promises
              const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
                return Promise.race([
                  promise,
                  new Promise<T>((_, reject) => 
                    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
                  ),
                ]);
              };

              // Step 3: Fetch all metadata/images using the match with timeout
              // searchArtwork now returns complete metadata (images + text) from Steam Store API
              const artworkResult = await withTimeout(window.electronAPI.searchArtwork(matchedTitle, steamAppId), 30000).catch(err => {
                console.warn(`[ImportWorkbench] searchArtwork timeout/error for "${matchedTitle}":`, err);
                return null;
              });

              // Get artwork metadata (this includes full metadata: images + text from Steam Store API)
              if (artworkResult) {
                metadata = artworkResult;
                
                // Extract all fields from the metadata
                boxArtUrl = metadata.boxArtUrl || '';
                bannerUrl = metadata.bannerUrl || '';
                logoUrl = metadata.logoUrl || '';
                heroUrl = metadata.heroUrl || '';
                description = (metadata.description || metadata.summary || '').trim();
                releaseDate = (metadata.releaseDate || '').trim();
                genres = metadata.genres || [];
                categories = metadata.categories || [];
                ageRating = (metadata.ageRating || '').trim();
                rating = metadata.rating || 0;
                platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                developers = metadata.developers || [];
                publishers = metadata.publishers || [];

                // Update metadata object with all extracted values
                metadata = {
                  ...metadata,
                  boxArtUrl,
                  bannerUrl,
                  logoUrl,
                  heroUrl,
                  description,
                  releaseDate,
                  genres,
                  categories,
                  ageRating,
                  rating,
                  platform: platform,
                };
                
                status = 'ready';
              } else {
                status = 'ambiguous';
              }
            } catch (err) {
              console.error(`Error fetching metadata for game with match:`, err);
              status = 'ambiguous';
            }
          } else {
            // No match found - try one more time with just the title
            try {
              const artworkResult = await window.electronAPI.searchArtwork(scanned.title);

              if (artworkResult) {
                metadata = artworkResult;
                boxArtUrl = metadata.boxArtUrl || '';
                bannerUrl = metadata.bannerUrl || '';
                logoUrl = metadata.logoUrl || '';
                heroUrl = metadata.heroUrl || '';
                description = metadata.description || metadata.summary || '';
                releaseDate = metadata.releaseDate || '';
                genres = metadata.genres || [];
                categories = metadata.categories || [];
                ageRating = metadata.ageRating || '';
                rating = metadata.rating || 0;
                platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                developers = metadata.developers || [];
                publishers = metadata.publishers || [];
                
                if (metadata.boxArtUrl || metadata.bannerUrl || description) {
                  status = 'ready';
                } else {
                  status = 'ambiguous';
                }
              } else {
                status = 'ambiguous';
              }
            } catch (err) {
              console.error(`Error fetching metadata for game "${scanned.title}":`, err);
              status = 'ambiguous';
            }
          }

          return {
            uuid: scanned.uuid,
            source: scanned.source,
            originalName: scanned.originalName,
            installPath: scanned.installPath,
            exePath: scanned.exePath,
            appId: scanned.appId || steamAppId,
            title: matchedTitle, // Use matched title if we found a Steam match
            description,
            releaseDate,
            genres,
            developers,
            publishers,
            categories,
            ageRating,
            rating,
            platform,
            scrapedMetadata: metadata,
            boxArtUrl,
            bannerUrl,
            logoUrl,
            heroUrl,
            screenshots: metadata?.screenshots,
            status,
            isSelected: !isIgnored, // Auto-select all non-ignored games
            isIgnored,
          };
          } catch (err) {
            // If anything goes wrong, return a basic game object so the import can continue
            console.error(`[ImportWorkbench] Error processing game "${scanned.title}":`, err);
            return {
              uuid: scanned.uuid,
              source: scanned.source,
              originalName: scanned.originalName,
              installPath: scanned.installPath,
              exePath: scanned.exePath,
              appId: scanned.appId,
              title: scanned.title,
              description: '',
              releaseDate: '',
              genres: [],
              developers: [],
              publishers: [],
              categories: [],
              ageRating: '',
              rating: 0,
              platform: scanned.source,
              scrapedMetadata: null,
              boxArtUrl: '',
              bannerUrl: '',
              logoUrl: '',
              heroUrl: '',
              screenshots: [],
              status: 'ambiguous' as ImportStatus,
              isSelected: !ignoredGames.has(gameId),
              isIgnored: ignoredGames.has(gameId),
            };
          }
        })();
        
        // Add game to queue as soon as it's processed
        stagedGames.push(stagedGame);
        setQueue([...stagedGames]);
        
        // Auto-select first game if none selected
        if (stagedGames.length === 1 && !selectedId) {
          setSelectedId(stagedGame.uuid);
        }
        } catch (gameError) {
          // If processing a single game fails, log it and continue with the next game
          console.error(`[ImportWorkbench] Failed to process game at index ${i}:`, gameError);
          const scanned = gamesToProcess[i];
          if (scanned) {
            // Create a basic game object so we don't lose the game entirely
            const gameId = scanned.source === 'steam' && scanned.appId
              ? `steam-${scanned.appId}`
              : scanned.uuid;
            const fallbackGame: StagedGame = {
              uuid: scanned.uuid,
              source: scanned.source,
              originalName: scanned.originalName,
              installPath: scanned.installPath,
              exePath: scanned.exePath,
              appId: scanned.appId,
              title: scanned.title,
              description: '',
              releaseDate: '',
              genres: [],
              developers: [],
              publishers: [],
              categories: [],
              ageRating: '',
              rating: 0,
              platform: scanned.source,
              scrapedMetadata: null,
              boxArtUrl: '',
              bannerUrl: '',
              logoUrl: '',
              heroUrl: '',
              screenshots: [],
              status: 'ambiguous' as ImportStatus,
              isSelected: !ignoredGames.has(gameId),
              isIgnored: ignoredGames.has(gameId),
            };
            stagedGames.push(fallbackGame);
            setQueue([...stagedGames]);
            processedCount++;
          }
        }
      }

      // Final update to ensure all games are in queue
      setQueue(stagedGames);
      
      // Auto-select the first non-ignored game if available
      const firstVisible = stagedGames.find(g => !g.isIgnored);
      if (firstVisible && !selectedId) {
        setSelectedId(firstVisible.uuid);
      }
      
      setScanProgressMessage(`Complete! Found ${stagedGames.length} game${stagedGames.length !== 1 ? 's' : ''} ready to import.`);
    } catch (err) {
      console.error('Error scanning sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan sources');
      setScanProgressMessage('Error occurred during scan.');
    } finally {
      setIsScanning(false);
    }
  };

  // Listen for scan progress updates
  useEffect(() => {
    const handleScanProgress = (_event: any, message: string) => {
      setScanProgressMessage(message);
      console.log('[ImportWorkbench] Progress:', message);
    };
    
    if (window.ipcRenderer) {
      window.ipcRenderer.on('import:scanProgress', handleScanProgress);
    }
    
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.off('import:scanProgress', handleScanProgress);
      }
    };
  }, []);

  // Scan folder when initialFolderPath is provided
  useEffect(() => {
    if (isOpen && initialFolderPath) {
      handleScanFolder(initialFolderPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFolderPath]);

  // Handle adding a file manually
  const handleAddFile = async () => {
    try {
      const filePath = await window.electronAPI.showOpenDialog();
      if (!filePath) return;

      const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
      const newGame: StagedGame = {
        uuid: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: 'manual_file',
        originalName: fileName,
        installPath: filePath,
        exePath: filePath,
        title: fileName.replace(/\.exe$/i, '').trim(),
        boxArtUrl: '',
        bannerUrl: '',
        status: 'ambiguous',
        isSelected: true, // Auto-select manually added games
        isIgnored: false,
      };

      setQueue(prev => [...prev, newGame]);
      setSelectedId(newGame.uuid);
    } catch (err) {
      console.error('Error adding file:', err);
      setError('Failed to add file');
    }
  };

  // Update game in queue
  const updateGame = (uuid: string, updates: Partial<StagedGame>) => {
    setQueue(prev =>
      prev.map(game => (game.uuid === uuid ? { ...game, ...updates } : game))
    );
  };

  // Toggle field lock
  const toggleFieldLock = (uuid: string, field: string) => {
    const game = queue.find(g => g.uuid === uuid);
    if (!game) return;

    const lockedFields = game.lockedFields || {};
    updateGame(uuid, {
      lockedFields: {
        ...lockedFields,
        [field]: !lockedFields[field],
      },
    });
  };

  // Search for better metadata match
  const handleSearchMetadata = async (searchQuery?: string) => {
    if (!selectedGame) return;

    const query = (searchQuery || (typeof metadataSearchQuery === 'string' ? metadataSearchQuery.trim() : '') || (selectedGame.title ? selectedGame.title.trim() : '')).trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingMetadata(true);
    setError(null);
    setMetadataSearchResults([]);

    try {
      // Use searchGames instead of searchMetadata - it searches all providers including Steam
      // and doesn't require IGDB to be configured
      const response = await window.electronAPI.searchGames(query);
      if (response.success && response.results && response.results.length > 0) {
        // Sort results: prioritize Steam results first, then by release date (newest first), then exact matches
        const normalizedQuery = query.toLowerCase().trim();
        const sortedResults = response.results.sort((a: any, b: any) => {
          // First, prioritize Steam results
          const aIsSteam = a.source === 'steam' || a.steamAppId;
          const bIsSteam = b.source === 'steam' || b.steamAppId;
          if (aIsSteam && !bIsSteam) return -1;
          if (!aIsSteam && bIsSteam) return 1;
          
          // Then, sort by release date (newest first)
          const getDate = (result: any): number => {
            if (result.releaseDate) {
              if (typeof result.releaseDate === 'number') {
                return result.releaseDate * 1000; // Convert Unix timestamp (seconds) to milliseconds
              }
              return new Date(result.releaseDate).getTime();
            }
            if (result.year) {
              return new Date(result.year, 0, 1).getTime();
            }
            return 0;
          };
          
          const aDate = getDate(a);
          const bDate = getDate(b);
          if (aDate !== bDate && aDate > 0 && bDate > 0) {
            return bDate - aDate; // Newest first
          }
          
          // Finally, prioritize exact matches
          const aName = (a.title || a.name || '').toLowerCase().trim();
          const bName = (b.title || b.name || '').toLowerCase().trim();
          const aExact = aName === normalizedQuery;
          const bExact = bName === normalizedQuery;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          return 0;
        });
        setMetadataSearchResults(sortedResults);
      } else {
        setError(response.error || 'No results found');
      }
    } catch (err) {
      setError('Failed to search for games');
      console.error('Error searching games:', err);
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  // Apply selected metadata result
  const handleApplyMetadata = async (result: any) => {
    if (!selectedGame) return;

    const formatReleaseDate = (timestamp?: number): string => {
      if (!timestamp) return '';
      const date = new Date(timestamp * 1000);
      return date.toISOString().split('T')[0];
    };

    // Extract Steam App ID from result if available
    const steamAppId = result.steamAppId || result.externalId || selectedGame.appId;
    
    try {
      // Fetch full metadata (artwork + text) for the selected result
      // Use searchArtwork which now returns complete metadata including description, release date, etc.
      const artwork = await window.electronAPI.searchArtwork(result.title || result.name || '', steamAppId);
      
      // searchArtwork now returns complete metadata including text fields from Steam Store API
      // No need for additional metadata fetching
      const fullMetadata = artwork;
      
      updateGame(selectedGame.uuid, {
        title: result.title || result.name || selectedGame.title,
        description: fullMetadata?.description || result.summary || '',
        releaseDate: fullMetadata?.releaseDate || formatReleaseDate(result.releaseDate) || '',
        genres: fullMetadata?.genres || result.genres || [],
        developers: fullMetadata?.developers || result.developers || [],
        publishers: fullMetadata?.publishers || result.publishers || [],
        categories: fullMetadata?.categories || result.categories || [],
        ageRating: fullMetadata?.ageRating || result.ageRating || '',
        rating: fullMetadata?.rating || result.rating || 0,
        platform: result.platform || selectedGame.platform || 'steam',
        boxArtUrl: fullMetadata?.boxArtUrl || artwork?.boxArtUrl || selectedGame.boxArtUrl,
        bannerUrl: fullMetadata?.bannerUrl || artwork?.bannerUrl || artwork?.heroUrl || selectedGame.bannerUrl,
        logoUrl: fullMetadata?.logoUrl || artwork?.logoUrl || selectedGame.logoUrl,
        heroUrl: fullMetadata?.heroUrl || artwork?.heroUrl || selectedGame.heroUrl,
        appId: steamAppId || selectedGame.appId,
        status: 'ready',
      });
    } catch (err) {
      console.error('Error fetching metadata:', err);
      // If metadata fetch fails, still update with basic info from result
      updateGame(selectedGame.uuid, {
        title: result.title || result.name || selectedGame.title,
        description: result.summary || '',
        releaseDate: formatReleaseDate(result.releaseDate) || '',
        genres: result.genres || [],
        categories: result.categories || [],
        ageRating: result.ageRating || '',
        rating: result.rating || 0,
        platform: result.platform || selectedGame.platform || 'steam',
        appId: steamAppId || selectedGame.appId,
        status: 'ready',
      });
    }

    setShowMetadataSearch(false);
    setMetadataSearchResults([]);
    setMetadataSearchQuery('');
  };

  // Toggle game selection (unused but kept for potential future use)
  // const toggleGameSelection = (uuid: string) => {
  //   setQueue(prev =>
  //     prev.map(game =>
  //       game.uuid === uuid ? { ...game, isSelected: !game.isSelected } : game
  //     )
  //   );
  // };

  // Search for images
  const handleSearchImages = async () => {
    if (!selectedGame || !showImageSearch) return;

    const query = imageSearchQuery.trim() || selectedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);
    setImageSearchResults([]);

    try {
      // For boxart, use the new searchImages handler to get vertical grids from SteamGridDB
      if (showImageSearch.type === 'boxart') {
        const response = await window.electronAPI.searchImages(query, 'boxart', selectedGame.appId);
        
        if (response.success && response.images && response.images.length > 0) {
          // Flatten the results - each game has multiple images
          const flattenedResults: any[] = [];
          response.images.forEach(gameResult => {
            gameResult.images.forEach(img => {
              flattenedResults.push({
                id: gameResult.gameId,
                name: gameResult.gameName,
                title: gameResult.gameName,
                boxArtUrl: img.url,
                coverUrl: img.url,
                source: 'steamgriddb',
                score: img.score,
                width: img.width,
                height: img.height,
              });
            });
          });
          setImageSearchResults(flattenedResults);
          return;
        }
      } else if (showImageSearch.type === 'banner') {
        const response = await window.electronAPI.searchImages(query, 'banner', selectedGame.appId);
        
        if (response.success && response.images && response.images.length > 0) {
          const flattenedResults: any[] = [];
          response.images.forEach(gameResult => {
            gameResult.images.forEach(img => {
              flattenedResults.push({
                id: gameResult.gameId,
                name: gameResult.gameName,
                title: gameResult.gameName,
                bannerUrl: img.url,
                heroUrl: img.url,
                screenshotUrls: [img.url],
                source: 'steamgriddb',
                score: img.score,
                width: img.width,
                height: img.height,
              });
            });
          });
          setImageSearchResults(flattenedResults);
          return;
        }
      } else if (showImageSearch.type === 'logo') {
        const response = await window.electronAPI.searchImages(query, 'logo', selectedGame.appId);
        
        if (response.success && response.images && response.images.length > 0) {
          const flattenedResults: any[] = [];
          response.images.forEach(gameResult => {
            gameResult.images.forEach(img => {
              flattenedResults.push({
                id: gameResult.gameId,
                name: gameResult.gameName,
                title: gameResult.gameName,
                logoUrl: img.url,
                source: 'steamgriddb',
                score: img.score,
                width: img.width,
                height: img.height,
              });
            });
          });
          setImageSearchResults(flattenedResults);
          return;
        }
      }

      // Fallback to general search if SteamGridDB doesn't have results
      const gamesResponse = await window.electronAPI.searchGames(query);
      
      if (gamesResponse.success && gamesResponse.results && gamesResponse.results.length > 0) {
        const artworkPromises = gamesResponse.results.slice(0, 10).map(async (gameResult) => {
          try {
            const steamAppId = gameResult.steamAppId?.toString();
            const artwork = await window.electronAPI.searchArtwork(gameResult.title, steamAppId);
            
            if (!artwork) return null;

            let imageUrl: string | undefined;
            if (showImageSearch.type === 'boxart') {
              imageUrl = artwork.boxArtUrl;
            } else if (showImageSearch.type === 'banner') {
              imageUrl = artwork.bannerUrl || artwork.heroUrl;
            } else if (showImageSearch.type === 'logo') {
              imageUrl = artwork.logoUrl;
            }

            if (!imageUrl) return null;

            return {
              id: gameResult.externalId || gameResult.id,
              name: gameResult.title,
              title: gameResult.title,
              boxArtUrl: artwork.boxArtUrl,
              bannerUrl: artwork.bannerUrl || artwork.heroUrl,
              logoUrl: artwork.logoUrl,
              coverUrl: artwork.boxArtUrl,
              screenshotUrls: artwork.screenshots,
              source: gameResult.source,
            };
          } catch (err) {
            return null;
          }
        });

        const results = await Promise.all(artworkPromises);
        const validResults = results.filter(r => r !== null);
        
        if (validResults.length > 0) {
          setImageSearchResults(validResults);
        } else {
          // Final fallback to IGDB
          const metadataResponse = await window.electronAPI.searchMetadata(query);
          if (metadataResponse.success && metadataResponse.results && metadataResponse.results.length > 0) {
            setImageSearchResults(metadataResponse.results);
          } else {
            setError('No results found');
          }
        }
      } else {
        setError('No results found');
      }
    } catch (err) {
      setError('Failed to search for images');
      console.error('Error searching images:', err);
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Select image from search
  const handleSelectImage = (imageUrl: string, type: 'boxart' | 'banner' | 'logo') => {
    if (!selectedGame) return;

    const updates: Partial<StagedGame> = {};
    if (type === 'boxart') {
      updates.boxArtUrl = imageUrl;
    } else if (type === 'banner') {
      updates.bannerUrl = imageUrl;
    } else if (type === 'logo') {
      updates.logoUrl = imageUrl;
    }

    updateGame(selectedGame.uuid, updates);
    setShowImageSearch(null);
    setImageSearchResults([]);
    setImageSearchQuery('');
  };

  // Select image from local file
  const handleSelectLocalImage = async (type: 'boxart' | 'banner' | 'logo') => {
    if (!selectedGame) return;

    try {
      const filePath = await window.electronAPI.showImageDialog();
      if (!filePath) return;

      // Convert to file:// URL
      const imageUrl = `file://${filePath.replace(/\\/g, '/')}`;
      handleSelectImage(imageUrl, type);
    } catch (err) {
      console.error('Error selecting local image:', err);
      setError('Failed to select image');
    }
  };

  // Import all visible games (no need to check selection since all are auto-selected)
  const handleImport = async () => {
    const selectedGames = visibleGames; // Import all visible games
    
    if (selectedGames.length === 0) {
      setError('No games to import');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // Convert StagedGame to Game
      const gamesToImport: Game[] = selectedGames.map(staged => {
        // If game has a Steam App ID (from SteamGridDB search or direct Steam scan), treat it as a Steam game
        const hasSteamAppId = staged.appId && (staged.source === 'steam' || staged.appId.match(/^\d+$/));
        const gameId = hasSteamAppId
          ? `steam-${staged.appId}`
          : `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          id: gameId,
          title: staged.title,
          platform: staged.platform || (hasSteamAppId ? 'steam' : 'other'),
          exePath: staged.exePath || staged.installPath,
          boxArtUrl: staged.boxArtUrl,
          bannerUrl: staged.bannerUrl,
          logoUrl: staged.logoUrl,
          heroUrl: staged.heroUrl,
          description: staged.description,
          releaseDate: staged.releaseDate,
          genres: staged.genres,
          developers: staged.developers,
          publishers: staged.publishers,
          categories: staged.categories,
          ageRating: staged.ageRating,
          userScore: staged.rating,
          installationDirectory: staged.installPath,
          lockedFields: staged.lockedFields,
        };
      });

      await onImport(gamesToImport);
      onClose();
    } catch (err) {
      console.error('Error importing games:', err);
      setError(err instanceof Error ? err.message : 'Failed to import games');
    } finally {
      setIsImporting(false);
    }
  };

  // Get ready count (all visible games are ready to import)
  const readyCount = useMemo(() => {
    return visibleGames.filter(g => g.status === 'ready').length;
  }, [visibleGames]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-[5vh]">
      <div className="w-[90vw] h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Scanning Indicator */}
        {isScanning && (
          <div className="bg-blue-600 text-white px-6 py-3 flex items-center gap-3 border-b border-blue-700">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <div className="flex-1">
              <div className="font-medium">Scanning for games in all enabled locations...</div>
              {scanProgressMessage && (
                <div className="text-sm text-blue-100 mt-1">{scanProgressMessage}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-semibold text-white">Game Importer</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                showIgnored
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {showIgnored ? 'Show Active' : 'Show Ignored'}
            </button>
            <button
              onClick={handleScanAll}
              disabled={isScanning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {isScanning ? 'Scanning...' : 'Scan All'}
            </button>
            <button
              onClick={handleAddFile}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Add File
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[300px] lg:w-[350px] border-r border-gray-800 bg-gray-900/50 overflow-y-auto">
            {Object.entries(groupedGames).map(([source, games]) => {
              if (games.length === 0) return null;
              
              const sourceName = source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ');
              
              return (
                <div key={source} className="mb-4">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-300">
                      {sourceName} ({games.length}) {showIgnored && '(Ignored)'}
                    </h3>
                  </div>
                  {games.map(game => (
                    <div
                      key={game.uuid}
                      onClick={() => setSelectedId(game.uuid)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                        selectedId === game.uuid ? 'bg-gray-800/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${getStatusColor(game.status)}`}>
                          {getStatusIcon(game.status)}
                        </span>
                        <span className="text-sm font-medium text-white flex-1 truncate">
                          {game.title}
                        </span>
                        {!showIgnored && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIgnoreGame(game);
                            }}
                            className="text-gray-400 hover:text-red-400 text-xs px-1"
                            title="Ignore game"
                          >
                            ×
                          </button>
                        )}
                        {showIgnored && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnignoreGame(game);
                            }}
                            className="text-green-400 hover:text-green-300 text-xs px-1"
                            title="Unignore game"
                          >
                            ↻
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 ml-6">
                        Status: {game.status}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            
            {visibleGames.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400">
                <p className="text-sm">
                  {showIgnored 
                    ? 'No ignored games. Ignore games by clicking the × button.' 
                    : 'No games found. Click "Scan All" to start.'}
                </p>
              </div>
            )}
          </div>

          {/* Workspace */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-gray-800/30">
            {selectedGame ? (
              <>
                {/* Images Section - Moved to top */}
                <div className="p-6 space-y-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Images</h3>
                  
                  {/* All Images in One Row */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Box Art */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Box Art
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSelectLocalImage('boxart')}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                            title="Select local file"
                          >
                            📁
                          </button>
                          <button
                            onClick={() => toggleFieldLock(selectedGame.uuid, 'boxArtUrl')}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedGame.lockedFields?.boxArtUrl
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={selectedGame.lockedFields?.boxArtUrl ? 'Unlock' : 'Lock'}
                          >
                            {selectedGame.lockedFields?.boxArtUrl ? '🔒' : '🔓'}
                          </button>
                        </div>
                      </div>
                      <div
                        onClick={() => setShowImageSearch({ type: 'boxart', gameId: selectedGame.uuid })}
                        className="cursor-pointer"
                      >
                        {selectedGame.boxArtUrl ? (
                          <div className="w-full h-48 bg-gray-800 rounded border-2 border-blue-500 hover:border-blue-400 transition-colors flex items-center justify-center p-2">
                            <img
                              src={selectedGame.boxArtUrl}
                              alt="Box Art"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gray-700 rounded flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
                            <span>Click to search</span>
                            <span className="text-[10px] mt-1">Box Art</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hero/Banner */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Hero
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSelectLocalImage('banner')}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                            title="Select local file"
                          >
                            📁
                          </button>
                          <button
                            onClick={() => toggleFieldLock(selectedGame.uuid, 'bannerUrl')}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedGame.lockedFields?.bannerUrl
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={selectedGame.lockedFields?.bannerUrl ? 'Unlock' : 'Lock'}
                          >
                            {selectedGame.lockedFields?.bannerUrl ? '🔒' : '🔓'}
                          </button>
                        </div>
                      </div>
                      <div
                        onClick={() => setShowImageSearch({ type: 'banner', gameId: selectedGame.uuid })}
                        className="cursor-pointer"
                      >
                        {selectedGame.bannerUrl || selectedGame.heroUrl ? (
                          <img
                            src={selectedGame.bannerUrl || selectedGame.heroUrl}
                            alt="Hero"
                            className="w-full h-48 object-cover rounded border-2 border-blue-500 hover:border-blue-400 transition-colors"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-700 rounded flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
                            <span>Click to search</span>
                            <span className="text-[10px] mt-1">Hero/Banner</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Logo
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSelectLocalImage('logo')}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                            title="Select local file"
                          >
                            📁
                          </button>
                          <button
                            onClick={() => toggleFieldLock(selectedGame.uuid, 'logoUrl')}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedGame.lockedFields?.logoUrl
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={selectedGame.lockedFields?.logoUrl ? 'Unlock' : 'Lock'}
                          >
                            {selectedGame.lockedFields?.logoUrl ? '🔒' : '🔓'}
                          </button>
                        </div>
                      </div>
                      <div
                        onClick={() => setShowImageSearch({ type: 'logo', gameId: selectedGame.uuid })}
                        className="cursor-pointer"
                      >
                        {selectedGame.logoUrl ? (
                          <div className="w-full h-24 bg-gray-800 rounded border-2 border-blue-500 hover:border-blue-400 transition-colors flex items-center justify-center p-2">
                            <img
                              src={selectedGame.logoUrl}
                              alt="Logo"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-gray-700 rounded flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
                            <span>Click to search</span>
                            <span className="text-[10px] mt-1">Logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata Form */}
                <div className="p-4 space-y-3">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Title
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={selectedGame.title}
                          onChange={(e) => updateGame(selectedGame.uuid, { title: e.target.value })}
                          disabled={selectedGame.lockedFields?.title}
                          className="w-full px-2 py-1.5 pr-20 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="absolute right-1 flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (selectedGame) {
                                setMetadataSearchQuery(selectedGame.title);
                                setShowMetadataSearch(true);
                                // Trigger search immediately with the game title
                                handleSearchMetadata(selectedGame.title);
                              }
                            }}
                            className="text-xs px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded"
                            title="Search for better metadata match"
                          >
                            Fix Match
                          </button>
                          <button
                            onClick={() => toggleFieldLock(selectedGame.uuid, 'title')}
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              selectedGame.lockedFields?.title
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={selectedGame.lockedFields?.title ? 'Unlock' : 'Lock'}
                          >
                            {selectedGame.lockedFields?.title ? '🔒' : '🔓'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-400">
                          Platform
                        </label>
                      </div>
                      <input
                        type="text"
                        value={selectedGame.platform || selectedGame.source}
                        onChange={(e) => updateGame(selectedGame.uuid, { platform: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Executable Path
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={selectedGame.exePath || selectedGame.installPath}
                        onChange={(e) => updateGame(selectedGame.uuid, { exePath: e.target.value })}
                        disabled={selectedGame.lockedFields?.exePath}
                        className="w-full px-2 py-1.5 pr-10 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={() => toggleFieldLock(selectedGame.uuid, 'exePath')}
                        className={`absolute right-1 text-xs px-1.5 py-0.5 rounded ${
                          selectedGame.lockedFields?.exePath
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title={selectedGame.lockedFields?.exePath ? 'Unlock' : 'Lock'}
                      >
                        {selectedGame.lockedFields?.exePath ? '🔒' : '🔓'}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <div className="relative">
                      <textarea
                        value={selectedGame.description || ''}
                        onChange={(e) => updateGame(selectedGame.uuid, { description: e.target.value })}
                        disabled={selectedGame.lockedFields?.description}
                        rows={3}
                        className="w-full px-2 py-1.5 pr-10 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                      />
                      <button
                        onClick={() => toggleFieldLock(selectedGame.uuid, 'description')}
                        className={`absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded ${
                          selectedGame.lockedFields?.description
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title={selectedGame.lockedFields?.description ? 'Unlock' : 'Lock'}
                      >
                        {selectedGame.lockedFields?.description ? '🔒' : '🔓'}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Grid - 4 columns for compact layout */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Release Date
                      </label>
                      <input
                        type="text"
                        value={selectedGame.releaseDate || ''}
                        onChange={(e) => updateGame(selectedGame.uuid, { releaseDate: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Age Rating
                      </label>
                      <input
                        type="text"
                        value={selectedGame.ageRating || ''}
                        onChange={(e) => updateGame(selectedGame.uuid, { ageRating: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Genres
                      </label>
                      <input
                        type="text"
                        value={selectedGame.genres?.join(', ') || ''}
                        onChange={(e) => updateGame(selectedGame.uuid, { genres: e.target.value.split(',').map(g => g.trim()).filter(Boolean) })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Action, Adventure, RPG"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Rating
                      </label>
                      <input
                        type="number"
                        value={selectedGame.rating || 0}
                        onChange={(e) => updateGame(selectedGame.uuid, { rating: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Developers
                      </label>
                      <input
                        type="text"
                        value={selectedGame.developers?.join(', ') || ''}
                        onChange={(e) => updateGame(selectedGame.uuid, { developers: e.target.value.split(',').map(d => d.trim()).filter(Boolean) })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Developer 1, Developer 2"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Publishers
                      </label>
                      <input
                        type="text"
                        value={selectedGame.publishers?.join(', ') || ''}
                        onChange={(e) => updateGame(selectedGame.uuid, { publishers: e.target.value.split(',').map(p => p.trim()).filter(Boolean) })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Publisher 1, Publisher 2"
                      />
                    </div>
                  </div>
                </div>

                {/* Metadata Search Modal */}
                {showMetadataSearch && selectedGame && (
                  <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                          Search for Better Metadata Match
                        </h3>
                        <button
                          onClick={() => {
                            setShowMetadataSearch(false);
                            setMetadataSearchResults([]);
                            setMetadataSearchQuery('');
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                      <div className="p-4 border-b border-gray-800">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={metadataSearchQuery}
                            onChange={(e) => setMetadataSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearchMetadata()}
                            placeholder="Search for game title..."
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleSearchMetadata()}
                            disabled={isSearchingMetadata}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
                          >
                            {isSearchingMetadata ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {metadataSearchResults.length > 0 ? (
                          <div className="space-y-3">
                            {metadataSearchResults.map((result, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleApplyMetadata(result)}
                                className="cursor-pointer p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-colors"
                              >
                                <div className="flex gap-4">
                                  {result.coverUrl && (
                                    <img
                                      src={result.coverUrl}
                                      alt={result.name}
                                      className="w-24 h-32 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold text-white mb-2">
                                      {result.name}
                                    </h4>
                                    {result.summary && (
                                      <p className="text-sm text-gray-300 line-clamp-3 mb-2">
                                        {result.summary}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                                      {result.releaseDate && (
                                        <span>
                                          Release: {new Date(result.releaseDate * 1000).getFullYear()}
                                        </span>
                                      )}
                                      {result.genres && result.genres.length > 0 && (
                                        <span>Genres: {result.genres.join(', ')}</span>
                                      )}
                                      {result.rating && (
                                        <span>Rating: {result.rating.toFixed(1)}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 py-8">
                            {isSearchingMetadata ? 'Searching...' : 'No results. Try searching for a game title.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Search Modal */}
                {showImageSearch && showImageSearch.gameId === selectedGame.uuid && (
                  <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                          Search {showImageSearch.type === 'boxart' ? 'Box Art' : showImageSearch.type === 'banner' ? 'Hero/Banner' : 'Logo'} Images
                        </h3>
                        <button
                          onClick={() => {
                            setShowImageSearch(null);
                            setImageSearchResults([]);
                            setImageSearchQuery('');
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                      <div className="p-4 border-b border-gray-800">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={imageSearchQuery}
                            onChange={(e) => setImageSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearchImages()}
                            placeholder="Search for images..."
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleSearchImages}
                            disabled={isSearchingImages}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
                          >
                            {isSearchingImages ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {imageSearchResults.length > 0 ? (
                          <div className="grid grid-cols-3 gap-4">
                            {imageSearchResults.map((result, idx) => {
                              let imageUrl: string | undefined;
                              
                              if (showImageSearch.type === 'boxart') {
                                imageUrl = result.boxArtUrl || result.coverUrl;
                              } else if (showImageSearch.type === 'logo') {
                                imageUrl = result.logoUrl;
                              } else if (showImageSearch.type === 'banner') {
                                imageUrl = result.bannerUrl || result.screenshotUrls?.[0] || result.heroUrl;
                              }
                              
                              if (!imageUrl) return null;

                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleSelectImage(imageUrl!, showImageSearch.type)}
                                  className="cursor-pointer border-2 border-gray-700 hover:border-blue-500 rounded-lg overflow-hidden transition-colors"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={result.name || result.title}
                                    className={`w-full ${
                                      showImageSearch.type === 'logo' 
                                        ? 'h-24 object-contain bg-gray-800 p-2' 
                                        : 'h-48 object-cover'
                                    }`}
                                  />
                                  <div className="p-2 bg-gray-800 text-white text-sm truncate">
                                    {result.name || result.title}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 py-8">
                            {isSearchingImages ? 'Searching...' : 'No results. Try searching for images.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <p>Select a game from the sidebar to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-[60px] flex items-center justify-between px-6 border-t border-gray-800 bg-gray-900/50">
          <div className="text-sm text-gray-300">
            Summary: {readyCount} {readyCount === 1 ? 'game' : 'games'} ready
          </div>
          <button
            onClick={handleImport}
            disabled={isImporting || readyCount === 0}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {isImporting ? 'Importing...' : `Import ${readyCount} ${readyCount === 1 ? 'Game' : 'Games'}`}
            <span>→</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-white/80 hover:text-white font-bold"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
