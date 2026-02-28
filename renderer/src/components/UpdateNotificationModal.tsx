import React, { useMemo, useState } from 'react';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
  currentVersion?: string | null;
  changelogSource?: string | null;
  changelogLoading?: boolean;
  changelogError?: string | null;
  isTestMode?: boolean;
  onUpdateNow: () => Promise<void>;
  onDismiss: () => void;
  onInstall: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  version,
  status,
  error,
  currentVersion,
  changelogSource,
  changelogLoading = false,
  changelogError,
  isTestMode = false,
  onUpdateNow,
  onDismiss,
  onInstall,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(true);

  if (!isOpen) return null;

  const handleUpdateNow = async () => {
    setIsDownloading(true);
    try {
      await onUpdateNow();
    } finally {
      setIsDownloading(false);
    }
  };

  const changelogRange = useMemo(() => {
    if (!changelogSource || !currentVersion) return '';

    const normalizeVersion = (value: string) => value.replace(/^v/i, '').trim();
    /** Only treat as version if it looks like semver (e.g. 0.5.7, 1.0.0). Excludes "GPL Source & Notice", "Unreleased", etc. */
    const isSemverLike = (value: string) => /^\d+\.\d+(\.\d+)?([-\w.]*)?$/i.test(normalizeVersion(value).split(/\s/)[0] ?? '');
    const toParts = (value: string) => normalizeVersion(value).split('-')[0].split('.').map(part => Number(part) || 0);
    const compareVersions = (a: string, b: string) => {
      const aParts = toParts(a);
      const bParts = toParts(b);
      const maxLen = Math.max(aParts.length, bParts.length);
      for (let i = 0; i < maxLen; i += 1) {
        const aPart = aParts[i] ?? 0;
        const bPart = bParts[i] ?? 0;
        if (aPart > bPart) return 1;
        if (aPart < bPart) return -1;
      }
      return 0;
    };

    /** Remove GPL/License/legal notice subsections from a section body so only actual changes are shown. */
    const stripLegalSubsections = (body: string): string => {
      const lines = body.split(/\r?\n/);
      const out: string[] = [];
      let skip = false;
      for (const line of lines) {
        const isSubHeading = /^##\s+/.test(line);
        if (isSubHeading) {
          const lower = line.toLowerCase();
          const isLegal = /gpl|source\s*&\s*notice|license|provenance|corresponding\s*source|legal/.test(lower);
          skip = isLegal;
          if (!skip) out.push(line);
          continue;
        }
        if (skip) continue;
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const lower = trimmed.toLowerCase();
          if (/corresponding\s*source|license\s*:|provenance|nyrna.*provenance|gpl-3\.0/.test(lower)) continue;
        }
        out.push(line);
      }
      return out.join('\n').trim();
    };

    const headerRegex = /^##\s+\[(.+?)\].*$/gm;
    const matches = [...changelogSource.matchAll(headerRegex)];
    const sections = matches.map((match, index) => {
      const startIndex = match.index ?? 0;
      const endIndex = index + 1 < matches.length ? (matches[index + 1].index ?? changelogSource.length) : changelogSource.length;
      const headerLine = match[0];
      const rawBody = changelogSource.slice(startIndex + headerLine.length, endIndex).trim();
      const sectionBody = stripLegalSubsections(rawBody);
      return {
        version: match[1],
        header: headerLine,
        body: sectionBody,
      };
    });

    const targetVersion = normalizeVersion(version);
    const baseVersion = normalizeVersion(currentVersion);
    const targetIsOlderOrEqual = compareVersions(targetVersion, baseVersion) <= 0;
    const filtered = sections.filter(section => {
      if (!isSemverLike(section.version)) return false;
      if (section.version.toLowerCase() === 'unreleased') return false;
      if (targetIsOlderOrEqual) {
        return compareVersions(section.version, targetVersion) === 0;
      }
      return compareVersions(section.version, baseVersion) > 0 && compareVersions(section.version, targetVersion) <= 0;
    });

    if (filtered.length === 0) return '';
    return filtered.map(section => [section.header, section.body].filter(Boolean).join('\n')).join('\n\n');
  }, [changelogSource, currentVersion, version]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999]" />
      
      {/* Modal - max height and overflow so content never goes off screen */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto">
        <div className={`bg-gradient-to-br from-gray-900/95 to-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-3xl shadow-2xl w-full max-h-[90vh] flex flex-col ${showChangelog ? 'max-w-4xl' : 'max-w-md'} p-8 animate-in fade-in zoom-in duration-300`}>
          <div className="flex flex-col items-center gap-6 min-h-0 overflow-hidden">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-cyan-400 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">
                Update Available
              </h2>
              <p className="text-slate-300 text-sm">
                A new version of Onyx is available: <span className="text-cyan-400 font-semibold">v{version}</span>
              </p>
            </div>

            {/* Status Messages */}
            {status === 'downloading' && (
              <div className="w-full bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  <span className="text-slate-200 text-sm">Downloading update... Please wait.</span>
                </div>
              </div>
            )}

            {status === 'downloaded' && (
              <div className="w-full bg-emerald-900/30 rounded-lg p-4 border border-emerald-500/30">
                <p className="text-emerald-300 text-sm text-center">
                  Update downloaded successfully! Click "Install Now" to apply the update.
                </p>
              </div>
            )}

            {status === 'error' && error && (
              <div className="w-full bg-red-900/30 rounded-lg p-4 border border-red-500/30">
                <p className="text-red-300 text-sm text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Changelog - constrained height and scroll so large changelogs stay on screen */}
            {showChangelog && (
              <div className="w-full min-h-0 flex flex-col rounded-2xl bg-slate-900/60 border border-slate-700/60 p-5 max-h-[50vh] overflow-y-auto">
                <div className="flex flex-col gap-2 mb-4">
                  <span className="text-sm text-slate-400">Changes from v{currentVersion ?? '0.0.0'} to v{version}</span>
                  {isTestMode && (
                    <span className="text-xs text-amber-300">Local test mode</span>
                  )}
                </div>
                {changelogLoading && (
                  <p className="text-slate-300 text-sm">Loading changelog...</p>
                )}
                {!changelogLoading && changelogError && (
                  <p className="text-red-300 text-sm">{changelogError}</p>
                )}
                {!changelogLoading && !changelogError && changelogRange && (
                  <pre className="whitespace-pre-wrap text-base text-slate-100 font-sans">{changelogRange}</pre>
                )}
                {!changelogLoading && !changelogError && !changelogRange && (
                  <p className="text-slate-300 text-sm">No changelog entries found for this range.</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setShowChangelog(prev => !prev)}
                className="w-full px-6 py-3 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 text-slate-100 font-medium transition-colors border border-slate-600/50"
              >
                {showChangelog ? 'Hide Changelog' : 'View Changelog'}
              </button>
              {status === 'available' && (
                <>
                  <button
                    onClick={handleUpdateNow}
                    disabled={isDownloading}
                    className="w-full px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Downloading...
                      </>
                    ) : (
                      'Download Update'
                    )}
                  </button>
                  <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
                  >
                    Dismiss
                  </button>
                </>
              )}

              {status === 'downloaded' && (
                <>
                  <button
                    onClick={onInstall}
                    className="w-full px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                  >
                    Install Now
                  </button>
                  <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
                  >
                    Install Later
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
