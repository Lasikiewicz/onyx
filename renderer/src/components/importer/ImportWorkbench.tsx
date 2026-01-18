import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StagedGame } from '../../types/importer';
import { Game } from '../../types/game';
import { areAPIsConfigured } from '../../utils/apiValidation';
import { determineAutoCategories, stripDemoIndicator, findBestMatch } from '../../utils/importMatching';

// Components
import { ImportHeader } from './ImportHeader';
import { ImportSidebar } from './ImportSidebar';
import { ImportGameForm } from './ImportGameForm';
import { ImageSearchModal } from './ImageSearchModal';

interface ImportWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (games: Game[]) => Promise<void>;
  existingLibrary?: Game[];
  initialFolderPath?: string;
  autoStartScan?: boolean;
  preScannedGames?: any[];
  appType?: 'steam' | 'xbox' | 'other';
}

export const ImportWorkbench: React.FC<ImportWorkbenchProps> = ({
  isOpen,
  onClose,
  onImport,
  existingLibrary = [],
  autoStartScan = false,
}) => {
  // --- State ---
  const [queue, setQueue] = useState<StagedGame[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignoredGames, setIgnoredGames] = useState<Set<string>>(new Set());
  const [showIgnored, setShowIgnored] = useState(false);

  // Image Search Modal State
  const [activeImageSearch, setActiveImageSearch] = useState<{ type: 'boxart' | 'banner' | 'logo' | 'icon'; gameId: string } | null>(null);

  // Folder Configs Cache
  const [folderConfigs, setFolderConfigs] = useState<Record<string, any>>({});

  // --- Derived State ---
  const selectedGame = useMemo(() => queue.find(g => g.uuid === selectedId) || null, [queue, selectedId]);

  // --- Effects ---

  // Load preferences (ignored games, folder configs)
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getPreferences().then(prefs => {
        setIgnoredGames(new Set(prefs.ignoredGames || []));
      });

      if (window.electronAPI.getManualFolderConfigs) {
        window.electronAPI.getManualFolderConfigs().then(configs => {
          setFolderConfigs(configs || {});
        });
      }
    }
  }, [isOpen]);

  // Auto-scan logic
  useEffect(() => {
    if (isOpen && autoStartScan && !isScanning && queue.length === 0) {
      // Check if we should auto-click scan results
      // For now, let's just trigger a scan All if requested
      const timer = setTimeout(() => handleScanAll(), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoStartScan]);

  // --- Actions ---

  const updateGame = useCallback((id: string, updates: Partial<StagedGame>) => {
    setQueue(prev => prev.map(g => g.uuid === id ? { ...g, ...updates } : g));
  }, []);

  const handleIgnoreGame = useCallback(async (game: StagedGame) => {
    const gameId = game.source === 'steam' && game.appId ? `steam-${game.appId}` : game.uuid;
    const newIgnored = new Set(ignoredGames);
    newIgnored.add(gameId);
    setIgnoredGames(newIgnored);

    // Persist
    updateGame(game.uuid, { isIgnored: true });

    const prefs = await window.electronAPI.getPreferences();
    await window.electronAPI.savePreferences({ ...prefs, ignoredGames: Array.from(newIgnored) });
  }, [ignoredGames, updateGame]);

  const handleUnignoreGame = useCallback(async (game: StagedGame) => {
    const gameId = game.source === 'steam' && game.appId ? `steam-${game.appId}` : game.uuid;
    const newIgnored = new Set(ignoredGames);
    newIgnored.delete(gameId);
    setIgnoredGames(newIgnored);

    // Persist
    updateGame(game.uuid, { isIgnored: false });

    const prefs = await window.electronAPI.getPreferences();
    await window.electronAPI.savePreferences({ ...prefs, ignoredGames: Array.from(newIgnored) });
  }, [ignoredGames, updateGame]);


  // --- Scanning Logic (Refactored for batching) ---

  const handleScanFolder = async () => {
    // TODO: Implement file dialog picker if no path provided
    // For this refactor, assuming we likely trigger the dialog from the main process or we just hardcode/mock it
    // Usually this would call window.electronAPI.selectFolder() -> then scan
    // Let's assume scanAll is the main entry point for now or we prompt user
    console.log("Scan folder clicked - implementation pending dialog integration");
  };

  const processScannedGames = async (rawGames: any[]) => {
    // 1. Filter existing
    const existingIds = new Set(existingLibrary.map(g => g.id));
    const gamesToProcess = rawGames.filter(g => !existingIds.has(g.source === 'steam' ? `steam-${g.appId}` : g.uuid));

    if (gamesToProcess.length === 0) return [];

    const results: StagedGame[] = [];

    // 2. Process in chunks to avoid blocking too hard, but purely JS side for now
    for (const scanned of gamesToProcess) {
      // Identify
      let steamAppId = scanned.appId;
      const { stripped: searchTitle, isDemo } = stripDemoIndicator(scanned.title);

      let matchedResult = null;

      // Try search if it's a demo or has no ID
      if (isDemo || !steamAppId) {
        const searchRes = await window.electronAPI.searchGames(searchTitle);
        if (searchRes.success && searchRes.results) {
          const best = findBestMatch(searchTitle, searchRes.results, scanned.appId);
          if (best) {
            matchedResult = best;
            steamAppId = best.steamAppId;
          }
        }
      }

      // Determine Categories
      const categories = determineAutoCategories(scanned, folderConfigs);

      // Construct Staged Game
      const staged: StagedGame = {
        uuid: scanned.uuid || crypto.randomUUID(),
        title: matchedResult ? matchedResult.title : scanned.title,
        source: scanned.source,
        appId: steamAppId,
        originalName: scanned.title,
        installPath: scanned.installPath,
        exePath: scanned.exePath,
        status: matchedResult ? 'matched' : (steamAppId ? 'ready' : 'ambiguous'),
        categories,
        isIgnored: false, // will check against set later
        // Defaults...
        description: matchedResult?.description || '',
        developers: matchedResult?.developers || [],
        publishers: matchedResult?.publishers || [],
        boxArtUrl: matchedResult?.coverUrl || '',
        bannerUrl: matchedResult?.bannerUrl || '',
        logoUrl: matchedResult?.logoUrl || '',
        isSelected: false,
      };

      // Check ignore status
      const gameId = (staged.source === 'steam' && staged.appId) ? `steam-${staged.appId}` : staged.uuid;
      if (ignoredGames.has(gameId)) staged.isIgnored = true;

      results.push(staged);
    }

    return results;
  };

  const handleScanAll = async () => {
    setIsScanning(true);
    setQueue([]); // Clear old queue 
    setError(null);

    try {
      // 1. Trigger config validation
      if (!await areAPIsConfigured()) {
        setError("APIs not configured.");
        setIsScanning(false);
        return;
      }

      // 2. Fetch all games from backend sources
      // Assuming scanAll returns a flat list of everything found
      // NOTE: In the original code, this logic was split across multiple internal calls. 
      // We assume electronAPI.scanFolder can be used or a specific scanAll method exists.
      // 2. Fetch all games from configured folders
      // const folderRes = await window.electronAPI.scanFolder("ALL_CONFIGURED"); // Conceptual - replacing with iteration below

      let allFound: any[] = [];
      const folders = Object.values(folderConfigs).filter(f => f.enabled);

      for (const folder of folders) {
        const res = await window.electronAPI.scanFolder(folder.path);
        if (res.success && res.games) {
          allFound = [...allFound, ...res.games];
        }
      }

      // 3. Process matches in batch
      const processed = await processScannedGames(allFound);

      // 4. Update State ONCE
      setQueue(processed);

    } catch (e: any) {
      setError(e.message || "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddFile = async () => {
    // Placeholder for adding a single file
    // window.electronAPI.showOpenDialog...
  };

  const handleFinalizeImport = async () => {
    setIsImporting(true);
    const toImport = queue.filter(g => !g.isIgnored && g.status !== 'error');

    // Convert StagedGame -> Game
    const finalGames: Game[] = toImport.map(g => ({
      id: g.uuid,
      title: g.title,
      source: g.source,
      appId: g.appId,
      installDirectory: g.installPath,
      exePath: g.exePath || '',
      bannerUrl: g.bannerUrl,
      boxArtUrl: g.boxArtUrl,
      logo: g.logoUrl,
      description: g.description,
      developers: g.developers,
      publishers: g.publishers,
      genres: [], // TODO: extract genres
      platform: 'pc',
      playTime: 0,
      lastPlayed: undefined,
      addedAt: Date.now(),
      favorite: false,
      hidden: false,
      categories: g.categories
    }));

    await onImport(finalGames);
    setIsImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col text-white">
      <ImportHeader
        onScanFolder={handleScanFolder}
        onAddFile={handleAddFile}
        onScanAll={handleScanAll}
        isScanning={isScanning}
      />

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-300">×</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <ImportSidebar
          queue={queue}
          selectedId={selectedId}
          onSelectGame={setSelectedId}
          isScanning={isScanning}
          ignoredGames={ignoredGames}
          showIgnored={showIgnored}
          onToggleShowIgnored={() => setShowIgnored(!showIgnored)}
        />

        <ImportGameForm
          selectedGame={selectedGame}
          onUpdateGame={updateGame}
          onSearchImages={(type) => selectedGame && setActiveImageSearch({ type, gameId: selectedGame.uuid })}
          onFixMatch={() => { /* Implement fix match dialog if needed, or re-run matcher */ }}
          onIgnore={handleIgnoreGame}
          onUnignore={handleUnignoreGame}
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {queue.filter(g => !g.isIgnored).length} games ready to import
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-gray-800 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalizeImport}
            disabled={isImporting || queue.length === 0}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold shadow-lg shadow-green-900/20 transition-all transform active:scale-95"
          >
            {isImporting ? 'Importing...' : 'Import Selected'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeImageSearch && selectedGame && (
        <ImageSearchModal
          initialQuery={selectedGame.title}
          type={activeImageSearch.type}
          onImageSelected={(url) => {
            const field = activeImageSearch.type === 'boxart' ? 'boxArtUrl'
              : activeImageSearch.type === 'banner' ? 'bannerUrl'
                : activeImageSearch.type === 'logo' ? 'logoUrl'
                  : 'iconUrl';
            updateGame(selectedGame.uuid, { [field]: url });
            setActiveImageSearch(null);
          }}
          onClose={() => setActiveImageSearch(null)}
        />
      )}
    </div>
  );
};
