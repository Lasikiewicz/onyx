import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Game } from '../types/game';
import { GameContextMenu } from './GameContextMenu';

interface LibraryCoverFlowProps {
  games: Game[];
  onPlay?: (game: Game) => void;
  onGameClick?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onEditCategories?: (game: Game) => void;
  onFavorite?: (game: Game) => void;
  onPin?: (game: Game) => void;
  onFixMatch?: (game: Game) => void;
  onHide?: (game: Game) => void;
  onUnhide?: (game: Game) => void;
  isHiddenView?: boolean;
  activeGameId?: string | null;
  coverSize?: number; // size of the center cover (width in px)
  reflectionStrength?: number; // 0–1, scales reflection opacity
  showButtons?: boolean;
  buttonPosition?: 'left' | 'middle' | 'right';
  buttonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onEmptySpaceRightClick?: (x: number, y: number) => void;
}

const COVER_ASPECT = 2 / 3; // width / height, typical box art
const PERSPECTIVE = 1000;   // subtle perspective distortion
const ANGLE_FIRST = 12;
const ANGLE_STEP = 10;
const ANGLE_MAX = 46;       // cap so outer cards stay recognisable (not edge-on)
const DEPTH_PER_SLOT = 28;  // gentler depth so outer cards don't squash
const DEPTH_CAP = 120;      // max translateZ so perspective stays subtle
const REFLECTION_HEIGHT_RATIO = 0.5;
const REFLECTION_OPACITY_START = 0.5;
const REFLECTION_OPACITY_END = 0;
const LOOP_SLOTS_LEFT = 8;
const LOOP_SLOTS_RIGHT = 8;
const HORIZONTAL_SPACING = 165;
const SCALE_CENTER = 1;
const SCALE_MIN = 0.72;           // outer cards stay clearly rectangular
const SCALE_FALLOFF_PER_STEP = 0.07; // only first ~4 steps shrink noticeably
const OPACITY_MIN = 0.28;
const OPACITY_FALLOFF_PER_STEP = 0.11;  // for centre + 1st + 2nd neighbour
const OPACITY_FADE_AFTER_2ND = 0.22;    // extra fade per step after 2nd neighbour (they match 2nd, then fade)
const OPACITY_END_MIN = 0.1;            // minimum for outermost
const SCROLL_DURATION_MS = 520;         // smooth scroll animation (slower)
const SCROLL_EASE = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

export const LibraryCoverFlow: React.FC<LibraryCoverFlowProps> = ({
  games,
  onPlay,
  onGameClick,
  onEdit,
  onFavorite,
  onPin,
  activeGameId,
  coverSize = 300,
  reflectionStrength = 0.6,
  showButtons = true,
  buttonPosition = 'middle',
  buttonColors = {},
  onEditImages,
  onEditCategories,
  onFixMatch,
  onHide,
  onUnhide,
  isHiddenView = false,
  onEmptySpaceRightClick,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0); // fractional steps for smooth scroll (0 when idle)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);
  const animationRef = React.useRef<number | null>(null);

  const validSelectedIndex = Math.max(0, Math.min(selectedIndex, games.length - 1));
  const selectedGame = games.length > 0 ? games[validSelectedIndex] : null;

  const requestSelection = React.useCallback(
    (targetIndex: number) => {
      if (games.length === 0) return;
      const from = validSelectedIndex;
      let steps = (targetIndex - from) % games.length;
      if (steps > games.length / 2) steps -= games.length;
      if (steps < -games.length / 2) steps += games.length;
      if (steps === 0) return;

      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      const startTime = performance.now();
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / SCROLL_DURATION_MS);
        const eased = SCROLL_EASE(t);
        setScrollOffset(eased * steps);
        if (t < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
          setSelectedIndex(targetIndex);
          setScrollOffset(0);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [games.length, validSelectedIndex]
  );

  useEffect(() => {
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeGameId && games.length > 0) {
      const index = games.findIndex((g) => g.id === activeGameId);
      if (index !== -1 && index !== selectedIndex) setSelectedIndex(index);
    }
  }, [activeGameId, games]);

  // Notify parent when selection changes (e.g. keyboard) so activeGameId stays in sync
  const prevIndexRef = React.useRef(validSelectedIndex);
  useEffect(() => {
    if (selectedGame && prevIndexRef.current !== validSelectedIndex) {
      prevIndexRef.current = validSelectedIndex;
      onGameClick?.(selectedGame);
    }
  }, [validSelectedIndex, selectedGame, onGameClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (games.length === 0) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          requestSelection(validSelectedIndex > 0 ? validSelectedIndex - 1 : games.length - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          requestSelection(validSelectedIndex < games.length - 1 ? validSelectedIndex + 1 : 0);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (selectedGame) {
            if (e.key === ' ') onPlay?.(selectedGame);
            else onGameClick?.(selectedGame);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [games, validSelectedIndex, selectedGame, onGameClick, onPlay, requestSelection]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && !(e.target as HTMLElement).closest('.coverflow-context-menu')) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-transparent">
        <p className="text-gray-500 text-sm tracking-wide">No games to display</p>
      </div>
    );
  }

  const coverHeight = coverSize / COVER_ASPECT;
  const playColor = buttonColors.playColor ?? '#0ea5e9';
  const editColor = buttonColors.editColor ?? '#6b7280';
  const modColor = buttonColors.modManagerColor ?? '#a855f7';
  const justifyMap = { left: 'justify-start', middle: 'justify-center', right: 'justify-end' } as const;

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-end overflow-hidden bg-transparent pb-2 relative"
      style={{ perspective: PERSPECTIVE }}
      onContextMenu={(e) => {
        if (!(e.target as HTMLElement).closest('[data-game-element]')) {
          e.preventDefault();
          onEmptySpaceRightClick?.(e.clientX, e.clientY);
        }
      }}
    >
      {/* Action buttons strip (when showButtons) */}
      {showButtons && selectedGame && (
        <div
          className={`absolute left-4 right-4 bottom-4 flex gap-2 ${justifyMap[buttonPosition]}`}
          style={{ zIndex: 200 }}
        >
          {onPlay && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPlay(selectedGame); }}
              className="px-3 py-1.5 rounded text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: playColor }}
            >
              Play
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(selectedGame); }}
              className="px-3 py-1.5 rounded text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: editColor }}
            >
              Edit
            </button>
          )}
          {selectedGame.modManagerUrl && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (selectedGame.modManagerUrl) await window.electronAPI?.openExternal(selectedGame.modManagerUrl);
              }}
              className="px-3 py-1.5 rounded text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: modColor }}
            >
              Mod Mgr
            </button>
          )}
        </div>
      )}
      {/* Subtle reflection plane (no black background) */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '30%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.06) 100%)',
        }}
      />
      <div
        className="relative flex items-end justify-center"
        style={{
          height: coverHeight * (1 + REFLECTION_HEIGHT_RATIO),
          width: '100%',
          perspectiveOrigin: '50% 45%',
          transformStyle: 'preserve-3d',
        }}
      >
        {Array.from({ length: LOOP_SLOTS_LEFT + 1 + LOOP_SLOTS_RIGHT }, (_, slotIndex) => {
          const delta = slotIndex - LOOP_SLOTS_LEFT;
          const gameIndex = ((validSelectedIndex + delta) % games.length + games.length) % games.length;
          const game = games[gameIndex];
          // Flow: use position during scroll so boxarts grow/shrink and ease through center
          const flowDelta = delta - scrollOffset;
          const absFlow = Math.abs(flowDelta);
          const isCenter = absFlow < 0.45;
          const effectiveVisual = Math.min(absFlow, 2);

          const angleDeg = isCenter ? 0 : Math.min(ANGLE_MAX, ANGLE_FIRST + (effectiveVisual - 1) * ANGLE_STEP);
          const rotateY = flowDelta * -angleDeg;
          const scale = isCenter ? SCALE_CENTER : Math.max(SCALE_MIN, SCALE_CENTER - effectiveVisual * SCALE_FALLOFF_PER_STEP);
          const z = Math.max(-DEPTH_CAP, -effectiveVisual * DEPTH_PER_SLOT);
          const opacityAt2 = Math.max(OPACITY_MIN, 1 - 2 * OPACITY_FALLOFF_PER_STEP);
          const opacity =
            isCenter
              ? 1
              : absFlow <= 2
                ? Math.max(OPACITY_MIN, 1 - absFlow * OPACITY_FALLOFF_PER_STEP)
                : opacityAt2 * Math.max(OPACITY_END_MIN, 1 - (absFlow - 2) * OPACITY_FADE_AFTER_2ND);

          const width = coverSize * scale;
          const height = width / COVER_ASPECT;
          const xOffset = flowDelta * HORIZONTAL_SPACING;
          const zIndex = 100 - absFlow;

          return (
            <div
              key={`${game.id}-${delta}`}
              data-game-element="true"
              data-game-card="true"
              className="absolute flex flex-col items-center transition-all duration-500 ease-out cursor-pointer"
              style={{
                left: '50%',
                transformStyle: 'preserve-3d',
                transform: `translateX(${xOffset - width / 2}px) rotateY(${rotateY}deg) translateZ(${z}px)`,
                zIndex,
                opacity,
                willChange: 'transform',
              }}
              onClick={() => {
                if (delta !== 0) {
                  requestSelection(gameIndex);
                } else if (selectedGame) {
                  onGameClick?.(selectedGame);
                }
              }}
              onDoubleClick={() => {
                if (delta === 0 && selectedGame) onPlay?.(selectedGame);
              }}
              onAuxClick={(e) => {
                if (e.button === 1 && delta === 0 && selectedGame) {
                  e.preventDefault();
                  onPlay?.(selectedGame);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, game });
              }}
            >
              <div
                className="relative overflow-hidden rounded-lg flex-shrink-0"
                style={{
                  width,
                  height,
                  backfaceVisibility: 'hidden',
                  boxShadow: isCenter
                    ? '0 20px 60px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
                    : `0 ${10 + effectiveVisual * 4}px ${25 + effectiveVisual * 8}px -8px rgba(0,0,0,0.5)`,
                }}
              >
                {game.boxArtUrl || game.bannerUrl ? (
                  <img
                    src={game.boxArtUrl || game.bannerUrl}
                    alt={game.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                    style={isCenter ? { filter: 'brightness(1.04) contrast(1.02)' } : undefined}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <span className="text-gray-500 text-sm text-center px-2">{game.title}</span>
                  </div>
                )}
                {(game.favorite || game.pinned) && (
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                    {game.favorite && (
                      <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    )}
                    {game.pinned && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Soft reflection on glossy dark surface */}
              <div
                className="relative overflow-hidden rounded-lg flex-shrink-0"
                style={{
                  width,
                  height: height * REFLECTION_HEIGHT_RATIO,
                  marginTop: 4,
                  transform: 'scaleY(-1)',
                  opacity: reflectionStrength * (isCenter ? 0.6 : absFlow <= 2 ? Math.max(0.08, 0.5 - absFlow * 0.07) : Math.max(0.04, 0.36 - (absFlow - 2) * 0.08)),
                  background: `linear-gradient(to bottom, rgba(0,0,0,${REFLECTION_OPACITY_START * reflectionStrength}), rgba(0,0,0,${REFLECTION_OPACITY_END}))`,
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
                }}
              >
                {game.boxArtUrl || game.bannerUrl ? (
                  <img
                    src={game.boxArtUrl || game.bannerUrl}
                    alt=""
                    className="w-full h-full object-cover object-top"
                    draggable={false}
                    style={{ opacity: 0.7 }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu &&
        createPortal(
          <GameContextMenu
            game={contextMenu.game}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onPlay={onPlay}
            onEdit={onEdit}
            onEditImages={onEditImages}
            onEditCategories={onEditCategories}
            onFavorite={onFavorite}
            onPin={onPin}
            onFixMatch={onFixMatch}
            onHide={onHide}
            onUnhide={onUnhide}
            isHiddenView={isHiddenView}
          />,
          document.body
        )}
    </div>
  );
};
