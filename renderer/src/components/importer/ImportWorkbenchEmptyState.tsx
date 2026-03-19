import React from 'react';
import { InteractiveOnyxLogo } from './InteractiveOnyxLogo';

const IMPORT_SOURCE_PREVIEW = ['Steam', 'Epic Games', 'GOG Galaxy', 'Xbox Game Pass', 'Ubisoft Connect', 'Rockstar Games', 'EA App / Origin', 'Battle.net'];

const IMPORT_REVIEW_POINTS = [
    'Scan your launchers and folders in one pass.',
    'Review matches before anything touches your library.',
    'Fix artwork, metadata, and launch details before import.',
];

export interface ImportWorkbenchEmptyStateProps {
    isScanning: boolean;
    onScanAll: () => void;
}

export const ImportWorkbenchEmptyState: React.FC<ImportWorkbenchEmptyStateProps> = ({ isScanning, onScanAll }) => {
    return (
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(135deg,#0b1120_0%,#111827_46%,#090e1a_100%)]">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />
            <div className="relative z-10 flex h-full flex-col justify-center p-8 lg:p-10">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,1fr)]">
                    <div className="max-w-2xl space-y-6 lg:pl-8 xl:pl-12">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <h3 className="max-w-xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                                    Discover your installed games and bring them into Onyx
                                </h3>
                                <p className="max-w-xl text-base leading-7 text-slate-300 lg:text-lg">
                                    Scan your launchers, review what was found, and refine metadata before you import anything into your library.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {IMPORT_SOURCE_PREVIEW.map(source => (
                                <span
                                    key={source}
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                >
                                    {source}
                                </span>
                            ))}
                        </div>

                        <button
                            onClick={onScanAll}
                            disabled={isScanning}
                            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 px-7 py-4 text-lg font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.01] hover:shadow-[0_24px_55px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600 disabled:shadow-none md:max-w-[calc(100%-0rem)]"
                        >
                            {isScanning ? (
                                <>
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Scanning System...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                    <span>Scan For Games</span>
                                </>
                            )}
                        </button>

                        <div className="grid gap-3 md:grid-cols-3">
                            {IMPORT_REVIEW_POINTS.map(point => (
                                <div
                                    key={point}
                                    className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl"
                                >
                                    <div className="mb-3 h-1.5 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                                    <p className="text-sm leading-6 text-slate-300">{point}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <InteractiveOnyxLogo />
                    </div>
                </div>
            </div>
        </div>
    );
};

