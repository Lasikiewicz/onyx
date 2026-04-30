import { useCallback } from 'react';
import type { Game } from '../types/game';
import type { RightClickMenuEditorSection } from '../components/rightClickMenu/RightClickMenuHeader';

interface UseAppShellCarouselControlsOptions {
  carouselButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  carouselButtonSize: number;
  carouselDescriptionSize: number;
  carouselLogoSize: number;
  detailsBarSize: number;
  gameContextMenu: { x: number; y: number; game: Game } | null;
  isViewFlipped: boolean;
  saveValue: <T>(setter: (value: T) => void, prefKey: string, value: T) => void;
  selectedBoxArtSize: number;
  setCarouselButtonSize: (size: number) => void;
  setCarouselDescriptionSize: (size: number) => void;
  setCarouselLogoSize: (size: number) => void;
  setDetailsBarSize: (size: number) => void;
  setGameContextMenu: (menu: { x: number; y: number; game: Game } | null) => void;
  setRightClickMenu: (menu: { x: number; y: number; initialEditorSection?: RightClickMenuEditorSection | null } | null) => void;
  showCarouselDetails: boolean;
  showCarouselLogos: boolean;
}

export function useAppShellCarouselControls({
  carouselButtonColors,
  carouselButtonSize,
  carouselDescriptionSize,
  carouselLogoSize,
  detailsBarSize,
  gameContextMenu,
  isViewFlipped,
  saveValue,
  selectedBoxArtSize,
  setCarouselButtonSize,
  setCarouselDescriptionSize,
  setCarouselLogoSize,
  setDetailsBarSize,
  setGameContextMenu,
  setRightClickMenu,
  showCarouselDetails,
  showCarouselLogos,
}: UseAppShellCarouselControlsOptions) {
  const handleEmptySpaceRightClick = useCallback((x: number, y: number) => {
    setGameContextMenu(null);
    setRightClickMenu({ x, y });
  }, [setGameContextMenu, setRightClickMenu]);

  return {
    carouselViewProps: {
      carouselButtonColors,
      carouselButtonSize,
      carouselDescriptionSize,
      carouselLogoSize,
      detailsBarSize,
      isViewFlipped,
      onCarouselButtonSizeChange: (size: number) => saveValue(setCarouselButtonSize, 'carouselButtonSize', size),
      onCarouselDescriptionSizeChange: (size: number) => saveValue(setCarouselDescriptionSize, 'carouselDescriptionSize', size),
      onCarouselLogoSizeChange: (size: number) => saveValue(setCarouselLogoSize, 'carouselLogoSize', size),
      onDetailsBarSizeChange: (size: number) => saveValue(setDetailsBarSize, 'detailsBarSize', size),
      onEmptySpaceRightClick: handleEmptySpaceRightClick,
      selectedBoxArtSize,
      showCarouselDetails,
      showCarouselLogos,
    },
    closeGameContextMenu: gameContextMenu ? () => setGameContextMenu(null) : undefined,
  };
}
