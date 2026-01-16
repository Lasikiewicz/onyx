import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game, GameMetadata } from '../../types/game';
import { areAPIsConfigured } from '../../utils/apiValidation';

interface ImportWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (games: Game[]) => Promise<void>;
  existingLibrary?: Game[];
  initialFolderPath?: string; // Optional: folder path to scan on open
  preScannedGames?: Array<{
    uuid?: string;
    source?: 'steam' | 'epic' | 'gog' | 'xbox' | 'ubisoft' | 'rockstar' | 'ea' | 'battle' | 'humble' | 'itch' | 'manual_file' | 'manual_folder';
    originalName?: string;
    installPath?: string;
    exePath?: string;
    appId?: string;
    title?: string;
    name?: string;
    installDir?: string;
    libraryPath?: string;
    id?: string;
    type?: string;
  }>; // Optional: games already scanned (can be ScannedGameResult or SteamGame/XboxGame format)
  appType?: 'steam' | 'xbox' | 'other'; // Type of app being imported
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return 1 - editDistance / longer.length;
}

/**
 * Calculate word overlap between two strings
 */
function calculateWordOverlap(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 0));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  let overlap = 0;
  words1.forEach(word => {
    if (words2.has(word)) {
      overlap++;
    }
  });

  return overlap / Math.max(words1.size, words2.size);
}

/**
 * Score a search result match against a scanned game
 */
interface MatchScore {
  confidence: number;
  reasons: string[];
}

function scoreMatch(scannedTitle: string, candidate: any, scannedAppId?: string): MatchScore {
  let confidence = 0;
  const reasons: string[] = [];

  const scannedNormalized = normalizeTitle(scannedTitle);
  const candidateNormalized = normalizeTitle(candidate.title || '');

  // Debug logging for matching
  if (candidate.steamAppId || candidate.source === 'steam') {
    console.log(`[Match] Scoring "${scannedTitle}" vs "${candidate.title}" (Steam App ID: ${candidate.steamAppId || 'none'}, source: ${candidate.source})`);
  }

  // 1. Exact Title Match (50% weight)
  if (scannedNormalized === candidateNormalized) {
    confidence += 0.5;
    reasons.push('exact title match');
  } else {
    // Fuzzy match
    const similarity = calculateSimilarity(scannedNormalized, candidateNormalized);
    if (similarity > 0.9) {
      confidence += 0.4;
      reasons.push(`very similar title (${(similarity * 100).toFixed(0)}%)`);
    } else if (similarity > 0.7) {
      confidence += 0.2;
      reasons.push(`similar title (${(similarity * 100).toFixed(0)}%)`);
    } else if (similarity > 0.5) {
      confidence += 0.1;
      reasons.push(`somewhat similar title (${(similarity * 100).toFixed(0)}%)`);
    } else {
      reasons.push(`low title similarity (${(similarity * 100).toFixed(0)}%)`);
    }
  }

  // 2. Steam App ID Match (40% weight) - Highest confidence
  if (scannedAppId && candidate.steamAppId) {
    if (scannedAppId === candidate.steamAppId.toString()) {
      confidence += 0.4;
      reasons.push('steam app id match');
    } else {
      // Wrong App ID - reduce confidence
      confidence -= 0.2;
      reasons.push('steam app id mismatch');
    }
  } else if (candidate.steamAppId && candidate.source === 'steam') {
    // Give a small bonus for Steam games, but ONLY if title is reasonably close
    // This prevents matching "GTA San Andreas" to "GTA V Enhanced" just because both are Steam games
    const titleSimilarity = calculateSimilarity(scannedNormalized, candidateNormalized);
    if (titleSimilarity > 0.7) {
      confidence += 0.2; // Reduced from 0.3
      reasons.push('steam game with similar title');
    } else if (titleSimilarity > 0.5) {
      confidence += 0.1;
      reasons.push('steam game with somewhat similar title');
    } else {
      reasons.push('steam game but title mismatch');
    }
  }

  // 3. Source Match (10% weight)
  // Note: We don't have scanned.source in this context, so skip this

  // 4. Provider Priority Bonus
  // Steam results are more reliable
  if (candidate.source === 'steam' && candidate.steamAppId) {
    confidence += 0.1;
    reasons.push('steam provider match');
  }

  // 5. Penalties
  // If candidate has very different title, penalize
  if (scannedNormalized !== candidateNormalized) {
    const wordOverlap = calculateWordOverlap(scannedNormalized, candidateNormalized);
    if (wordOverlap < 0.3) {
      confidence -= 0.5; // Increased penalty
      reasons.push('low word overlap');
    }

    // Strict title length difference penalty
    const lengthDiff = Math.abs(scannedNormalized.length - candidateNormalized.length);
    if (lengthDiff > Math.max(scannedNormalized.length, candidateNormalized.length) * 0.5) {
      confidence -= 0.4; // Increased penalty
      reasons.push('significant title length difference');
    }

    // Check for title suffix mismatch (e.g., "San Andreas" vs "V Enhanced")
    const scannedWords = scannedNormalized.split(/\s+/);
    const candidateWords = candidateNormalized.split(/\s+/);

    // If one title is a prefix of the other, check if the suffix is completely different
    const minLen = Math.min(scannedWords.length, candidateWords.length);
    let prefixMatchCount = 0;
    for (let i = 0; i < minLen; i++) {
      if (scannedWords[i] === candidateWords[i]) {
        prefixMatchCount++;
      } else {
        break;
      }
    }

    // If we have a common prefix but different suffixes, penalize heavily
    if (prefixMatchCount > 0 && prefixMatchCount < Math.max(scannedWords.length, candidateWords.length)) {
      const scannedSuffix = scannedWords.slice(prefixMatchCount).join(' ');
      const candidateSuffix = candidateWords.slice(prefixMatchCount).join(' ');

      // If both have suffixes and they're very different, penalize
      if (scannedSuffix && candidateSuffix && calculateSimilarity(scannedSuffix, candidateSuffix) < 0.5) {
        confidence -= 0.5;
        reasons.push(`title suffix mismatch: "${scannedSuffix}" vs "${candidateSuffix}"`);
      }
    }
  }

  // Clamp confidence to 0-1
  confidence = Math.max(0, Math.min(1, confidence));

  return { confidence, reasons };
}

/**
 * Strip demo-related words from a title
 */
function stripDemoIndicator(title: string): { stripped: string; isDemo: boolean } {
  const demoIndicators = [
    /\s+demo$/i,
    /\s+prologue$/i,
    /\s+trial$/i,
    /\s+beta$/i,
    /\s+alpha$/i,
    /\s+demo version$/i,
    /\s+playtest$/i,
    /demo$/i,
    /prologue$/i
  ];

  let stripped = title;
  let isDemo = false;

  while (true) {
    let changed = false;
    for (const indicator of demoIndicators) {
      if (indicator.test(stripped)) {
        stripped = stripped.replace(indicator, '').trim();
        isDemo = true;
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }

  return { stripped, isDemo };
}

/**
 * Find the best match from search results
 */
function findBestMatch(scannedTitle: string, searchResults: any[], scannedAppId?: string): any | null {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // Score all results
  const scoredResults = searchResults.map(result => ({
    result,
    score: scoreMatch(scannedTitle, result, scannedAppId),
  }));

  // Sort by confidence (highest first)
  scoredResults.sort((a, b) => b.score.confidence - a.score.confidence);

  const bestMatch = scoredResults[0];

  // Only return if confidence is above threshold (0.3 minimum, but prefer 0.5+)
  // This prevents matches like "Grand Theft Auto San Andreas" -> "Grand Theft Auto V Enhanced"
  if (bestMatch.score.confidence >= 0.3) {
    console.log(`[Match] Best match for "${scannedTitle}": "${bestMatch.result.title}" (confidence: ${(bestMatch.score.confidence * 100).toFixed(0)}%, reasons: ${bestMatch.score.reasons.join(', ')})`);
    return bestMatch.result;
  }

  console.log(`[Match] No good match found for "${scannedTitle}" (best confidence: ${(bestMatch.score.confidence * 100).toFixed(0)}%)`);
  return null;
}

/**
 * Fetch text metadata from alternative sources when description is empty
 */
async function fetchTextMetadataFromAlternativeSource(
  gameTitle: string,
  _matchedResult: any | null,
  steamAppId?: string
): Promise<{
  description: string;
  releaseDate: string;
  genres: string[];
  developers: string[];
  publishers: string[];
  ageRating: string;
  rating: number;
  platform: string;
}> {
  const emptyResult = {
    description: '',
    releaseDate: '',
    genres: [],
    developers: [],
    publishers: [],
    ageRating: '',
    rating: 0,
    platform: '',
  };

  try {
    // Try fetching from searchArtwork which queries multiple providers (IGDB, RAWG, etc.)
    // This will get text metadata from alternative sources
    console.log(`[ImportWorkbench] Fetching text metadata from alternative sources for "${gameTitle}"`);
    const altMetadata = await window.electronAPI.searchArtwork(gameTitle, steamAppId);

    if (altMetadata) {
      return {
        description: (altMetadata.description || altMetadata.summary || '').trim(),
        releaseDate: (altMetadata.releaseDate || '').trim(),
        genres: altMetadata.genres || [],
        developers: altMetadata.developers || [],
        publishers: altMetadata.publishers || [],
        ageRating: (altMetadata.ageRating || '').trim(),
        rating: altMetadata.rating || 0,
        platform: altMetadata.platforms?.join(', ') || altMetadata.platform || '',
      };
    }
  } catch (err) {
    console.warn(`[ImportWorkbench] Error fetching text metadata from alternative sources for "${gameTitle}":`, err);
  }

  return emptyResult;
}

export const ImportWorkbench: React.FC<ImportWorkbenchProps> = ({
  isOpen,
  onClose,
  onImport,
  existingLibrary = [],
  initialFolderPath,
  preScannedGames,
  appType = 'steam',
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
  const [categoryInput, setCategoryInput] = useState<string>('');
  const [folderConfigs, setFolderConfigs] = useState<Record<string, { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[] }>>({});
  const titleInputRef = useRef<HTMLInputElement>(null);
  const hasAutoScannedRef = useRef<boolean>(false); // Track if we've already auto-scanned

  // Default categories for quick selection
  const DEFAULT_CATEGORIES = ['Apps', 'Games', 'VR'];

  // Pause/resume background scan when ImportWorkbench opens/closes
  useEffect(() => {
    if (isOpen) {
      // Pause background scan when ImportWorkbench opens
      window.electronAPI.pauseBackgroundScan?.().catch(err => {
        console.error('Error pausing background scan:', err);
      });
    } else {
      // Resume background scan when ImportWorkbench closes
      window.electronAPI.resumeBackgroundScan?.().catch(err => {
        console.error('Error resuming background scan:', err);
      });
    }
  }, [isOpen]);

  // Load ignored games and folder configs on mount
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getPreferences().then(prefs => {
        const ignored = prefs.ignoredGames ? new Set(prefs.ignoredGames) : new Set<string>();
        setIgnoredGames(ignored);
      });

      // Load folder configs to check for autoCategory
      if (window.electronAPI.getManualFolderConfigs) {
        window.electronAPI.getManualFolderConfigs().then(configs => {
          setFolderConfigs(configs || {});
        }).catch(err => {
          console.error('Error loading folder configs:', err);
        });
      }
    }
  }, [isOpen]);

  const selectedGame = useMemo(() => {
    return queue.find(g => g.uuid === selectedId) || null;
  }, [queue, selectedId]);

  // Clear category input only when selected game actually changes (not on every render)
  const prevSelectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSelectedIdRef.current !== selectedId && prevSelectedIdRef.current !== null) {
      // Only clear if the selected game actually changed (not on initial mount)
      setCategoryInput('');
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

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
      setError('IGDB (Client ID + Secret) is required before scanning. Please configure it in Settings > APIs.');
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
          let steamAppId = scanned.appId;  // Start with appId from scanning (for Steam games)
          let matchedTitle = scanned.title;
          let matchedResult: any = null;

          // Check for demo indicator in scanned title
          const { stripped: searchTitle, isDemo } = stripDemoIndicator(scanned.title);
          const effectiveSearchTitle = isDemo ? searchTitle : scanned.title;
          const isDemoMatch = isDemo;

          try {
            // Step 1: Search with the provided name
            const searchResponse = await window.electronAPI.searchGames(effectiveSearchTitle);

            if (searchResponse && (searchResponse.success !== false) && searchResponse.results && searchResponse.results.length > 0) {
              // Step 2: Find best match using scoring algorithm
              const bestMatch = findBestMatch(effectiveSearchTitle, searchResponse.results, scanned.appId);

              if (bestMatch) {
                if (bestMatch.steamAppId) {
                  steamAppId = bestMatch.steamAppId.toString();
                }
                matchedTitle = bestMatch.title || effectiveSearchTitle;
                matchedResult = bestMatch;

                // If it was a demo match, add indicator back to matched title
                if (isDemoMatch) {
                  matchedTitle = `${matchedTitle} [Demo]`;
                }
              }
            }
          } catch (err) {
            // Ignore search errors during staging - will search again later
            console.log(`[ImportWorkbench] Search failed for "${scanned.title}":`, err);
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

          // Check if this game is from a manual folder with autoCategory configured
          if (scanned.source === 'manual_folder' && scanned.installPath) {
            console.log(`[ImportWorkbench] Checking autoCategory for ${scanned.title} from path: ${scanned.installPath}`);
            console.log(`[ImportWorkbench] Available folder configs:`, Object.keys(folderConfigs).length);

            // Find folder config that matches this game's install path or parent folder
            const matchingConfig = Object.values(folderConfigs).find(config => {
              if (!config.enabled) {
                console.log(`[ImportWorkbench] Config ${config.path} is disabled, skipping`);
                return false;
              }
              if (!config.autoCategory || config.autoCategory.length === 0) {
                console.log(`[ImportWorkbench] Config ${config.path} has no autoCategory, skipping`);
                return false;
              }
              // Normalize paths: lowercase, forward slashes, remove trailing slashes
              const normalizePath = (path: string) => {
                return path.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '');
              };
              const configPath = normalizePath(config.path);
              const installPath = normalizePath(scanned.installPath);
              console.log(`[ImportWorkbench] Comparing config path "${configPath}" with install path "${installPath}"`);

              // Match if install path starts with config path (with trailing slash to ensure it's a subdirectory)
              // Or if they're exactly the same
              const matches = installPath === configPath || installPath.startsWith(configPath + '/');
              if (matches) {
                console.log(`[ImportWorkbench] ✓ Found matching folder config for ${scanned.title}: ${config.path} -> ${scanned.installPath}`);
              }
              return matches;
            });

            if (matchingConfig && matchingConfig.autoCategory) {
              categories = [...matchingConfig.autoCategory];
              console.log(`[ImportWorkbench] ✓ Applied autoCategory "${matchingConfig.autoCategory.join(', ')}" to ${scanned.title} from folder ${matchingConfig.path}`);
            } else {
              console.log(`[ImportWorkbench] ✗ No matching folder config found for ${scanned.title}`);
            }
          }

          // steamAppId and matchedTitle are already set above if found

          if (steamAppId || matchedResult) {
            // Game has a found match - fetch complete metadata
            // Step 1: Fetch images from Steam Store
            // Step 2: Fetch text metadata (descriptions) separately
            try {
              // Step 1: Fetch images from searchArtwork
              const artworkResult = await window.electronAPI.searchArtwork(matchedTitle, steamAppId);

              if (artworkResult) {
                metadata = artworkResult;

                // Extract image fields from the metadata
                boxArtUrl = metadata.boxArtUrl || '';
                bannerUrl = metadata.bannerUrl || '';
                logoUrl = metadata.logoUrl || '';
                heroUrl = metadata.heroUrl || '';

                // Step 2: Explicitly fetch text metadata (descriptions) separately when we have a Steam App ID
                // This ensures descriptions are always fetched as a separate step, even if searchArtwork returned some
                const finalSteamAppId = steamAppId || scanned.appId;
                if (finalSteamAppId && finalSteamAppId.toString().match(/^\d+$/)) {
                  try {
                    // Add a small delay to avoid rate limiting (Steam Store API has rate limits)
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    console.log(`[ImportWorkbench] Fetching description for ${matchedTitle} with App ID: ${finalSteamAppId}`);
                    // Fetch description directly from Steam Store API (separate call)
                    const steamGameId = `steam-${finalSteamAppId}`;
                    const descriptionResult = await window.electronAPI.fetchGameDescription(steamGameId);
                    console.log(`[ImportWorkbench] Description result for ${matchedTitle}:`, descriptionResult);
                    if (descriptionResult && descriptionResult.success) {
                      // Use description from direct Steam Store API call
                      description = (descriptionResult.description || descriptionResult.summary || '').trim();
                      releaseDate = (descriptionResult.releaseDate || '').trim();
                      genres = descriptionResult.genres || [];
                      developers = descriptionResult.developers || [];
                      publishers = descriptionResult.publishers || [];
                      ageRating = (descriptionResult.ageRating || '').trim();
                      rating = descriptionResult.rating || 0;
                      platform = descriptionResult.platforms?.join(', ') || metadata.platform || scanned.source;
                      console.log(`[ImportWorkbench] Successfully fetched description for ${matchedTitle}, length: ${description.length}`);
                    } else {
                      console.warn(`[ImportWorkbench] Description fetch failed for ${matchedTitle}:`, descriptionResult?.error);
                      // Fallback to what we got from searchArtwork
                      description = (metadata.description || metadata.summary || '').trim();
                      releaseDate = (metadata.releaseDate || '').trim();
                      genres = metadata.genres || [];
                      developers = metadata.developers || [];
                      publishers = metadata.publishers || [];
                      ageRating = (metadata.ageRating || '').trim();
                      rating = metadata.rating || 0;
                      platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                    }
                  } catch (descErr) {
                    console.error(`[ImportWorkbench] Error fetching description for ${matchedTitle}:`, descErr);
                    // Use what we got from searchArtwork
                    description = (metadata.description || metadata.summary || '').trim();
                    releaseDate = (metadata.releaseDate || '').trim();
                    genres = metadata.genres || [];
                    developers = metadata.developers || [];
                    publishers = metadata.publishers || [];
                    ageRating = (metadata.ageRating || '').trim();
                    rating = metadata.rating || 0;
                    platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                  }
                } else {
                  console.log(`[ImportWorkbench] No valid Steam App ID for ${matchedTitle}, using searchArtwork metadata`);
                  // No Steam App ID - use metadata from searchArtwork
                  description = (metadata.description || metadata.summary || '').trim();
                  releaseDate = (metadata.releaseDate || '').trim();
                  genres = metadata.genres || [];
                  developers = metadata.developers || [];
                  publishers = metadata.publishers || [];
                  ageRating = (metadata.ageRating || '').trim();
                  rating = metadata.rating || 0;
                  platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                }

                // If description is still empty, try alternative sources
                if (!description || description.trim().length === 0) {
                  console.log(`[ImportWorkbench] Description still empty for ${matchedTitle}, trying alternative sources...`);
                  const altMetadata = await fetchTextMetadataFromAlternativeSource(matchedTitle, matchedResult, finalSteamAppId);
                  if (altMetadata.description) {
                    description = altMetadata.description;
                    releaseDate = altMetadata.releaseDate || releaseDate;
                    genres = altMetadata.genres.length > 0 ? altMetadata.genres : genres;
                    developers = altMetadata.developers.length > 0 ? altMetadata.developers : developers;
                    publishers = altMetadata.publishers.length > 0 ? altMetadata.publishers : publishers;
                    ageRating = altMetadata.ageRating || ageRating;
                    rating = altMetadata.rating || rating;
                    platform = altMetadata.platform || platform;
                    console.log(`[ImportWorkbench] Successfully fetched text metadata from alternative source for ${matchedTitle}`);
                  }
                }

                // Auto-categorize games with "Utilities" genre as "Apps"
                if (genres.includes('Utilities') && !categories.includes('Apps')) {
                  categories = [...categories, 'Apps'];
                  console.log(`[ImportWorkbench] Auto-categorized "${matchedTitle}" as "Apps" (genre: Utilities)`);
                }

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

                // Only set to ready if all required metadata is present
                const tempGame: Partial<StagedGame> = {
                  boxArtUrl,
                  bannerUrl,
                  logoUrl,
                  heroUrl,
                  description,
                };
                status = isGameReady(tempGame) ? 'ready' : 'ambiguous';
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
                // Auto-categorize games with "Utilities" genre as "Apps"
                if (genres.includes('Utilities') && !categories.includes('Apps')) {
                  categories = [...categories, 'Apps'];
                  console.log(`[ImportWorkbench] Auto-categorized "${scanned.title}" as "Apps" (genre: Utilities)`);
                }
                ageRating = (metadata.ageRating || '').trim();
                rating = metadata.rating || 0;
                platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                developers = metadata.developers || [];
                publishers = metadata.publishers || [];

                // Only set to ready if all required metadata is present
                const tempGame: Partial<StagedGame> = {
                  boxArtUrl: metadata.boxArtUrl || '',
                  bannerUrl: metadata.bannerUrl || '',
                  logoUrl: metadata.logoUrl || '',
                  heroUrl: metadata.heroUrl || '',
                  description,
                };
                status = isGameReady(tempGame) ? 'ready' : 'ambiguous';
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
            launchArgs: (scanned as any).launchArgs,
            // Always use found Steam App ID if available, otherwise use scanned appId
            appId: steamAppId || scanned.appId,
            packageFamilyName: scanned.packageFamilyName,
            appUserModelId: scanned.appUserModelId,
            launchUri: scanned.launchUri,
            xboxKind: scanned.xboxKind,
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
        // Merge with existing queue to preserve manual edits
        setQueue(prevQueue => {
          const existingMap = new Map(prevQueue.map(g => [g.uuid, g]));
          const merged = stagedGames.map(newGame => {
            const existing = existingMap.get(newGame.uuid);
            if (existing) {
              // Preserve manual edits - only update fields that haven't been manually changed
              // For categories, always preserve existing if they exist (user may have added them)
              return {
                ...newGame,
                categories: existing.categories && existing.categories.length > 0
                  ? existing.categories
                  : newGame.categories,
                // Preserve other manually edited fields if they differ from initial values
                title: existing.title !== newGame.originalName ? existing.title : newGame.title,
                description: existing.description || newGame.description,
                releaseDate: existing.releaseDate || newGame.releaseDate,
                genres: existing.genres && existing.genres.length > 0 ? existing.genres : newGame.genres,
                developers: existing.developers && existing.developers.length > 0 ? existing.developers : newGame.developers,
                publishers: existing.publishers && existing.publishers.length > 0 ? existing.publishers : newGame.publishers,
                boxArtUrl: existing.boxArtUrl || newGame.boxArtUrl,
                bannerUrl: existing.bannerUrl || newGame.bannerUrl,
                logoUrl: existing.logoUrl || newGame.logoUrl,
                heroUrl: existing.heroUrl || newGame.heroUrl,
                lockedFields: existing.lockedFields || newGame.lockedFields,
              };
            }
            return newGame;
          });
          return merged;
        });

        if (stagedGames.length === 1 && !selectedId) {
          setSelectedId(stagedGame.uuid);
        }
      }

      // Final merge to preserve any remaining manual edits
      setQueue(prevQueue => {
        const existingMap = new Map(prevQueue.map(g => [g.uuid, g]));
        const merged = stagedGames.map(newGame => {
          const existing = existingMap.get(newGame.uuid);
          if (existing) {
            return {
              ...newGame,
              categories: existing.categories && existing.categories.length > 0
                ? existing.categories
                : newGame.categories,
              title: existing.title !== newGame.originalName ? existing.title : newGame.title,
              description: existing.description || newGame.description,
              releaseDate: existing.releaseDate || newGame.releaseDate,
              genres: existing.genres && existing.genres.length > 0 ? existing.genres : newGame.genres,
              developers: existing.developers && existing.developers.length > 0 ? existing.developers : newGame.developers,
              publishers: existing.publishers && existing.publishers.length > 0 ? existing.publishers : newGame.publishers,
              boxArtUrl: existing.boxArtUrl || newGame.boxArtUrl,
              bannerUrl: existing.bannerUrl || newGame.bannerUrl,
              logoUrl: existing.logoUrl || newGame.logoUrl,
              heroUrl: existing.heroUrl || newGame.heroUrl,
              lockedFields: existing.lockedFields || newGame.lockedFields,
            };
          }
          return newGame;
        });
        return merged;
      });

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
      setError('IGDB (Client ID + Secret) is required before scanning. Please configure it in Settings > APIs.');
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

              // Check if this game is from a manual folder with autoCategory configured
              if (scanned.source === 'manual_folder' && scanned.installPath) {
                console.log(`[ImportWorkbench] Checking autoCategory for ${scanned.title} from path: ${scanned.installPath}`);
                console.log(`[ImportWorkbench] Available folder configs:`, Object.keys(folderConfigs).length);

                // Find folder config that matches this game's install path or parent folder
                const matchingConfig = Object.values(folderConfigs).find(config => {
                  if (!config.enabled) {
                    console.log(`[ImportWorkbench] Config ${config.path} is disabled, skipping`);
                    return false;
                  }
                  if (!config.autoCategory || config.autoCategory.length === 0) {
                    console.log(`[ImportWorkbench] Config ${config.path} has no autoCategory, skipping`);
                    return false;
                  }
                  // Normalize paths: lowercase, forward slashes, remove trailing slashes
                  const normalizePath = (path: string) => {
                    return path.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '');
                  };
                  const configPath = normalizePath(config.path);
                  const installPath = normalizePath(scanned.installPath);
                  console.log(`[ImportWorkbench] Comparing config path "${configPath}" with install path "${installPath}"`);

                  // Match if install path starts with config path (with trailing slash to ensure it's a subdirectory)
                  // Or if they're exactly the same
                  const matches = installPath === configPath || installPath.startsWith(configPath + '/');
                  if (matches) {
                    console.log(`[ImportWorkbench] ✓ Found matching folder config for ${scanned.title}: ${config.path} -> ${scanned.installPath}`);
                  }
                  return matches;
                });

                if (matchingConfig && matchingConfig.autoCategory) {
                  categories = [...matchingConfig.autoCategory];
                  console.log(`[ImportWorkbench] ✓ Applied autoCategory "${matchingConfig.autoCategory.join(', ')}" to ${scanned.title} from folder ${matchingConfig.path}`);
                } else {
                  console.log(`[ImportWorkbench] ✗ No matching folder config found for ${scanned.title}`);
                }
              }

              // Try to find match for games without Steam App ID - SIMPLE APPROACH
              let steamAppId = scanned.appId;
              let matchedTitle = scanned.title; // Use matched title for better metadata fetching
              let matchedResult: any = null;
              let isDemoMatch = false;

              // Check for demo indicator in scanned title
              const { stripped: searchTitle, isDemo } = stripDemoIndicator(scanned.title);
              const effectiveSearchTitle = isDemo ? searchTitle : scanned.title;
              isDemoMatch = isDemo;

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
                  const searchResponse = await withTimeout(window.electronAPI.searchGames(effectiveSearchTitle), 30000);

                  if (searchResponse && (searchResponse.success !== false) && searchResponse.results && searchResponse.results.length > 0) {
                    // Step 2: Find best match using scoring algorithm
                    const bestMatch = findBestMatch(effectiveSearchTitle, searchResponse.results, scanned.appId);

                    if (bestMatch) {
                      if (bestMatch.steamAppId) {
                        steamAppId = bestMatch.steamAppId.toString();
                        console.log(`[ImportWorkbench] Found Steam App ID ${steamAppId} for "${scanned.title}" (matched with "${bestMatch.title}")`);
                      } else {
                        console.log(`[ImportWorkbench] Found match for "${scanned.title}" (matched with "${bestMatch.title}")`);
                      }
                      matchedTitle = bestMatch.title || effectiveSearchTitle;
                      matchedResult = bestMatch;
                    } else {
                      console.log(`[ImportWorkbench] No good match found for "${scanned.title}" (confidence too low)`);
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

                  // Step 3a: Fetch images from Steam Store
                  const artworkResult = await withTimeout(window.electronAPI.searchArtwork(scanned.title, scanned.appId), 30000).catch(err => {
                    console.warn(`[ImportWorkbench] searchArtwork timeout/error for "${scanned.title}":`, err);
                    return null;
                  });

                  // Get artwork metadata (images)
                  if (artworkResult) {
                    metadata = artworkResult;

                    // Extract image fields from the metadata
                    boxArtUrl = metadata.boxArtUrl || '';
                    bannerUrl = metadata.bannerUrl || '';
                    logoUrl = metadata.logoUrl || '';
                    heroUrl = metadata.heroUrl || '';

                    // Step 3b: Explicitly fetch text metadata (descriptions) separately
                    if (scanned.appId && scanned.appId.toString().match(/^\d+$/)) {
                      try {
                        // Add a small delay to avoid rate limiting (Steam Store API has rate limits)
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                        console.log(`[ImportWorkbench] Fetching description for ${scanned.title} with App ID: ${scanned.appId}`);
                        // Fetch description directly from Steam Store API (separate call)
                        const steamGameId = `steam-${scanned.appId}`;
                        const descriptionResult = await window.electronAPI.fetchGameDescription(steamGameId);
                        console.log(`[ImportWorkbench] Description result for ${scanned.title}:`, descriptionResult);
                        if (descriptionResult && descriptionResult.success) {
                          // Use description from direct Steam Store API call
                          description = (descriptionResult.description || descriptionResult.summary || '').trim();
                          releaseDate = (descriptionResult.releaseDate || '').trim();
                          genres = descriptionResult.genres || [];
                          developers = descriptionResult.developers || [];
                          publishers = descriptionResult.publishers || [];
                          ageRating = (descriptionResult.ageRating || '').trim();
                          rating = descriptionResult.rating || 0;
                          platform = descriptionResult.platforms?.join(', ') || metadata.platform || 'steam';
                          console.log(`[ImportWorkbench] Successfully fetched description for ${scanned.title}, length: ${description.length}`);
                        } else {
                          console.warn(`[ImportWorkbench] Description fetch failed for ${scanned.title}:`, descriptionResult?.error);
                          // Fallback to what we got from searchArtwork
                          description = (metadata.description || metadata.summary || '').trim();
                          releaseDate = (metadata.releaseDate || '').trim();
                          genres = metadata.genres || [];
                          developers = metadata.developers || [];
                          publishers = metadata.publishers || [];
                          ageRating = (metadata.ageRating || '').trim();
                          rating = metadata.rating || 0;
                          platform = metadata.platforms?.join(', ') || metadata.platform || 'steam';
                        }
                      } catch (descErr) {
                        console.error(`[ImportWorkbench] Error fetching description for ${scanned.title}:`, descErr);
                        // Use what we got from searchArtwork
                        description = (metadata.description || metadata.summary || '').trim();
                        releaseDate = (metadata.releaseDate || '').trim();
                        genres = metadata.genres || [];
                        developers = metadata.developers || [];
                        publishers = metadata.publishers || [];
                        ageRating = (metadata.ageRating || '').trim();
                        rating = metadata.rating || 0;
                        platform = metadata.platforms?.join(', ') || metadata.platform || 'steam';
                      }
                    } else {
                      console.log(`[ImportWorkbench] No valid Steam App ID for ${scanned.title}, using searchArtwork metadata`);
                      // No valid Steam App ID - use metadata from searchArtwork
                      description = (metadata.description || metadata.summary || '').trim();
                      releaseDate = (metadata.releaseDate || '').trim();
                      genres = metadata.genres || [];
                      developers = metadata.developers || [];
                      publishers = metadata.publishers || [];
                      ageRating = (metadata.ageRating || '').trim();
                      rating = metadata.rating || 0;
                      platform = metadata.platforms?.join(', ') || metadata.platform || 'steam';
                    }

                    // If description is still empty, try alternative sources
                    if (!description || description.trim().length === 0) {
                      console.log(`[ImportWorkbench] Description still empty for ${scanned.title}, trying alternative sources...`);
                      const altMetadata = await fetchTextMetadataFromAlternativeSource(scanned.title, matchedResult, scanned.appId);
                      if (altMetadata.description) {
                        description = altMetadata.description;
                        releaseDate = altMetadata.releaseDate || releaseDate;
                        genres = altMetadata.genres.length > 0 ? altMetadata.genres : genres;
                        developers = altMetadata.developers.length > 0 ? altMetadata.developers : developers;
                        publishers = altMetadata.publishers.length > 0 ? altMetadata.publishers : publishers;
                        ageRating = altMetadata.ageRating || ageRating;
                        rating = altMetadata.rating || rating;
                        platform = altMetadata.platform || platform;
                        console.log(`[ImportWorkbench] Successfully fetched text metadata from alternative source for ${scanned.title}`);
                      }
                    }

                    // Auto-categorize games with "Utilities" genre as "Apps"
                    if (genres.includes('Utilities') && !categories.includes('Apps')) {
                      categories = [...categories, 'Apps'];
                      console.log(`[ImportWorkbench] Auto-categorized "${scanned.title}" as "Apps" (genre: Utilities)`);
                    }

                    // Keep autoCategory if already set from folder config, otherwise don't preselect
                    if (categories.length === 0) {
                      categories = [];
                    }

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

                    // Only set to ready if all required metadata is present
                    const tempGame: Partial<StagedGame> = {
                      boxArtUrl,
                      bannerUrl,
                      logoUrl,
                      heroUrl,
                      description,
                    };
                    status = isGameReady(tempGame) ? 'ready' : 'ambiguous';
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

                  // Step 3: Fetch images and descriptions separately
                  // Step 3a: Fetch images from Steam Store
                  const artworkResult = await withTimeout(window.electronAPI.searchArtwork(matchedTitle, steamAppId), 30000).catch(err => {
                    console.warn(`[ImportWorkbench] searchArtwork timeout/error for "${matchedTitle}":`, err);
                    return null;
                  });

                  // Get artwork metadata (images)
                  if (artworkResult) {
                    metadata = artworkResult;

                    // Extract image fields from the metadata
                    boxArtUrl = metadata.boxArtUrl || '';
                    bannerUrl = metadata.bannerUrl || '';
                    logoUrl = metadata.logoUrl || '';
                    heroUrl = metadata.heroUrl || '';

                    // Step 3b: Explicitly fetch text metadata (descriptions) separately when we have a Steam App ID
                    if (steamAppId) {
                      try {
                        // Add a small delay to avoid rate limiting (Steam Store API has rate limits)
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                        // Fetch description directly from Steam Store API (separate call)
                        const steamGameId = `steam-${steamAppId}`;
                        const descriptionResult = await window.electronAPI.fetchGameDescription(steamGameId);
                        if (descriptionResult && descriptionResult.success) {
                          // Use description from direct Steam Store API call
                          description = (descriptionResult.description || descriptionResult.summary || '').trim();
                          releaseDate = (descriptionResult.releaseDate || '').trim();
                          genres = descriptionResult.genres || [];
                          developers = descriptionResult.developers || [];
                          publishers = descriptionResult.publishers || [];
                          ageRating = (descriptionResult.ageRating || '').trim();
                          rating = descriptionResult.rating || 0;
                          platform = descriptionResult.platforms?.join(', ') || metadata.platform || scanned.source;
                        } else {
                          // Fallback to what we got from searchArtwork
                          description = (metadata.description || metadata.summary || '').trim();
                          releaseDate = (metadata.releaseDate || '').trim();
                          genres = metadata.genres || [];
                          developers = metadata.developers || [];
                          publishers = metadata.publishers || [];
                          ageRating = (metadata.ageRating || '').trim();
                          rating = metadata.rating || 0;
                          platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                        }
                      } catch (descErr) {
                        console.warn(`[ImportWorkbench] Failed to fetch description for "${matchedTitle}":`, descErr);
                        // Use what we got from searchArtwork
                        description = (metadata.description || metadata.summary || '').trim();
                        releaseDate = (metadata.releaseDate || '').trim();
                        genres = metadata.genres || [];
                        developers = metadata.developers || [];
                        publishers = metadata.publishers || [];
                        ageRating = (metadata.ageRating || '').trim();
                        rating = metadata.rating || 0;
                        platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                      }
                    } else {
                      // No Steam App ID - use metadata from searchArtwork
                      description = (metadata.description || metadata.summary || '').trim();
                      releaseDate = (metadata.releaseDate || '').trim();
                      genres = metadata.genres || [];
                      developers = metadata.developers || [];
                      publishers = metadata.publishers || [];
                      ageRating = (metadata.ageRating || '').trim();
                      rating = metadata.rating || 0;
                      platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                    }

                    // If description is still empty, try alternative sources
                    if (!description || description.trim().length === 0) {
                      console.log(`[ImportWorkbench] Description still empty for "${matchedTitle}", trying alternative sources...`);
                      const altMetadata = await fetchTextMetadataFromAlternativeSource(matchedTitle, matchedResult, steamAppId);
                      if (altMetadata.description) {
                        description = altMetadata.description;
                        releaseDate = altMetadata.releaseDate || releaseDate;
                        genres = altMetadata.genres.length > 0 ? altMetadata.genres : genres;
                        developers = altMetadata.developers.length > 0 ? altMetadata.developers : developers;
                        publishers = altMetadata.publishers.length > 0 ? altMetadata.publishers : publishers;
                        ageRating = altMetadata.ageRating || ageRating;
                        rating = altMetadata.rating || rating;
                        platform = altMetadata.platform || platform;
                        console.log(`[ImportWorkbench] Successfully fetched text metadata from alternative source for "${matchedTitle}"`);
                      }
                    }

                    // Keep autoCategory if already set from folder config, otherwise don't preselect
                    if (categories.length === 0) {
                      categories = [];
                    }

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

                    // Only set to ready if all required metadata is present
                    const tempGame: Partial<StagedGame> = {
                      boxArtUrl,
                      bannerUrl,
                      logoUrl,
                      heroUrl,
                      description,
                    };
                    status = isGameReady(tempGame) ? 'ready' : 'ambiguous';
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
                  const artworkResult = await window.electronAPI.searchArtwork(effectiveSearchTitle);

                  if (artworkResult) {
                    metadata = artworkResult;
                    boxArtUrl = metadata.boxArtUrl || '';
                    bannerUrl = metadata.bannerUrl || '';
                    logoUrl = metadata.logoUrl || '';
                    heroUrl = metadata.heroUrl || '';
                    description = (metadata.description || metadata.summary || '').trim();
                    releaseDate = (metadata.releaseDate || '').trim();
                    genres = metadata.genres || [];
                    // Auto-categorize games with "Utilities" genre as "Apps"
                    if (genres.includes('Utilities') && !categories.includes('Apps')) {
                      categories = [...categories, 'Apps'];
                      console.log(`[ImportWorkbench] Auto-categorized "${scanned.title}" as "Apps" (genre: Utilities)`);
                    }

                    // Preserve autoCategory if already set from folder config
                    // Don't overwrite categories that were set earlier
                    if (categories.length === 0) {
                      categories = [];
                    }
                    ageRating = (metadata.ageRating || '').trim();
                    rating = metadata.rating || 0;
                    platform = metadata.platforms?.join(', ') || metadata.platform || scanned.source;
                    developers = metadata.developers || [];
                    publishers = metadata.publishers || [];

                    // If description is still empty, try to fetch from alternative sources
                    if (!description || description.trim().length === 0) {
                      console.log(`[ImportWorkbench] Description still empty for ${scanned.title}, trying alternative sources...`);
                      try {
                        const altMetadata = await fetchTextMetadataFromAlternativeSource(effectiveSearchTitle, null, steamAppId);
                        if (altMetadata.description) {
                          description = altMetadata.description;
                          releaseDate = altMetadata.releaseDate || releaseDate;
                          genres = altMetadata.genres.length > 0 ? altMetadata.genres : genres;
                          developers = altMetadata.developers.length > 0 ? altMetadata.developers : developers;
                          publishers = altMetadata.publishers.length > 0 ? altMetadata.publishers : publishers;
                          ageRating = altMetadata.ageRating || ageRating;
                          rating = altMetadata.rating || rating;
                          platform = altMetadata.platform || platform;
                          console.log(`[ImportWorkbench] Successfully fetched text metadata from alternative source for ${scanned.title}`);
                        }
                      } catch (altErr) {
                        console.warn(`[ImportWorkbench] Error fetching alternative metadata for ${scanned.title}:`, altErr);
                      }
                    }

                    // Only set to ready if all required metadata is present
                    const tempGame: Partial<StagedGame> = {
                      boxArtUrl: metadata.boxArtUrl || '',
                      bannerUrl: metadata.bannerUrl || '',
                      logoUrl: metadata.logoUrl || '',
                      heroUrl: metadata.heroUrl || '',
                      description,
                    };
                    status = isGameReady(tempGame) ? 'ready' : 'ambiguous';
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
                launchArgs: (scanned as any).launchArgs,
                // Always use found Steam App ID if available, otherwise use scanned appId
                appId: steamAppId || scanned.appId,
                packageFamilyName: scanned.packageFamilyName,
                appUserModelId: scanned.appUserModelId,
                launchUri: scanned.launchUri,
                xboxKind: scanned.xboxKind,
                title: isDemoMatch ? `${matchedTitle} [Demo]` : matchedTitle, // Add Demo indicator at the end
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
                launchArgs: (scanned as any).launchArgs,
                appId: scanned.appId,
                packageFamilyName: scanned.packageFamilyName,
                appUserModelId: scanned.appUserModelId,
                launchUri: scanned.launchUri,
                xboxKind: scanned.xboxKind,
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
          // Merge with existing queue to preserve manual edits
          setQueue(prevQueue => {
            const existingMap = new Map(prevQueue.map(g => [g.uuid, g]));
            const merged = stagedGames.map(newGame => {
              const existing = existingMap.get(newGame.uuid);
              if (existing) {
                // Preserve manual edits - only update fields that haven't been manually changed
                return {
                  ...newGame,
                  categories: existing.categories && existing.categories.length > 0
                    ? existing.categories
                    : newGame.categories,
                  title: existing.title !== newGame.originalName ? existing.title : newGame.title,
                  description: existing.description || newGame.description,
                  releaseDate: existing.releaseDate || newGame.releaseDate,
                  genres: existing.genres && existing.genres.length > 0 ? existing.genres : newGame.genres,
                  developers: existing.developers && existing.developers.length > 0 ? existing.developers : newGame.developers,
                  publishers: existing.publishers && existing.publishers.length > 0 ? existing.publishers : newGame.publishers,
                  boxArtUrl: existing.boxArtUrl || newGame.boxArtUrl,
                  bannerUrl: existing.bannerUrl || newGame.bannerUrl,
                  logoUrl: existing.logoUrl || newGame.logoUrl,
                  heroUrl: existing.heroUrl || newGame.heroUrl,
                  lockedFields: existing.lockedFields || newGame.lockedFields,
                };
              }
              return newGame;
            });
            return merged;
          });

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
              launchArgs: (scanned as any).launchArgs,
              appId: scanned.appId,
              packageFamilyName: scanned.packageFamilyName,
              appUserModelId: scanned.appUserModelId,
              launchUri: scanned.launchUri,
              xboxKind: scanned.xboxKind,
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
            // Merge with existing queue to preserve manual edits
            setQueue(prevQueue => {
              const existingMap = new Map(prevQueue.map(g => [g.uuid, g]));
              const merged = stagedGames.map(newGame => {
                const existing = existingMap.get(newGame.uuid);
                if (existing) {
                  return {
                    ...newGame,
                    categories: existing.categories && existing.categories.length > 0
                      ? existing.categories
                      : newGame.categories,
                    title: existing.title !== newGame.originalName ? existing.title : newGame.title,
                    description: existing.description || newGame.description,
                    releaseDate: existing.releaseDate || newGame.releaseDate,
                    genres: existing.genres && existing.genres.length > 0 ? existing.genres : newGame.genres,
                    developers: existing.developers && existing.developers.length > 0 ? existing.developers : newGame.developers,
                    publishers: existing.publishers && existing.publishers.length > 0 ? existing.publishers : newGame.publishers,
                    boxArtUrl: existing.boxArtUrl || newGame.boxArtUrl,
                    bannerUrl: existing.bannerUrl || newGame.bannerUrl,
                    logoUrl: existing.logoUrl || newGame.logoUrl,
                    heroUrl: existing.heroUrl || newGame.heroUrl,
                    lockedFields: existing.lockedFields || newGame.lockedFields,
                  };
                }
                return newGame;
              });
              return merged;
            });
            processedCount++;
          }
        }
      }

      // Final update to ensure all games are in queue, preserving manual edits
      setQueue(prevQueue => {
        const existingMap = new Map(prevQueue.map(g => [g.uuid, g]));
        const merged = stagedGames.map(newGame => {
          const existing = existingMap.get(newGame.uuid);
          if (existing) {
            return {
              ...newGame,
              categories: existing.categories && existing.categories.length > 0
                ? existing.categories
                : newGame.categories,
              title: existing.title !== newGame.originalName ? existing.title : newGame.title,
              description: existing.description || newGame.description,
              releaseDate: existing.releaseDate || newGame.releaseDate,
              genres: existing.genres && existing.genres.length > 0 ? existing.genres : newGame.genres,
              developers: existing.developers && existing.developers.length > 0 ? existing.developers : newGame.developers,
              publishers: existing.publishers && existing.publishers.length > 0 ? existing.publishers : newGame.publishers,
              boxArtUrl: existing.boxArtUrl || newGame.boxArtUrl,
              bannerUrl: existing.bannerUrl || newGame.bannerUrl,
              logoUrl: existing.logoUrl || newGame.logoUrl,
              heroUrl: existing.heroUrl || newGame.heroUrl,
              lockedFields: existing.lockedFields || newGame.lockedFields,
            };
          }
          return newGame;
        });
        return merged;
      });

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

  // Convert pre-scanned games to ScannedGameResult format and add to queue
  const convertPreScannedGames = useMemo(() => {
    try {
      if (!preScannedGames || !Array.isArray(preScannedGames) || preScannedGames.length === 0) {
        return [];
      }

      return preScannedGames
        .filter(game => game != null && typeof game === 'object')
        .map((game, index) => {
          // Check if it's already in ScannedGameResult format
          if ('uuid' in game && 'source' in game && 'title' in game) {
            return game as any; // Already in correct format
          }

          // Convert from SteamGame/XboxGame/OtherGame format
          const source: ImportSource = appType === 'steam' ? 'steam' : appType === 'xbox' ? 'xbox' : 'manual_folder';
          const uuid = (game?.appId || game?.id || `pre-scanned-${index}`) as string;
          const title = (game?.title || game?.name || 'Unknown Game') as string;
          const installPath = (game?.installPath || game?.installDir || game?.libraryPath || '') as string;
          const exePath = (game?.exePath || '') as string;
          const packageFamilyName = (game as any)?.packageFamilyName as string | undefined;
          const appUserModelId = (game as any)?.appUserModelId as string | undefined;
          const launchUri = (game as any)?.launchUri as string | undefined;
          const xboxKind = ((game as any)?.xboxKind || (game as any)?.type) as 'uwp' | 'pc' | undefined;

          return {
            uuid,
            source,
            originalName: title,
            installPath,
            exePath,
            appId: game?.appId,
            packageFamilyName,
            appUserModelId,
            launchUri,
            xboxKind,
            title,
            status: 'pending' as ImportStatus,
          };
        });
    } catch (err) {
      console.error('[ImportWorkbench] Error converting pre-scanned games:', err);
      return [];
    }
  }, [preScannedGames, appType]);

  // Track if we've already processed pre-scanned games to avoid re-processing
  const processedPreScannedGamesRef = useRef<string>('');

  // Load pre-scanned games when modal opens
  useEffect(() => {
    // Only process if modal is open and we have pre-scanned games
    if (!isOpen) {
      // Reset when modal closes
      if (processedPreScannedGamesRef.current) {
        processedPreScannedGamesRef.current = '';
      }
      return;
    }

    // Safety check - ensure we have valid data before processing
    if (!preScannedGames || !Array.isArray(preScannedGames) || preScannedGames.length === 0) {
      return;
    }

    if (!convertPreScannedGames || convertPreScannedGames.length === 0) {
      return;
    }

    // Create a key from the pre-scanned games to track if we've already processed them
    // Safely handle undefined/null games
    const gamesKey = JSON.stringify(
      preScannedGames
        .filter(g => g != null)
        .map(g => g?.appId || g?.id || g?.name || '')
    ).slice(0, 100);
    if (processedPreScannedGamesRef.current === gamesKey) {
      return; // Already processed these games
    }

    // Process pre-scanned games similar to scanAllSources
    const processPreScannedGames = async () => {
      setIsScanning(true);
      setError(null);
      setScanProgressMessage('Processing games...');

      try {
        // Pre-filter games that already exist in library
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

        const gamesToProcess = convertPreScannedGames.filter(scanned => {
          if (!scanned || !scanned.uuid) {
            return false; // Skip invalid games
          }

          const gameId = scanned.source === 'steam' && scanned.appId
            ? `steam-${scanned.appId}`
            : scanned.uuid;
          if (existingGameIds.has(gameId)) {
            return false;
          }

          if (scanned.exePath) {
            const normalizedExePath = scanned.exePath.toLowerCase().replace(/\\/g, '/');
            if (existingExePaths.has(normalizedExePath)) {
              return false;
            }
          }

          if (scanned.installPath) {
            const normalizedInstallPath = scanned.installPath.toLowerCase().replace(/\\/g, '/');
            if (existingInstallPaths.has(normalizedInstallPath)) {
              return false;
            }
          }

          return true;
        });

        if (gamesToProcess.length === 0) {
          setScanProgressMessage('No new games to import');
          setIsScanning(false);
          return;
        }

        // Process games and convert to StagedGame (similar to handleScanAllSources)
        const stagedGames: StagedGame[] = [];
        setScanProgressMessage(`Processing ${gamesToProcess.length} game${gamesToProcess.length !== 1 ? 's' : ''}...`);

        for (let i = 0; i < gamesToProcess.length; i++) {
          const scanned = gamesToProcess[i];
          if (!scanned || !scanned.uuid) {
            continue; // Skip invalid games
          }

          const gameId = scanned.source === 'steam' && scanned.appId
            ? `steam-${scanned.appId}`
            : scanned.uuid;

          if (existingGameIds.has(gameId)) {
            continue;
          }

          const isIgnored = ignoredGames.has(gameId);

          const stagedGame: StagedGame = {
            uuid: scanned.uuid,
            source: (scanned.source || 'manual_folder') as ImportSource,
            originalName: scanned.originalName || scanned.title || 'Unknown',
            installPath: scanned.installPath || '',
            exePath: scanned.exePath,
            launchArgs: (scanned as any).launchArgs,
            appId: scanned.appId,
            packageFamilyName: scanned.packageFamilyName,
            appUserModelId: scanned.appUserModelId,
            launchUri: scanned.launchUri,
            xboxKind: scanned.xboxKind,
            title: scanned.title || 'Unknown',
            boxArtUrl: '',
            bannerUrl: '',
            status: 'pending' as ImportStatus,
            isSelected: !isIgnored,
            isIgnored,
          };

          stagedGames.push(stagedGame);
        }

        setQueue(stagedGames);
        setScanProgressMessage('');
        setIsScanning(false);
        processedPreScannedGamesRef.current = gamesKey; // Mark as processed
      } catch (err) {
        console.error('[ImportWorkbench] Error processing pre-scanned games:', err);
        setError(err instanceof Error ? err.message : 'Failed to process games');
        setIsScanning(false);
      }
    };

    processPreScannedGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-trigger scanAll when opened with pre-scanned games (from notification)
  // This ensures all games are scanned, not just the pre-scanned ones
  useEffect(() => {
    if (!isOpen) {
      // Reset flag when modal closes
      hasAutoScannedRef.current = false;
      return;
    }

    if (preScannedGames && preScannedGames.length > 0 && !hasAutoScannedRef.current) {
      // Small delay to ensure component is fully mounted and pre-scanned games are processed
      const timer = setTimeout(() => {
        hasAutoScannedRef.current = true; // Mark as scanned to prevent re-triggering
        handleScanAll();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preScannedGames?.length]);

  // Scan folder when initialFolderPath is provided
  useEffect(() => {
    if (isOpen && initialFolderPath && !preScannedGames) {
      handleScanFolder(initialFolderPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFolderPath, preScannedGames]);

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

  // Helper function to check if a game has all required metadata
  const isGameReady = (game: StagedGame | Partial<StagedGame>): boolean => {
    const hasBoxArt = !!(game.boxArtUrl && game.boxArtUrl.trim());
    const hasBanner = !!(game.bannerUrl && game.bannerUrl.trim());
    const hasLogo = !!(game.logoUrl && game.logoUrl.trim());
    const hasHero = !!(game.heroUrl && game.heroUrl.trim());
    const hasDescription = !!(game.description && game.description.trim());

    return hasBoxArt && hasBanner && hasLogo && hasHero && hasDescription;
  };

  // Update game in queue
  const updateGame = (uuid: string, updates: Partial<StagedGame>) => {
    setQueue(prev =>
      prev.map(game => {
        if (game.uuid === uuid) {
          const updatedGame = { ...game, ...updates };
          // Re-validate ready status when metadata fields are updated
          // Check if any metadata fields were updated
          const metadataFieldsUpdated =
            'boxArtUrl' in updates ||
            'bannerUrl' in updates ||
            'logoUrl' in updates ||
            'heroUrl' in updates ||
            'description' in updates;

          // If metadata was updated or status is being explicitly set, re-validate
          if (metadataFieldsUpdated || updates.status === 'ready' || updatedGame.status === 'ready') {
            // Only set to ready if it has all required metadata, otherwise set to ambiguous
            updatedGame.status = isGameReady(updatedGame) ? 'ready' : 'ambiguous';
          }
          return updatedGame;
        }
        return game;
      })
    );
  };

  // Add category to selected game
  const addCategory = (category: string) => {
    if (!selectedGame || !category.trim()) return;
    const current = selectedGame.categories || [];
    if (!current.includes(category.trim())) {
      updateGame(selectedGame.uuid, {
        categories: [...current, category.trim()],
      });
    }
    setCategoryInput('');
  };

  // Remove category from selected game
  const removeCategory = (category: string) => {
    if (!selectedGame) return;
    const current = selectedGame.categories || [];
    updateGame(selectedGame.uuid, {
      categories: current.filter(item => item !== category),
    });
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

  // Search for better metadata match (same as GameManager)
  const handleSearchMetadata = async (searchQuery?: string) => {
    if (!selectedGame) return;

    // Get Steam App ID from game
    const getSteamAppId = (): string | undefined => {
      if (selectedGame.appId && /^\d+$/.test(selectedGame.appId.toString())) {
        return selectedGame.appId.toString();
      }
      return undefined;
    };

    const steamAppId = getSteamAppId();
    let query = (searchQuery || (typeof metadataSearchQuery === 'string' ? metadataSearchQuery.trim() : '') || (selectedGame.title ? selectedGame.title.trim() : '')).trim();

    if (!query) {
      setError('Please enter a game title or Steam App ID to search');
      return;
    }

    // Check if query is a Steam App ID (numeric only)
    const isSteamAppId = /^\d+$/.test(query);

    if (isSteamAppId) {
      // Direct Steam App ID search - use fixMatch to get metadata directly
      setIsSearchingMetadata(true);
      setError(null);
      setMetadataSearchResults([]);

      try {
        const fixMatchResult = await window.electronAPI.fixMatch(query, {
          uuid: selectedGame.uuid,
          source: selectedGame.source,
          originalName: selectedGame.originalName,
          installPath: selectedGame.installPath,
          exePath: selectedGame.exePath,
          appId: selectedGame.appId,
          title: selectedGame.title,
          status: selectedGame.status,
        });

        if (fixMatchResult.success && fixMatchResult.matchedGame) {
          // Show the matched game as a result
          setMetadataSearchResults([fixMatchResult.matchedGame]);
        } else {
          setError(fixMatchResult.error || 'No game found with that Steam App ID');
        }
      } catch (err) {
        setError('Failed to search by Steam App ID');
        console.error('Error searching by Steam App ID:', err);
      } finally {
        setIsSearchingMetadata(false);
      }
      return;
    }

    // Create a simplified query for better results (remove special chars, common suffixes)
    // This helps find more games when searching for series like "Call of Duty"
    const createSearchVariations = (originalQuery: string): string[] => {
      const variations: string[] = [originalQuery];

      // Remove special characters (®, :, etc.)
      const noSpecialChars = originalQuery.replace(/[^\w\s]/g, '').trim();
      if (noSpecialChars && noSpecialChars !== originalQuery) {
        variations.push(noSpecialChars);
      }

      // Remove common suffixes/prefixes that might limit results
      const noSuffixes = originalQuery
        .replace(/\s*(?:edition|pack|dlc|remastered|remaster|definitive|ultimate|gold|platinum|deluxe|collector|special|limited|anniversary|game of the year|goty)\s*/gi, '')
        .trim();
      if (noSuffixes && noSuffixes !== originalQuery && noSuffixes.length >= 3) {
        variations.push(noSuffixes);
      }

      // Remove everything after colon (for "Call of Duty: Black Ops 7" -> "Call of Duty")
      const beforeColon = originalQuery.split(':')[0].trim();
      if (beforeColon && beforeColon !== originalQuery && beforeColon.length >= 3) {
        variations.push(beforeColon);
      }

      // Remove everything after dash
      const beforeDash = originalQuery.split(' - ')[0].trim();
      if (beforeDash && beforeDash !== originalQuery && beforeDash.length >= 3) {
        variations.push(beforeDash);
      }

      return [...new Set(variations)]; // Remove duplicates
    };

    const searchVariations = createSearchVariations(query);

    setIsSearchingMetadata(true);
    setError(null);
    setMetadataSearchResults([]);

    try {
      // Try multiple search variations to get more results
      // Prioritize simplified queries first to avoid early exact-match returns
      const allResults: any[] = [];
      const searchedQueries = new Set<string>();

      // Reorder variations: put simplified queries first (without special chars, before colon, etc.)
      // This helps get more results instead of early exact-match returns
      const prioritizedVariations = [...searchVariations].sort((a, b) => {
        // Prefer queries without special characters
        const aHasSpecial = /[^\w\s]/.test(a);
        const bHasSpecial = /[^\w\s]/.test(b);
        if (aHasSpecial && !bHasSpecial) return 1;
        if (!aHasSpecial && bHasSpecial) return -1;
        // Prefer shorter queries (base names)
        return a.length - b.length;
      });

      // Search with each variation (prioritized order)
      for (const searchVar of prioritizedVariations.slice(0, 3)) { // Limit to first 3 variations to avoid too many API calls
        if (searchedQueries.has(searchVar.toLowerCase())) continue;
        searchedQueries.add(searchVar.toLowerCase());

        try {
          const response = await window.electronAPI.searchGames(searchVar);
          if (response.success && response.results && response.results.length > 0) {
            // Add results that we haven't seen yet (by Steam App ID or external ID)
            for (const result of response.results) {
              const resultId = result.steamAppId || result.externalId || result.id;
              if (!allResults.find(r => (r.steamAppId || r.externalId || r.id) === resultId)) {
                allResults.push(result);
              }
            }
            // If we got multiple results, we can stop searching (we have enough)
            // But continue if we only got 1 result (might be an early exact match)
            if (response.results.length > 1) {
              console.log(`[Fix Match] Found ${response.results.length} results with "${searchVar}", continuing to get more...`);
            }
          } else if (response.success && (!response.results || response.results.length === 0)) {
            console.log(`[Fix Match] No results for variation "${searchVar}"`);
          }
        } catch (err) {
          console.warn(`[Fix Match] Error searching with variation "${searchVar}":`, err);
        }
      }

      console.log(`[Fix Match] Total unique results found: ${allResults.length} from ${searchedQueries.size} search variations`);

      if (allResults.length > 0) {
        const response = { success: true, results: allResults };
        // Get the current game's Steam App ID if available
        const currentSteamAppId = steamAppId;

        // Separate Steam results and other results
        const steamResults = response.results.filter((result: any) => result.source === 'steam');
        const otherResults = response.results.filter((result: any) => result.source !== 'steam');

        // Helper function to normalize strings for fuzzy matching (remove special chars, normalize whitespace)
        const normalizeForFuzzy = (str: string): string => {
          return str.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters like ®, :, etc.
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        };

        // Helper function to calculate fuzzy match score (0-1, higher is better)
        const calculateFuzzyScore = (query: string, resultTitle: string): number => {
          const normalizedQuery = normalizeForFuzzy(query);
          const normalizedResult = normalizeForFuzzy(resultTitle);

          // Exact match after normalization
          if (normalizedQuery === normalizedResult) {
            return 1.0;
          }

          // Query is contained in result (e.g., "call of duty" in "call of duty black ops 7")
          if (normalizedResult.includes(normalizedQuery) && normalizedQuery.length >= 5) {
            // Bonus if it starts with the query
            if (normalizedResult.startsWith(normalizedQuery)) {
              return 0.9;
            }
            return 0.8;
          }

          // Result is contained in query (less common but still relevant)
          if (normalizedQuery.includes(normalizedResult) && normalizedResult.length >= 5) {
            return 0.7;
          }

          // Word-based similarity
          const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
          const resultWords = normalizedResult.split(' ').filter(w => w.length > 2);

          if (queryWords.length === 0 || resultWords.length === 0) {
            return 0;
          }

          // Calculate word match ratio
          const matchingWords = queryWords.filter(word => resultWords.includes(word));
          const matchRatio = matchingWords.length / Math.max(queryWords.length, resultWords.length);

          // If most words match, it's a good match
          if (matchRatio >= 0.7) {
            return 0.6 + (matchRatio - 0.7) * 0.3; // Scale 0.7-1.0 match ratio to 0.6-0.9 score
          }

          // Partial word matches
          const partialMatches = queryWords.filter(qWord =>
            resultWords.some(rWord => rWord.includes(qWord) || qWord.includes(rWord))
          );
          if (partialMatches.length > 0) {
            return 0.3 + (partialMatches.length / queryWords.length) * 0.3;
          }

          return 0;
        };

        // Helper function to get release date for sorting
        const getDate = (result: any): number => {
          if (result.releaseDate) {
            if (typeof result.releaseDate === 'number') {
              return result.releaseDate * 1000;
            }
            return new Date(result.releaseDate).getTime();
          }
          if (result.year) {
            return new Date(result.year, 0, 1).getTime();
          }
          return 0;
        };

        // Add fuzzy scores to all results (use original query for scoring, not searchQuery)
        const resultsWithScores = [...steamResults, ...otherResults].map(result => ({
          ...result,
          fuzzyScore: calculateFuzzyScore(query, result.title || result.name || ''),
        }));

        // Lower threshold to show more results - filter out only very poor matches (below 0.1)
        // If we have few results, be even more lenient
        const totalResultsCount = resultsWithScores.length;
        const minScore = totalResultsCount < 5 ? 0.1 : 0.2;
        const relevantResults = resultsWithScores.filter(r => r.fuzzyScore >= minScore);

        // If filtering removed all results, show all results regardless of score
        const resultsToSort = relevantResults.length > 0 ? relevantResults : resultsWithScores;

        // Sort results: matching Steam App ID first, then Steam results, then by fuzzy score (best matches first), then by release date (newest first)
        const sortedResults = resultsToSort.sort((a: any, b: any) => {
          // First priority: matching Steam App ID
          const aMatchesAppId = currentSteamAppId && a.steamAppId === currentSteamAppId;
          const bMatchesAppId = currentSteamAppId && b.steamAppId === currentSteamAppId;
          if (aMatchesAppId && !bMatchesAppId) return -1;
          if (!aMatchesAppId && bMatchesAppId) return 1;

          // Second priority: Steam results before others (prioritize Steam over external sources)
          const aIsSteam = a.source === 'steam';
          const bIsSteam = b.source === 'steam';
          if (aIsSteam && !bIsSteam) return -1;
          if (!aIsSteam && bIsSteam) return 1;

          // Third priority: fuzzy match score (higher is better)
          if (Math.abs(a.fuzzyScore - b.fuzzyScore) > 0.05) { // Only if difference is significant
            return b.fuzzyScore - a.fuzzyScore;
          }

          // Fourth priority: release date (newest first)
          const aDate = getDate(a);
          const bDate = getDate(b);
          if (aDate !== bDate && aDate > 0 && bDate > 0) {
            return bDate - aDate;
          }

          return 0;
        });

        const finalSortedResults = sortedResults;

        if (finalSortedResults.length === 0) {
          setError('No matching results found. Try searching with a different game title or check your API configuration.');
          setMetadataSearchResults([]);
          return;
        }

        setMetadataSearchResults(finalSortedResults);
      } else {
        // No results found from any search variation
        setError('No matching results found. Try searching with a different game title.');
        setMetadataSearchResults([]);
      }
    } catch (err) {
      setError('Failed to search for games');
      console.error('Error searching games:', err);
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  // Apply selected metadata result (Fix Match) - using new enhanced fixMatch method
  const handleApplyMetadata = async (result: { id: string; source: string; steamAppId?: string; title?: string }) => {
    if (!selectedGame) return;

    setIsSearchingMetadata(true);
    setError(null);

    try {
      const gameTitle = result.title || selectedGame.title;
      const query = result.steamAppId || gameTitle;

      // Use the new fixMatch IPC method which handles everything
      const fixMatchResult = await window.electronAPI.fixMatch(query, {
        uuid: selectedGame.uuid,
        source: selectedGame.source,
        originalName: selectedGame.originalName,
        installPath: selectedGame.installPath,
        exePath: selectedGame.exePath,
        appId: selectedGame.appId,
        title: selectedGame.title,
        status: selectedGame.status,
      });

      if (!fixMatchResult.success) {
        setError(fixMatchResult.error || 'Failed to update metadata');
        setIsSearchingMetadata(false);
        return;
      }

      const { matchedGame, metadata } = fixMatchResult;

      // When user selects a result from Fix Match, update title to the matched game's title
      // This is the expected behavior when explicitly selecting a match
      const newTitle = matchedGame.title || result.title || gameTitle;

      // Update the staged game with the new metadata
      updateGame(selectedGame.uuid, {
        title: newTitle,
        description: metadata.description || '',
        genres: metadata.genres || [],
        releaseDate: metadata.releaseDate || '',
        developers: metadata.developers || [],
        publishers: metadata.publishers || [],
        ageRating: metadata.ageRating || '',
        rating: metadata.rating || 0,
        platform: metadata.platforms?.join(', ') || selectedGame.platform || '',
        // Refresh all images
        boxArtUrl: metadata.boxArtUrl || '',
        bannerUrl: metadata.bannerUrl || '',
        logoUrl: metadata.logoUrl || '',
        heroUrl: metadata.heroUrl || '',
        screenshots: metadata.screenshots || [],
        appId: matchedGame.steamAppId || selectedGame.appId,
        // Preserve categories and other user edits
        categories: selectedGame.categories || [],
      });

      // Close the inline search and return to game view
      setShowMetadataSearch(false);
      setMetadataSearchResults([]);
      setMetadataSearchQuery('');
      setIsSearchingMetadata(false);
    } catch (err) {
      setError('Failed to update metadata');
      console.error('Error updating metadata:', err);
      setIsSearchingMetadata(false);
    }
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
      const steamAppId = selectedGame.appId?.toString();

      // Primary: IGDB-backed searchArtwork (IGDB-first, RAWG fallback)
      const primaryArtwork = await window.electronAPI.searchArtwork(query, steamAppId);
      const primaryResults: any[] = [];

      if (primaryArtwork) {
        if (showImageSearch.type === 'boxart' && primaryArtwork.boxArtUrl) {
          primaryResults.push({
            id: query,
            name: query,
            title: query,
            boxArtUrl: primaryArtwork.boxArtUrl,
            coverUrl: primaryArtwork.boxArtUrl,
            bannerUrl: primaryArtwork.bannerUrl || primaryArtwork.heroUrl,
            logoUrl: primaryArtwork.logoUrl,
            heroUrl: primaryArtwork.heroUrl,
            source: 'igdb',
          });
        }
        if (showImageSearch.type === 'banner' && (primaryArtwork.bannerUrl || primaryArtwork.heroUrl)) {
          const url = primaryArtwork.bannerUrl || primaryArtwork.heroUrl;
          primaryResults.push({
            id: query,
            name: query,
            title: query,
            bannerUrl: url,
            heroUrl: url,
            screenshotUrls: primaryArtwork.screenshots,
            source: 'igdb',
          });
        }
        if (showImageSearch.type === 'logo' && primaryArtwork.logoUrl) {
          primaryResults.push({
            id: query,
            name: query,
            title: query,
            logoUrl: primaryArtwork.logoUrl,
            source: 'igdb',
          });
        }
      }

      if (primaryResults.length > 0) {
        setImageSearchResults(primaryResults);
        return;
      }

      // Fallback: broader search then per-result artwork fetch (still IGDB-first via searchArtwork)
      const gamesResponse = await window.electronAPI.searchGames(query);

      if (gamesResponse.success && gamesResponse.results && gamesResponse.results.length > 0) {
        const artworkPromises = gamesResponse.results.slice(0, 10).map(async (gameResult) => {
          try {
            const appId = gameResult.steamAppId?.toString();
            const artwork = await window.electronAPI.searchArtwork(gameResult.title, appId);

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
              source: 'igdb',
            };
          } catch (err) {
            return null;
          }
        });

        const results = await Promise.all(artworkPromises);
        const validResults = results.filter(r => r !== null);

        if (validResults.length > 0) {
          setImageSearchResults(validResults as any[]);
        } else {
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
        // CRITICAL FIX: Game ID and launcher source must be based on SOURCE, not Steam App ID
        // Steam App ID is used ONLY for metadata fetching, NOT for determining the launcher
        // A Ubisoft game with a Steam App ID should remain a Ubisoft game
        // However, keep the display-friendly platform info from metadata (e.g., "Windows, PC")

        let gameId: string;
        let launcherSource: string;
        let displayPlatform: string;
        const xboxKind = staged.xboxKind;
        const appUserModelId = staged.appUserModelId;
        const launchUri = staged.launchUri || (appUserModelId ? `shell:AppsFolder\\${appUserModelId}` : undefined);
        const exePathForSave = xboxKind === 'uwp'
          ? 'explorer.exe'
          : staged.exePath || staged.installPath;
        const actions = xboxKind === 'uwp' && launchUri
          ? [{ name: 'Launch', path: 'explorer.exe', arguments: launchUri }]
          : undefined;

        if (staged.source === 'steam' && staged.appId) {
          // Only true Steam games get steam-{appId} format
          gameId = `steam-${staged.appId}`;
          launcherSource = 'steam';
          displayPlatform = staged.platform || 'steam';
        } else if (staged.source === 'xbox' && staged.uuid.startsWith('xbox-')) {
          // Xbox games keep their Xbox ID format
          gameId = staged.uuid;
          launcherSource = 'xbox';
          displayPlatform = staged.platform || 'xbox';
        } else {
          // All other sources (epic, gog, ubisoft, rockstar, ea, etc.) get custom IDs
          // Source determines the launcher, but platform can be descriptive (e.g., "Windows, PC")
          gameId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          launcherSource = staged.source;
          // Keep metadata platform for display if available, otherwise use source
          displayPlatform = staged.platform || staged.source;
        }

        return {
          id: gameId,
          title: staged.title,
          platform: displayPlatform,
          source: launcherSource, // CRITICAL: This determines which launcher to use
          exePath: exePathForSave,
          launchArgs: staged.launchArgs,
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
          xboxKind,
          packageFamilyName: staged.packageFamilyName,
          appUserModelId,
          launchUri,
          actions,
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
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${showIgnored
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
                      className={`px-4 py-2 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${selectedId === game.uuid ? 'bg-gray-800/50' : ''
                        }`}
                    >
                      <div className="flex items-center gap-2">
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
                <div className="p-4 space-y-3 border-b border-gray-700">
                  <h3 className="text-base font-semibold text-white">Images</h3>

                  {/* All Images in One Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Box Art */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-300">
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
                            className={`text-xs px-2 py-1 rounded ${selectedGame.lockedFields?.boxArtUrl
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
                          <div className="w-full h-32 bg-gray-800 rounded border-2 border-blue-500 hover:border-blue-400 transition-colors flex items-center justify-center p-1">
                            <img
                              src={selectedGame.boxArtUrl}
                              alt="Box Art"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-gray-700 rounded flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
                            <span>Click to search</span>
                            <span className="text-[10px] mt-1">Box Art</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hero/Banner */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-300">
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
                            className={`text-xs px-2 py-1 rounded ${selectedGame.lockedFields?.bannerUrl
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
                            className="w-full h-32 object-cover rounded border-2 border-blue-500 hover:border-blue-400 transition-colors"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-700 rounded flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
                            <span>Click to search</span>
                            <span className="text-[10px] mt-1">Hero/Banner</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-300">
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
                            className={`text-xs px-2 py-1 rounded ${selectedGame.lockedFields?.logoUrl
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
                          <div className="w-full h-16 bg-gray-800 rounded border-2 border-blue-500 hover:border-blue-400 transition-colors flex items-center justify-center p-1">
                            <img
                              src={selectedGame.logoUrl}
                              alt="Logo"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-16 bg-gray-700 rounded flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors">
                            <span>Click to search</span>
                            <span className="text-[10px] mt-1">Logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Categories Section */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Categories
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCategory(categoryInput);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add category"
                      />
                      <button
                        type="button"
                        onClick={() => addCategory(categoryInput)}
                        disabled={!categoryInput.trim()}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        +
                      </button>
                    </div>

                    {/* Existing Categories for Quick Selection */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Quick select existing categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_CATEGORIES
                          .filter(cat => !selectedGame.categories?.includes(cat))
                          .map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => addCategory(category)}
                              className="px-2 py-1 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded text-xs text-gray-300 transition-colors"
                            >
                              + {category}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Selected Categories */}
                    {selectedGame.categories && selectedGame.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedGame.categories.map((category, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-xs text-blue-300"
                          >
                            {category}
                            <button
                              type="button"
                              onClick={() => removeCategory(category)}
                              className="text-blue-300 hover:text-blue-100"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Form */}
                <div className="p-3 space-y-2">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Title
                      </label>
                      <div className="relative flex items-center">
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={selectedGame.title}
                          onChange={(e) => updateGame(selectedGame.uuid, { title: e.target.value })}
                          disabled={selectedGame.lockedFields?.title}
                          className="w-full px-2 py-1.5 pr-20 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="absolute right-1 flex items-center gap-1">
                          <button
                            onClick={async () => {
                              if (selectedGame) {
                                // Use current input value if available, otherwise fall back to selectedGame.title
                                // Read directly from the input element to get the most up-to-date value
                                const currentTitle = titleInputRef.current?.value?.trim() || selectedGame.title?.trim() || '';

                                if (!currentTitle) {
                                  setError('Please enter a game title first');
                                  return;
                                }

                                // Update the game title in state if it's different (in case state is stale)
                                if (currentTitle !== selectedGame.title) {
                                  updateGame(selectedGame.uuid, { title: currentTitle });
                                }

                                setMetadataSearchQuery(currentTitle);
                                setShowMetadataSearch(true);
                                // Trigger search immediately with the current title
                                await handleSearchMetadata(currentTitle);
                              }
                            }}
                            className="text-xs px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded"
                            title="Search for better metadata match"
                          >
                            Fix Match
                          </button>
                          <button
                            onClick={() => toggleFieldLock(selectedGame.uuid, 'title')}
                            className={`text-xs px-1.5 py-0.5 rounded ${selectedGame.lockedFields?.title
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

                    {/* Inline Fix Match Section - appears directly below Title field */}
                    {showMetadataSearch && selectedGame && (
                      <div className="p-4 border-t border-gray-700 bg-gray-800/50 mt-2">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-semibold text-white">
                            Fix Match - Search for Correct Game
                          </h3>
                          <button
                            onClick={() => {
                              setShowMetadataSearch(false);
                              setMetadataSearchResults([]);
                              setMetadataSearchQuery('');
                            }}
                            className="text-gray-400 hover:text-white text-lg font-bold"
                          >
                            ×
                          </button>
                        </div>
                        <div className="mb-4">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={metadataSearchQuery}
                              onChange={(e) => setMetadataSearchQuery(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSearchMetadata()}
                              placeholder="Enter game name or Steam App ID (e.g., 782330)"
                              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleSearchMetadata()}
                              disabled={isSearchingMetadata}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                              {isSearchingMetadata ? 'Searching...' : 'Search'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            You can search by game name or enter a Steam App ID directly (numbers only)
                          </p>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {isSearchingMetadata && metadataSearchResults.length === 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Searching for metadata matches...
                            </div>
                          )}
                          {metadataSearchResults.length > 0 ? (
                            <div className="space-y-2">
                              {metadataSearchResults.map((result, idx) => {
                                // Extract release date properly
                                let displayDate: string | undefined;
                                if (result.releaseDate) {
                                  if (typeof result.releaseDate === 'number') {
                                    const date = new Date(result.releaseDate * 1000);
                                    displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                  } else if (typeof result.releaseDate === 'string') {
                                    const date = new Date(result.releaseDate);
                                    if (!isNaN(date.getTime())) {
                                      displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                    } else {
                                      displayDate = result.releaseDate;
                                    }
                                  }
                                } else if (result.year) {
                                  displayDate = result.year.toString();
                                }

                                return (
                                  <button
                                    key={result.id || result.externalId || idx}
                                    onClick={async () => {
                                      await handleApplyMetadata({
                                        id: String(result.id || result.externalId || ''),
                                        source: result.source,
                                        steamAppId: result.steamAppId,
                                        title: result.title || result.name
                                      });
                                    }}
                                    disabled={isSearchingMetadata}
                                    className="relative w-full text-left p-3 text-sm bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 cursor-pointer"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-medium text-sm truncate" title={result.title || result.name}>
                                        {result.title || result.name}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs ${result.source === 'steam' ? 'text-blue-400' : 'text-gray-400'}`}>
                                          {result.source === 'steam' ? 'Steam' : result.source === 'igdb' ? 'IGDB' : result.source}
                                        </span>
                                        {result.steamAppId && (
                                          <span className="text-xs text-gray-500">App ID: {result.steamAppId}</span>
                                        )}
                                        {displayDate && (
                                          <span className="text-xs text-gray-400">• {displayDate}</span>
                                        )}
                                      </div>
                                    </div>
                                    {isSearchingMetadata && (
                                      <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : !isSearchingMetadata && (
                            <div className="text-center text-gray-400 py-8">
                              No results. Try searching for a game title or Steam App ID.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                        className={`absolute right-1 text-xs px-1.5 py-0.5 rounded ${selectedGame.lockedFields?.exePath
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-400">
                        Description
                      </label>
                      {selectedGame.appId && (
                        <span className="text-xs text-gray-500">
                          App ID: {selectedGame.appId}
                        </span>
                      )}
                    </div>
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
                        className={`absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded ${selectedGame.lockedFields?.description
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
                  <div className="grid grid-cols-4 gap-2">
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
                                imageUrl = (result as any).boxArtUrl || (result as any).coverUrl;
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
                                    className={`w-full ${showImageSearch.type === 'logo'
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
