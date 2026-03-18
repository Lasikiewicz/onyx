import React, { useMemo, useState } from 'react';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
  progressPercent?: number;
  currentVersion?: string | null;
  changelogSource?: string | null;
  changelogLoading?: boolean;
  changelogError?: string | null;
  isTestMode?: boolean;
  onUpdateNow: () => Promise<void>;
  onDismiss: () => void;
  onInstall: () => void;
}

interface ParsedBullet {
  title: string | null;
  detail: string;
  raw: string;
  children: string[];
}

interface ParsedSection {
  version: string;
  releaseDate: string | null;
  bullets: ParsedBullet[];
}

const aggregateBullets = (bullets: ParsedBullet[]): ParsedBullet[] => {
  const aggregated: ParsedBullet[] = [];

  for (const bullet of bullets) {
    if (!bullet.title) {
      aggregated.push(bullet);
      continue;
    }

    const existing = aggregated.find((entry) => entry.title === bullet.title);
    if (!existing) {
      aggregated.push({
        ...bullet,
        detail: '',
        children: [
          ...(bullet.detail ? [bullet.detail] : []),
          ...bullet.children,
        ],
      });
      continue;
    }

    if (bullet.detail) {
      existing.children.push(bullet.detail);
    }
    existing.children.push(...bullet.children);
  }

  return aggregated;
};

const renderInlineSegments = (text: string, className = '') => {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <em key={`${part}-${index}`} className="italic text-slate-100">
              {part.slice(1, -1)}
            </em>
          );
        }

        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      })}
    </span>
  );
};

const normalizeVersion = (value: string) => value.replace(/^v/i, '').trim();

const toParts = (value: string) =>
  normalizeVersion(value)
    .split('-')[0]
    .split('.')
    .map((part) => Number(part) || 0);

const compareVersions = (a: string, b: string) => {
  const aParts = toParts(a);
  const bParts = toParts(b);
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < maxLen; index += 1) {
    const aPart = aParts[index] ?? 0;
    const bPart = bParts[index] ?? 0;
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  return 0;
};

const parseBullet = (line: string): ParsedBullet => {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= line.length - 1) {
    if (line.endsWith(':')) {
      return {
        title: line.slice(0, -1).trim() || null,
        detail: '',
        raw: line,
        children: [],
      };
    }

    return { title: null, detail: line, raw: line, children: [] };
  }

  const title = line.slice(0, separatorIndex).trim();
  const detail = line.slice(separatorIndex + 1).trim();
  if (!title || !detail) {
    return { title: null, detail: line, raw: line, children: [] };
  }

  return { title, detail, raw: line, children: [] };
};

const parseSections = (source: string): ParsedSection[] => {
  const headerRegex = /^##\s+\[(.+?)\](?:\s+-\s+(.+))?$/gm;
  const matches = [...source.matchAll(headerRegex)];

  return matches
    .map((match, index) => {
      const startIndex = match.index ?? 0;
      const endIndex = index + 1 < matches.length ? (matches[index + 1].index ?? source.length) : source.length;
      const headerLine = match[0];
      const sectionBody = source.slice(startIndex + headerLine.length, endIndex).trim();
      const bullets: ParsedBullet[] = [];
      let currentParent: ParsedBullet | null = null;

      sectionBody.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const childMatch = line.match(/^\s{2,}-\s+(.*)$/);
        if (childMatch && currentParent) {
          currentParent.children.push(childMatch[1].trim());
          return;
        }

        if (trimmed.startsWith('- ')) {
          currentParent = parseBullet(trimmed.slice(2).trim());
          bullets.push(currentParent);
        }
      });

      return {
        version: normalizeVersion(match[1]),
        releaseDate: match[2]?.trim() || null,
        bullets,
      };
    })
    .filter((section) => section.version.toLowerCase() !== 'unreleased');
};

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  version,
  status,
  error,
  progressPercent,
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

  const handleUpdateNow = async () => {
    setIsDownloading(true);
    try {
      await onUpdateNow();
    } finally {
      setIsDownloading(false);
    }
  };

  const changelogData = useMemo<{
    displayVersion: string;
    rangeLabel: string;
    releaseDate: string | null;
    includedVersions: ParsedSection[];
  } | null>(() => {
    if (!changelogSource || !currentVersion) return null;
    const sections = parseSections(changelogSource);
    const targetVersion = normalizeVersion(version);
    const baseVersion = normalizeVersion(currentVersion);
    const targetIsOlderOrEqual = compareVersions(targetVersion, baseVersion) <= 0;

    let filtered = sections.filter((section) => {
      if (targetIsOlderOrEqual) {
        return compareVersions(section.version, targetVersion) === 0;
      }
      return compareVersions(section.version, baseVersion) > 0 && compareVersions(section.version, targetVersion) <= 0;
    });

    if (isTestMode && sections.length > 0) {
      filtered = sections.slice(0, 3);
    }

    if (filtered.length === 0) return null;

    const displayVersion = filtered[0]?.version ?? targetVersion;
    return {
      displayVersion,
      rangeLabel: isTestMode
        ? 'Latest changelog preview'
        : `Changes from v${baseVersion || '0.0.0'} to v${targetVersion}`,
      releaseDate: filtered[0]?.releaseDate ?? null,
      includedVersions: filtered,
    };
  }, [changelogSource, currentVersion, isTestMode, version]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999]" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div className={`bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_32%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] backdrop-blur-xl border border-cyan-500/35 rounded-[2rem] shadow-2xl w-full ${showChangelog ? 'max-w-5xl h-[90vh] max-h-[90vh]' : 'max-w-2xl'} p-6 md:p-8 animate-in fade-in zoom-in duration-300 flex flex-col`}>
          <div className={`flex flex-col items-center gap-6 ${showChangelog ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 max-w-3xl text-center sm:text-left">
              <div className="w-16 h-16 rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/30 flex items-center justify-center shrink-0 shadow-[0_0_40px_rgba(34,211,238,0.18)] overflow-visible translate-y-1">
                <svg
                  className={`w-9 h-9 text-cyan-400 ${status !== 'error' || isDownloading ? 'animate-[spin_2s_linear_infinite]' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="-1 -1 26 26"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-slate-200 text-xl md:text-2xl font-semibold">
                A new version of Onyx is available: <span className="text-cyan-400 font-semibold">v{version}</span>
              </p>
            </div>

            {/* Status Messages */}
            {status === 'downloading' && (
              <div className="w-full bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  <span className="text-slate-200 text-sm">
                    Downloading update... Please wait.
                    {typeof progressPercent === 'number' ? ` ${Math.round(progressPercent)}%` : ''}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-cyan-500/15">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.75),rgba(6,182,212,1))] transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(4, Math.min(100, progressPercent ?? 8))}%` }}
                  />
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

            {/* Changelog */}
            {showChangelog && (
              <div className="w-full rounded-[1.75rem] bg-slate-950/45 border border-slate-700/60 p-4 md:p-5 max-h-[55vh] overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
                    {changelogData ? changelogData.rangeLabel : `Changes from v${currentVersion ?? '0.0.0'} to v${version}`}
                  </span>
                  {changelogData?.releaseDate && (
                    <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                      {changelogData.releaseDate}
                    </span>
                  )}
                  {isTestMode && (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">Local test mode</span>
                  )}
                </div>
                {changelogLoading && (
                  <p className="text-slate-300 text-sm">Loading changelog...</p>
                )}
                {!changelogLoading && changelogError && (
                  <p className="text-red-300 text-sm">{changelogError}</p>
                )}
                {!changelogLoading && !changelogError && changelogData && (
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(8,47,73,0.22),rgba(15,23,42,0.12))] p-4 md:p-5">
                      <h3 className="text-xl font-semibold text-slate-50 mb-5">What&apos;s new in v{changelogData.displayVersion}</h3>
                      <div className="space-y-5">
                        {changelogData.includedVersions.map((section, index) => (
                          <article
                            key={section.version}
                            className={index > 0 ? 'border-t border-slate-700/60 pt-5' : ''}
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                                v{section.version}
                              </span>
                              {section.releaseDate && (
                                <span className="text-xs text-slate-400">{section.releaseDate}</span>
                              )}
                            </div>
                            {(() => {
                              const fallbackBullets = section.bullets.length > 0
                                ? section.bullets
                                : [{ title: null, detail: 'Internal maintenance and quality improvements.', raw: `fallback-${section.version}`, children: [] }];
                              const bullets = aggregateBullets(fallbackBullets);

                              return (
                                <div className="space-y-2">
                                  {bullets.map((bullet) => {
                                    const childItems = bullet.title && bullet.detail
                                      ? [bullet.detail, ...bullet.children]
                                      : bullet.children;

                                    if (bullet.title) {
                                      return (
                                        <div key={bullet.raw} className="space-y-2 text-sm text-slate-200">
                                          <p className="leading-6 font-semibold text-slate-50">
                                            {renderInlineSegments(`${bullet.title}:`)}
                                          </p>
                                          {childItems.length > 0 && (
                                            <div className="space-y-1.5 pl-1">
                                              {childItems.map((child) => (
                                                <div key={`${bullet.raw}-${child}`} className="flex items-start gap-2 text-sm text-slate-300">
                                                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400/80 shrink-0" />
                                                  <p className="leading-6">{renderInlineSegments(child)}</p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={bullet.raw} className="flex items-start gap-3 text-sm text-slate-200">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80 shrink-0" />
                                        <p className="leading-6">{renderInlineSegments(bullet.detail)}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
                {!changelogLoading && !changelogError && !changelogData && (
                  <p className="text-slate-300 text-sm">No changelog entries found for this range.</p>
                )}
              </div>
            )}

          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 flex flex-col gap-3 w-full">
            <button
              onClick={() => setShowChangelog(prev => !prev)}
              className="w-full px-6 py-3 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 text-slate-100 font-medium transition-colors border border-slate-600/50"
            >
              {showChangelog ? 'Hide Changelog' : 'View Changelog'}
            </button>
            {status === 'available' && (
              <>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
                  >
                    Dismiss
                  </button>
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
                </div>
              </>
            )}

            {status === 'downloaded' && (
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={onDismiss}
                  className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
                >
                  Install Later
                </button>
                <button
                  onClick={onInstall}
                  className="w-full px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                >
                  Install Now
                </button>
              </div>
            )}

            {status === 'error' && (
              <button
                onClick={onDismiss}
                className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
