import { useCallback } from 'react';
import type React from 'react';
import type { Game } from '../types/game';
import { getImportIgnoreKey } from '../types/importer';
import type { ImportStatus, StagedGame } from '../types/importer';
import type { GamePropertiesPanelHandle } from '../components/GamePropertiesPanel';

type ImportProgressSetter = (value: { current: number; total: number; phase: string; detail?: string } | null) => void;

export interface UseImportWorkbenchActionsParams {
    onImport: (games: Game[], onProgress?: (current: number, total: number, phase: string, detail?: string) => void) => Promise<void>;
    onClose: () => void;
    panelRef: React.RefObject<GamePropertiesPanelHandle>;

    selectedId: string | null;
    visibleGames: StagedGame[];

    setQueue: React.Dispatch<React.SetStateAction<StagedGame[]>>;
    setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;

    setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
    setImportProgress: ImportProgressSetter;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useImportWorkbenchActions({
    onImport,
    onClose,
    panelRef,

    selectedId,
    visibleGames,

    setQueue,
    setSelectedId,

    setIsImporting,
    setImportProgress,
    setError,
}: UseImportWorkbenchActionsParams) {
    const handleUpdateGame = useCallback(
        (updatedGame: StagedGame) => {
            setQueue(prev =>
                prev.map(g => {
                    if (g.uuid !== updatedGame.uuid) return g;

                    const hasImages = Boolean(
                        updatedGame.boxArtUrl &&
                            (updatedGame.bannerUrl || updatedGame.alternativeBannerUrl || updatedGame.heroUrl),
                    );
                    const hasDesc = updatedGame.description;
                    const status: ImportStatus = hasImages && hasDesc ? 'ready' : 'ambiguous';

                    return { ...updatedGame, status };
                }),
            );
        },
        [setQueue],
    );

    const handleSkipGame = useCallback(
        (game: StagedGame) => {
            setQueue(prev => {
                const next = prev.filter(g => g.uuid !== game.uuid);
                if (selectedId === game.uuid) {
                    const remaining = next.filter(g => !g.isIgnored);
                    setSelectedId(remaining[0]?.uuid || null);
                }
                return next;
            });
        },
        [selectedId, setQueue, setSelectedId],
    );

    const handleIgnoreGame = useCallback(
        async (game: StagedGame) => {
            const gameId = getImportIgnoreKey(game.source, game.appId, game.originalName);
            try {
                const prefs = await window.electronAPI.getPreferences();
                const ignored = new Set(prefs.ignoredGames || []);
                ignored.add(gameId);
                await window.electronAPI.savePreferences({
                    ...prefs,
                    ignoredGames: Array.from(ignored),
                });
            } catch (err) {
                console.error('Failed to ignore game:', err);
            }

            setQueue(prev => prev.map(g => (g.uuid === game.uuid ? { ...g, isIgnored: true } : g)));
        },
        [setQueue],
    );

    const handleImport = useCallback(async () => {
        if (visibleGames.length === 0) {
            setError('No games to import');
            return;
        }

        setIsImporting(true);
        setImportProgress(null);
        setError(null);

        try {
            // Flush current panel edits to queue and get merged game so import uses latest data
            const updatedGame = (await panelRef.current?.saveToParent?.()) as StagedGame | undefined;

            const merged =
                selectedId && updatedGame
                    ? visibleGames.map(staged => (staged.uuid === selectedId ? updatedGame : staged))
                    : visibleGames;

            const listToImport = merged.filter(staged => staged.status === 'ready');

            if (listToImport.length === 0) {
                setError('No games ready to import');
                setIsImporting(false);
                return;
            }

            const gamesToImport: Game[] = listToImport.map(staged => {
                let gameId: string;
                let launcherSource: string;

                if (staged.source === 'steam' && staged.appId) {
                    gameId = `steam-${staged.appId}`;
                    launcherSource = 'steam';
                } else if (staged.source === 'xbox') {
                    gameId = staged.uuid;
                    launcherSource = 'xbox';
                } else {
                    gameId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                    launcherSource = staged.source;
                }

                return {
                    id: gameId,
                    title: staged.title,
                    platform: staged.platform || staged.source,
                    source: launcherSource,
                    exePath: staged.exePath || staged.installPath,
                    launchArgs: staged.launchArgs,
                    boxArtUrl: staged.boxArtUrl,
                    bannerUrl: staged.bannerUrl,
                    alternativeBannerUrl: staged.alternativeBannerUrl,
                    useAlternativeBackground: staged.useAlternativeBackground,
                    logoUrl: staged.logoUrl,
                    heroUrl: staged.heroUrl,
                    iconUrl: staged.iconUrl,
                    screenshots: staged.screenshots,
                    links: staged.links,
                    description: staged.description,
                    releaseDate: staged.releaseDate,
                    genres: staged.genres,
                    developers: staged.developers,
                    publishers: staged.publishers,
                    categories: staged.categories,
                    ageRating: staged.ageRating,
                    userScore: staged.rating,
                    installationDirectory: staged.installPath,
                    xboxKind: staged.xboxKind,
                    packageFamilyName: staged.packageFamilyName,
                    appUserModelId: staged.appUserModelId,
                    launchUri: staged.launchUri,
                };
            });

            await onImport(gamesToImport, (current, total, phase, detail) => {
                setImportProgress({ current, total, phase, detail: detail ?? '' });
            });

            setQueue([]); // Clear queue for a fresh start next time
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsImporting(false);
            setImportProgress(null);
        }
    }, [
        onClose,
        onImport,
        panelRef,
        selectedId,
        setError,
        setImportProgress,
        setIsImporting,
        setQueue,
        visibleGames,
    ]);

    return { handleUpdateGame, handleSkipGame, handleIgnoreGame, handleImport };
}

