import { useCallback } from 'react';

interface UseSettingsSaveRefreshOptions {
  loadLibrary: () => Promise<void>;
  setHideGameTitles: (value: boolean) => void;
  setGameTilePadding: (value: number) => void;
  setShowLogoOverBoxart: (value: boolean) => void;
  setLogoPosition: (value: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  setConfirmGameLaunch: (value: boolean) => void;
  setEnableGamepadSupport: (value: boolean) => void;
  setGamepadButtonLayout: (value: 'xbox' | 'playstation') => void;
  setGamepadNavigationSpeed: (value: number) => void;
  setDisableAllAnimations: (value: boolean) => void;
  setDisableAnimatedBanners: (value: boolean) => void;
  setDisableAnimatedBoxarts: (value: boolean) => void;
  setDisableAnimatedBackgrounds: (value: boolean) => void;
  setDisableAnimatedIcons: (value: boolean) => void;
  setDisableAnimatedLogos: (value: boolean) => void;
  setLinkDisplayOrder: (value: string[]) => void;
  setVisibleLinkTypes: (value: Record<string, boolean>) => void;
}

export function useSettingsSaveRefresh({
  loadLibrary,
  setHideGameTitles,
  setGameTilePadding,
  setShowLogoOverBoxart,
  setLogoPosition,
  setConfirmGameLaunch,
  setEnableGamepadSupport,
  setGamepadButtonLayout,
  setGamepadNavigationSpeed,
  setDisableAllAnimations,
  setDisableAnimatedBanners,
  setDisableAnimatedBoxarts,
  setDisableAnimatedBackgrounds,
  setDisableAnimatedIcons,
  setDisableAnimatedLogos,
  setLinkDisplayOrder,
  setVisibleLinkTypes,
}: UseSettingsSaveRefreshOptions) {
  const refreshAfterSettingsSave = useCallback(async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();

      if (prefs.hideGameTitles !== undefined) {
        setHideGameTitles(prefs.hideGameTitles);
      }
      if (prefs.gameTilePadding !== undefined) {
        setGameTilePadding(prefs.gameTilePadding);
      }
      if (prefs.showLogoOverBoxart !== undefined) {
        setShowLogoOverBoxart(prefs.showLogoOverBoxart);
      }
      if (prefs.logoPosition !== undefined) {
        setLogoPosition(prefs.logoPosition);
      }
      if (prefs.confirmGameLaunch !== undefined) {
        setConfirmGameLaunch(prefs.confirmGameLaunch);
      }
      if (prefs.enableGamepadSupport !== undefined) {
        setEnableGamepadSupport(prefs.enableGamepadSupport);
      }
      if (prefs.gamepadButtonLayout !== undefined) {
        setGamepadButtonLayout(prefs.gamepadButtonLayout);
      }
      if (prefs.gamepadNavigationSpeed !== undefined) {
        setGamepadNavigationSpeed(prefs.gamepadNavigationSpeed);
      }
      if (prefs.disableAllAnimations !== undefined) {
        setDisableAllAnimations(prefs.disableAllAnimations);
      }
      if (prefs.disableAnimatedBanners !== undefined) {
        setDisableAnimatedBanners(prefs.disableAnimatedBanners);
      }
      if (prefs.disableAnimatedBoxarts !== undefined) {
        setDisableAnimatedBoxarts(prefs.disableAnimatedBoxarts);
      }
      if (prefs.disableAnimatedBackgrounds !== undefined) {
        setDisableAnimatedBackgrounds(prefs.disableAnimatedBackgrounds);
      }
      if (prefs.disableAnimatedIcons !== undefined) {
        setDisableAnimatedIcons(prefs.disableAnimatedIcons);
      }
      if (prefs.disableAnimatedLogos !== undefined) {
        setDisableAnimatedLogos(prefs.disableAnimatedLogos);
      }
      if (prefs.linkDisplayOrder && prefs.linkDisplayOrder.length > 0) {
        setLinkDisplayOrder(prefs.linkDisplayOrder);
      }
      if (prefs.visibleLinkTypes && Object.keys(prefs.visibleLinkTypes).length > 0) {
        setVisibleLinkTypes(prefs.visibleLinkTypes);
      }

      await loadLibrary();
    } catch (error) {
      console.error('Error reloading preferences after save:', error);
    }
  }, [
    loadLibrary,
    setConfirmGameLaunch,
    setEnableGamepadSupport,
    setGamepadButtonLayout,
    setGamepadNavigationSpeed,
    setDisableAllAnimations,
    setDisableAnimatedBackgrounds,
    setDisableAnimatedBanners,
    setDisableAnimatedBoxarts,
    setDisableAnimatedIcons,
    setDisableAnimatedLogos,
    setGameTilePadding,
    setHideGameTitles,
    setLinkDisplayOrder,
    setLogoPosition,
    setShowLogoOverBoxart,
    setVisibleLinkTypes,
  ]);

  return { refreshAfterSettingsSave };
}
