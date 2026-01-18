import React, { useMemo, useState } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';

interface ImportSidebarProps {
    queue: StagedGame[];
    selectedId: string | null;
    onSelectGame: (id: string) => void;
    isScanning: boolean;
    ignoredGames: Set<string>;
    showIgnored: boolean;
    onToggleShowIgnored: () => void;
}

export const ImportSidebar: React.FC<ImportSidebarProps> = ({
    queue,
    selectedId,
    onSelectGame,
    isScanning,
    showIgnored,
    onToggleShowIgnored
}) => {
    const [activeTab, setActiveTab] = useState<ImportSource | 'all'>('all');

    // Filter games based on showIgnored state
    const visibleGames = useMemo(() => {
        // First apply the ignored filter
        const statusFiltered = showIgnored
            ? queue.filter(g => g.isIgnored)
            : queue.filter(g => !g.isIgnored);

        // Then apply tab filter
        if (activeTab === 'all') return statusFiltered;
        return statusFiltered.filter(g => g.source === activeTab);
    }, [queue, showIgnored, activeTab]);

    // Group games by source for counts
    const counts = useMemo(() => {
        const defaultCounts: Record<string, number> = {
            all: 0,
            steam: 0,
            epic: 0,
            gog: 0,
            xbox: 0,
            ubisoft: 0,
            rockstar: 0,
            ea: 0,
            battle: 0,
            manual_file: 0,
            manual_folder: 0
        };

        // Calculate checks based on whether they are ignored or not (matching current view mode)
        const baseGames = showIgnored
            ? queue.filter(g => g.isIgnored)
            : queue.filter(g => !g.isIgnored);

        baseGames.forEach(g => {
            defaultCounts.all++;
            if (g.source) {
                defaultCounts[g.source] = (defaultCounts[g.source] || 0) + 1;
            }
        });

        return defaultCounts;
    }, [queue, showIgnored]);

    // Get status color
    const getStatusColor = (status: ImportStatus): string => {
        switch (status) {
            case 'ready': return 'text-green-400';
            case 'ambiguous':
            case 'matched':
                return 'text-yellow-400';
            case 'error': return 'text-red-400';
            case 'scanning': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: ImportStatus): string => {
        switch (status) {
            case 'ready': return '✓';
            case 'ambiguous': return '?';
            case 'error': return '✗';
            case 'scanning': return '⟳';
            default: return '○';
        }
    };

    const tabs: { id: ImportSource | 'all', label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'steam', label: 'Steam' },
        { id: 'xbox', label: 'Xbox' },
        { id: 'gog', label: 'GOG' },
        { id: 'epic', label: 'Epic' },
        { id: 'manual_folder', label: 'Folder' },
        { id: 'manual_file', label: 'File' }
    ];

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            {/* Source Tabs */}
            <div className="flex overflow-x-auto p-2 gap-2 border-b border-gray-800 custom-scrollbar hide-scrollbar">
                {tabs.map(tab => (
                    counts[tab.id] > 0 && (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                        >
                            {tab.label} <span className="opacity-70 text-[10px] ml-1">{counts[tab.id]}</span>
                        </button>
                    )
                ))}
            </div>

            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">{visibleGames.length} games found</span>
                <button
                    onClick={onToggleShowIgnored}
                    className={`text-xs px-2 py-1 rounded transition-colors ${showIgnored ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    {showIgnored ? 'Show Active' : 'Show Ignored'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {visibleGames.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        {isScanning ? 'Scanning...' : 'No games found'}
                    </div>
                ) : (
                    visibleGames.map(game => (
                        <div
                            key={game.uuid}
                            onClick={() => onSelectGame(game.uuid)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all cursor-pointer group ${selectedId === game.uuid
                                ? 'bg-blue-600/20 border border-blue-500/50'
                                : 'hover:bg-gray-800 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-medium truncate ${selectedId === game.uuid ? 'text-white' : 'text-gray-300'}`}>
                                    {game.title}
                                </span>
                                <span className={`text-xs ml-2 ${getStatusColor(game.status as ImportStatus)}`}>
                                    {getStatusIcon(game.status as ImportStatus)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded capitalize">{game.source.replace('_', ' ')}</span>
                                {game.appId && <span>ID: {game.appId}</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
