import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type FocusRegion = 'library' | 'topBar' | 'contextMenu' | 'settings' | 'details' | null;

interface FocusContextType {
  region: FocusRegion;
  index: number;
  setRegion: (region: FocusRegion) => void;
  setIndex: (index: number) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  navigateLeft: () => void;
  navigateRight: () => void;
  confirm: () => void;
  back: () => void;
  setMaxIndex: (maxIndex: number) => void;
  getMaxIndex: () => number;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

interface FocusProviderProps {
  children: React.ReactNode;
  onConfirm?: (region: FocusRegion, index: number) => void;
  onBack?: (region: FocusRegion) => void;
}

export function FocusProvider({ children, onConfirm, onBack }: FocusProviderProps) {
  const [region, setRegion] = useState<FocusRegion>('library');
  const [index, setIndex] = useState<number>(0);
  const maxIndexRef = useRef<Map<FocusRegion, number>>(new Map());

  const setMaxIndex = useCallback((maxIndex: number) => {
    if (region) {
      maxIndexRef.current.set(region, maxIndex);
    }
  }, [region]);

  const getMaxIndex = useCallback(() => {
    if (!region) return 0;
    return maxIndexRef.current.get(region) ?? 0;
  }, [region]);

  const navigateUp = useCallback(() => {
    if (!region) return;
    const max = getMaxIndex();
    if (max === 0) return;
    setIndex(prev => (prev > 0 ? prev - 1 : max));
  }, [region, getMaxIndex]);

  const navigateDown = useCallback(() => {
    if (!region) return;
    const max = getMaxIndex();
    if (max === 0) return;
    setIndex(prev => (prev < max ? prev + 1 : 0));
  }, [region, getMaxIndex]);

  const navigateLeft = useCallback(() => {
    if (!region) return;
    const max = getMaxIndex();
    if (max === 0) return;
    setIndex(prev => (prev > 0 ? prev - 1 : max));
  }, [region, getMaxIndex]);

  const navigateRight = useCallback(() => {
    if (!region) return;
    const max = getMaxIndex();
    if (max === 0) return;
    setIndex(prev => (prev < max ? prev + 1 : 0));
  }, [region, getMaxIndex]);

  const confirm = useCallback(() => {
    if (!region) return;

    // Try provider callback first
    if (onConfirm) {
      onConfirm(region, index);
      return;
    }

    // Fallback to DOM element handlers
    if (region === 'contextMenu') {
      const menuElement = document.querySelector('[data-context-menu]') as any;
      if (menuElement?.__focusConfirm) {
        menuElement.__focusConfirm();
        return;
      }
    } else if (region === 'settings') {
      const settingsElement = document.querySelector('[data-settings-sidebar]') as any;
      if (settingsElement?.__focusConfirm) {
        settingsElement.__focusConfirm();
        return;
      }
    } else if (region === 'topBar') {
      const menuBarElement = document.querySelector('[data-menu-bar]') as any;
      if (menuBarElement?.__focusConfirm) {
        menuBarElement.__focusConfirm();
        return;
      }
    }
  }, [region, index, onConfirm]);

  const back = useCallback(() => {
    if (!region) return;

    // Try provider callback first
    if (onBack) {
      onBack(region);
      return;
    }

    // Fallback to DOM element handlers
    if (region === 'contextMenu') {
      const menuElement = document.querySelector('[data-context-menu]') as any;
      if (menuElement?.__focusBack) {
        menuElement.__focusBack();
        return;
      }
    } else if (region === 'settings') {
      const settingsElement = document.querySelector('[data-settings-sidebar]') as any;
      if (settingsElement?.__focusBack) {
        settingsElement.__focusBack();
        return;
      }
    } else if (region === 'topBar') {
      const menuBarElement = document.querySelector('[data-menu-bar]') as any;
      if (menuBarElement?.__focusBack) {
        menuBarElement.__focusBack();
        return;
      }
    }
  }, [region, onBack]);

  // Reset index when region changes
  useEffect(() => {
    setIndex(0);
  }, [region]);

  const value: FocusContextType = {
    region,
    index,
    setRegion,
    setIndex,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    confirm,
    back,
    setMaxIndex,
    getMaxIndex,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
