import React from 'react';
import type { ImportSource, ImportStatus } from '../../types/importer';
import { LauncherIcon, getLauncherDisplayName } from '../../utils/launcherIcons';

export const SOURCE_LABELS: Record<ImportSource, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    gog: 'GOG Galaxy',
    xbox: 'Xbox Game Pass',
    ubisoft: 'Ubisoft Connect',
    rockstar: 'Rockstar Games',
    ea: 'EA App / Origin',
    battle: 'Battle.net',
    manual_file: 'Manual File',
    manual_folder: 'Game',
};

export const getSourceIcon = (source: string): React.ReactNode => {
    const cls = 'w-4 h-4 flex-shrink-0';

    if (source === 'manual_file') {
        return (
            <svg
                className={cls}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        );
    }

    if (source === 'manual_folder') {
        return (
            <svg
                className={cls}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
        );
    }

    return (
        <LauncherIcon
            launcher={source as ImportSource}
            className={cls}
            alt={`${getLauncherDisplayName(source)} icon`}
        />
    );
};

export const getStatusColor = (status: ImportStatus) => {
    switch (status) {
        case 'ready':
            return 'text-green-400';
        case 'matched':
            return 'text-blue-400';
        case 'ambiguous':
            return 'text-yellow-400';
        case 'error':
            return 'text-red-400';
        case 'pending':
            return 'text-gray-500';
        case 'scanning':
            return 'text-blue-300';
        default:
            return 'text-gray-400';
    }
};

export const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
        case 'ready':
            return '✓';
        case 'matched':
            return '◎';
        case 'ambiguous':
            return '?';
        case 'error':
            return '✗';
        case 'pending':
            return '○';
        case 'scanning':
            return '↻';
        default:
            return '○';
    }
};

