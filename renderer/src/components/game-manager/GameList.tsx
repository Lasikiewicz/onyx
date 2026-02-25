import React from 'react';
import { Game } from '../../types/game';

interface GameListProps {
  games: Game[];
  selectedGameId: string | null;
  onSelectGame: (id: string) => void;
  viewMode: 'boxart' | 'icon' | 'text';
  onViewModeChange: (mode: 'boxart' | 'icon' | 'text') => void;
  getLauncherName: (game: Game) => string;
}

export const GameList: React.FC<GameListProps> = ({
  games,
  selectedGameId,
  onSelectGame,
  viewMode,
  onViewModeChange,
  getLauncherName,
}) => {
  return (
    <div className="w-80 border-r border-gray-800 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 bg-gray-900 border-b border-gray-700 pb-2 top-0 sticky z-10">
          <h3 className="text-sm font-semibold text-gray-300">Imported Games ({games.length})</h3>
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => onViewModeChange('boxart')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'boxart' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title="Boxart View"
            >
              <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button
              onClick={() => onViewModeChange('icon')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'icon' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title="Icon View"
            >
              <svg className="w-4 h-4 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </button>
            <button
              onClick={() => onViewModeChange('text')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'text' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title="Text Only"
            >
              <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedGameId === game.id
                ? 'bg-blue-600/30 border border-blue-500/50'
                : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700'
                }`}
            >
              {viewMode === 'boxart' && (
                <img
                  src={game.boxArtUrl || '/placeholder.png'}
                  alt={game.title}
                  className="w-16 h-20 object-cover rounded flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.png';
                    target.onerror = () => { target.style.display = 'none'; };
                  }}
                />
              )}
              {viewMode === 'icon' && (
                <div className="w-10 h-10 flex-shrink-0 rounded p-1 flex items-center justify-center border border-gray-700">
                  {game.iconUrl ? (
                    <img
                      src={game.iconUrl}
                      alt={game.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[8px] text-gray-500">No Icon</span>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{game.title}</p>
                <p className="text-xs text-gray-400 mt-1">{getLauncherName(game)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
