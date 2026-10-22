import React, { useEffect, useState } from 'react';
import type { Game } from '../../types/game';
import type { ControllerButtonLayout } from '../../utils/controllerLabels';
import { ControllerHints } from './ControllerHints';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface BigScreenShellProps {
  games: Game[];
  activeGame: Game | null;
  loading: boolean;
  error: string | null;
  buttonLayout: ControllerButtonLayout;
  searchQuery: string;
  selectedCategory: string | null;
  menuOpen: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (game: Game) => void;
  onPlay: (game: Game) => void;
  onToggleFavorite: (game: Game) => void;
  onOpenGameMenu: (game: Game, x: number, y: number) => void;
  onOpenSettings: () => void;
  onCloseMenu: () => void;
  onExit: () => void;
}

function artUrl(game: Game | null): string {
  if (!game) return '';
  return game.heroUrl || game.bannerUrl || game.boxArtUrl || '';
}

function isVideoArt(game: Game | null, url: string): boolean {
  if (!game || !url) return false;
  if (url === game.heroUrl) return game.heroIsVideo === true;
  if (url === game.bannerUrl) return game.bannerIsVideo === true;
  if (url === game.boxArtUrl) return game.boxArtIsVideo === true;
  return false;
}

export const BigScreenShell: React.FC<BigScreenShellProps> = ({
  games,
  activeGame,
  loading,
  error,
  buttonLayout,
  searchQuery,
  selectedCategory,
  menuOpen,
  onSearchChange,
  onSelect,
  onPlay,
  onToggleFavorite,
  onOpenGameMenu,
  onOpenSettings,
  onCloseMenu,
  onExit,
}) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const heroUrl = artUrl(activeGame);
  const heroIsVideo = isVideoArt(activeGame, heroUrl);

  useEffect(() => {
    if (keyboardOpen || menuOpen || !activeGame) return;
    const card = document.querySelector<HTMLElement>(`[data-controller-game-card="${CSS.escape(activeGame.id)}"]`);
    card?.focus({ preventScroll: true });
  }, [activeGame, keyboardOpen, menuOpen, games]);

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col bg-black/35 text-white">
      <header className="flex items-center gap-6 px-10 pt-8">
        <div className="text-3xl font-semibold tracking-[0.2em] text-sky-200">ONYX</div>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search library</span>
          <input
            data-controller-top-control="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => setKeyboardOpen(true)}
            placeholder="Search"
            className="w-full rounded-2xl border border-white/15 bg-black/45 px-6 py-4 text-2xl text-white placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onExit}
          className="rounded-2xl bg-white/10 px-6 py-4 text-2xl font-medium hover:bg-white/20 focus:outline-none"
        >
          Exit
        </button>
      </header>

      <section className="relative mx-10 mt-6 min-h-[28vh] overflow-hidden rounded-3xl border border-white/10">
        {heroUrl && !heroIsVideo && (
          <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {heroUrl && heroIsVideo && (
          <video src={heroUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
        <div className="relative flex h-full flex-col justify-end gap-4 p-10">
          <p className="text-xl uppercase tracking-[0.18em] text-sky-200">
            {selectedCategory ? selectedCategory : 'Library'}
            {activeGame?.favorite ? ' · Favorite' : ''}
          </p>
          <h1 className="max-w-4xl text-6xl font-semibold leading-tight">{activeGame?.title || (loading ? 'Loading library' : 'No games')}</h1>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              data-controller-action="play"
              disabled={!activeGame}
              onClick={() => activeGame && onPlay(activeGame)}
              className="rounded-full bg-sky-500 px-10 py-4 text-2xl font-semibold text-slate-950 disabled:opacity-40 focus:outline-none"
            >
              Play
            </button>
            <button
              type="button"
              disabled={!activeGame}
              onClick={() => activeGame && onToggleFavorite(activeGame)}
              className="rounded-full bg-white/15 px-8 py-4 text-2xl font-medium disabled:opacity-40 focus:outline-none"
            >
              {activeGame?.favorite ? 'Unfavorite' : 'Favorite'}
            </button>
          </div>
        </div>
      </section>

      <div
        data-controller-library-surface
        className="min-h-0 flex-1 overflow-y-auto px-10 py-6"
      >
        {error && <p className="mb-4 text-2xl text-red-300">{error}</p>}
        {!loading && games.length === 0 && (
          <p className="text-2xl text-slate-300">No games match this view. Open the menu to leave Big Screen or change the search.</p>
        )}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
          {games.map((game) => {
            const selected = game.id === activeGame?.id;
            const cover = game.boxArtUrl && !game.boxArtIsVideo ? game.boxArtUrl : '';
            return (
              <button
                key={game.id}
                type="button"
                data-controller-game-card={game.id}
                onClick={() => onSelect(game)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onOpenGameMenu(game, event.clientX, event.clientY);
                }}
                className={`group relative aspect-[2/3] overflow-hidden rounded-2xl border text-left focus:outline-none ${selected ? 'border-white ring-4 ring-white' : 'border-white/10'}`}
              >
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-950" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 text-xl font-semibold leading-tight">
                  {game.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-white/10 bg-black/50 px-10 py-4">
        <ControllerHints layout={buttonLayout} />
      </footer>

      {keyboardOpen && (
        <OnScreenKeyboard
          query={searchQuery}
          onChange={onSearchChange}
          onClose={() => {
            setKeyboardOpen(false);
            const card = activeGame
              ? document.querySelector<HTMLElement>(`[data-controller-game-card="${CSS.escape(activeGame.id)}"]`)
              : null;
            card?.focus({ preventScroll: true });
          }}
        />
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-8">
          <div
            data-spatial-root=""
            data-spatial-active="true"
            role="menu"
            aria-label="Big Screen menu"
            className="w-full max-w-xl rounded-3xl border border-white/15 bg-slate-950 p-6 shadow-2xl"
          >
            <h2 className="mb-4 text-4xl font-semibold">Menu</h2>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  onCloseMenu();
                  setKeyboardOpen(true);
                }}
                className="rounded-2xl bg-white/10 px-6 py-5 text-left text-2xl hover:bg-white/20 focus:outline-none"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseMenu();
                  onOpenSettings();
                }}
                className="rounded-2xl bg-white/10 px-6 py-5 text-left text-2xl hover:bg-white/20 focus:outline-none"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-2xl bg-white/10 px-6 py-5 text-left text-2xl hover:bg-white/20 focus:outline-none"
              >
                Exit Big Screen
              </button>
              <button
                type="button"
                data-spatial-dismiss=""
                onClick={onCloseMenu}
                className="rounded-2xl px-6 py-5 text-left text-2xl text-slate-300 hover:bg-white/10 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
