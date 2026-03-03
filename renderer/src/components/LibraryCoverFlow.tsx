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
  onUninstall?: (game: Game) => void;
  isHiddenView?: boolean;
  activeGameId?: string | null;
  coverSize?: number; // size of the center cover (width in px)
  reflectionStrength?: number; // 0–1, scales reflection opacity
  verticalOffset?: number; // vertical offset in px
  showButtons?: boolean;
  buttonPosition?: 'left' | 'middle' | 'right';
  buttonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  sideOpacity?: number;
  onEmptySpaceRightClick?: (x: number, y: number) => void;
}

const COVER_ASPECT = 2 / 3; // width / height, typical box art
const PERSPECTIVE = 1200;   // perspective (reference-style depth)
const ROTATION_DEG = 50;    // max Y rotation each side (iOS-like, per reference)
const CENTER_GAP = 220;     // horizontal spread for center + immediate neighbours (reference: centerGap)
const STACK_SPACING = 90;   // spacing for stacked items further out (reference: stackSpacing)
const Z_OFF_CENTER = -200;  // fixed recede when |pos| > 0.5 (reference)
const Z_CENTER_FALLOFF = 400; // z = -|pos| * this when |pos| <= 0.5 (reference)
const REFLECTION_HEIGHT_RATIO = 0.5;
const REFLECTION_OPACITY_START = 0.5;
const REFLECTION_OPACITY_END = 0;
const LOOP_SLOTS_LEFT = 8;
const LOOP_SLOTS_RIGHT = 8;
const SCALE_CENTER = 1;
const SCALE_MIN = 0.72;     // outer cards stay recognisable
const SCALE_FALLOFF = 0.08; // scale falloff per step from center
const BRIGHTNESS_OFF_CENTER = 0.55; // dim non-center cards (reference: 0.5)
const OPACITY_MIN = 0.35;
const OPACITY_FALLOFF = 0.12;
const SCROLL_DURATION_PER_STEP_MS = 420; // same speed per step (1 step or distant click)
const SCROLL_EASE = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
const PIXELS_PER_INDEX = 200; // drag distance (px) per item for 1:1 feel

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
  verticalOffset = 0,
  showButtons = true,
  buttonPosition = 'middle',
  buttonColors = {},
  sideOpacity = 100,
  onEditImages,
  onEditCategories,
  onFixMatch,
  onHide,
  onUnhide,
  onUninstall,
  isHiddenView = false,
  onEmptySpaceRightClick,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0); // fractional steps for smooth scroll (0 when idle)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const animationTargetRef = React.useRef(0);
  const scrollPositionRef = React.useRef(0);
  const isAnimatingRef = React.useRef(false); // true while scroll animating – don't notify parent until done (so background doesn't flash in-betweens)
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const dragStartXRef = React.useRef(0);
  const isDragActiveRef = React.useRef(false);
  const dragOffsetPxRef = React.useRef(0);
  const justDraggedRef = React.useRef(false);
  const isWebmUrl = (url?: string) => !!url && /\.webm(\?|$)/i.test(url);

  const validSelectedIndex = Math.max(0, Math.min(selectedIndex, games.length - 1));
  const selectedGame = games.length > 0 ? games[validSelectedIndex] : null;

  // Notify parent when selection settles
  const onGameClickRef = React.useRef(onGameClick);
  onGameClickRef.current = onGameClick;

  const requestSelection = React.useCallback(
    (targetIndex: number) => {
      if (games.length === 0) return;
      const length = games.length;
      const startLogical = scrollPositionRef.current;
      let delta = targetIndex - startLogical;
      if (delta > length / 2) delta -= length;
      if (delta < -length / 2) delta += length;
      if (delta === 0) return;

      animationTargetRef.current = targetIndex;
      isAnimatingRef.current = true;
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      const duration = Math.abs(delta) * SCROLL_DURATION_PER_STEP_MS;
      const startTime = performance.now();
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = SCROLL_EASE(t);
        const currentLogical = startLogical + delta * eased;
        scrollPositionRef.current = currentLogical;
        const rawIndex = Math.floor(currentLogical);
        const sel = ((rawIndex % length) + length) % length;
        const offset = currentLogical - rawIndex;
        setSelectedIndex(sel);
        setScrollOffset(offset);
        if (t < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
          isAnimatingRef.current = false;
          setSelectedIndex(targetIndex);
          setScrollOffset(0);
          scrollPositionRef.current = targetIndex;

          if (games[targetIndex]) {
            onGameClickRef.current?.(games[targetIndex]);
          }
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [games.length]
  );

  useEffect(() => {
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeGameId || games.length === 0) return;
    const index = games.findIndex((g) => g.id === activeGameId);
    if (index === -1) return;
    setSelectedIndex((prev) => {
      if (prev === index) return prev;
      animationTargetRef.current = index;
      scrollPositionRef.current = index;
      return index;
    });
  }, [activeGameId, games]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (games.length === 0) return;
      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const target = animationTargetRef.current;
          const next = target > 0 ? target - 1 : games.length - 1;
          requestSelection(next);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const target = animationTargetRef.current;
          const next = target < games.length - 1 ? target + 1 : 0;
          requestSelection(next);
          break;
        }
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
  }, [games, selectedGame, onGameClick, onPlay, requestSelection]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && !(e.target as HTMLElement).closest('.coverflow-context-menu')) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Wheel navigation disabled (scroll wheel no longer advances cover flow)

  // Click-and-drag to scroll
  const handleDragStart = React.useCallback((clientX: number) => {
    isDragActiveRef.current = true;
    dragStartXRef.current = clientX;
    setDragOffsetPx(0);
  }, []);
  const handleDragMove = React.useCallback((clientX: number) => {
    if (!isDragActiveRef.current) return;
    const px = dragStartXRef.current - clientX;
    dragOffsetPxRef.current = px;
    setDragOffsetPx(px);
  }, []);
  const handleDragEnd = React.useCallback(() => {
    if (!isDragActiveRef.current) return;
    isDragActiveRef.current = false;
    const px = dragOffsetPxRef.current;
    justDraggedRef.current = Math.abs(px) > 8;
    setDragOffsetPx(0);
    const effectiveOffset = scrollOffset + px / PIXELS_PER_INDEX;
    let newIndex = validSelectedIndex + Math.round(effectiveOffset);
    newIndex = ((newIndex % games.length) + games.length) % games.length;
    newIndex = Math.max(0, Math.min(newIndex, games.length - 1));
    if (newIndex !== validSelectedIndex) requestSelection(newIndex);
  }, [scrollOffset, validSelectedIndex, games.length, requestSelection]);
  useEffect(() => {
    const onMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const onUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [handleDragMove, handleDragEnd]);

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-transparent">
        <p className="text-gray-500 text-sm tracking-wide">No games to display</p>
      </div>
    );
  }

  const coverHeight = coverSize / COVER_ASPECT;
  const effectiveOffset = scrollOffset + dragOffsetPx / PIXELS_PER_INDEX; // includes drag for smooth flow
  scrollPositionRef.current = validSelectedIndex + effectiveOffset; // keep ref current for interrupt animation
  const playColor = buttonColors.playColor ?? '#0ea5e9';
  const editColor = buttonColors.editColor ?? '#6b7280';
  const modColor = buttonColors.modManagerColor ?? '#a855f7';
  const justifyMap = { left: 'justify-start', middle: 'justify-center', right: 'justify-end' } as const;

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col items-center justify-end overflow-hidden bg-transparent pb-2 relative cursor-grab active:cursor-grabbing"
      style={{ perspective: PERSPECTIVE }}
      onMouseDown={(e) => {
        if (e.button === 0 && !(e.target as HTMLElement).closest('button')) handleDragStart(e.clientX);
      }}
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
                if (selectedGame.id) {
                  try {
                    const result = await window.electronAPI.launchModManager(selectedGame.id);
                    if (!result.success && result.error) {
                      console.error('Error launching mod manager:', result.error);
                    }
                  } catch (err) {
                    console.error('Error opening mod manager:', err);
                  }
                }
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
          const centerIndex = Math.floor(validSelectedIndex + effectiveOffset); // render around current center to avoid blank when scrolling to edge
          const gameIndex = ((centerIndex + delta) % games.length + games.length) % games.length;
          const game = games[gameIndex];
          // Position in flow: center is at effectiveOffset, so slot delta is at (centerIndex + delta) - (validSelectedIndex + effectiveOffset) = delta + (centerIndex - validSelectedIndex - effectiveOffset). We want pos = (game index) - (logical center) = (centerIndex + delta) - (validSelectedIndex + effectiveOffset) = delta + centerIndex - validSelectedIndex - effectiveOffset. Since centerIndex = floor(validSelectedIndex + effectiveOffset), we have centerIndex <= validSelectedIndex + effectiveOffset < centerIndex + 1. So the offset (validSelectedIndex + effectiveOffset - centerIndex) is in [0,1). So pos = delta - (validSelectedIndex + effectiveOffset - centerIndex) = delta - frac. So we need pos = delta - (effectiveOffset + validSelectedIndex - centerIndex). Let's use: logicalCenter = validSelectedIndex + effectiveOffset; pos = (centerIndex + delta) - logicalCenter = delta + centerIndex - logicalCenter = delta - (logicalCenter - centerIndex). So pos = delta - (effectiveOffset + validSelectedIndex - centerIndex). So pos = delta - (validSelectedIndex + effectiveOffset - centerIndex). That's the position of this slot.
          const logicalCenter = validSelectedIndex + effectiveOffset;
          const pos = (centerIndex + delta) - logicalCenter;
          const absPos = Math.abs(pos);
          const isCenter = absPos < 0.5;

          // Rotation: smooth through center band, fixed angle outside (reference)
          let rotateY: number;
          if (absPos < 0.5) rotateY = -pos * (ROTATION_DEG * 2);
          else if (pos < 0) rotateY = ROTATION_DEG;
          else rotateY = -ROTATION_DEG;

          // X: center band uses centerGap spread; beyond that stack (reference)
          let xOffset: number;
          if (absPos < 1) xOffset = pos * CENTER_GAP;
          else {
            const stackIndex = absPos - 1;
            xOffset = pos < 0 ? -CENTER_GAP - stackIndex * STACK_SPACING : CENTER_GAP + stackIndex * STACK_SPACING;
          }

          // Z depth: recede off-center (reference)
          const z = absPos > 0.5 ? Z_OFF_CENTER : -Z_CENTER_FALLOFF * absPos;

          const scale = isCenter ? SCALE_CENTER : Math.max(SCALE_MIN, SCALE_CENTER - absPos * SCALE_FALLOFF);
          const baseOpacity = isCenter ? 1 : Math.max(OPACITY_MIN, 1 - absPos * OPACITY_FALLOFF);
          const opacity = isCenter ? 1 : baseOpacity * (sideOpacity / 100);
          const brightness = isCenter ? 1 : BRIGHTNESS_OFF_CENTER;
          // Base reflection opacity by position (centre fully opaque, sides gently fade)
          const baseReflectionOpacity = isCenter ? 1 : Math.max(0.25, 0.85 - absPos * 0.25);
          // Slider value is *transparency*: 0 = fully opaque, 1 = fully invisible
          const reflectionOpacity = (1 - reflectionStrength) * baseReflectionOpacity;

          const width = coverSize * scale;
          const height = width / COVER_ASPECT;
          const zIndex = 1000 - Math.round(absPos * 10);

          return (
            <div
              key={`${game.id}-${delta}`}
              data-game-element="true"
              data-game-card="true"
              className="absolute flex flex-col items-center transition-all duration-500 ease-out cursor-pointer"
              style={{
                left: '50%',
                transformStyle: 'preserve-3d',
                transform: `translateX(${xOffset - width / 2}px) translateY(${verticalOffset}px) translateZ(${z}px) rotateY(${rotateY}deg)`,
                zIndex,
                opacity,
                willChange: 'transform',
              }}
              onClick={() => {
                if (justDraggedRef.current) {
                  justDraggedRef.current = false;
                  return;
                }
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
                    : `0 ${10 + absPos * 4}px ${25 + absPos * 8}px -8px rgba(0,0,0,0.5)`,
                }}
              >
                {game.boxArtUrl || game.bannerUrl ? (
                  (() => {
                    const artworkUrl = game.boxArtUrl || game.bannerUrl;
                    const isVideo = (artworkUrl === game.boxArtUrl && game.boxArtIsVideo) || (artworkUrl === game.bannerUrl && game.bannerIsVideo) || isWebmUrl(artworkUrl);
                    if (isVideo && artworkUrl) {
                      const videoKind: 'boxart' | 'banner' = artworkUrl === game.bannerUrl ? 'banner' : 'boxart';
                      return (
                        <video
                          src={artworkUrl}
                          data-animation-kind={videoKind}
                          muted
                          loop
                          playsInline
                          autoPlay
                          className="w-full h-full object-cover"
                          style={isCenter ? { filter: 'brightness(1.04) contrast(1.02)' } : { filter: `brightness(${brightness})` }}
                        />
                      );
                    }
                    return (
                      <img
                        src={artworkUrl}
                        alt={game.title}
                        className="w-full h-full object-cover"
                        draggable={false}
                        style={isCenter ? { filter: 'brightness(1.04) contrast(1.02)' } : { filter: `brightness(${brightness})` }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    );
                  })()
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <span className="text-gray-500 text-sm text-center px-2">{game.title}</span>
                  </div>
                )}
                {(game.favorite || game.pinned) && (
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                    {game.favorite && (
                      <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white group- hover:animate-gentle-bounce group-hover:animate-gentle-bounce" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    )}
                    {game.pinned && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white group- hover:animate-pin-shake group-hover:animate-pin-shake" fill="currentColor" viewBox="0 0 24 24">
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
                  // 0% transparency = fully opaque, 100% = fully see-through
                  opacity: reflectionOpacity,
                  // Darkening follows opacity: no darkening when fully transparent
                  background: `linear-gradient(to bottom, rgba(0,0,0,${REFLECTION_OPACITY_START * reflectionOpacity}), rgba(0,0,0,${REFLECTION_OPACITY_END}))`,
                  // At 0% transparency use an opaque mask so reflection is solid; at higher transparency the mask fades to transparent so background shows through
                  WebkitMaskImage: reflectionStrength >= 0.99
                    ? 'none'
                    : reflectionStrength <= 0.01
                      ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 100%)'
                      : `linear-gradient(to bottom, rgba(0,0,0,${0.7 + 0.3 * (1 - reflectionStrength)}) 0%, rgba(0,0,0,${0.2 + 0.72 * (1 - reflectionStrength)}) 60%, rgba(0,0,0,${(1 - reflectionStrength) * 0.3}) 100%)`,
                  maskImage: reflectionStrength >= 0.99
                    ? 'none'
                    : reflectionStrength <= 0.01
                      ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 100%)'
                      : `linear-gradient(to bottom, rgba(0,0,0,${0.7 + 0.3 * (1 - reflectionStrength)}) 0%, rgba(0,0,0,${0.2 + 0.72 * (1 - reflectionStrength)}) 60%, rgba(0,0,0,${(1 - reflectionStrength) * 0.3}) 100%)`,
                }}
              >
                {game.boxArtUrl || game.bannerUrl ? (
                  <img
                    src={game.boxArtUrl || game.bannerUrl}
                    alt=""
                    className="w-full h-full object-cover object-top"
                    draggable={false}
                    // Image visibility also follows transparency (0 = solid, 1 = invisible)
                    style={{ opacity: 0.4 + 0.6 * (1 - reflectionStrength) }}
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
            onUninstall={onUninstall}
            isHiddenView={isHiddenView}
          />,
          document.body
        )}
    </div>
  );
};
