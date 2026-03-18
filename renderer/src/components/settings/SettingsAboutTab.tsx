import React from 'react';
import { InteractiveSettingsAboutLogo } from './InteractiveSettingsAboutLogo';

interface SettingsAboutTabProps {
  appVersion: string;
  isAlphaBuild: boolean;
  isPackagedApp: boolean;
  updateStatus: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  updateVersion: string | null;
  updateError: string | null;
  onCheckForUpdates: () => Promise<void>;
  onDownloadUpdate: () => Promise<void>;
  onRestartToUpdate: () => void;
  onBugReportClick: () => void;
  onOpenExternal: (url: string) => Promise<void> | void;
}

interface SocialAction {
  label: string;
  url: string;
  className: string;
  icon: React.ReactNode;
}

const socialActions: SocialAction[] = [
  {
    label: 'Join Discord',
    url: 'https://discord.gg/m2dgd4ZUPu',
    className: 'bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20 border border-[#5865F2]/20',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    label: 'Official Website',
    url: 'https://onyxlauncher.co.uk/',
    className: 'bg-slate-700/10 text-slate-200 hover:bg-slate-700/20 border border-slate-700/20',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2v20" />
      </svg>
    ),
  },
  {
    label: 'Visit Reddit',
    url: 'https://www.reddit.com/r/OnyxLauncher/',
    className: 'bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500]/20 border border-[#FF4500]/20',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM12 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM7.5 13.5c1.5 1 4.5 1 6 0M16.5 13.5c-1.5 1-4.5 1-6 0" />
      </svg>
    ),
  },
  {
    label: 'Support Onyx',
    url: 'https://ko-fi.com/oynxgilga',
    className: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

export const SettingsAboutTab: React.FC<SettingsAboutTabProps> = ({
  appVersion,
  isAlphaBuild,
  isPackagedApp,
  updateStatus,
  updateVersion,
  updateError,
  onCheckForUpdates,
  onDownloadUpdate,
  onRestartToUpdate,
  onBugReportClick,
  onOpenExternal,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8">
      <div className="flex flex-col items-center animate-fade-in">
        <div className="mb-4">
          <InteractiveSettingsAboutLogo />
        </div>
        <h2 className="text-3xl font-bold text-white tracking-wide">Onyx{isAlphaBuild ? ' Alpha' : ''}</h2>
        <span className="text-sm font-medium text-slate-500 mt-1">v{appVersion}</span>
      </div>

      <div className="flex flex-col items-center gap-3 mt-2">
          <button
            onClick={() => void onCheckForUpdates()}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-200 hover:bg-slate-600/50 transition-colors border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {updateStatus === 'checking' || updateStatus === 'downloading' ? 'Checking...' : 'Check for Updates'}
          </button>
          {updateStatus === 'available' && updateVersion && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-emerald-400">Update available: v{updateVersion}</p>
              <button
                onClick={() => void onDownloadUpdate()}
                className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium"
              >
                Download Update
              </button>
            </div>
          )}
          {updateStatus === 'downloaded' && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-emerald-400">Update ready. Restart to install.</p>
              <button
                onClick={onRestartToUpdate}
                className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium"
              >
                Restart to Update
              </button>
            </div>
          )}
          {updateStatus === 'not-available' && (
            <p className="text-sm text-slate-500">
              {isPackagedApp ? "You're on the latest version." : 'Updater is only available in installed builds.'}
            </p>
          )}
          {updateStatus === 'error' && updateError && (
            <p className="text-sm text-red-400 max-w-xs text-center">{updateError}</p>
          )}
      </div>

      {isAlphaBuild && (
        <button
          onClick={onBugReportClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all duration-300 border border-yellow-500/20"
        >
          Found a bug?
        </button>
      )}

      <div className="max-w-md space-y-4">
        <p className="text-slate-400 leading-relaxed">
          Onyx is a passion project built by a single developer who just wanted a better way to launch games.
        </p>
        <p className="text-slate-400 leading-relaxed font-medium">
          No ads, no bloat-just games.
        </p>
        <div className="pt-4 border-t border-slate-700/50 mt-4 space-y-1">
          <p className="text-xs text-slate-500">
            Powered by <span className="text-slate-400 font-medium">IGDB</span>, <span className="text-slate-400 font-medium">SteamGridDB</span>, and <span className="text-slate-400 font-medium">RAWG.io</span>
          </p>
          <p className="text-xs text-slate-500">
            Link icons by{' '}
            <button
              type="button"
              onClick={() => void onOpenExternal('https://allsvgicons.com')}
              className="text-slate-400 font-medium hover:text-sky-400 transition-colors underline"
            >
              allsvgicons.com
            </button>
          </p>
        </div>

        <div className="pt-4 border-t border-slate-700/50 mt-4 space-y-2 text-xs text-slate-500">
          <p>
            Licensed under <span className="text-slate-300 font-medium">GNU GPL v3.0-or-later</span>. You can review the license text in this repository.
          </p>
          <p>
            Suspend/Resume integration thanks to{' '}
            <button
              type="button"
              onClick={() => void onOpenExternal('https://nyrna.merritt.codes/')}
              className="text-slate-300 font-medium hover:text-sky-400 transition-colors underline"
            >
              Nyrna
            </button>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 flex-wrap justify-center">
        {socialActions.map((action) => (
          <button
            key={action.label}
            onClick={() => void onOpenExternal(action.url)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${action.className}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-12">
        <p className="text-xs text-slate-700">
          Copyright 2026 Onyx. All rights reserved.
        </p>
      </div>
    </div>
  );
};
