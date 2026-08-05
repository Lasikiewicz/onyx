import { useState, useEffect, useCallback, useRef } from 'react';

interface FullscreenState {
  isFullscreen: boolean;
  isLoading: boolean;
}

interface UseFullscreenReturn {
  isFullscreen: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
}

/**
 * Hook for managing fullscreen mode
 * Provides fullscreen state and control methods
 * Automatically manages cursor hiding based on user preferences
 */
export function useFullscreen(): UseFullscreenReturn {
  const [state, setState] = useState<FullscreenState>({
    isFullscreen: false,
    isLoading: true,
  });

  const [cursorHideTimeout, setCursorHideTimeout] = useState<number | null>(null);
  // Held in a ref, not state: this timer is reset on every mousemove, and as state it fed
  // its own effect's dependency array — the effect set it, which re-ran the effect, forever.
  const mouseIdleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize fullscreen state
  useEffect(() => {
    const initFullscreen = async () => {
      try {
        const { isFullscreen } = await window.electronAPI.fullscreen.getState();
        setState({ isFullscreen, isLoading: false });
        
        // Apply fullscreen class to document
        if (isFullscreen) {
          document.documentElement.classList.add('fullscreen-mode');
        }
      } catch (error) {
        console.error('Error getting fullscreen state:', error);
        setState({ isFullscreen: false, isLoading: false });
      }
    };

    initFullscreen();

    // Listen for fullscreen changes from keyboard shortcuts (F11, Escape)
    const unsubscribe = window.electronAPI.fullscreen.onChanged((isFullscreen: boolean) => {
      setState(prev => ({ ...prev, isFullscreen }));
      if (isFullscreen) {
        document.documentElement.classList.add('fullscreen-mode');
      } else {
        document.documentElement.classList.remove('fullscreen-mode');
        document.documentElement.classList.remove('hide-cursor');
      }
    });

    return unsubscribe;
  }, []);

  // Manage cursor hiding in fullscreen
  useEffect(() => {
    if (!state.isFullscreen) {
      // Clear any existing timer and show cursor
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current);
        mouseIdleTimerRef.current = null;
      }
      document.documentElement.classList.remove('hide-cursor');
      return;
    }

    // Get cursor hide preferences
    const setupCursorHiding = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (prefs.hideMouseCursorInFullscreen !== false) {
          const timeout = prefs.cursorHideTimeout ?? 3000;
          setCursorHideTimeout(timeout);
        } else {
          setCursorHideTimeout(null);
        }
      } catch (error) {
        console.error('Error getting cursor preferences:', error);
        setCursorHideTimeout(3000); // Default to 3 seconds
      }
    };

    setupCursorHiding();
  }, [state.isFullscreen]);

  // Handle mouse movement for cursor hiding
  useEffect(() => {
    if (!state.isFullscreen || cursorHideTimeout === null) {
      return;
    }

    const handleMouseMove = () => {
      // Show cursor
      document.documentElement.classList.remove('hide-cursor');

      // Clear existing timer
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current);
      }

      // Set new timer to hide cursor
      mouseIdleTimerRef.current = setTimeout(() => {
        document.documentElement.classList.add('hide-cursor');
      }, cursorHideTimeout);
    };

    // Initial setup
    handleMouseMove();

    // Add event listener
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current);
        mouseIdleTimerRef.current = null;
      }
    };
  }, [state.isFullscreen, cursorHideTimeout]);

  const toggle = useCallback(async () => {
    try {
      await window.electronAPI.fullscreen.toggle();
      // State will be updated via event listener
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, []);

  const enter = useCallback(async () => {
    try {
      await window.electronAPI.fullscreen.enter();
      // State will be updated via event listener
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      await window.electronAPI.fullscreen.exit();
      // State will be updated via event listener
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }, []);

  return {
    isFullscreen: state.isFullscreen,
    isLoading: state.isLoading,
    toggle,
    enter,
    exit,
  };
}
