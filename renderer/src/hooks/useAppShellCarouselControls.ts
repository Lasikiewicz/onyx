import { useCallback, useMemo } from 'react';
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

  const handleCarouselButtonSizeChange = useCallback((size: number) => saveValue(setCarouselButtonSize, 'carouselButtonSize', size), [saveValue, setCarouselButtonSize]);
  const handleCarouselDescriptionSizeChange = useCallback((size: number) => saveValue(setCarouselDescriptionSize, 'carouselDescriptionSize', size), [saveValue, setCarouselDescriptionSize]);
  const handleCarouselLogoSizeChange = useCallback((size: number) => saveValue(setCarouselLogoSize, 'carouselLogoSize', size), [saveValue, setCarouselLogoSize]);
  const handleDetailsBarSizeChange = useCallback((size: number) => saveValue(setDetailsBarSize, 'detailsBarSize', size), [saveValue, setDetailsBarSize]);
  const closeGameContextMenu = useCallback(() => setGameContextMenu(null), [setGameContextMenu]);

  const carouselViewProps = useMemo(() => ({
    carouselButtonColors,
    carouselButtonSize,
    carouselDescriptionSize,
    carouselLogoSize,
    detailsBarSize,
    isViewFlipped,
    onCarouselButtonSizeChange: handleCarouselButtonSizeChange,
    onCarouselDescriptionSizeChange: handleCarouselDescriptionSizeChange,
    onCarouselLogoSizeChange: handleCarouselLogoSizeChange,
    onDetailsBarSizeChange: handleDetailsBarSizeChange,
    onEmptySpaceRightClick: handleEmptySpaceRightClick,
    selectedBoxArtSize,
    showCarouselDetails,
    showCarouselLogos,
  }), [
    carouselButtonColors,
    carouselButtonSize,
    carouselDescriptionSize,
    carouselLogoSize,
    detailsBarSize,
    handleCarouselButtonSizeChange,
    handleCarouselDescriptionSizeChange,
    handleCarouselLogoSizeChange,
    handleDetailsBarSizeChange,
    handleEmptySpaceRightClick,
    isViewFlipped,
    selectedBoxArtSize,
    showCarouselDetails,
    showCarouselLogos,
  ]);

  return {
    carouselViewProps,
    closeGameContextMenu: gameContextMenu ? closeGameContextMenu : undefined,
  };
}
