import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InteractiveOnyxLogo } from '../importer/InteractiveOnyxLogo';

const LARGE_LOGO_SIZE = 300;
const SMALL_LOGO_SCALE = 0.46;
const LARGE_LOGO_SCALE = 1.08;

export function InteractiveSettingsAboutLogo() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const centerPosition = () => {
      setPosition({
        x: Math.max(24, (window.innerWidth - LARGE_LOGO_SIZE) / 2),
        y: Math.max(24, (window.innerHeight - LARGE_LOGO_SIZE) / 2),
      });
      velocityRef.current = { x: 0, y: 0 };
    };

    centerPosition();

    const handleResize = () => {
      setPosition((prev) => {
        const fallback = {
          x: Math.max(24, (window.innerWidth - LARGE_LOGO_SIZE) / 2),
          y: Math.max(24, (window.innerHeight - LARGE_LOGO_SIZE) / 2),
        };
        if (!prev) return fallback;
        return {
          x: Math.min(Math.max(24, prev.x), Math.max(24, window.innerWidth - LARGE_LOGO_SIZE - 24)),
          y: Math.min(Math.max(24, prev.y), Math.max(24, window.innerHeight - LARGE_LOGO_SIZE - 24)),
        };
      });
    };

    const tick = () => {
      if (!isDraggingRef.current) {
        setPosition((prev) => {
          if (!prev) return prev;

          const next = {
            x: prev.x + velocityRef.current.x,
            y: prev.y + velocityRef.current.y,
          };

          const minX = 24;
          const minY = 24;
          const maxX = Math.max(24, window.innerWidth - LARGE_LOGO_SIZE - 24);
          const maxY = Math.max(24, window.innerHeight - LARGE_LOGO_SIZE - 24);

          if (next.x <= minX || next.x >= maxX) {
            next.x = Math.min(Math.max(next.x, minX), maxX);
            velocityRef.current.x *= -0.92;
          }

          if (next.y <= minY || next.y >= maxY) {
            next.y = Math.min(Math.max(next.y, minY), maxY);
            velocityRef.current.y *= -0.92;
          }

          velocityRef.current.x *= 0.994;
          velocityRef.current.y *= 0.994;

          if (Math.abs(velocityRef.current.x) < 0.008) velocityRef.current.x = 0;
          if (Math.abs(velocityRef.current.y) < 0.008) velocityRef.current.y = 0;

          return next;
        });
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return;

      setPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });

      const now = performance.now();
      if (lastPointerRef.current) {
        const dt = Math.max(8, now - lastPointerRef.current.time);
        velocityRef.current = {
          x: ((event.clientX - lastPointerRef.current.x) / dt) * 16,
          y: ((event.clientY - lastPointerRef.current.y) / dt) * 16,
        };
      }

      lastPointerRef.current = { x: event.clientX, y: event.clientY, time: now };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      lastPointerRef.current = null;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative bg-transparent p-0 transition-transform duration-300 hover:scale-[1.03]"
          aria-label="Open interactive Onyx logo"
        >
          <div style={{ transform: `scale(${SMALL_LOGO_SCALE})` }}>
            <InteractiveOnyxLogo />
          </div>
        </button>
      )}

      {isOpen && position && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[9999]">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="pointer-events-auto absolute right-6 top-6 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900/85"
          >
            Close
          </button>

          <div
            className="pointer-events-auto absolute cursor-grab active:cursor-grabbing"
            style={{ left: position.x, top: position.y, width: LARGE_LOGO_SIZE, height: LARGE_LOGO_SIZE }}
            onPointerDown={(event) => {
              event.preventDefault();
              isDraggingRef.current = true;
              velocityRef.current = { x: 0, y: 0 };
              dragOffsetRef.current = {
                x: event.clientX - position.x,
                y: event.clientY - position.y,
              };
              lastPointerRef.current = { x: event.clientX, y: event.clientY, time: performance.now() };
            }}
          >
            <div style={{ transform: `scale(${LARGE_LOGO_SCALE})` }}>
              <InteractiveOnyxLogo />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
