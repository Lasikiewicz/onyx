import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import iconPng from '../../../resources/icon.png';
import iconSvg from '../../../resources/icon.svg';
import { TopBarContextMenu, TopBarPositions, TopBarElementPosition } from './TopBarContextMenu';
import type { OptimizationStatus } from '../types/optimization';
import { LauncherIcon, getLauncherDisplayName } from '../utils/launcherIcons';
import { DEV_DIALOG_ENTRIES, DevDialogPreview } from './develop/DevDialogPreview';

interface MenuBarProps {
  onScanFolder?: () => void;
  onUpdateSteamLibrary?: () => void;
  onUpdateLibrary?: () => void;
  onGameManager?: () => void;
  onConfigureSteam?: () => void;
  onOnyxSettings?: () => void;
  onAPISettings?: () => void;
  onAbout?: () => void;
  onShowLibraryTutorial?: () => void;
  onExit?: () => void;
  onBugReport?: () => void;
  onForceOpenUpdateFound?: () => void;
  onForceOpenOnboarding?: () => void;
  onForceCloseOnboarding?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  allCategories?: string[];
  categoryCounts?: Record<string, number>;
  pinnedCategories?: string[];
  onTogglePinCategory?: (category: string) => void;
  onReorderPinnedCategories?: (categories: string[]) => void;
  sortBy?: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed';
  onSortChange?: (sort: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed') => void;
  hasFavoriteGames?: boolean;
  hasVRCategory?: boolean;
  hasAppsCategory?: boolean;
  hasHiddenGames?: boolean;
  hideVRTitles?: boolean;
  hideAppsTitles?: boolean;
  onToggleHideVRTitles?: () => void;
  onToggleHideAppsTitles?: () => void;
  launchers?: string[];
  selectedLauncher?: string | null;
  onLauncherChange?: (launcher: string | null) => void;
  topBarPositions?: TopBarPositions;
  onTopBarPositionsChange?: (positions: TopBarPositions) => void;
  showCategoriesInGameList?: boolean;
  /** When provided, the optimizer queue modal is controlled by the parent (e.g. open from Game Manager). */
  showImageQueueDetail?: boolean;
  setShowImageQueueDetail?: (show: boolean) => void;
}

interface SortablePinnedCategoryProps {
  id: string;
  isSelected: boolean;
  onClick: () => void;
  removeBackgrounds?: boolean;
}

const SortablePinnedCategory: React.FC<SortablePinnedCategoryProps> = ({ id, isSelected, onClick, removeBackgrounds }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 60 : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        // Prevent click if we were dragging
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) {
          return;
        }
        onClick();
      }}
      className={`h-7 px-3 py-0.5 rounded text-sm transition-colors whitespace-nowrap active:scale-95 ${removeBackgrounds
        ? (isSelected
            ? 'bg-blue-600/40 text-blue-200 border border-transparent shadow-sm shadow-blue-500/20'
            : 'border border-transparent text-gray-300 hover:text-white hover:bg-white/5')
        : (isSelected
            ? 'bg-blue-600/40 text-blue-200 border border-blue-500/40 shadow-sm shadow-blue-500/20'
            : 'bg-gray-700/20 text-gray-300 hover:bg-gray-700/40 hover:text-white border border-gray-600/30')
        }`}
    >
      {id}
    </button>
  );
};

export const MenuBar: React.FC<MenuBarProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  allCategories = [],
  categoryCounts = {},
  pinnedCategories = [],
  onTogglePinCategory,
  onReorderPinnedCategories,
  sortBy = 'title',
  onSortChange,
  hasFavoriteGames = false,
  hasVRCategory = false,
  hasAppsCategory = false,
  hasHiddenGames = false,
  hideVRTitles = true,
  hideAppsTitles = true,
  onToggleHideVRTitles,
  onToggleHideAppsTitles,
  launchers = [],
  selectedLauncher,
  onLauncherChange,
  topBarPositions = { searchBar: 'left', sortBy: 'left', launcher: 'left', categories: 'left', pinnedCategories: 'left' },
  onTopBarPositionsChange,
  showCategoriesInGameList = false,
  showImageQueueDetail: showImageQueueDetailProp,
  setShowImageQueueDetail: setShowImageQueueDetailProp,
  // onScanFolder, // Unused
  onUpdateLibrary,
  onGameManager,
  onOnyxSettings,
  // onAPISettings, // Unused
  onAbout,
  onShowLibraryTutorial,
  onExit,
  onBugReport,
  onForceOpenUpdateFound,
  onForceOpenOnboarding,
  onForceCloseOnboarding,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isLauncherDropdownOpen, setIsLauncherDropdownOpen] = useState(false);
  const [isOnyxSettingsMenuOpen, setIsOnyxSettingsMenuOpen] = useState(false);
  const [isDevelopMenuOpen, setIsDevelopMenuOpen] = useState(false);
  const [previewDialogId, setPreviewDialogId] = useState<string | null>(null);
  const [isPackagedRuntime, setIsPackagedRuntime] = useState<boolean | null>(null);

  const [topBarContextMenu, setTopBarContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus | null>(null);
  const processingLogRef = useRef<HTMLDivElement | null>(null);
  const completedLogRef = useRef<HTMLDivElement | null>(null);
  const activeProcessingRowRef = useRef<HTMLDivElement | null>(null);
  const [internalShowImageQueueDetail, setInternalShowImageQueueDetail] = useState(false);
  const showImageQueueDetail = setShowImageQueueDetailProp !== undefined && showImageQueueDetailProp !== undefined
    ? showImageQueueDetailProp
    : internalShowImageQueueDetail;
  const setShowImageQueueDetail = setShowImageQueueDetailProp ?? setInternalShowImageQueueDetail;
  const openTopBarContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setTopBarContextMenu({ x: event.clientX, y: event.clientY });
  };
  const visiblePinnedCategories = pinnedCategories.filter((category) => {
    const count = categoryCounts?.[category] ?? 0;
    return count > 0 || allCategories.includes(category);
  });

  const downloadOptimizationLogs = async () => {
    if (!optimizationStatus) return;
    try {
      const appName = await window.electronAPI.getName().catch(() => 'Onyx');
      const appVersion = await window.electronAPI.getVersion().catch(() => 'unknown');
      const appProfile = await (window.electronAPI.getAppProfile?.() ?? Promise.resolve(undefined)).catch(() => undefined);
      const diagnostics = await (window.electronAPI.optimization?.getDiagnostics?.() ?? Promise.resolve(undefined)).catch(() => undefined);
      const timestamp = new Date();
      const safeTimestamp = timestamp.toISOString().replace(/[:.]/g, '-');
      const jobs = optimizationStatus.jobs ?? [];
      const reductionPercents: number[] = [];
      const errors = new Map<string, number>();

      const perJobDecision = jobs.map((job) => {
        const originalBytes = job.originalBytes;
        const optimizedBytes = job.optimizedBytes;
        const hasSizes = typeof originalBytes === 'number' && typeof optimizedBytes === 'number' && originalBytes > 0;
        const reductionPercent = hasSizes ? Number((((originalBytes - optimizedBytes) / originalBytes) * 100).toFixed(2)) : null;
        if (typeof reductionPercent === 'number') reductionPercents.push(reductionPercent);

        let decision = job.decisionReason ?? 'unknown';
        if (job.phase === 'failed') decision = 'failed';
        else if (job.phase === 'skipped') decision = job.error?.toLowerCase().includes('cached') ? 'skipped_cached' : (job.decisionReason ?? 'skipped');
        else if (hasSizes && optimizedBytes < originalBytes) decision = 'optimized';
        else if (hasSizes && optimizedBytes === originalBytes && !job.decisionReason) decision = 'no_gain_kept_original';
        else if (hasSizes && optimizedBytes > originalBytes) decision = 'larger_result_rejected';
        else if (job.phase === 'done' && job.decisionReason) decision = job.decisionReason;
        else if (job.phase === 'done') decision = 'done_no_size_metrics';

        if (job.error) {
          errors.set(job.error, (errors.get(job.error) ?? 0) + 1);
        }

        return {
          jobId: job.jobId,
          gameId: job.gameId,
          gameTitle: job.gameTitle,
          imageType: job.imageType,
          source: job.source,
          phase: job.phase,
          sourceExt: job.sourceExt,
          fileName: job.fileName,
          originalBytes,
          optimizedBytes,
          reductionPercent,
          decision,
          error: job.error ?? null,
          attempts: job.attemptSummary ?? null,
          attemptNote: job.attemptSummary ? null : 'Per-stage worker/ffmpeg/sharp attempt metrics unavailable for this job.',
          timingsMs: {
            total: job.attemptSummary?.totalDurationMs ?? null,
            worker: job.attemptSummary?.worker?.durationMs ?? null,
            ffmpeg: job.attemptSummary?.ffmpeg?.durationMs ?? null,
            sharp: job.attemptSummary?.sharp?.durationMs ?? null,
          },
        };
      });

      const sortedReductions = [...reductionPercents].sort((a, b) => a - b);
      const avgReductionPercent = reductionPercents.length > 0
        ? Number((reductionPercents.reduce((sum, value) => sum + value, 0) / reductionPercents.length).toFixed(2))
        : null;
      const medianReductionPercent = sortedReductions.length > 0
        ? Number((sortedReductions[Math.floor(sortedReductions.length / 2)]).toFixed(2))
        : null;
      const optimizedCount = perJobDecision.filter((j) => j.decision === 'optimized').length;
      const noGainCount = perJobDecision.filter((j) => j.decision === 'no_gain_kept_original').length;
      const failedCount = perJobDecision.filter((j) => j.decision === 'failed').length;
      const skippedCachedCount = perJobDecision.filter((j) => j.decision === 'skipped_cached').length;
      const skippedOtherCount = perJobDecision.filter((j) => j.decision === 'skipped').length;
      const unknownCount = perJobDecision.filter((j) => j.decision === 'unknown' || j.decision === 'done_no_size_metrics').length;

      const failureCategoryDigest = jobs.reduce<Record<string, number>>((acc, job) => {
        const categories = [job.attemptSummary?.worker?.failureCategory, job.attemptSummary?.ffmpeg?.failureCategory, job.attemptSummary?.sharp?.failureCategory];
        for (const category of categories) {
          if (!category) continue;
          acc[category] = (acc[category] ?? 0) + 1;
        }
        return acc;
      }, {});

      const notes: string[] = [];
      if (!diagnostics) {
        notes.push('This JSON does not include worker/ffmpeg diagnostics, so it can’t prove whether alpha has worker/ffmpeg capability differences vs local dev.');
      }
      notes.push('Per-stage optimization attempt/timing fields are included when available. If a stage is null, that stage was not attempted for that job.');

      const errorDigest = Array.from(errors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([message, count]) => ({ message, count }));

      const report = {
        reportVersion: 3,
        generatedAt: timestamp.toISOString(),
        appName,
        appVersion,
        appProfile,
        buildProfile: __BUILD_PROFILE__,
        diagnostics: diagnostics ?? null,
        environment: {
          isPackaged: diagnostics?.isPackaged ?? null,
          platform: diagnostics?.platform ?? null,
          arch: diagnostics?.arch ?? null,
          execPath: diagnostics?.execPath ?? null,
          workerAvailable: diagnostics?.workerAvailable ?? null,
          ffmpeg: diagnostics?.ffmpeg ?? null,
          runtime: optimizationStatus.runtime ?? null,
        },
        settingsSnapshot: {
          profile: optimizationStatus.runtime?.profile ?? null,
          reserveCores: optimizationStatus.runtime?.reserveCores ?? null,
          maxWorkers: optimizationStatus.runtime?.maxWorkers ?? null,
        },
        summary: {
          totalJobs: jobs.length,
          optimizedCount,
          noGainKeptOriginalCount: noGainCount,
          failedCount,
          skippedCachedCount,
          skippedOtherCount,
          unknownCount,
          avgReductionPercent,
          medianReductionPercent,
        },
        cacheBehavior: {
          skippedCachedCount,
          skippedOtherCount,
          completedCount: perJobDecision.filter((j) => j.phase === 'done').length,
        },
        errorDigest,
        failureCategoryDigest,
        notes,
        perJobDecision,
        status: optimizationStatus,
      };
      const content = `${JSON.stringify(report, null, 2)}\n`;
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `onyx-optimization-logs-${safeTimestamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download optimization logs:', error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visiblePinnedCategories.indexOf(active.id as string);
      const newIndex = visiblePinnedCategories.indexOf(over.id as string);
      const newOrder = arrayMove(visiblePinnedCategories, oldIndex, newIndex);
      onReorderPinnedCategories?.(newOrder);
    }
  };

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const launcherDropdownRef = useRef<HTMLDivElement>(null);
  const onyxSettingsMenuRef = useRef<HTMLDivElement>(null);
  const developMenuRef = useRef<HTMLDivElement>(null);

  const showDevelopMenu = import.meta.env.DEV || isPackagedRuntime === false;

  // Every Develop entry — direct actions and mock-data dialog previews — flattened into one
  // alphabetical list. Actions take precedence over a preview sharing the same id, so "Report a
  // Bug" opens the real modal on builds that provide the handler and the mock mount elsewhere.
  const developMenuEntries = useMemo(() => {
    const actions: Array<{ id: string; label: string; onSelect: () => void }> = [
      {
        id: 'toggle-console',
        label: 'Toggle Console',
        onSelect: async () => {
          try {
            await window.electronAPI.toggleDevTools();
          } catch (error) {
            console.error('Error toggling DevTools:', error);
          }
        },
      },
      { id: 'open-onboarding', label: 'Open Initial Onboarding', onSelect: () => onForceOpenOnboarding?.() },
      { id: 'close-onboarding', label: 'Close Initial Onboarding', onSelect: () => onForceCloseOnboarding?.() },
      { id: 'open-update-found', label: 'Open Update Found', onSelect: () => onForceOpenUpdateFound?.() },
      { id: 'bug-report', label: 'Report a Bug', onSelect: onBugReport ?? (() => setPreviewDialogId('bug-report')) },
    ];

    const actionIds = new Set(actions.map((action) => action.id));
    const previews = DEV_DIALOG_ENTRIES
      .filter((entry) => !actionIds.has(entry.id))
      .map((entry) => ({ id: entry.id, label: entry.label, onSelect: () => setPreviewDialogId(entry.id) }));

    return [...actions, ...previews].sort((a, b) => a.label.localeCompare(b.label));
  }, [onBugReport, onForceCloseOnboarding, onForceOpenOnboarding, onForceOpenUpdateFound]);

  useEffect(() => {
    (async () => {
      try {
        const packaged = await window.electronAPI.isPackaged?.();
        if (typeof packaged === 'boolean') setIsPackagedRuntime(packaged);
      } catch {
        setIsPackagedRuntime(null);
      }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (launcherDropdownRef.current && !launcherDropdownRef.current.contains(event.target as Node)) {
        setIsLauncherDropdownOpen(false);
      }
      if (onyxSettingsMenuRef.current && !onyxSettingsMenuRef.current.contains(event.target as Node)) {
        setIsOnyxSettingsMenuOpen(false);
      }
      if (developMenuRef.current && !developMenuRef.current.contains(event.target as Node)) {
        setIsDevelopMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleOpenTopBarMenu = (event: Event) => {
      const customEvent = event as CustomEvent<{ x: number; y: number }>;
      setTopBarContextMenu(customEvent.detail);
    };

    window.addEventListener('open-top-bar-menu', handleOpenTopBarMenu);
    return () => {
      window.removeEventListener('open-top-bar-menu', handleOpenTopBarMenu);
    };
  }, []);

  // Unified optimization status (importer and cache optimize)
  useEffect(() => {
    window.electronAPI.optimization?.getStatus?.()
      .then((s: unknown) => setOptimizationStatus(s as OptimizationStatus))
      .catch(() => {});

    const unsub = window.electronAPI.optimization?.onStatus?.((status: unknown) => {
      const s = status as OptimizationStatus;
      setOptimizationStatus(s);
    });
    return () => unsub?.();
  }, []);

  // Auto-follow each column independently while detail modal is open
  useEffect(() => {
    if (!showImageQueueDetail) return;

    const activeRow = activeProcessingRowRef.current;
    if (activeRow) {
      activeRow.scrollIntoView({ block: 'nearest' });
    } else {
      const processingEl = processingLogRef.current;
      if (processingEl) processingEl.scrollTop = processingEl.scrollHeight;
    }

    const completedEl = completedLogRef.current;
    if (completedEl) completedEl.scrollTop = 0;
  }, [optimizationStatus?.jobs, showImageQueueDetail]);

  // Create element renderers for configurable items
  const renderSearchBar = () => (
    <div className="relative w-64">
      <input
        type="text"
        value={searchQuery}
        data-controller-top-control="search"
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder="Q Search"
        aria-label="Search library"
        className={`h-7 w-full pr-7 pl-3 py-0.5 rounded text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/60 transition-colors ${topBarPositions?.removeButtonBackgrounds
          ? 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10 focus:bg-white/10 focus:border-white/20'
          : 'bg-gray-700/45 border border-gray-500/60 hover:bg-gray-700/55 hover:border-gray-400/70 focus:bg-gray-700/65'
        }`}
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange?.('')}
          className="absolute inset-y-0 right-1 my-auto px-1.5 flex items-center justify-center rounded hover:bg-gray-600/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          aria-label="Clear search"
        >
          <svg
            className="w-3.5 h-3.5 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  const renderSortBy = () => (
    <div className="relative" ref={sortDropdownRef}>
      <button
        data-controller-top-control="sort"
        onClick={() => {
          setIsSortDropdownOpen(!isSortDropdownOpen);
          setIsFilterDropdownOpen(false);
          setIsLauncherDropdownOpen(false);
          setIsOnyxSettingsMenuOpen(false);
        }}
        className={`h-7 px-3 py-0.5 rounded text-sm transition-colors ${topBarPositions?.removeButtonBackgrounds
          ? 'border border-transparent text-gray-300 hover:text-white hover:bg-white/5'
          : 'bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 text-gray-300 hover:text-white'
        }`}
        title="Sort by"
      >
        Sort by
      </button>
      {isSortDropdownOpen && (
        <div className="absolute left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            {(['title', 'releaseDate', 'playtime', 'lastPlayed'] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  onSortChange?.(option);
                  setIsSortDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${sortBy === option
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {option === 'title' && 'Title'}
                {option === 'releaseDate' && 'Release Date'}
                {option === 'playtime' && 'Playtime'}
                {option === 'lastPlayed' && 'Last Played'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLauncher = () => {
    if (launchers.length === 0) return null;
    const selectedLauncherDisplayName = selectedLauncher ? getLauncherDisplayName(selectedLauncher) : 'Launcher';
    return (
      <div className="relative" ref={launcherDropdownRef}>
        <button
          data-controller-top-control="launcher"
          onClick={() => {
            setIsLauncherDropdownOpen(!isLauncherDropdownOpen);
            setIsFilterDropdownOpen(false);
            setIsSortDropdownOpen(false);
            setIsOnyxSettingsMenuOpen(false);
          }}
          className={`h-7 px-3 py-0.5 rounded text-sm transition-colors ${topBarPositions?.removeButtonBackgrounds
            ? (selectedLauncher
                ? 'bg-blue-600/30 text-blue-300 border border-transparent shadow-sm shadow-blue-500/10'
                : 'border border-transparent text-gray-300 hover:text-white hover:bg-white/5')
            : ('bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 ' + (selectedLauncher
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/30'
                : 'text-gray-300 hover:text-white'))
            }`}
          title="Launcher"
        >
          {selectedLauncher ? (
            <span className="flex items-center gap-2">
              <LauncherIcon launcher={selectedLauncher} className="w-4 h-4" />
              <span>{selectedLauncherDisplayName}</span>
            </span>
          ) : (
            'Launcher'
          )}
        </button>
        {isLauncherDropdownOpen && (
          <div className="absolute left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-2">
              <button
                onClick={() => {
                  onLauncherChange?.(null);
                  setIsLauncherDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedLauncher === null
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                  </svg>
                  <span>All Launchers</span>
                </span>
              </button>
              {launchers.map((launcher) => {
                const displayName = getLauncherDisplayName(launcher);
                const isSelected = selectedLauncher === launcher;
                return (
                  <button
                    key={launcher}
                    onClick={() => {
                      onLauncherChange?.(isSelected ? null : launcher);
                      setIsLauncherDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <LauncherIcon launcher={launcher} className="w-4 h-4" />
                      <span>{displayName}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategories = () => {
    const filteredCategories = allCategories.filter(cat =>
      cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );

    return (
      <div className="relative" ref={filterDropdownRef}>
        <button
          data-controller-top-control="categories"
          onClick={() => {
            setIsFilterDropdownOpen(!isFilterDropdownOpen);
            setIsSortDropdownOpen(false);
            setIsLauncherDropdownOpen(false);
            setIsOnyxSettingsMenuOpen(false);
            setCategorySearchQuery('');
          }}
          className={`h-7 px-3 py-0.5 rounded text-sm transition-all flex items-center gap-2 ${topBarPositions?.removeButtonBackgrounds
            ? (selectedCategory && selectedCategory !== 'favorites' && selectedCategory !== 'hidden'
                ? 'bg-blue-600/30 text-blue-300 border border-transparent shadow-sm shadow-blue-500/10'
                : 'border border-transparent text-gray-300 hover:text-white hover:bg-white/5')
            : ('bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 ' + (selectedCategory && selectedCategory !== 'favorites' && selectedCategory !== 'hidden'
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/30'
                : 'text-gray-300 hover:text-white'))
            }`}
          title="Categories"
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 12h.01M7 17h.01M17 7h.01M17 12h.01M17 17h.01M12 7h.01M12 12h.01M12 17h.01" />
          </svg>
          <span className="max-w-[120px] truncate">
            {selectedCategory && selectedCategory !== 'favorites' && selectedCategory !== 'hidden' ? selectedCategory : 'Categories'}
          </span>
        </button>
        {isFilterDropdownOpen && (
          <div className="absolute left-0 mt-2 w-72 onyx-glass-panel rounded-xl shadow-2xl z-50 max-h-[80vh] flex flex-col overflow-hidden onyx-dropdown-animate">
            {/* Search header or Title */}
            <div className="p-3 border-b border-white/5 bg-white/5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Filter By</span>
                <button
                  onClick={() => {
                    onCategoryChange?.(null);
                    setIsFilterDropdownOpen(false);
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              {allCategories.length > 8 && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    autoFocus
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 transform -translate-y-1/2 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
              {/* Core Filters */}
              <div className="space-y-1 mb-3">
                <button
                  onClick={() => {
                    onCategoryChange?.(null);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group/cat ${selectedCategory === null
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                    : 'text-gray-200 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>All Games</span>
                  </div>
                  {categoryCounts['all'] !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === null ? 'bg-blue-500/30 text-blue-200' : 'bg-white/5 text-gray-300 group-hover/cat:bg-white/10'}`}>
                      {categoryCounts['all']}
                    </span>
                  )}
                </button>

                {hasFavoriteGames && (
                  <button
                    onClick={() => {
                      const isSelected = selectedCategory === 'favorites';
                      onCategoryChange?.(isSelected ? null : 'favorites');
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group/cat ${selectedCategory === 'favorites'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 shadow-sm shadow-yellow-500/10'
                      : 'text-gray-200 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-yellow-500 group- hover:animate-gentle-bounce group-hover:animate-gentle-bounce" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span>Favorites</span>
                    </div>
                    {categoryCounts['favorites'] !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'favorites' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-white/5 text-gray-300 group-hover/cat:bg-white/10'}`}>
                        {categoryCounts['favorites']}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Categories */}
              {filteredCategories.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Categories</div>
                  {filteredCategories.map((category) => {
                    const isPinned = pinnedCategories?.includes(category);
                    const isSelected = selectedCategory === category;
                    return (
                      <div key={category} className="group flex items-center gap-1">
                        <button
                          onClick={() => {
                            onCategoryChange?.(category);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all truncate flex items-center justify-between group/cat ${isSelected
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                            : 'text-gray-200 hover:bg-white/5 hover:text-white border border-transparent'
                            }`}
                        >
                          <span className="truncate">{category}</span>
                          {categoryCounts[category] !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-white/5 text-gray-300 group-hover/cat:text-gray-200 group-hover/cat:bg-white/10'
                              }`}>
                              {categoryCounts[category]}
                            </span>
                          )}
                        </button>
                        {onTogglePinCategory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinCategory(category);
                            }}
                            className={`p-2 rounded-lg transition-all ${isPinned
                              ? 'text-yellow-400 bg-yellow-400/10'
                              : 'text-gray-300 hover:text-yellow-400 hover:bg-white/10 opacity-60 group-hover:opacity-100'
                              }`}
                            title={isPinned ? 'Unpin category' : 'Pin category'}
                          >
                            <svg className="w-3.5 h-3.5 group- hover:animate-pin-shake group-hover:animate-pin-shake" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {categorySearchQuery && filteredCategories.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-gray-300 text-xs italic">No categories found matching "{categorySearchQuery}"</p>
                </div>
              )}
            </div>

            {/* Footer with Visibility Toggles */}
            <div className="p-2 border-t border-white/5 bg-black/20 space-y-1">
              <div className="px-1 py-1 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Visibility</div>
              <div className="grid grid-cols-1 gap-1">
                {hasVRCategory && (
                  <button
                    onClick={() => onToggleHideVRTitles?.()}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Hide VR Titles from main list</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${hideVRTitles ? 'bg-blue-600' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideVRTitles ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                )}
                {hasAppsCategory && (
                  <button
                    onClick={() => onToggleHideAppsTitles?.()}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span>Hide Apps Titles</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${hideAppsTitles ? 'bg-blue-600' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideAppsTitles ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                )}
                {hasHiddenGames && (
                  <button
                    onClick={() => {
                      const isSelected = selectedCategory === 'hidden';
                      onCategoryChange?.(isSelected ? null : 'hidden');
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 ${selectedCategory === 'hidden'
                      ? 'bg-red-900/40 text-red-300 border border-red-500/20 shadow-sm shadow-red-500/10'
                      : 'text-gray-200 hover:bg-white/5 hover:text-red-300'
                      }`}
                  >
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                        </svg>
                        <span>{selectedCategory === 'hidden' ? 'Showing Hidden Games' : 'Show Hidden Games'}</span>
                      </div>
                      {categoryCounts['hidden'] !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'hidden' ? 'bg-red-500/30 text-red-200' : 'bg-white/5 text-gray-300 hover:text-red-300'}`}>
                          {categoryCounts['hidden']}
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  const renderPinnedCategoryControls = () => {
    if (showCategoriesInGameList) return null;

    const hasFavoritesButton = hasFavoriteGames;
    const hasPinnedCategoryButtons = visiblePinnedCategories.length > 0;
    if (!hasFavoritesButton && !hasPinnedCategoryButtons) return null;

    return (
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {hasFavoritesButton && (
          <button
            onClick={() => {
              const isSelected = selectedCategory === 'favorites';
              onCategoryChange?.(isSelected ? null : 'favorites');
            }}
            className={`h-7 px-3 py-0.5 rounded text-sm transition-colors flex items-center gap-2 ${topBarPositions?.removeButtonBackgrounds
              ? (selectedCategory === 'favorites'
                  ? 'bg-blue-600/30 text-blue-300 border border-transparent shadow-sm shadow-blue-500/10'
                  : 'border border-transparent text-gray-300 hover:text-white hover:bg-white/5')
              : (selectedCategory === 'favorites'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                  : 'bg-gray-700/20 text-gray-300 hover:bg-gray-700/40 hover:text-white border border-gray-600/30')
              }`}
            title="Favorites"
          >
            <svg className="w-4 h-4 text-yellow-400 group- hover:animate-gentle-bounce group-hover:animate-gentle-bounce" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Favorites</span>
          </button>
        )}

        {hasPinnedCategoryButtons && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visiblePinnedCategories}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                {visiblePinnedCategories.map((pinnedCategory) => (
                  <SortablePinnedCategory
                    key={pinnedCategory}
                    id={pinnedCategory}
                    isSelected={selectedCategory === pinnedCategory}
                    onClick={() => {
                      onCategoryChange?.(selectedCategory === pinnedCategory ? null : pinnedCategory);
                    }}
                    removeBackgrounds={topBarPositions?.removeButtonBackgrounds}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    );
  };


  // Group elements by position
  const elementsByPosition = { left: [] as React.ReactNode[], middle: [] as React.ReactNode[], right: [] as React.ReactNode[] };

  const addPositionedElement = (key: string, position: TopBarElementPosition, element: React.ReactNode) => {
    if (position === 'hidden') return;
    elementsByPosition[position].push(<React.Fragment key={key}>{element}</React.Fragment>);
  };

  addPositionedElement('search', topBarPositions.searchBar, renderSearchBar());
  addPositionedElement('sort', topBarPositions.sortBy, renderSortBy());
  addPositionedElement('launcher', topBarPositions.launcher, renderLauncher());
  addPositionedElement('categories', topBarPositions.categories, renderCategories());

  const pinnedCategoryControls = renderPinnedCategoryControls();
  if (pinnedCategoryControls) {
    addPositionedElement('pinned-categories', topBarPositions.pinnedCategories, pinnedCategoryControls);
  }

  const renderPositionedElements = (items: React.ReactNode[]) => (
    <div className="flex items-center gap-2 translate-y-px">
      {items}
    </div>
  );

  return (
    <div
      className="h-10 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-gradient-to-b from-black/60 to-transparent"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onContextMenu={openTopBarContextMenu}
    >
      {/* Left section - System buttons + configurable elements */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onContextMenu={openTopBarContextMenu}
      >
        {/* Onyx Settings Button with Dropdown */}
        {onOnyxSettings && (
          <div
            className="relative"
            ref={onyxSettingsMenuRef}









          >
            <button
              data-controller-menu-trigger
              onClick={() => {
                setIsFilterDropdownOpen(false);
                setIsSortDropdownOpen(false);
                setIsLauncherDropdownOpen(false);
                setIsDevelopMenuOpen(false);
                setIsOnyxSettingsMenuOpen((isOpen) => !isOpen);

              }}
              className="group p-1.5 rounded transition-colors flex items-center justify-center"
              title="Onyx Settings"
            >
              <svg className="w-6 h-6 hover:animate-wobble group-hover:animate-wobble"
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M256 30 L465 150 V362 L256 482 L47 362 V150 L256 30Z" fill="url(#onyxGradMenuBar)" stroke="#0ea5e9" strokeWidth="8" />
                <path d="M256 256 L256 482 M256 256 L47 150 M256 256 L465 150" stroke="#1e293b" strokeWidth="4" />
                <g className="origin-center group-hover:animate-gear-spin transition-all duration-700 ease-in-out">
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
                </g>
                <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z" fill="white" fillOpacity="0.1" className="group-hover:fill-opacity-20 transition-all duration-500" />
                <defs>
                  <linearGradient id="onyxGradMenuBar" x1="256" y1="20" x2="256" y2="492" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#334155" />
                    <stop offset="1" stopColor="#020617" />
                  </linearGradient>
                </defs>
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div
              data-controller-app-menu={isOnyxSettingsMenuOpen ? 'open' : 'closed'}
              className={`absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[240px] transition-all duration-300 origin-top-left ${isOnyxSettingsMenuOpen ? 'opacity-100 scale-100 visible pointer-events-auto' : 'opacity-0 scale-95 invisible pointer-events-none'}`}
            >
              <div className="p-1">
                {onUpdateLibrary && (
                  <button
                    onClick={() => {
                      onUpdateLibrary();
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="flex-1">Add Games</span>
                  </button>
                )}

                {onGameManager && (
                  <button
                    onClick={() => {
                      onGameManager();
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span className="flex-1">Game Manager</span>
                  </button>
                )}

                {onOnyxSettings && (
                  <button
                    onClick={() => {
                      onOnyxSettings();
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                  >
                    <img
                      src={iconPng}
                      alt="Onyx"
                      className="w-5 h-5 flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = iconSvg;
                      }}
                    />
                    <span className="flex-1">Onyx Settings</span>
                  </button>
                )}

                <hr className="border-white/10 my-2" />

                <button
                  type="button"
                  aria-label="Support Onyx on Ko-fi"
                  onClick={async () => {
                    try {
                      if (window.electronAPI && window.electronAPI.openExternal) {
                        const result = await window.electronAPI.openExternal('https://ko-fi.com/oynxgilga');
                        if (!result.success) {
                          console.error('Failed to open external URL:', result.error);
                        }
                      } else {
                        console.error('window.electronAPI.openExternal is not available');
                      }
                    } catch (error) {
                      console.error('Failed to open external URL:', error);
                    }
                    setIsOnyxSettingsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 rounded transition-colors whitespace-nowrap"
                >
                  <svg className="w-5 h-5 text-rose-500 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="flex-1">Support Onyx</span>
                </button>

                {/* Discord */}
                <button
                  type="button"
                  aria-label="Join Onyx Discord"
                  onClick={async () => {
                    try {
                      if (window.electronAPI && window.electronAPI.openExternal) {
                        const result = await window.electronAPI.openExternal('https://discord.gg/m2dgd4ZUPu');
                        if (!result.success) {
                          console.error('Failed to open external URL:', result.error);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to open external URL:', error);
                    }
                    setIsOnyxSettingsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 rounded transition-colors whitespace-nowrap"
                >
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="flex-1">Join Discord</span>
                </button>

                {onShowLibraryTutorial && (
                  <button
                    onClick={() => {
                      onShowLibraryTutorial();
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="flex-1">Quick tips</span>
                  </button>
                )}

                {onAbout && (
                  <button
                    onClick={() => {
                      onAbout();
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="flex-1">About</span>
                  </button>
                )}

                {onExit && (
                  <button
                    onClick={() => {
                      onExit();
                      setIsOnyxSettingsMenuOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="flex-1">Exit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configurable elements on the left */}
        {elementsByPosition.left.length > 0 && renderPositionedElements(elementsByPosition.left)}

      </div>

      {/* Middle section */}
      {elementsByPosition.middle.length > 0 && (
        <div
          className="absolute left-1/2 flex -translate-x-1/2 items-center"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onContextMenu={openTopBarContextMenu}
        >
          {renderPositionedElements(elementsByPosition.middle)}
        </div>
      )}

      {/* Right section - develop menu + positioned elements + alpha badge; mr-32 keeps clear of window controls */}
      {(elementsByPosition.right.length > 0 || showDevelopMenu || __BUILD_PROFILE__ === 'alpha') && (
        <div
          className="flex items-center gap-2 mr-32"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onContextMenu={openTopBarContextMenu}
        >
          {elementsByPosition.right.length > 0 && renderPositionedElements(elementsByPosition.right)}
          {showDevelopMenu && (
            <div className="relative" ref={developMenuRef}>
              <button
                onClick={() => {
                  setIsFilterDropdownOpen(false);
                  setIsSortDropdownOpen(false);
                  setIsLauncherDropdownOpen(false);
                  setIsOnyxSettingsMenuOpen(false);
                  setIsDevelopMenuOpen((prev) => !prev);
                }}
                className={`h-7 px-3 py-0.5 rounded text-sm transition-colors ${topBarPositions?.removeButtonBackgrounds
                  ? 'border border-transparent text-gray-300 hover:text-white hover:bg-white/5'
                  : 'bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 text-gray-300 hover:text-white'
                }`}
                title="Develop"
              >
                Develop
              </button>

              {isDevelopMenuOpen && (
                <div className="absolute right-0 mt-1 w-[48rem] max-w-[85vw] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 p-2">
                  <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 leading-snug">
                    {developMenuEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setIsDevelopMenuOpen(false);
                          entry.onSelect();
                        }}
                        className="text-left px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Alpha Badge - only on alpha builds (top right) */}
          {__BUILD_PROFILE__ === 'alpha' && (
            <div className="px-2 py-1 bg-yellow-500 text-black rounded font-bold text-xs uppercase tracking-wider pointer-events-none">
              ALPHA
            </div>
          )}
        </div>
      )}

      {/* Dev-only dialog gallery. Portalled to body so it escapes the top bar's drag region
          and stacks above the rest of the shell. */}
      {showDevelopMenu && previewDialogId && createPortal(
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <DevDialogPreview dialogId={previewDialogId} onClose={() => setPreviewDialogId(null)} />
        </div>,
        document.body
      )}

      {/* Top Bar Context Menu */}
      {topBarContextMenu && (
        <TopBarContextMenu
          x={topBarContextMenu.x}
          y={topBarContextMenu.y}
          onClose={() => setTopBarContextMenu(null)}
          positions={topBarPositions}
          onPositionsChange={(positions) => {
            onTopBarPositionsChange?.(positions);
          }}
        />
      )}

      {/* Image optimization queue/detail modal (unified importer + cache).
          Rendered via portal so it always appears above other overlays like GameManager. */}
      {showImageQueueDetail && optimizationStatus && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setShowImageQueueDetail(false)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-full max-w-[108rem] max-h-[94vh] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Background image optimization</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadOptimizationLogs}
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-200"
                >
                  Download logs
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await window.electronAPI.optimization?.clearStatus?.();
                    } finally {
                      setShowImageQueueDetail(false);
                    }
                  }}
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-200"
                >
                  Clear report
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageQueueDetail(false)}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="min-h-[2.25rem] text-xs text-gray-400 bg-gray-900/40 border border-gray-700/70 rounded px-3 py-2">
                {optimizationStatus.runtime ? (
                  <>
                    Profile: {optimizationStatus.runtime.profile ?? 'balanced'} · Workers: {optimizationStatus.runtime.activeWorkers ?? 0}/{optimizationStatus.runtime.maxWorkers ?? 0}
                  {typeof optimizationStatus.runtime.availableWorkers === 'number' ? ` (raw capacity ${optimizationStatus.runtime.availableWorkers}, reserved ${optimizationStatus.runtime.reserveCores ?? 0}, queue worker cap ${optimizationStatus.runtime.maxWorkers ?? 0})` : ''}
                  {typeof optimizationStatus.runtime.cpuCount === 'number' ? ` · CPUs: ${optimizationStatus.runtime.cpuCount}` : ''}
                  {typeof optimizationStatus.runtime.systemCpuUsage === 'number' ? ` · CPU usage: ${optimizationStatus.runtime.systemCpuUsage.toFixed(0)}%` : ''}
                  {typeof optimizationStatus.runtime.queuedGames === 'number' ? ` · Queue games: ${optimizationStatus.runtime.queuedGames}` : ''}
                  {typeof optimizationStatus.runtime.allStaticComplete === 'boolean' ? ` · Static barrier: ${optimizationStatus.runtime.allStaticComplete ? 'open' : 'blocked'}` : ''}
                  </>
                ) : null}
              </div>
              <div className="flex justify-between">
                <span>
                  Games: {optimizationStatus.gamesDone} done, {optimizationStatus.gamesQueued} queued · Images: {optimizationStatus.imagesDone} done, {optimizationStatus.imagesQueued} queued
                </span>
                <span>
                  {(() => {
                    const total = optimizationStatus.imagesDone + optimizationStatus.imagesQueued;
                    return total > 0 ? `${Math.round((optimizationStatus.imagesDone / total) * 100)}%` : '0%';
                  })()}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500/80 transition-all duration-300"
                  style={{
                    width: (() => {
                      const total = optimizationStatus.imagesDone + optimizationStatus.imagesQueued;
                      return total > 0 ? `${(optimizationStatus.imagesDone / total) * 100}%` : '0%';
                    })(),
                  }}
                />
              </div>
              {/* Fixed-height row so layout does not bounce when active job changes */}
              <div className="mt-2 min-h-[2.5rem] flex flex-col justify-center">
                {optimizationStatus.jobs.some(j => j.phase === 'downloading' || j.phase === 'optimizing') ? (() => {
                  const active = optimizationStatus.jobs.find(j => j.phase === 'downloading' || j.phase === 'optimizing');
                  if (!active) return <p className="text-xs text-gray-500">—</p>;
                  const typeLabel = active.imageType === 'alternativeBanner' ? 'alternativeBanner' : active.imageType || 'image';
                  return (
                    <>
                      <p className="text-xs text-amber-300/90 mb-1 truncate" title={`${active.gameTitle} · ${typeLabel}`}>
                        Current: {active.gameTitle} · {typeLabel}
                      </p>
                      <div className="h-1.5 bg-gray-700/80 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full w-1/3 bg-amber-500 rounded-full [animation:optimizer-slide_1.2s_ease-in-out_infinite]" />
                      </div>
                      <style>{`
                        @keyframes optimizer-slide {
                          0%, 100% { transform: translateX(-100%); }
                          50% { transform: translateX(250%); }
                        }
                      `}</style>
                    </>
                  );
                })() : (
                  <p className="text-xs text-gray-500">—</p>
                )}
              </div>
              {optimizationStatus.jobs.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-700/70 font-mono text-[12px] text-gray-300">
                  {(() => {
                    const orderedTypes = ['boxart', 'banner', 'alternativeBanner', 'logo', 'hero', 'icon'];
                    const jobs = optimizationStatus.jobs;
                    const latestByGameAndType = new Map<string, Map<string, typeof jobs[0]>>();
                    for (const j of jobs) {
                      const game = j.gameTitle || j.gameId;
                      const type = (j.imageType || '').toLowerCase();
                      if (!type) continue;
                      if (!latestByGameAndType.has(game)) {
                        latestByGameAndType.set(game, new Map());
                      }
                      latestByGameAndType.get(game)!.set(type, j);
                    }
                    const games = Array.from(latestByGameAndType.keys());
                    const sortedGames = [...games].sort((a, b) => {
                      const aEntries = Array.from(latestByGameAndType.get(a)?.values() ?? []);
                      const bEntries = Array.from(latestByGameAndType.get(b)?.values() ?? []);
                      const aLatest = aEntries.reduce((m, e) => Math.max(m, e.updatedAt ?? 0), 0);
                      const bLatest = bEntries.reduce((m, e) => Math.max(m, e.updatedAt ?? 0), 0);
                      return bLatest - aLatest;
                    });
                    const fmtSize = (n?: number) => {
                      if (n == null) return '';
                      return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
                    };
                    const processingRows: JSX.Element[] = [];
                    const doneRows: JSX.Element[] = [];
                    let activeProcessingKey: string | null = null;

                    sortedGames.forEach((game) => {
                      const typeMap = latestByGameAndType.get(game)!;
                      const entries = Array.from(typeMap.values()).sort((a, b) => {
                        const ia = orderedTypes.indexOf((a.imageType || '').toLowerCase());
                        const ib = orderedTypes.indexOf((b.imageType || '').toLowerCase());
                        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                      });
                      const doneEntries = entries.filter(e => e.phase === 'done' || e.phase === 'failed' || e.phase === 'skipped');
                      const processingEntries = entries.filter(e => e.phase !== 'done' && e.phase !== 'failed' && e.phase !== 'skipped');
                      const sortedProcessingEntries = [...processingEntries].sort((a, b) => {
                        const aActive = a.phase === 'downloading' || a.phase === 'optimizing';
                        const bActive = b.phase === 'downloading' || b.phase === 'optimizing';
                        if (aActive !== bActive) return aActive ? -1 : 1;
                        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
                      });
                      const sortedDoneEntries = [...doneEntries].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

                      if (processingEntries.length > 0) {
                        const gameTotal = doneEntries.length + processingEntries.length;
                        const gamePct = gameTotal > 0 ? (doneEntries.length / gameTotal) * 100 : 0;
                        processingRows.push(
                          <div key={`${game}-processing-header`} className="mb-1">
                            <p className="text-white font-medium truncate" title={game}>
                              {game} · {doneEntries.length}/{gameTotal} images
                            </p>
                            <div className="h-1 bg-gray-700/60 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full bg-amber-500/70 transition-all duration-300"
                                style={{ width: `${gamePct}%` }}
                              />
                            </div>
                          </div>
                        );
                        sortedProcessingEntries.forEach((entry, idx) => {
                          const origStr = entry.originalBytes != null ? fmtSize(entry.originalBytes) : '';
                          const ext = entry.fileName ? entry.fileName.split('.').pop() : undefined;
                          const normalizedType = entry.imageType === 'alternativeBanner' ? 'alternativeBanner' : entry.imageType;
                          const displayExt = (ext ? ext.toUpperCase() : entry.sourceExt || 'UNKNOWN');
                          const typeLabel = normalizedType ? `${normalizedType} (${displayExt})` : `(${displayExt})`;
                          const rowKey = `${game}-processing-${entry.imageType}-${idx}`;
                          const isActive = entry.phase === 'downloading' || entry.phase === 'optimizing';
                          if (!activeProcessingKey && isActive) activeProcessingKey = rowKey;
                          processingRows.push(
                            <div
                              key={rowKey}
                              ref={(el) => {
                                if (activeProcessingKey === rowKey) activeProcessingRowRef.current = el;
                              }}
                              className="truncate min-w-0"
                              title={`${game} · ${typeLabel} · ${entry.fileName || '-'} ${origStr ? `Original - ${origStr}` : ''}`}
                            >
                              {game} · {typeLabel} · {entry.fileName || '-'} {origStr ? <>Original - {origStr} → <span className="text-amber-300 animate-pulse">Processing</span></> : 'Queued'}
                            </div>
                          );
                        });
                        processingRows.push(<div key={`${game}-processing-spacer`} className="h-2" />);
                      }
                      if (doneEntries.length > 0) {
                        doneRows.push(
                          <p key={`${game}-done-header`} className="text-white font-medium truncate mb-1" title={game}>
                            {game} · Images: {doneEntries.length} done
                          </p>
                        );
                        sortedDoneEntries.forEach((entry, idx) => {
                          const origStr = entry.originalBytes != null ? fmtSize(entry.originalBytes) : '';
                          const optStr = entry.optimizedBytes != null ? fmtSize(entry.optimizedBytes) : '';
                          const ext = entry.fileName ? entry.fileName.split('.').pop() : undefined;
                          const normalizedType = entry.imageType === 'alternativeBanner' ? 'alternativeBanner' : entry.imageType;
                          const displayExt = (ext ? ext.toUpperCase() : entry.sourceExt || 'UNKNOWN');
                          const typeLabel = normalizedType ? `${normalizedType} (${displayExt})` : `(${displayExt})`;
                          const isFailed = entry.phase === 'failed';
                          const isSkipped = entry.phase === 'skipped';
                          const skipLabel = entry.error ? entry.error : 'skipped';
                          doneRows.push(
                            <div key={`${game}-done-${entry.imageType}-${idx}`} className={`truncate min-w-0 ${isSkipped ? 'text-gray-400' : ''}`} title={`${game} · ${typeLabel} · ${entry.fileName || '-'}`}>
                              {game} · {typeLabel} · {entry.fileName || '-'} {isSkipped ? (
                                <span className="text-gray-400 italic">{skipLabel}</span>
                              ) : isFailed ? (
                                <>{origStr ? `Original - ${origStr} ` : ''}(failed){entry.error ? `: ${entry.error}` : ''}</>
                              ) : (
                                <>{origStr && optStr && <>Original - {origStr} → Optimized - {optStr}</>}</>
                              )}
                            </div>
                          );
                        });
                        doneRows.push(<div key={`${game}-done-spacer`} className="h-2" />);
                      }
                    });
                    return (
                      <div className="flex gap-8">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-400 font-semibold mb-1">Processing / queued</p>
                          <div ref={processingLogRef} className="max-h-[68vh] overflow-y-auto pr-2">
                            {processingRows.length > 0 ? processingRows : <p className="text-gray-500">None</p>}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-400 font-semibold mb-1">Completed</p>
                          <div ref={completedLogRef} className="max-h-[68vh] overflow-y-auto pr-2">
                            {doneRows.length > 0 ? doneRows : <p className="text-gray-500">None</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
