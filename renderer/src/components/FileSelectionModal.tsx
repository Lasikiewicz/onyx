import React, { useState, useEffect } from 'react';
import { ExecutableFile, GameMetadata, Game } from '../types/game';
import { SteamGameMetadataEditor } from './SteamGameMetadataEditor';
import { areAPIsConfigured } from '../utils/apiValidation';

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  executables: ExecutableFile[];
  onSelect: (file: ExecutableFile, metadata?: GameMetadata) => void;
  folderPath: string;
  existingLibrary?: Game[]; // Optional: existing library games to check if already imported
  onAPIConfigRequired?: () => void; // Callback when API configuration is required
}

export const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
  isOpen,
  onClose,
  executables,
  onSelect,
  folderPath,
  existingLibrary = [],
  onAPIConfigRequired,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [ignoredFiles, setIgnoredFiles] = useState<Set<string>>(new Set());
  const [gameMetadata, setGameMetadata] = useState<Map<string, GameMetadata>>(new Map());
  const [isFetchingMetadata, setIsFetchingMetadata] = useState<Set<string>>(new Set());
  const [editingFile, setEditingFile] = useState<ExecutableFile | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'imported' | 'ignored'>('new');

  useEffect(() => {
    if (isOpen) {
      // Load ignored files from preferences
      window.electronAPI.getPreferences().then(prefs => {
        if (prefs.ignoredGames) {
          setIgnoredFiles(new Set(prefs.ignoredGames));
        }
      }).catch(err => console.error('Error loading ignored files:', err));
      
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set());
      setActiveTab('new');
    }
  }, [isOpen, executables]);

  // Don't auto-select new files - they should be unchecked by default
  // Removed auto-selection logic

  // Helper to get a better search name from path
  const getSearchNameFromPath = (file: ExecutableFile): string => {
    const path = file.fullPath;
    if (path && folderPath) {
      // Normalize paths for comparison
      const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '');
      const normalizedFolderPath = normalizePath(folderPath);
      const normalizedFilePath = normalizePath(path);
      
      // Check if the file path starts with the folder path
      if (normalizedFilePath.startsWith(normalizedFolderPath)) {
        // Get the relative path from the scanned folder
        const relativePath = path.substring(folderPath.length).replace(/^[/\\]+/, '');
        const relativeParts = relativePath.split(/[/\\]/);
        
        // The first part after the scanned folder is likely the game name
        if (relativeParts.length > 0 && relativeParts[0]) {
          const gameFolderName = relativeParts[0];
          // Skip if it's a common non-game directory
          if (!gameFolderName.match(/^(Program Files|Program Files \(x86\)|Steam|Epic|EA|GOG|Ubisoft|Battle\.net|__Installer|_Installer|Installer)$/i)) {
            // Clean up the name (remove version numbers, etc.)
            const cleaned = gameFolderName.replace(/[_\s]*(trial|demo|beta|alpha|test|v?\d+\.\d+)[_\s]*$/i, '').trim();
            return cleaned || gameFolderName;
          }
        }
      }
    }
    
    // Fallback: Extract from full path
    if (path) {
      const pathParts = path.split(/[/\\]/);
      // Look for common game directory patterns, starting from the executable's parent
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const part = pathParts[i];
        // Skip common non-game directories
        if (part && 
            !part.match(/^(Program Files|Program Files \(x86\)|Games|Steam|Epic|EA|GOG|Ubisoft|Battle\.net|__Installer|_Installer|Installer|SP|MP|Bin|Binaries|Win64|Win32|Common|Redist|Redistributables|work|ph_ft|game)$/i) &&
            !part.match(/^(setup|install|uninstall|cleanup|touchup|repair|config|launcher|updater)$/i) &&
            part.length > 2) {
          // Clean up the name
          const cleaned = part.replace(/[_\s]*(trial|demo|beta|alpha|test)[_\s]*$/i, '').trim();
          return cleaned || part;
        }
      }
    }
    
    // Final fallback: executable name without extension
    const name = file.fileName.replace(/[_\s]*(trial|demo|beta|alpha|test|\.exe)[_\s]*$/i, '').trim();
    return name || file.fileName;
  };

  // Helper to get file ID
  const getFileId = (file: ExecutableFile): string => {
    return `file-${file.fullPath}`;
  };

  // Helper to check if a file is already imported
  const isFileImported = (file: ExecutableFile): boolean => {
    return existingLibrary.some(game => game.exePath === file.fullPath);
  };

  // Categorize files
  const newFiles = executables.filter((file) => {
    const fileId = getFileId(file);
    return !ignoredFiles.has(fileId) && !isFileImported(file);
  });

  const importedFiles = executables.filter((file) => {
    return isFileImported(file);
  });

  const ignoredFilesList = executables.filter((file) => {
    const fileId = getFileId(file);
    return ignoredFiles.has(fileId);
  });

  // Get files for current tab
  const getFilesForTab = () => {
    switch (activeTab) {
      case 'new':
        return newFiles;
      case 'imported':
        return importedFiles;
      case 'ignored':
        return ignoredFilesList;
      default:
        return newFiles;
    }
  };

  const filteredExecutables = getFilesForTab();

  // Helper to check if a search result is a good match
  const isGoodMatch = (searchName: string, resultName: string): boolean => {
    const normalize = (str: string): string => {
      return str.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    const normalizedSearch = normalize(searchName);
    const normalizedResult = normalize(resultName);
    
    // Exact match
    if (normalizedSearch === normalizedResult) {
      return true;
    }
    
    // Check if search name is contained in result name (for cases like "Dying Light" matching "Dying Light: The Following")
    if (normalizedResult.includes(normalizedSearch) && normalizedSearch.length >= 5) {
      return true;
    }
    
    // Check if result name is contained in search name
    if (normalizedSearch.includes(normalizedResult) && normalizedResult.length >= 5) {
      return true;
    }
    
    // Check similarity using word matching
    const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
    const resultWords = normalizedResult.split(' ').filter(w => w.length > 2);
    
    if (searchWords.length === 0 || resultWords.length === 0) {
      return false;
    }
    
    // If most words match, consider it a good match
    const matchingWords = searchWords.filter(word => resultWords.includes(word));
    const matchRatio = matchingWords.length / Math.max(searchWords.length, resultWords.length);
    
    return matchRatio >= 0.7; // 70% word match
  };

  // Fetch metadata for a file
  const fetchMetadataForFile = async (file: ExecutableFile, autoApply: boolean = false) => {
    const fileId = getFileId(file);
    
    // Skip if we already have metadata with images
    const currentMetadata = gameMetadata.get(fileId);
    if (currentMetadata && (currentMetadata.boxArtUrl || currentMetadata.bannerUrl)) {
      return; // Already has metadata
    }
    
    setIsFetchingMetadata(prev => new Set(prev).add(fileId));
    
    try {
      const searchName = getSearchNameFromPath(file);
      console.log(`[Metadata] Fetching for fileId: ${fileId}, searchName: "${searchName}", fileName: "${file.fileName}"`);
      
      const response = await window.electronAPI.searchMetadata(searchName);
      if (response.success && response.results && response.results.length > 0) {
        const topResult = response.results[0];
        
        // Check if it's a good match
        const goodMatch = isGoodMatch(searchName, topResult.name);
        
        // Format release date from timestamp if available
        const formatReleaseDate = (timestamp?: number): string | undefined => {
          if (!timestamp) return undefined;
          const date = new Date(timestamp * 1000);
          return date.toISOString().split('T')[0];
        };
        
        // Store all metadata fields from IGDB result
        const metadata: GameMetadata = {
          boxArtUrl: topResult.coverUrl || '',
          bannerUrl: topResult.screenshotUrls && topResult.screenshotUrls.length > 0 
            ? topResult.screenshotUrls[0] 
            : topResult.coverUrl || '',
          screenshots: topResult.screenshotUrls,
          // Import all metadata fields
          title: topResult.name,
          description: topResult.summary,
          releaseDate: formatReleaseDate(topResult.releaseDate),
          genres: topResult.genres,
          ageRating: topResult.ageRating,
          categories: topResult.categories,
          rating: topResult.rating,
          platform: topResult.platform,
        };
        
        // Auto-apply if it's a good match and we have images, or if autoApply is true
        if ((goodMatch && metadata.boxArtUrl) || (autoApply && metadata.boxArtUrl)) {
          console.log(`[Metadata] Auto-applying metadata for "${searchName}" - matched with "${topResult.name}"`);
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            newMap.set(fileId, metadata);
            return newMap;
          });
        } else if (!currentMetadata) {
          // Store metadata but don't auto-apply - user can search manually
          console.log(`[Metadata] Found results for "${searchName}" but not auto-applying (match quality: ${goodMatch ? 'good' : 'uncertain'})`);
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            if (!newMap.has(fileId)) {
              newMap.set(fileId, metadata);
            }
            return newMap;
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching metadata for ${file.fileName}:`, err);
    } finally {
      setIsFetchingMetadata(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  // Auto-fetch metadata for all new files when modal opens
  useEffect(() => {
    if (isOpen && newFiles.length > 0) {
      // Check if APIs are configured
      areAPIsConfigured().then(configured => {
        if (configured) {
          // Fetch metadata for all new files that don't already have metadata
          newFiles.forEach(file => {
            const fileId = getFileId(file);
            const existingMetadata = gameMetadata.get(fileId);
            // Only fetch if we don't already have metadata with images
            if (!existingMetadata || (!existingMetadata.boxArtUrl && !existingMetadata.bannerUrl)) {
              fetchMetadataForFile(file, true);
            }
          });
        }
      }).catch(err => {
        console.error('Error checking API configuration:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, executables.length]); // Only depend on executables length to avoid re-fetching

  const toggleFileSelection = (file: ExecutableFile) => {
    // Find the index in the original executables array
    const originalIndex = executables.findIndex(f => f.fullPath === file.fullPath);
    if (originalIndex === -1) return;
    
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(originalIndex)) {
        newSet.delete(originalIndex);
      } else {
        newSet.add(originalIndex);
        // Open metadata editor when a file is checked
        setEditingFile(file);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const currentTabIndices = new Set(
      filteredExecutables.map(file => executables.findIndex(f => f.fullPath === file.fullPath)).filter(i => i !== -1)
    );
    
    // Check if all current tab files are selected
    const allSelected = Array.from(currentTabIndices).every(idx => selectedFiles.has(idx));
    
    if (allSelected) {
      // Deselect all files in current tab
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        currentTabIndices.forEach(idx => newSet.delete(idx));
        return newSet;
      });
    } else {
      // Select all files in current tab
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        currentTabIndices.forEach(idx => {
          newSet.add(idx);
        });
        // Don't auto-fetch metadata - user can open metadata editor for each file individually
        return newSet;
      });
    }
  };

  const handleAlwaysIgnore = async (file: ExecutableFile) => {
    const fileId = getFileId(file);
    const newIgnoredFiles = new Set(ignoredFiles);
    newIgnoredFiles.add(fileId);
    setIgnoredFiles(newIgnoredFiles);
    
    // Remove from selected files
    const fileIndex = filteredExecutables.findIndex(f => f.fullPath === file.fullPath);
    if (fileIndex !== -1) {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileIndex);
        return newSet;
      });
    }
    
    // Save to preferences
    try {
      const prefs = await window.electronAPI.getPreferences();
      await window.electronAPI.savePreferences({
        ...prefs,
        ignoredGames: Array.from(newIgnoredFiles),
      });
    } catch (err) {
      console.error('Error saving ignored files:', err);
    }
  };

  const handleRemoveIgnore = async (file: ExecutableFile) => {
    const fileId = getFileId(file);
    const newIgnoredFiles = new Set(ignoredFiles);
    newIgnoredFiles.delete(fileId);
    setIgnoredFiles(newIgnoredFiles);
    
    // Save to preferences
    try {
      const prefs = await window.electronAPI.getPreferences();
      await window.electronAPI.savePreferences({
        ...prefs,
        ignoredGames: Array.from(newIgnoredFiles),
      });
    } catch (err) {
      console.error('Error removing ignore:', err);
    }
  };

  const handleImport = async () => {
    // Check if APIs are configured
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      // Notify parent component to handle API configuration
      if (onAPIConfigRequired) {
        onAPIConfigRequired();
      } else {
        alert('Both IGDB (Client ID + Secret) and SteamGridDB (API Key) are required before adding games. Please configure them in Settings > APIs.');
      }
      return;
    }

    // Import all selected files with their metadata
    filteredExecutables.forEach((file) => {
      const originalIndex = executables.findIndex(f => f.fullPath === file.fullPath);
      if (originalIndex !== -1 && selectedFiles.has(originalIndex)) {
        const fileId = getFileId(file);
        const metadata = gameMetadata.get(fileId);
        onSelect(file, metadata);
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl mx-4 border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Select Game Executables</h2>
              <p className="text-sm text-gray-400 mt-1">Found {filteredExecutables.length} executable{filteredExecutables.length !== 1 ? 's' : ''} in: {folderPath}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              New Games ({newFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('imported')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'imported'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Imported ({importedFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('ignored')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'ignored'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Ignored ({ignoredFilesList.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredExecutables.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No executables found in this folder.</p>
            </div>
          ) : (
            <>
              {activeTab !== 'imported' && (
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {(() => {
                      const currentTabIndices = new Set(
                        filteredExecutables.map(file => executables.findIndex(f => f.fullPath === file.fullPath)).filter(i => i !== -1)
                      );
                      const allSelected = Array.from(currentTabIndices).every(idx => selectedFiles.has(idx));
                      return allSelected ? 'Deselect All' : 'Select All';
                    })()}
                  </button>
                  <span className="text-gray-400 text-sm">
                    {(() => {
                      const currentTabIndices = new Set(
                        filteredExecutables.map(file => executables.findIndex(f => f.fullPath === file.fullPath)).filter(i => i !== -1)
                      );
                      const selectedCount = Array.from(currentTabIndices).filter(idx => selectedFiles.has(idx)).length;
                      return `${selectedCount} of ${filteredExecutables.length} selected`;
                    })()}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {filteredExecutables.map((file) => {
                  const originalIndex = executables.findIndex(f => f.fullPath === file.fullPath);
                  const isSelected = originalIndex !== -1 && selectedFiles.has(originalIndex);
                  const gameName = file.fileName.replace(/\.exe$/i, '').trim();
                  const fileId = getFileId(file);
                  const metadata = gameMetadata.get(fileId);
                  const isFetching = isFetchingMetadata.has(fileId);
                  const boxArtUrl = metadata?.boxArtUrl || '';
                  const bannerUrl = metadata?.bannerUrl || '';

                  return (
                    <div
                      key={fileId}
                      className={`relative rounded-lg border-2 transition-all flex gap-4 p-4 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      {activeTab !== 'imported' && (
                        <div 
                          className="cursor-pointer flex-shrink-0 self-start pt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileSelection(file);
                          }}
                        >
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-gray-800/80 border-gray-400'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Box Art - Correct Aspect Ratio (2:3) */}
                      <div className="relative overflow-hidden rounded flex-shrink-0" style={{ width: '120px', height: '180px' }}>
                        {boxArtUrl ? (
                          <img
                            src={boxArtUrl}
                            alt={gameName}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFile(file);
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (bannerUrl) {
                                target.src = bannerUrl;
                              } else {
                                target.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <div 
                            className="w-full h-full bg-gray-700 flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFile(file);
                            }}
                          >
                            {isFetching ? (
                              <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <span className="text-gray-400 text-xs">No Image</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* File Info and Metadata */}
                      <div className="flex-1 min-w-0 flex gap-4 relative">
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="text-white font-semibold text-base cursor-pointer hover:text-blue-400 transition-colors mb-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFile(file);
                            }}
                            title={gameName}
                          >
                            {gameName}
                          </h3>
                          <p className="text-gray-400 text-sm truncate mb-3" title={file.fullPath}>
                            {file.fullPath}
                          </p>
                        </div>
                        
                        {/* Banner Preview */}
                        {bannerUrl && (
                          <div className="flex-shrink-0 w-48 h-28 rounded overflow-hidden">
                            <img
                              src={bannerUrl}
                              alt={`${gameName} banner`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFile(file);
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Action buttons - positioned at bottom right */}
                        <div className="absolute bottom-0 right-0 flex gap-2">
                          {!boxArtUrl && !bannerUrl && !isFetching && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchMetadataForFile(file, false);
                              }}
                              className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/50 rounded transition-colors"
                              title="Search for game metadata"
                            >
                              Search
                            </button>
                          )}
                          {activeTab === 'ignored' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveIgnore(file);
                              }}
                              className="px-3 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 rounded transition-colors"
                              title="Remove ignore tag"
                            >
                              Remove Ignore
                            </button>
                          ) : activeTab === 'new' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAlwaysIgnore(file);
                              }}
                              className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50 rounded transition-colors"
                              title="Always ignore this executable in future scans"
                            >
                              Always Ignore
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedFiles.size === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {selectedFiles.size > 0 ? `${selectedFiles.size} ` : ''}Game{selectedFiles.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Metadata Editor */}
      {editingFile && (
        <SteamGameMetadataEditor
          isOpen={!!editingFile}
          onClose={() => setEditingFile(null)}
          game={{
            id: getFileId(editingFile),
            name: getSearchNameFromPath(editingFile),
            exePath: editingFile.fullPath,
            installPath: editingFile.fullPath,
            type: 'other',
          }}
          currentMetadata={gameMetadata.get(getFileId(editingFile))}
          onSave={(metadata: GameMetadata) => {
            const fileId = getFileId(editingFile);
            setGameMetadata(prev => {
              const newMap = new Map(prev);
              newMap.set(fileId, metadata);
              return newMap;
            });
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
};
