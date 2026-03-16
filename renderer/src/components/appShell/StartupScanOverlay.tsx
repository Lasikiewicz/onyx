import { FoundGamesModal } from '../FoundGamesModal';

interface FoundGame {
  id?: string;
  title: string;
  exePath?: string;
  installPath?: string;
  platform?: string;
  source?: string;
  appId?: string;
  isDownloading?: boolean;
}

interface StartupScanOverlayProps {
  startupProgress: { message: string } | null;
  foundGames: FoundGame[] | null;
  onCancelFoundGames: () => void;
  onReviewFoundGames: (games: FoundGame[]) => void;
}

export function StartupScanOverlay({
  startupProgress,
  foundGames,
  onCancelFoundGames,
  onReviewFoundGames,
}: StartupScanOverlayProps) {
  if (!startupProgress) {
    return null;
  }

  if (foundGames && foundGames.length > 0) {
    return (
      <FoundGamesModal
        foundGames={foundGames}
        onCancel={onCancelFoundGames}
        onOpenImporter={onReviewFoundGames}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-900/95 to-slate-950/95 backdrop-blur-xl border border-cyan-500/20 p-10 rounded-3xl shadow-2xl w-[800px] max-w-[90vw] max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-24 h-24 animate-pulse">
            <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="onyxGrad" x1="256" y1="20" x2="256" y2="492" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#334155" />
                  <stop offset="1" stopColor="#020617" />
                </linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <path
                d="M256 30 L465 150 V362 L256 482 L47 362 V150 L256 30Z"
                fill="url(#onyxGrad)"
                stroke="#0ea5e9"
                strokeWidth="8"
                filter="url(#glow)"
              />

              <path d="M256 256 L256 482 M256 256 L47 150 M256 256 L465 150" stroke="#1e293b" strokeWidth="4" />

              <g transform="translate(256, 143) scale(1, 0.58)">
                <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
              </g>

              <g transform="translate(151, 325) rotate(60) scale(1, 0.58)">
                <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
              </g>

              <g transform="translate(361, 325) rotate(-60) scale(1, 0.58)">
                <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
              </g>

              <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z" fill="white" fillOpacity="0.1" />
            </svg>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Scanning Game Libraries</h3>
            <p className="text-cyan-100/60 text-sm">Checking for new games on startup...</p>
          </div>

          <div className="w-full bg-slate-800/50 rounded-xl p-4 border border-cyan-500/10">
            <p className="text-cyan-50/90 text-base text-center font-medium break-words">
              {startupProgress.message}
            </p>
          </div>

          <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
