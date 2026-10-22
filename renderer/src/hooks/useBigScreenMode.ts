import { useCallback, useEffect, useRef, useState } from 'react';
import type { BigScreenDisplayChoice } from '../types/bigScreen';

function topSpatialDismiss(): HTMLElement | null {
  const roots = document.querySelectorAll<HTMLElement>('[data-spatial-root][data-spatial-active="true"]');
  const root = roots.item(roots.length - 1);
  const dismiss = root?.querySelector<HTMLElement>('[data-spatial-dismiss]');
  return dismiss ?? null;
}

/**
 * Big Screen session for the renderer. The main process owns the real fullscreen
 * window and the launch flag; this hook owns whether the TV layout is showing.
 */
export function useBigScreenMode() {
  const [active, setActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeRef = useRef(false);
  const sawFullscreenRef = useRef(false);
  const exitRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const enter = useCallback(async (display?: BigScreenDisplayChoice) => {
    setMenuOpen(false);
    setActive(true);
    sawFullscreenRef.current = true;
    const api = window.electronAPI?.bigScreen;
    if (!api?.enter) return;
    try {
      await api.enter(display === undefined ? undefined : { display });
    } catch (error) {
      console.error('[BigScreen] Failed to enter fullscreen:', error);
    }
  }, []);

  const exit = useCallback(async () => {
    setMenuOpen(false);
    setActive(false);
    sawFullscreenRef.current = false;
    const api = window.electronAPI?.bigScreen;
    if (!api?.exit) return;
    try {
      await api.exit();
    } catch (error) {
      console.error('[BigScreen] Failed to exit fullscreen:', error);
    }
  }, []);

  useEffect(() => {
    exitRef.current = exit;
  }, [exit]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.bigScreen = active ? 'true' : 'false';
    return () => {
      if (!active) delete document.documentElement.dataset.bigScreen;
    };
  }, [active]);

  useEffect(() => {
    const api = window.electronAPI?.bigScreen;
    if (!api?.getLaunchFlags) return undefined;

    let cancelled = false;
    const boot = async () => {
      try {
        const flags = await api.getLaunchFlags();
        const prefs = await window.electronAPI.getPreferences();
        if (cancelled) return;
        const display = flags.bigScreenDisplay ?? prefs?.bigScreenDisplay;
        if (flags.bigScreen || prefs?.startInBigScreen) {
          await enter(display);
        }
      } catch (error) {
        console.error('[BigScreen] Startup check failed:', error);
      }
    };
    void boot();

    const unsubscribeRequested = api.onRequested?.(() => {
      void enter();
    });
    const unsubscribeEscape = api.onEscape?.(() => {
      const dismiss = topSpatialDismiss();
      if (dismiss) {
        dismiss.click();
        return;
      }
      void exitRef.current();
    });
    let fullscreenExitTimer: number | null = null;
    const unsubscribeFullscreen = window.electronAPI.fullscreen?.onChanged?.((isFullscreen: boolean) => {
      if (fullscreenExitTimer != null) {
        window.clearTimeout(fullscreenExitTimer);
        fullscreenExitTimer = null;
      }
      if (isFullscreen) {
        sawFullscreenRef.current = true;
        return;
      }
      if (!sawFullscreenRef.current || !activeRef.current) return;
      // Moving Big Screen onto another display leaves fullscreen for a moment.
      // Wait, then leave the TV layout only if the window is still windowed.
      fullscreenExitTimer = window.setTimeout(() => {
        fullscreenExitTimer = null;
        if (!activeRef.current) return;
        const readState = window.electronAPI.fullscreen?.getState;
        if (!readState) {
          void exitRef.current();
          return;
        }
        void readState().then((stillFullscreen) => {
          if (stillFullscreen === false && activeRef.current) {
            void exitRef.current();
          }
        }).catch(() => {
          if (activeRef.current) void exitRef.current();
        });
      }, 450);
    });

    return () => {
      cancelled = true;
      if (fullscreenExitTimer != null) window.clearTimeout(fullscreenExitTimer);
      unsubscribeRequested?.();
      unsubscribeEscape?.();
      unsubscribeFullscreen?.();
    };
  }, [enter]);

  return {
    active,
    menuOpen,
    enter,
    exit,
    toggleMenu,
    closeMenu,
  };
}
