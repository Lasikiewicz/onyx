import { useCallback } from 'react';

interface StartupProgressState {
  message: string;
}

interface FoundGameCandidate {
  id?: string;
  title: string;
  exePath?: string;
  installPath?: string;
  platform?: string;
  source?: string;
}

interface UseStartupScanReviewOptions {
  setFoundGames: (value: FoundGameCandidate[] | null | ((current: FoundGameCandidate[] | null) => FoundGameCandidate[] | null)) => void;
  setStartupProgress: (value: StartupProgressState | null | ((current: StartupProgressState | null) => StartupProgressState | null)) => void;
  openImporterWithGames: (games: FoundGameCandidate[]) => void;
}

export function useStartupScanReview({
  setFoundGames,
  setStartupProgress,
  openImporterWithGames,
}: UseStartupScanReviewOptions) {
  const handleCancelFoundGames = useCallback(() => {
    setFoundGames(null);
    setStartupProgress(null);
  }, [setFoundGames, setStartupProgress]);

  const handleReviewFoundGames = useCallback((gamesToReview: FoundGameCandidate[]) => {
    setStartupProgress(null);
    setTimeout(() => {
      openImporterWithGames(gamesToReview);
    }, 200);
  }, [openImporterWithGames, setStartupProgress]);

  return {
    handleCancelFoundGames,
    handleReviewFoundGames,
  };
}
