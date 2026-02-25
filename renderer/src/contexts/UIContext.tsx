import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, ExecutableFile } from '../types/game';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export interface UIContextType {
  // Navigation & Selection
  activeGameId: string | null;
  setActiveGameId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedLauncher: string | null;
  setSelectedLauncher: (launcher: string | null) => void;
  sortBy: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed';
  setSortBy: (sortBy: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed') => void;
  activeSection: string;
  showTopBar: boolean;

  // Game State
  launchingGameId: string | null;
  setLaunchingGameId: (id: string | null) => void;
  runningGames: Set<string>;
  setRunningGames: (games: Set<string> | ((prev: Set<string>) => Set<string>)) => void;

  // Modals & Overlays
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  isSteamConfigOpen: boolean;
  setIsSteamConfigOpen: (isOpen: boolean) => void;
  isUpdateLibraryOpen: boolean;
  setIsUpdateLibraryOpen: (isOpen: boolean) => void;
  isOnyxSettingsOpen: boolean;
  setIsOnyxSettingsOpen: (isOpen: boolean) => void;
  isImportWorkbenchOpen: boolean;
  setIsImportWorkbenchOpen: (isOpen: boolean) => void;
  showLibraryTutorial: boolean;
  setShowLibraryTutorial: (show: boolean) => void;
  isGameManagerOpen: boolean;
  setIsGameManagerOpen: (isOpen: boolean) => void;
  isAPISettingsOpen: boolean;
  setIsAPISettingsOpen: (isOpen: boolean) => void;
  isBugReportOpen: boolean;
  setIsBugReportOpen: (isOpen: boolean) => void;

  // Modal Data/State
  onyxSettingsInitialTab: 'general' | 'appearance' | 'apis' | 'apps' | 'about';
  setOnyxSettingsInitialTab: (tab: 'general' | 'appearance' | 'apis' | 'apps' | 'about') => void;
  gameManagerInitialGameId: string | null;
  setGameManagerInitialGameId: (id: string | null) => void;
  gameManagerInitialTab: 'images' | 'metadata' | 'modManager';
  setGameManagerInitialTab: (tab: 'images' | 'metadata' | 'modManager') => void;

  // Editors
  isMetadataEditorOpen: boolean;
  setIsMetadataEditorOpen: (isOpen: boolean) => void;
  selectedExecutable: ExecutableFile | null;
  setSelectedExecutable: (exe: ExecutableFile | null) => void;
  isCategoriesEditorOpen: boolean;
  setIsCategoriesEditorOpen: (isOpen: boolean) => void;
  editingCategoriesGame: Game | null;
  setEditingCategoriesGame: (game: Game | null) => void;

  // Search/Fix
  isMetadataSearchOpen: boolean;
  setIsMetadataSearchOpen: (isOpen: boolean) => void;
  fixingGame: Game | null;
  setFixingGame: (game: Game | null) => void;

  // Scanning & Import
  isScanningSteam: boolean;
  setIsScanningSteam: (isScanning: boolean) => void;
  importWorkbenchFolderPath: string | undefined;
  setImportWorkbenchFolderPath: (path: string | undefined) => void;
  scannedSteamGames: Array<any>;
  setScannedSteamGames: (games: Array<any>) => void;
  setImportAppType: (type: 'steam' | 'xbox' | 'other') => void;
  autoStartScan: boolean;
  setAutoStartScan: (auto: boolean) => void;
  startupProgress: { message: string } | null;
  setStartupProgress: (progress: { message: string } | null) => void;
  foundGames: Array<any> | null;
  setFoundGames: (games: Array<any> | null | ((prev: Array<any> | null) => Array<any> | null)) => void;
  missingGames: Array<{
    id: string;
    title: string;
    exePath?: string;
    platform?: string;
    source?: string;
  }> | null;
  setMissingGames: (games: Array<any> | null) => void;

  // Confirmations
  launchConfirmation: { game: Game } | null;
  setLaunchConfirmation: (confirmation: { game: Game } | null) => void;
  hideConfirmation: { game: Game } | null;
  setHideConfirmation: (confirmation: { game: Game } | null) => void;

  // Notifications
  toast: Toast | null;
  setToast: (toast: Toast | null) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;

  // Context Menus
  rightClickMenu: { x: number; y: number } | null;
  setRightClickMenu: (menu: { x: number; y: number } | null) => void;
  gameContextMenu: { x: number; y: number; game: Game } | null;
  setGameContextMenu: (menu: { x: number; y: number; game: Game } | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Selection
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLauncher, setSelectedLauncher] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'releaseDate' | 'playtime' | 'lastPlayed'>('title');
  const [activeSection] = useState('library');
  const [showTopBar] = useState(false);

  // Game State
  const [launchingGameId, setLaunchingGameId] = useState<string | null>(null);
  const [runningGames, setRunningGames] = useState<Set<string>>(new Set());

  // Modals & Overlays
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSteamConfigOpen, setIsSteamConfigOpen] = useState(false);
  const [isUpdateLibraryOpen, setIsUpdateLibraryOpen] = useState(false);
  const [isOnyxSettingsOpen, setIsOnyxSettingsOpen] = useState(false);
  const [isImportWorkbenchOpen, setIsImportWorkbenchOpen] = useState(false);
  const [showLibraryTutorial, setShowLibraryTutorial] = useState(false);
  const [isGameManagerOpen, setIsGameManagerOpen] = useState(false);
  const [isAPISettingsOpen, setIsAPISettingsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  // Modal Data/State
  const [onyxSettingsInitialTab, setOnyxSettingsInitialTab] = useState<'general' | 'appearance' | 'apis' | 'apps' | 'about'>('general');
  const [gameManagerInitialGameId, setGameManagerInitialGameId] = useState<string | null>(null);
  const [gameManagerInitialTab, setGameManagerInitialTab] = useState<'images' | 'metadata' | 'modManager'>('images');

  // Editors
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [selectedExecutable, setSelectedExecutable] = useState<ExecutableFile | null>(null);
  const [isCategoriesEditorOpen, setIsCategoriesEditorOpen] = useState(false);
  const [editingCategoriesGame, setEditingCategoriesGame] = useState<Game | null>(null);

  // Search/Fix
  const [isMetadataSearchOpen, setIsMetadataSearchOpen] = useState(false);
  const [fixingGame, setFixingGame] = useState<Game | null>(null);

  // Scanning & Import
  const [isScanningSteam, setIsScanningSteam] = useState(false);
  const [importWorkbenchFolderPath, setImportWorkbenchFolderPath] = useState<string | undefined>(undefined);
  const [scannedSteamGames, setScannedSteamGames] = useState<Array<any>>([]);
  const [, setImportAppType] = useState<'steam' | 'xbox' | 'other'>('steam');
  const [autoStartScan, setAutoStartScan] = useState(false);
  const [startupProgress, setStartupProgress] = useState<{ message: string } | null>(null);
  const [foundGames, setFoundGames] = useState<Array<any> | null>(null);
  const [missingGames, setMissingGames] = useState<Array<any> | null>(null);

  // Confirmations
  const [launchConfirmation, setLaunchConfirmation] = useState<{ game: Game } | null>(null);
  const [hideConfirmation, setHideConfirmation] = useState<{ game: Game } | null>(null);

  // Notifications
  const [toast, setToast] = useState<Toast | null>(null);

  // Context Menus
  const [rightClickMenu, setRightClickMenu] = useState<{ x: number; y: number } | null>(null);
  const [gameContextMenu, setGameContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Save activeGameId when it changes (Persist locally or via preferences context?)
  // For now, let's keep it simple. The persistence was in App.tsx.
  // We can add the persistence logic in AppLayout or similar if needed,
  // or add a listener here if we have access to electronAPI.

  // In the original App.tsx, activeGameId persistence was handled by a useEffect.
  // We should probably handle that in the component that uses this context, or pass a callback.
  // But wait, PreferencesContext has a `activeGameId` in `applyPreferences`.

  // Let's rely on the consumer (AppLayout) to handle the persistence of activeGameId
  // by syncing it with electronAPI, or move the persistence logic here.
  // Since we want to decouple, I'll add the persistence effect here.

  useEffect(() => {
    const saveActiveGameId = async () => {
      try {
        await window.electronAPI.savePreferences({ activeGameId });
      } catch (error) {
        console.error('Error saving active game ID:', error);
      }
    };
    if (activeGameId !== null) { // Only save if not null? Original code didn't check for null but had debounce
         const timeoutId = setTimeout(saveActiveGameId, 300);
         return () => clearTimeout(timeoutId);
    }
  }, [activeGameId]);

  const value = {
    activeGameId,
    setActiveGameId,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedLauncher,
    setSelectedLauncher,
    sortBy,
    setSortBy,
    activeSection,
    showTopBar,
    launchingGameId,
    setLaunchingGameId,
    runningGames,
    setRunningGames,
    isModalOpen,
    setIsModalOpen,
    isSteamConfigOpen,
    setIsSteamConfigOpen,
    isUpdateLibraryOpen,
    setIsUpdateLibraryOpen,
    isOnyxSettingsOpen,
    setIsOnyxSettingsOpen,
    isImportWorkbenchOpen,
    setIsImportWorkbenchOpen,
    showLibraryTutorial,
    setShowLibraryTutorial,
    isGameManagerOpen,
    setIsGameManagerOpen,
    isAPISettingsOpen,
    setIsAPISettingsOpen,
    isBugReportOpen,
    setIsBugReportOpen,
    onyxSettingsInitialTab,
    setOnyxSettingsInitialTab,
    gameManagerInitialGameId,
    setGameManagerInitialGameId,
    gameManagerInitialTab,
    setGameManagerInitialTab,
    isMetadataEditorOpen,
    setIsMetadataEditorOpen,
    selectedExecutable,
    setSelectedExecutable,
    isCategoriesEditorOpen,
    setIsCategoriesEditorOpen,
    editingCategoriesGame,
    setEditingCategoriesGame,
    isMetadataSearchOpen,
    setIsMetadataSearchOpen,
    fixingGame,
    setFixingGame,
    isScanningSteam,
    setIsScanningSteam,
    importWorkbenchFolderPath,
    setImportWorkbenchFolderPath,
    scannedSteamGames,
    setScannedSteamGames,
    setImportAppType,
    autoStartScan,
    setAutoStartScan,
    startupProgress,
    setStartupProgress,
    foundGames,
    setFoundGames,
    missingGames,
    setMissingGames,
    launchConfirmation,
    setLaunchConfirmation,
    hideConfirmation,
    setHideConfirmation,
    toast,
    setToast,
    showToast,
    rightClickMenu,
    setRightClickMenu,
    gameContextMenu,
    setGameContextMenu,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
