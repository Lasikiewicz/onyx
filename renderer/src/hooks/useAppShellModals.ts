import { useCallback, useState } from 'react';
import { ExecutableFile, Game } from '../types/game';

export type OnyxSettingsInitialTab = 'general' | 'appearance' | 'apis' | 'apps' | 'about';
export type GameManagerInitialTab = 'images' | 'metadata' | 'modManager';

export function useAppShellModals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [selectedExecutable, setSelectedExecutable] = useState<ExecutableFile | null>(null);
  const [isSteamConfigOpen, setIsSteamConfigOpen] = useState(false);
  const [isCategoriesEditorOpen, setIsCategoriesEditorOpen] = useState(false);
  const [editingCategoriesGame, setEditingCategoriesGame] = useState<Game | null>(null);
  const [isMetadataSearchOpen, setIsMetadataSearchOpen] = useState(false);
  const [fixingGame, setFixingGame] = useState<Game | null>(null);
  const [isUpdateLibraryOpen, setIsUpdateLibraryOpen] = useState(false);
  const [isOnyxSettingsOpen, setIsOnyxSettingsOpen] = useState(false);
  const [onyxSettingsInitialTab, setOnyxSettingsInitialTab] = useState<OnyxSettingsInitialTab>('general');
  const [showLibraryTutorial, setShowLibraryTutorial] = useState(false);
  const [isGameManagerOpen, setIsGameManagerOpen] = useState(false);
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);
  const [gameManagerInitialGameId, setGameManagerInitialGameId] = useState<string | null>(null);
  const [gameManagerInitialTab, setGameManagerInitialTab] = useState<GameManagerInitialTab>('images');
  const [isAPISettingsOpen, setIsAPISettingsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [forceShowInitialOnboarding, setForceShowInitialOnboarding] = useState(false);

  const openOnyxSettings = useCallback((tab: OnyxSettingsInitialTab = 'general') => {
    setOnyxSettingsInitialTab(tab);
    setIsOnyxSettingsOpen(true);
  }, []);

  const closeOnyxSettings = useCallback(() => {
    setIsOnyxSettingsOpen(false);
  }, []);

  const openGameManager = useCallback((options?: { gameId?: string | null; tab?: GameManagerInitialTab }) => {
    setGameManagerInitialGameId(options?.gameId ?? null);
    setGameManagerInitialTab(options?.tab ?? 'images');
    setIsGameManagerOpen(true);
  }, []);

  const closeGameManager = useCallback(() => {
    setIsGameManagerOpen(false);
    setGameManagerInitialGameId(null);
    setGameManagerInitialTab('images');
  }, []);

  const openCategoriesEditor = useCallback((game: Game) => {
    setEditingCategoriesGame(game);
    setIsCategoriesEditorOpen(true);
  }, []);

  const closeCategoriesEditor = useCallback(() => {
    setIsCategoriesEditorOpen(false);
    setEditingCategoriesGame(null);
  }, []);

  const openMetadataEditor = useCallback((executable: ExecutableFile) => {
    setSelectedExecutable(executable);
    setIsMetadataEditorOpen(true);
  }, []);

  const closeMetadataEditor = useCallback(() => {
    setIsMetadataEditorOpen(false);
    setSelectedExecutable(null);
  }, []);

  const openMetadataSearch = useCallback((game: Game) => {
    setFixingGame(game);
    setIsMetadataSearchOpen(true);
  }, []);

  const closeMetadataSearch = useCallback(() => {
    setIsMetadataSearchOpen(false);
    setFixingGame(null);
  }, []);

  const openLibraryTutorial = useCallback(() => {
    setShowLibraryTutorial(true);
  }, []);

  const closeLibraryTutorial = useCallback(() => {
    setShowLibraryTutorial(false);
  }, []);

  return {
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
    openMetadataEditor,
    openMetadataSearch,
    openOnyxSettings,
    selectedExecutable,
    setFixingGame,
    setForceShowInitialOnboarding,
    setIsAPISettingsOpen,
    setIsBugReportOpen,
    setIsGameManagerOpen,
    setIsModalOpen,
    setIsOnyxSettingsOpen,
    setIsSteamConfigOpen,
    setIsUpdateLibraryOpen,
    setOnyxSettingsInitialTab,
    setShowLibraryTutorial,
    showLibraryTutorial,
    showOptimizerModal,
    setShowOptimizerModal,
  };
}
