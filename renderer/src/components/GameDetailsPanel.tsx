import React, { useState, useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Game } from '../types/game';
import { GameContextMenu } from './GameContextMenu';
import { LogoResizeMenu } from './LogoResizeMenu';
import { ImageSearchModal } from './ImageSearchModal';
import { GameLinks, DEFAULT_VISIBLE_LINK_TYPES } from './GameLinks';
import { getContrastingTextColor } from '../utils/colorUtils';
import { LauncherIcon, getLauncherDisplayName } from '../utils/launcherIcons';

type ViewKey = 'grid' | 'list' | 'logo';

export interface GameDetailsPanelProps {
  game: Game | null;
  onPlay?: (game: Game) => void;
  isLaunching?: boolean;
  isRunning?: boolean;
  onSaveGame?: (game: Game) => Promise<void>;
  onOpenInGameManager?: (game: Game, tab: 'images' | 'metadata') => void;
  onFavorite?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  onEditImages?: (game: Game) => void;
  onEditCategories?: (game: Game) => void;
  onPin?: (game: Game) => void;
  onFixMatch?: (game: Game) => void;
  onHide?: (game: Game) => void;
  onUnhide?: (game: Game) => void;
  onUninstall?: (game: Game) => void;
  isHiddenView?: boolean;
  onUpdateGameInState?: (game: Game) => void;
  onRightClick?: (x: number, y: number) => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';
  // Right panel styling props
  rightPanelLogoSize?: number;
  rightPanelBoxartPosition?: 'left' | 'right' | 'none';
  rightPanelBoxartSize?: number;
  rightPanelTextSize?: number;
  rightPanelButtonSize?: number;
  rightPanelButtonLocation?: 'left' | 'middle' | 'right';
  detailsPanelOpacity?: number;
  panelWidth?: number;
  onPanelWidthChange?: (width: number) => void;
  /** Disables manual dragging of the panel-width divider (e.g. while Maximize Space owns it). */
  disablePanelResize?: boolean;
  fanartHeight?: number;
  onFanartHeightChange?: (height: number) => void;
  descriptionWidth?: number;
  onDescriptionWidthChange?: (width: number) => void;
  detailsPanelBottomBarHeight?: number;
  onDetailsPanelBottomBarHeightChange?: (height: number) => void;
  isViewFlipped?: boolean;
  // Button colors
  rightPanelButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  // Link management (source of truth from Settings when provided by App)
  linkDisplayOrder?: string[] | null;
  visibleLinkTypes?: Record<string, boolean>;
  disableAnimatedBackgrounds?: boolean;
  disableAnimatedBanners?: boolean;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedIcons?: boolean;
  disableAnimatedLogos?: boolean;
  overlaysOpen?: boolean;
}

// Helpers to detect animated media (animated image formats).
// We exclude webp here as many webp files are static, and lumping them all into "animated"
// causes them to be hidden when animations are disabled.
// Module scope rather than component scope: they close over nothing, and as component-local
// consts they were a fresh identity every render inside effect dependency lists.
const DEFAULT_PANEL_WIDTHS: Record<ViewKey, number> = { grid: 800, list: 800, logo: 800 };

const isAnimatedImage = (url: string) => /\.(gif|apng)(\?|$)/i.test(url);
const isAnimatedMedia = (url: string, isVideo?: boolean) => !!isVideo || isAnimatedImage(url);

export const GameDetailsPanel: React.FC<GameDetailsPanelProps> = ({
  game,
  onPlay,
  isLaunching = false,
  isRunning = false,
  onSaveGame,
  onOpenInGameManager,
  onFavorite,
  onEdit,
  onEditImages,
  onEditCategories,
  onPin,
  onFixMatch,
  onHide,
  onUnhide,
  onUninstall,
  isHiddenView = false,
  onUpdateGameInState,
  onRightClick,
  viewMode,
  rightPanelLogoSize = 100,
  rightPanelBoxartPosition = 'right',
  rightPanelBoxartSize = 300,
  rightPanelTextSize = 14,
  rightPanelButtonSize = 14,
  rightPanelButtonLocation = 'right',
  detailsPanelOpacity = 80,
  panelWidth: propPanelWidth,
  onPanelWidthChange,
  disablePanelResize = false,
  fanartHeight: propFanartHeight = 320,
  onFanartHeightChange,
  descriptionWidth: propDescriptionWidth = 50,
  onDescriptionWidthChange,
  detailsPanelBottomBarHeight: propBottomBarHeight,
  onDetailsPanelBottomBarHeightChange,
  isViewFlipped = false,
  rightPanelButtonColors,
  linkDisplayOrder: linkDisplayOrderFromProps,
  visibleLinkTypes: visibleLinkTypesFromProps,
  disableAnimatedBackgrounds: _disableAnimatedBackgrounds = false,
  disableAnimatedBanners = false,
  disableAnimatedBoxarts = false,
  disableAnimatedIcons = false,
  disableAnimatedLogos = false,
  overlaysOpen = false,
}) => {
  const buildStructuredDescriptionHtml = (descriptionHtml: string, useSideLayout: boolean): string => {
    const sanitizedHtml = DOMPurify.sanitize(descriptionHtml);

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${sanitizedHtml}</div>`, 'text/html');
      const root = doc.body.firstElementChild as HTMLElement | null;
      if (!root) return sanitizedHtml;

      type Section = {
        headingHtml: string;
        bodyHtmlParts: string[];
        mediaHtml: string;
      };

      const sections: Section[] = [];
      let current: Section = { headingHtml: '', bodyHtmlParts: [], mediaHtml: '' };

      const pushCurrent = () => {
        const hasContent = current.headingHtml || current.bodyHtmlParts.length > 0 || current.mediaHtml;
        if (hasContent) {
          sections.push(current);
        }
        current = { headingHtml: '', bodyHtmlParts: [], mediaHtml: '' };
      };

      const isHeadingElement = (element: Element) => {
        const tag = element.tagName.toUpperCase();
        return tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || element.classList.contains('bb_tag');
      };

      const isMeaningfulText = (text: string) => text.replace(/\s+/g, '').length > 0;

      const mediaSelector = '.bb_img_ctn, img, video, iframe, canvas';

      for (const node of Array.from(root.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (isMeaningfulText(text)) {
            current.bodyHtmlParts.push(`<p>${text}</p>`);
          }
          continue;
        }

        if (!(node instanceof Element)) continue;

        if (isHeadingElement(node)) {
          pushCurrent();
          current.headingHtml = node.outerHTML;
          continue;
        }

        const clone = node.cloneNode(true) as Element;
        if (!current.mediaHtml) {
          const media = clone.matches(mediaSelector) ? clone : clone.querySelector(mediaSelector);
          if (media) {
            current.mediaHtml = media.outerHTML;
            media.remove();
          }
        }

        const remainingText = clone.textContent?.trim() || '';
        if (remainingText.length > 0) {
          current.bodyHtmlParts.push(clone.outerHTML);
        }
      }

      pushCurrent();

      if (sections.length === 0) return sanitizedHtml;

      if (useSideLayout) {
        return sections.map((section) => {
          const hasMedia = !!section.mediaHtml;
          const mediaClass = hasMedia ? ' has-media' : ' no-media';
          const bodyHtml = section.bodyHtmlParts.join('');
          const plainText = `${section.headingHtml} ${bodyHtml}`.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const textLength = plainText.length;
          const estimatedLines = Math.max(3, Math.ceil(textLength / 62));
          const sectionMediaMaxHeight = Math.max(180, Math.min(460, estimatedLines * 30));
          const sectionMediaWidth = Math.max(260, Math.min(520, Math.round(sectionMediaMaxHeight * 1.7)));
          const sectionStyle = hasMedia
            ? ` style="--onyx-section-media-max-height:${sectionMediaMaxHeight}px;--onyx-section-media-width:${sectionMediaWidth}px;"`
            : '';
          const mediaBlock = section.mediaHtml
            ? `<div class="onyx-desc-media">${section.mediaHtml}</div>`
            : '';
          return `<section class="onyx-desc-section${mediaClass}"${sectionStyle}>${mediaBlock}<div class="onyx-desc-text">${section.headingHtml}${bodyHtml}</div></section>`;
        }).join('');
      }

      return sections.map((section) => {
        const hasMedia = !!section.mediaHtml;
        const mediaClass = hasMedia ? ' has-media' : ' no-media';
        const bodyHtml = section.bodyHtmlParts.join('');
        const plainText = `${section.headingHtml} ${bodyHtml}`.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const textLength = plainText.length;
        const estimatedLines = Math.max(3, Math.ceil(textLength / 62));
        const sectionMediaMaxHeight = Math.max(180, Math.min(460, estimatedLines * 30));
        const sectionMediaWidth = Math.max(260, Math.min(520, Math.round(sectionMediaMaxHeight * 1.7)));
        const sectionStyle = hasMedia
          ? ` style="--onyx-section-media-max-height:${sectionMediaMaxHeight}px;--onyx-section-media-width:${sectionMediaWidth}px;"`
          : '';
        const mediaBlock = section.mediaHtml
          ? `<div class="onyx-desc-media">${section.mediaHtml}</div>`
          : '';
        return `<section class="onyx-desc-section${mediaClass}"${sectionStyle}><div class="onyx-desc-text">${section.headingHtml}${bodyHtml}</div>${mediaBlock}</section>`;
      }).join('');
    } catch {
      return sanitizedHtml;
    }
  };

  const [panelWidths, setPanelWidths] = useState<Record<ViewKey, number>>(DEFAULT_PANEL_WIDTHS);
  const [fanartHeight, setFanartHeight] = useState(propFanartHeight);
  const [descriptionHeight, setDescriptionHeight] = useState(400);
  const [descriptionWidth, setDescriptionWidth] = useState(propDescriptionWidth);
  const [descriptionViewport, setDescriptionViewport] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingFanart, setIsResizingFanart] = useState(false);
  const [isResizingDescription, setIsResizingDescription] = useState(false);
  const [isResizingDescriptionWidth, setIsResizingDescriptionWidth] = useState(false);
  const [isResizingBottomBar, setIsResizingBottomBar] = useState(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(propBottomBarHeight ?? 72);
  const panelRef = useRef<HTMLDivElement>(null);
  const fanartRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const descriptionContainerRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const viewKey: ViewKey = viewMode === 'list' ? 'list' : viewMode === 'logo' ? 'logo' : 'grid';
  const activePanelWidth = (propPanelWidth ?? panelWidths[viewKey] ?? DEFAULT_PANEL_WIDTHS[viewKey]);
  const normalizedOpacity = Math.max(0, Math.min(100, detailsPanelOpacity));
  const panelTransparency = 1 - (normalizedOpacity / 100);
  const panelBackground = `rgba(26, 31, 46, ${normalizedOpacity / 100})`;
  const panelBackdropBlur = `${Math.round(normalizedOpacity * 0.2)}px`;
  const useSideMediaLayout = descriptionViewport.width >= 760 && descriptionViewport.height >= 420;
  const useLeftBoxartWideLayout = rightPanelBoxartPosition === 'left'
    && descriptionViewport.width >= 900
    && descriptionViewport.height >= 420;
  const useDescriptionSideMediaLayout = rightPanelBoxartPosition === 'left'
    ? useLeftBoxartWideLayout
    : useSideMediaLayout;
  const mediaMaxHeight = Math.max(180, Math.floor(descriptionViewport.height * 0.52));
  const mediaSideWidth = Math.max(220, Math.floor(descriptionViewport.width * 0.42));
  const renderedDescriptionHtml = useMemo(
    () => (game?.description ? buildStructuredDescriptionHtml(game.description, useDescriptionSideMediaLayout) : ''),
    [game?.description, useDescriptionSideMediaLayout]
  );
  const formatScore = (score: number) => `${Math.round(score)}/100`;

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [logoResizeMenu, setLogoResizeMenu] = useState<{ x: number; y: number } | null>(null);

  // Image search modal
  const [imageSearchModal, setImageSearchModal] = useState<{ type: 'artwork' | 'boxart' } | null>(null);
  const [showLogoResizeDialog, setShowLogoResizeDialog] = useState(false);
  const [showBoxartResizeDialog, setShowBoxartResizeDialog] = useState(false);
  const [localLogoSize, setLocalLogoSize] = useState<number | undefined>(undefined);
  const [isSavingLogoSize, setIsSavingLogoSize] = useState(false);

  // Font and style preferences
  const [titleFontSize, setTitleFontSize] = useState(24);
  const [titleFontFamily, setTitleFontFamily] = useState('system-ui');
  const [descriptionFontSize, setDescriptionFontSize] = useState(14);
  const [descriptionFontFamily, setDescriptionFontFamily] = useState('system-ui');
  const [detailsFontSize, setDetailsFontSize] = useState(14);
  const [detailsFontFamily, setDetailsFontFamily] = useState('system-ui');
  const [boxartWidth, setBoxartWidth] = useState(128);
  const [visibleLinkTypes, setVisibleLinkTypes] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_LINK_TYPES);
  const [linkDisplayOrder, setLinkDisplayOrder] = useState<string[] | null>(null);
  const [visibleDetails, setVisibleDetails] = useState({
    releaseDate: true,
    platform: true,
    ageRating: true,
    genres: true,
    developers: true,
    publishers: true,
    communityScore: true,
    userScore: true,
    criticScore: true,
    installationDirectory: true,
  });

  const [displayedLogo, setDisplayedLogo] = useState<{ url: string; isVideo: boolean }>({
    url: game?.logoUrl || '',
    isVideo: !!game?.logoIsVideo,
  });

  // Artwork fields read by the two effects below. Pulled out as locals so the dependency
  // lists name exactly what is used — depending on the whole `game` object would re-run these
  // on any unrelated field change (favorite, playtime, categories).
  const gameId = game?.id;
  const gameHeroUrl = game?.heroUrl;
  const gameBannerUrl = game?.bannerUrl;
  const gameBoxArtUrl = game?.boxArtUrl;
  const gameLogoUrl = game?.logoUrl;
  const gameLogoIsVideo = game?.logoIsVideo;

  // Preload current game images so they are decoded before <img> mounts (faster first paint)
  useEffect(() => {
    if (!gameId) return;
    const bgUrl = gameBannerUrl || gameHeroUrl || gameBoxArtUrl || '';
    const urls = [bgUrl, gameLogoUrl, gameBoxArtUrl].filter(Boolean) as string[];
    const images: HTMLImageElement[] = [];
    const animatedRe = /\.(gif|webp|apng|webm)(\?|$)/i;
    for (const url of urls) {
      const img = new Image();
      images.push(img);
      img.src = url;
      if (!animatedRe.test(url) && img.decode) {
        img.decode().catch(() => {});
      }
    }
    return () => {
      for (const img of images) img.src = '';
    };
  }, [gameId, gameHeroUrl, gameBannerUrl, gameBoxArtUrl, gameLogoUrl]);

  useEffect(() => {
    if (!gameLogoUrl) {
      setDisplayedLogo({ url: '', isVideo: false });
      return;
    }

    const disableAnimatedLogosBySettings = disableAnimatedLogos && !overlaysOpen;
    const canRenderLogo = gameLogoIsVideo || !isAnimatedMedia(gameLogoUrl, gameLogoIsVideo) || !disableAnimatedLogosBySettings;
    if (!canRenderLogo) {
      setDisplayedLogo({ url: '', isVideo: false });
      return;
    }

    if (gameLogoIsVideo) {
      setDisplayedLogo({ url: gameLogoUrl, isVideo: true });
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setDisplayedLogo({ url: gameLogoUrl, isVideo: false });
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setDisplayedLogo({ url: '', isVideo: false });
      }
    };
    img.src = gameLogoUrl;

    if (img.complete && img.naturalWidth > 0) {
      setDisplayedLogo({ url: gameLogoUrl, isVideo: false });
    }

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }, [gameId, gameLogoUrl, gameLogoIsVideo, disableAnimatedLogos, overlaysOpen]);

  // Load panel-local preferences on mount.
  //
  // This deliberately only fills in values the parent did NOT supply. App bootstraps
  // app-shell preferences once at startup and passes panel width, fanart height,
  // description width, bottom bar height and the link settings down as props; re-reading
  // them from disk here resolves *after* the prop-sync effects below and snapped them back
  // to their persisted values (the "snaps back to saved values" bug). The remaining keys
  // (fonts, visible details, boxart width, description height) are owned by this panel and
  // have no prop, so they still load here.
  //
  // `hasPropX` is captured once on mount on purpose — this is a bootstrap, not a sync.
  const propOwnershipRef = useRef({
    panelWidth: propPanelWidth !== undefined,
    fanartHeight: propFanartHeight !== undefined,
    descriptionWidth: propDescriptionWidth !== undefined,
    bottomBarHeight: propBottomBarHeight !== undefined,
    linkDisplayOrder: linkDisplayOrderFromProps !== undefined && linkDisplayOrderFromProps !== null,
    visibleLinkTypes: visibleLinkTypesFromProps !== undefined,
  });

  useEffect(() => {
    const owned = propOwnershipRef.current;
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (!owned.panelWidth) {
          const panelWidthByView = prefs.panelWidthByView || {};
          const fallbackPanelWidth = prefs.panelWidth ?? DEFAULT_PANEL_WIDTHS.grid;
          setPanelWidths({
            grid: panelWidthByView.grid ?? fallbackPanelWidth,
            list: panelWidthByView.list ?? fallbackPanelWidth,
            logo: panelWidthByView.logo ?? fallbackPanelWidth,
          });
        }
        if (!owned.fanartHeight && prefs.fanartHeight) setFanartHeight(prefs.fanartHeight);
        if (!owned.descriptionWidth && prefs.descriptionWidth !== undefined) setDescriptionWidth(prefs.descriptionWidth);
        if (!owned.bottomBarHeight && prefs.detailsPanelBottomBarHeight !== undefined) setBottomBarHeight(prefs.detailsPanelBottomBarHeight);
        if (prefs.titleFontSize) setTitleFontSize(prefs.titleFontSize);
        if (prefs.titleFontFamily) setTitleFontFamily(prefs.titleFontFamily);
        if (prefs.descriptionFontSize) setDescriptionFontSize(prefs.descriptionFontSize);
        if (prefs.descriptionFontFamily) setDescriptionFontFamily(prefs.descriptionFontFamily);
        if (prefs.detailsFontSize) setDetailsFontSize(prefs.detailsFontSize);
        if (prefs.detailsFontFamily) setDetailsFontFamily(prefs.detailsFontFamily);
        if (prefs.visibleDetails) setVisibleDetails(prefs.visibleDetails);
        if (prefs.boxartWidth) setBoxartWidth(prefs.boxartWidth);
        if (prefs.descriptionHeight !== undefined) setDescriptionHeight(prefs.descriptionHeight);
        if (!owned.visibleLinkTypes) {
          if (prefs.visibleLinkTypes && Object.keys(prefs.visibleLinkTypes).length > 0) {
            setVisibleLinkTypes(prefs.visibleLinkTypes);
          } else {
            setVisibleLinkTypes(DEFAULT_VISIBLE_LINK_TYPES);
          }
        }
        if (!owned.linkDisplayOrder && prefs.linkDisplayOrder && prefs.linkDisplayOrder.length > 0) {
          setLinkDisplayOrder(prefs.linkDisplayOrder);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Sync divider heights from props (RightClickMenu sliders)
  useEffect(() => {
    setFanartHeight(propFanartHeight);
  }, [propFanartHeight]);

  useEffect(() => {
    setDescriptionWidth(propDescriptionWidth);
  }, [propDescriptionWidth]);

  // Sync bottom bar height from prop when provided (e.g. from App/RightClickMenu)
  useEffect(() => {
    if (propBottomBarHeight !== undefined) setBottomBarHeight(propBottomBarHeight);
  }, [propBottomBarHeight]);

  // Sync panel width from prop when provided
  useEffect(() => {
    if (propPanelWidth !== undefined) {
      setPanelWidths(prev => ({ ...prev, [viewKey]: propPanelWidth }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propPanelWidth]);

  // Logo-size fields, again narrowed so the effects below key only on what they read.
  const gameLogoSize = game?.logoSize;
  const gameLogoSizePerViewMode = game?.logoSizePerViewMode;
  const sizeForCurrentView = gameLogoSizePerViewMode?.[viewMode as 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow']
    || gameLogoSizePerViewMode?.carousel
    || gameLogoSize;

  // Initialize local logo size when dialog opens or when game changes, reset when it closes
  useEffect(() => {
    if (showLogoResizeDialog && gameId) {
      // Use per-view-mode size for the current view, or fallback to global logoSize
      setLocalLogoSize(sizeForCurrentView);
    } else if (!showLogoResizeDialog) {
      setLocalLogoSize(undefined);
      setIsSavingLogoSize(false);
    }
  }, [showLogoResizeDialog, gameId, sizeForCurrentView]);

  // Keep local logo size in sync with game changes (for real-time slider updates from RightClickMenu)
  useEffect(() => {
    if (gameId && !showLogoResizeDialog) {
      setLocalLogoSize(sizeForCurrentView);
    }
  }, [gameId, showLogoResizeDialog, sizeForCurrentView]);

  // Close the logo resize UI whenever a context menu is invoked anywhere
  useEffect(() => {
    const handleGlobalContextMenu = () => {
      setLogoResizeMenu(null);
      setShowLogoResizeDialog(false);
    };

    document.addEventListener('contextmenu', handleGlobalContextMenu, true);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu, true);
    };
  }, []);

  // Resize handlers are read through a ref so the mousemove listener below can depend only on
  // the drag flags. Putting the callbacks in the dep array either tore the listener down
  // mid-drag or (when omitted, as before) left the drag calling the versions captured when it
  // started.
  const resizeCallbacksRef = useRef({
    onPanelWidthChange,
    onFanartHeightChange,
    onDescriptionWidthChange,
    onDetailsPanelBottomBarHeightChange,
  });
  resizeCallbacksRef.current = {
    onPanelWidthChange,
    onFanartHeightChange,
    onDescriptionWidthChange,
    onDetailsPanelBottomBarHeightChange,
  };

  // Whether App owns the bottom bar height. A stable boolean rather than the callback itself,
  // so the debounced save below is not restarted by an unstable function identity.
  const ownsBottomBarHeight = onDetailsPanelBottomBarHeightChange !== undefined;

  // Save preferences when they change (omit bottom bar height when App owns it via callback)
  useEffect(() => {
    const savePreferences = async () => {
      try {
        const prefs: Record<string, unknown> = {
          panelWidthByView: panelWidths,
          panelWidth: activePanelWidth,
          fanartHeight,
          descriptionHeight: descriptionHeight,
          descriptionWidth,
          titleFontSize,
          titleFontFamily,
          descriptionFontSize,
          descriptionFontFamily,
          detailsFontSize,
          detailsFontFamily,
          visibleDetails,
          boxartWidth,
        };
        if (!ownsBottomBarHeight) {
          prefs.detailsPanelBottomBarHeight = bottomBarHeight;
        }
        await window.electronAPI.savePreferences(prefs);
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    };
    // Debounce saves
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [panelWidths, activePanelWidth, fanartHeight, descriptionHeight, descriptionWidth, bottomBarHeight, ownsBottomBarHeight, titleFontSize, titleFontFamily, descriptionFontSize, descriptionFontFamily, detailsFontSize, detailsFontFamily, visibleDetails, boxartWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && panelRef.current) {
        // Measure from the live panel edge so the divider tracks the shell split,
        // not the full window width.
        const panelRect = panelRef.current.getBoundingClientRect();
        const newWidth = panelRect.right - e.clientX;
        const minWidth = 400;
        const maxWidth = window.innerWidth * 0.75;
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        setPanelWidths(prev => ({ ...prev, [viewKey]: clampedWidth }));
        resizeCallbacksRef.current.onPanelWidthChange?.(clampedWidth);
      } else if (isResizingFanart && fanartRef.current) {
        const rect = fanartRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        const minHeight = 200;
        const maxHeight = 600;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        setFanartHeight(clampedHeight);
        resizeCallbacksRef.current.onFanartHeightChange?.(clampedHeight);
      } else if (isResizingDescription && descriptionRef.current) {
        const rect = descriptionRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        const minHeight = 200;
        const maxHeight = 600;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        setDescriptionHeight(clampedHeight);
      } else if (isResizingDescriptionWidth && descriptionContainerRef.current) {
        const rect = descriptionContainerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const percentage = (relativeX / rect.width) * 100;
        const minPercentage = 20;
        const maxPercentage = 80;
        const clampedPercentage = Math.max(minPercentage, Math.min(maxPercentage, percentage));
        setDescriptionWidth(clampedPercentage);
        resizeCallbacksRef.current.onDescriptionWidthChange?.(clampedPercentage);
      } else if (isResizingBottomBar && bottomBarRef.current) {
        const rect = bottomBarRef.current.getBoundingClientRect();
        const newHeight = rect.bottom - e.clientY;
        const minHeight = 48;
        const maxHeight = 140;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        setBottomBarHeight(clampedHeight);
        resizeCallbacksRef.current.onDetailsPanelBottomBarHeightChange?.(clampedHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsResizingFanart(false);
      setIsResizingDescription(false);
      setIsResizingDescriptionWidth(false);
      setIsResizingBottomBar(false);
    };

    if (isResizing || isResizingFanart || isResizingDescription || isResizingDescriptionWidth || isResizingBottomBar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isResizingFanart, isResizingDescription, isResizingDescriptionWidth, isResizingBottomBar, viewKey]);

  useEffect(() => {
    if (!descriptionRef.current) return;

    const element = descriptionRef.current;
    const updateViewport = () => {
      setDescriptionViewport({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [game?.id, descriptionWidth, descriptionHeight]);

  const handleLogoSizeChange = async (newSize: number) => {
    if (!game) return;
    const updated = {
      ...game,
      logoSizePerViewMode: {
        ...(game.logoSizePerViewMode || {}),
        carousel: newSize,
      },
    };
    if (onSaveGame) await onSaveGame(updated);
  };

  if (!game) {
    return (
      <div
        ref={panelRef}
        className={`${isViewFlipped ? 'rounded-r-3xl' : 'rounded-l-3xl'} flex items-center justify-center p-8 relative border border-white/5 shadow-xl`}
        style={{
          width: `${activePanelWidth}px`,
          minWidth: '400px',
          backgroundColor: panelBackground,
          backdropFilter: `blur(${panelBackdropBlur})`,
          WebkitBackdropFilter: `blur(${panelBackdropBlur})`,
          boxShadow: panelTransparency >= 0.98 ? 'none' : undefined,
        }}
      >
        <div className="text-center">
          <p className="text-gray-100 text-lg">Select a game</p>
          <p className="text-gray-300 text-sm mt-2">Click on a game card to view details</p>
        </div>
        {!disablePanelResize && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
        )}
      </div>
    );
  }

  // Banner at top of panel always uses the explicitly selected banner first,
  // then falls back to hero art and box art.
  // Alternative Background toggle only affects the full-page backdrop in App.tsx.
  const backgroundImageUrl = game.bannerUrl || game.heroUrl || game.boxArtUrl || '';
  const backgroundFromBanner = game.bannerUrl === backgroundImageUrl;
  const backgroundFromHero = game.heroUrl === backgroundImageUrl;
  const backgroundFromBoxart = game.boxArtUrl === backgroundImageUrl;
  const backgroundMediaKind: 'banner' | 'boxart' = (backgroundFromHero || backgroundFromBanner)
    ? 'banner'
    : 'boxart';
  const isBackgroundVideo = !!(backgroundImageUrl && (
    (backgroundFromHero && game.heroIsVideo) ||
    (backgroundFromBanner && game.bannerIsVideo) ||
    (backgroundFromBoxart && game.boxArtIsVideo)
  ));
  
  const isBoxartVideo = !!game.boxArtIsVideo;
  const disableAnimatedBannersBySettings = disableAnimatedBanners && !overlaysOpen;
  const disableAnimatedBoxartsBySettings = disableAnimatedBoxarts && !overlaysOpen;
  const disableAnimatedIconsBySettings = disableAnimatedIcons && !overlaysOpen;
  const shouldDisableAnimatedCurrentBackground =
    (backgroundMediaKind === 'banner' && disableAnimatedBannersBySettings) ||
    (backgroundMediaKind === 'boxart' && disableAnimatedBoxartsBySettings);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatInstallSize = (installSize?: number) => {
    if (installSize === undefined || installSize <= 0) return '';
    return `${Math.round((installSize / 1024 / 1024 / 1024) * 100) / 100} GB`;
  };

  const normalizedPlatform = game.platform?.trim() || '';
  const platformDisplay = normalizedPlatform
    ? getLauncherDisplayName(normalizedPlatform)
    : '';
  const formattedReleaseDate = formatDate(game.releaseDate);
  const formattedInstallSize = formatInstallSize(game.installSize);
  const baseContentTopPadding = 24;
  const contentInnerWidth = Math.max(0, activePanelWidth - 48);
  const descriptionColumnWidth = Math.max(0, contentInnerWidth * (descriptionWidth / 100));
  const detailsColumnWidth = Math.max(0, contentInnerWidth - descriptionColumnWidth - 4);
  const requestedLogoHeight = localLogoSize !== undefined
    ? localLogoSize
    : (game.logoSizePerViewMode?.[viewMode as 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow'] || game.logoSizePerViewMode?.carousel || rightPanelLogoSize);
  const effectiveLogoHeight = requestedLogoHeight;
  const logoClearancePadding = (game.logoUrl || !game.boxArtUrl)
    ? Math.min(Math.ceil(effectiveLogoHeight * 0.3) + 20, 110)
    : 0;
  const maxBoxartWidthForSide = rightPanelBoxartPosition === 'left'
    ? Math.max(120, descriptionColumnWidth - 72)
    : rightPanelBoxartPosition === 'right'
      ? Math.max(120, detailsColumnWidth - 72)
      : rightPanelBoxartSize;
  const renderedBoxartWidth = rightPanelBoxartPosition === 'none'
    ? rightPanelBoxartSize
    : Math.max(120, Math.min(rightPanelBoxartSize, maxBoxartWidthForSide));
  const renderedBoxartHeight = Math.round(renderedBoxartWidth * 1.5);
  const leftBoxartOverlapRatio = useLeftBoxartWideLayout ? 0.34 : 0.22;
  const leftBoxartContentOverlapHeight = Math.max(0, Math.round(renderedBoxartHeight * leftBoxartOverlapRatio));
  const logoAreaOuterInset = 24;
  const boxartPanelInset = 56;
  const logoAreaPositionStyle: React.CSSProperties = rightPanelBoxartPosition === 'none'
    ? {
      left: `${logoAreaOuterInset}px`,
      right: `${logoAreaOuterInset}px`,
    }
    : rightPanelBoxartPosition === 'right'
      ? {
        left: `${logoAreaOuterInset}px`,
        right: `${boxartPanelInset + renderedBoxartWidth + logoAreaOuterInset}px`,
      }
      : {
        left: `${boxartPanelInset + renderedBoxartWidth + logoAreaOuterInset}px`,
        right: `${logoAreaOuterInset}px`,
      };
  const descriptionTopPadding = logoClearancePadding;
  const detailsTopPadding = rightPanelBoxartPosition === 'right'
    ? Math.max(logoClearancePadding, Math.ceil(renderedBoxartWidth * 1.5 * 0.5) + 24)
    : logoClearancePadding;
  const primaryDeveloper = game.developers?.[0] || '';
  const detailsSectionGapClass = 'gap-2';
  const detailsLabelClass = 'text-gray-400 mb-0 leading-tight';
  const renderBoxart = (position: 'left' | 'right') => {
    const wrapperClassName = `absolute ${position === 'left' ? 'left-6' : 'right-14'} bottom-0 z-20`;

    return (
      <div className={wrapperClassName} style={{ transform: 'translateY(50%)' }}>
        {game.boxArtUrl && (isBoxartVideo || !isAnimatedMedia(game.boxArtUrl, isBoxartVideo) || !disableAnimatedBoxartsBySettings) ? (
          game.boxArtIsVideo ? (
            <video
              src={game.boxArtUrl}
              data-animation-kind="boxart"
              muted
              loop
              playsInline
              autoPlay
              className="aspect-[2/3] object-cover rounded border border-gray-600 shadow-lg cursor-pointer"
              style={{ width: `${renderedBoxartWidth}px` }}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
            />
          ) : (
            <img
              src={game.boxArtUrl}
              alt={game.title}
              className="aspect-[2/3] object-cover rounded border border-gray-600 shadow-lg cursor-pointer"
              style={{
                width: `${renderedBoxartWidth}px`,
                ...(isAnimatedImage(game.boxArtUrl) ? {
                  willChange: 'transform',
                  contain: 'layout style paint',
                } : {})
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.dataset.errorHandled === 'true') return;

                if (game.bannerUrl && target.src !== game.bannerUrl && !target.dataset.fallbackAttempted) {
                  target.dataset.fallbackAttempted = 'true';
                  target.src = game.bannerUrl;
                } else {
                  target.dataset.errorHandled = 'true';
                  target.style.display = 'none';
                  target.src = '';
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
            />
          )
        ) : (
          <div
            className="aspect-[2/3] bg-gray-800 rounded border border-gray-600 flex items-center justify-center text-gray-400 text-xs text-center px-2 cursor-pointer hover:bg-gray-700 transition-colors"
            style={{ width: `${renderedBoxartWidth}px` }}
            onClick={() => onOpenInGameManager?.(game, 'images')}
          >
            Click to add boxart
          </div>
        )}
      </div>
    );
  };

  const renderLeftBoxartSpacer = () => {
    if (rightPanelBoxartPosition !== 'left') {
      return null;
    }

    return (
      <div
        aria-hidden="true"
        className="float-left mr-6 mb-2 pointer-events-none"
        style={{
          width: `${renderedBoxartWidth}px`,
          height: `${leftBoxartContentOverlapHeight}px`,
        }}
      />
    );
  };

  return (
    <div
      ref={panelRef}
      className={`${isViewFlipped ? 'rounded-r-3xl' : 'rounded-l-3xl'} flex flex-col h-full overflow-hidden relative border border-white/5 shadow-xl`}
      style={{
        width: `${activePanelWidth}px`,
        minWidth: '400px',
        backgroundColor: panelBackground,
        backdropFilter: `blur(${panelBackdropBlur})`,
        WebkitBackdropFilter: `blur(${panelBackdropBlur})`,
        boxShadow: panelTransparency >= 0.98 ? 'none' : undefined,
      }}
      onContextMenu={(e) => {
        // Open right-click menu anywhere in the panel
        setLogoResizeMenu(null);
        setShowLogoResizeDialog(false);
        e.preventDefault();
        e.stopPropagation();
        onRightClick?.(e.clientX, e.clientY);
      }}
    >
      {!disablePanelResize && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />
      )}

      {/* Background Image - Resizable */}
      <div
        ref={fanartRef}
        className="relative flex-shrink-0 overflow-visible"
        style={{ height: backgroundImageUrl ? `${fanartHeight}px` : 'auto', minHeight: backgroundImageUrl ? `${fanartHeight}px` : '120px' }}
      >
        {backgroundImageUrl && (isBackgroundVideo || !isAnimatedMedia(backgroundImageUrl, isBackgroundVideo) || !shouldDisableAnimatedCurrentBackground) && (
          <>
            {isBackgroundVideo ? (
              <video
                key={backgroundImageUrl}
                src={backgroundImageUrl}
                data-animation-kind={backgroundMediaKind}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
                className="w-full h-full object-cover cursor-pointer"
                style={{ 
                  height: `${fanartHeight}px`,
                  maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                }}
                onError={(e) => {
                  const v = e.currentTarget;
                  v.style.display = 'none';
                }}
              />
            ) : (
              <img
                key={backgroundImageUrl}
                src={backgroundImageUrl}
                alt={game.title}
                className="w-full h-full object-cover cursor-pointer"
                style={{
                  height: `${fanartHeight}px`,
                  maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                  ...(isAnimatedImage(backgroundImageUrl) ? {
                    willChange: 'transform',
                    contain: 'layout style paint',
                  } : {})
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Prevent infinite retry loop
                  if (target.dataset.errorHandled === 'true') return;
                  target.dataset.errorHandled = 'true';
                  target.style.display = 'none';
                  target.src = ''; // Clear src to prevent retries
                }}
              />
            )}
          </>
        )}

        {/* Logo - Position based on rightPanelBoxartPosition */}
        <div
          className="absolute bottom-0 z-20 flex items-center justify-center px-6"
          data-logo-area
          style={{
            ...logoAreaPositionStyle,
            transform: 'translateY(50%)',
            maxHeight: `${requestedLogoHeight}px`,
            contain: 'layout style',
          }}
        >
          {displayedLogo.url ? (
            <div
              key={displayedLogo.url}
              className="game-logo-swap-in"
              onContextMenu={(e) => {
                // Allow event to bubble up to parent to open RightClickMenu
                e.preventDefault();
              }}
              style={{ pointerEvents: 'auto' }}
            >
              {displayedLogo.isVideo ? (
                <video
                  src={displayedLogo.url}
                  data-animation-kind="logo"
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="max-w-full max-h-full object-contain cursor-pointer drop-shadow-2xl"
                  style={{
                    maxHeight: `${requestedLogoHeight}px`,
                    display: 'block',
                    contain: 'layout style paint',
                    ...(game.removeLogoTransparency ? {
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      padding: '8px',
                      borderRadius: '4px'
                    } : {})
                  }}
                />
              ) : (
                <img
                  src={displayedLogo.url}
                  alt={game.title}
                  className="max-w-full max-h-full object-contain cursor-pointer drop-shadow-2xl"
                  style={{
                    maxHeight: `${requestedLogoHeight}px`,
                    display: 'block',
                    contain: 'layout style paint',
                    ...(game.removeLogoTransparency ? {
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      padding: '8px',
                      borderRadius: '4px'
                    } : {})
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Prevent infinite retry loop
                    if (target.dataset.errorHandled === 'true') return;
                    target.dataset.errorHandled = 'true';
                    target.style.display = 'none';
                    target.src = ''; // Clear src to prevent retries
                  }}
                />
              )}
            </div>
          ) : (
            <div
              className="text-center text-gray-100 leading-tight"
              style={{
                fontSize: localLogoSize !== undefined ? `${localLogoSize * 0.5}px` : 'clamp(1.25rem, 5vw, 2.5rem)',
                fontWeight: '600',
                wordBreak: 'break-word',
                hyphens: 'auto',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
              }}
            >
              {game.title}
            </div>
          )}
        </div>

        {/* Box Art - Position based on rightPanelBoxartPosition */}
        {rightPanelBoxartPosition === 'left' && renderBoxart('left')}
        {rightPanelBoxartPosition === 'right' && renderBoxart('right')}

        {/* Resize handle */}
        {backgroundImageUrl && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingFanart(true);
            }}
          />
        )}
      </div>

      {/* Social media links have been moved to the bottom action bar overlay */}

      {/* Content */}
      <div className="flex-1" style={{ overflowX: 'hidden', minHeight: 0 }}>
        <div
          key={game.id}
          className="p-6 flex flex-col gap-6 h-full min-h-0"
          style={{
            paddingTop: `${baseContentTopPadding}px`
          }}
        >
          {/* Upper Section: Title - only shown when no logo */}
          {game && (false && !game?.logoUrl) && (
            <div className="relative">
              <div>
                <h1
                  className="title-fallback font-bold text-white onyx-text-glow tracking-wide break-words cursor-pointer"
                  style={{
                    fontSize: `${titleFontSize}px`,
                    fontFamily: titleFontFamily,
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {game?.title}
                </h1>
              </div>
            </div>
          )}

        {/* Description and Details in a row */}
        <div ref={descriptionContainerRef} className="flex flex-1 min-h-0 gap-0 relative">
            {/* Description Content - Left side */}
            <div
              className="relative min-h-0 flex flex-col"
              style={{
                width: `${descriptionWidth}%`,
                paddingTop: descriptionTopPadding > 0 ? `${descriptionTopPadding}px` : undefined,
              }}
            >
              <div
                ref={descriptionRef}
                className={`${rightPanelBoxartPosition === 'left' ? '' : 'space-y-6'} relative pr-3 min-h-0 flex-1`}
                style={{
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {renderLeftBoxartSpacer()}

                {/* Game Description */}
                {game.description && (
                  <div className={rightPanelBoxartPosition === 'left' ? 'mb-6' : ''}>
                    <div
                      className={`game-details-description ${useDescriptionSideMediaLayout ? 'layout-side' : 'layout-stacked'} ${rightPanelBoxartPosition === 'left' ? 'left-boxart-wrap' : ''} text-gray-200 leading-relaxed cursor-pointer`}
                      style={{
                        fontSize: `${rightPanelTextSize}px`,
                        fontFamily: descriptionFontFamily,
                        ['--desc-media-max-height' as any]: `${mediaMaxHeight}px`,
                        ['--desc-media-side-width' as any]: `${mediaSideWidth}px`,
                      } as React.CSSProperties}
                      dangerouslySetInnerHTML={{ __html: renderedDescriptionHtml }}
                    />
                  </div>
                )}

                {/* Features */}
                {game.features && game.features.length > 0 && (
                  <div className={rightPanelBoxartPosition === 'left' ? 'mt-6' : ''}>
                    <h3 className="text-lg font-semibold text-white mb-3">Features</h3>
                    <ul className="space-y-2 text-gray-200 text-sm">
                      {game.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Resize handle for description */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingDescription(true);
                }}
              />
            </div>

            {/* Vertical divider */}
            <div
              className="w-1 cursor-col-resize hover:bg-blue-500/40 transition-colors bg-transparent flex-shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingDescriptionWidth(true);
              }}
            />

            {/* Details Section - Right side */}
            <div
              className="pl-6 min-h-0 flex flex-col items-end text-right"
              style={{
                paddingTop: detailsTopPadding > 0 ? `${detailsTopPadding}px` : undefined,
                width: `${100 - descriptionWidth}%`,
                fontSize: `${detailsFontSize}px`,
                fontFamily: detailsFontFamily,
              }}
            >
              <div className={`grid grid-cols-1 ${detailsSectionGapClass} min-h-0 flex-1 overflow-y-auto justify-items-end pr-4`}>
                {visibleDetails.releaseDate && formattedReleaseDate && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass} style={{ fontSize: `${rightPanelTextSize - 2}px` }}>Release Date</p>
                    <p className="text-gray-200" style={{ fontSize: `${rightPanelTextSize}px` }}>{formattedReleaseDate}</p>
                  </div>
                )}
                {visibleDetails.platform && platformDisplay && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass} style={{ fontSize: `${rightPanelTextSize - 2}px` }}>Platform</p>
                    <div className="text-gray-200 flex items-center justify-end gap-2" style={{ fontSize: `${rightPanelTextSize}px` }}>
                      <LauncherIcon launcher={normalizedPlatform} className="w-4 h-4" />
                      <span>{platformDisplay}</span>
                    </div>
                  </div>
                )}
                {visibleDetails.ageRating && game.ageRating && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Age Rating</p>
                    <p className="text-gray-200">{game.ageRating}</p>
                  </div>
                )}
                {visibleDetails.genres && game.genres && game.genres.length > 0 && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Genres</p>
                    <p className="text-gray-200">{game.genres.join(', ')}</p>
                  </div>
                )}
                {visibleDetails.developers && primaryDeveloper && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Developer</p>
                    <p className="text-gray-200" title={game.developers?.join(', ')}>{primaryDeveloper}</p>
                  </div>
                )}
                {visibleDetails.publishers && game.publishers && game.publishers.length > 0 && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Publisher</p>
                    <p className="text-gray-200">{game.publishers.join(', ')}</p>
                  </div>
                )}
                {visibleDetails.communityScore && game.communityScore !== undefined && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Community Score</p>
                    <p className="text-gray-200">{formatScore(game.communityScore)}</p>
                  </div>
                )}
                {visibleDetails.userScore && game.userScore !== undefined && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>User Score</p>
                    <p className="text-gray-200">{formatScore(game.userScore)}</p>
                  </div>
                )}
                {visibleDetails.criticScore && game.criticScore !== undefined && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Critic Score</p>
                    <p className="text-gray-200">{formatScore(game.criticScore)}</p>
                  </div>
                )}
                {visibleDetails.installationDirectory && game.installationDirectory && (
                  <div className="leading-tight">
                    <p className={detailsLabelClass}>Installation Folder</p>
                    <p className="text-gray-200 text-xs break-all">{game.installationDirectory}</p>
                    {formattedInstallSize && (
                      <p className="text-gray-400 text-xs mt-1">
                        {formattedInstallSize}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && game && (
        <GameContextMenu
          game={game}
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
        />
      )}

      {/* Logo Resize Menu */}
      {logoResizeMenu && game && (
        <LogoResizeMenu
          game={game}
          x={logoResizeMenu.x}
          y={logoResizeMenu.y}
          onClose={() => setLogoResizeMenu(null)}
          onSizeChange={handleLogoSizeChange}
          rightPanelLogoSize={rightPanelLogoSize}
        />
      )}

      {/* Image Search Modal */}
      {imageSearchModal && game && (
        <ImageSearchModal
          isOpen={!!imageSearchModal}
          onClose={() => setImageSearchModal(null)}
          gameTitle={game.title}
          imageType={imageSearchModal.type}
          onSelectImage={async (imageUrl) => {
            if (onSaveGame) {
              const updatedGame = imageSearchModal.type === 'artwork'
                ? { ...game, bannerUrl: imageUrl }
                : { ...game, boxArtUrl: imageUrl };
              await onSaveGame(updatedGame);
            }
          }}
        />
      )}

      {/* Logo Resize Dialog */}
      {showLogoResizeDialog && game && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Resize Logo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Logo Height: {localLogoSize !== undefined ? localLogoSize : (game.logoSize || 300)}px</label>
                <input
                  type="range"
                  min="50"
                  max="600"
                  value={localLogoSize !== undefined ? localLogoSize : (game.logoSize || 300)}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setLocalLogoSize(newSize);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={async () => {
                    if (isSavingLogoSize || !game || localLogoSize === undefined) {
                      return;
                    }

                    setIsSavingLogoSize(true);
                    try {
                      // Ensure we have the latest game data with all properties preserved
                      const updatedGame = {
                        ...game,
                        logoSize: localLogoSize,
                        // Explicitly preserve all image URLs to prevent them from being lost
                        bannerUrl: game.bannerUrl,
                        boxArtUrl: game.boxArtUrl,
                        logoUrl: game.logoUrl,
                        heroUrl: game.heroUrl
                      };

                      // Update UI immediately without full reload to prevent banner from disappearing
                      if (onUpdateGameInState) {
                        onUpdateGameInState(updatedGame);
                      }

                      // Save to disk in the background
                      if (onSaveGame) {
                        await onSaveGame(updatedGame);
                      }
                    } catch (error) {
                      console.error('Error saving logo size:', error);
                    } finally {
                      setIsSavingLogoSize(false);
                      setShowLogoResizeDialog(false);
                    }
                  }}
                  disabled={isSavingLogoSize || localLogoSize === undefined}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingLogoSize ? 'Saving...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boxart Resize Dialog */}
      {showBoxartResizeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Resize Boxart</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Boxart Width: {boxartWidth}px</label>
                <input
                  type="range"
                  min="64"
                  max="256"
                  value={boxartWidth}
                  onChange={(e) => setBoxartWidth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowBoxartResizeDialog(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons and Links at Bottom - Resizable height */}
      {game && (() => {
        const bottomBarScale = bottomBarHeight / 72;
        const scaledButtonSize = Math.round(rightPanelButtonSize * bottomBarScale);
        const scaledPadding = Math.max(8, 16 * bottomBarScale);
        const scaledGap = Math.max(8, 12 * bottomBarScale);
        const scaledIconSize = Math.max(14, 20 * bottomBarScale);
        return (
        <div
          ref={bottomBarRef}
          className="border-t border-gray-700 flex items-center flex-shrink-0 w-full relative"
          style={{
            boxSizing: 'border-box',
            height: `${bottomBarHeight}px`,
            minHeight: `${bottomBarHeight}px`,
            paddingLeft: scaledPadding,
            paddingRight: scaledPadding,
            paddingTop: scaledPadding,
            paddingBottom: scaledPadding,
            gap: scaledGap,
          }}
        >
          {/* Resize handle at top of bottom bar */}
          <div
            className="absolute left-0 right-0 top-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingBottomBar(true);
            }}
          />
          <div className={`flex items-center w-full ${rightPanelButtonLocation === 'middle' ? 'justify-between' : 'justify-between'}`} style={{ gap: scaledGap }}>
          {(() => {
            const actionButtons = (
              <>
                <button
                  onClick={() => onFavorite?.(game)}
                  data-controller-action="favorite"
                  className={`group rounded transition-colors ${game.favorite ? 'text-yellow-400' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  title="Favorite"
                  style={{ fontSize: `${scaledButtonSize}px`, padding: scaledGap * 0.5 }}
                >
                  <svg className="group- hover:animate-gentle-bounce group-hover:animate-gentle-bounce" fill={game.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ width: scaledIconSize, height: scaledIconSize }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>

                {onEdit && (
                  <button
                    onClick={() => onEdit(game)}
                    data-controller-action="edit"
                    style={{
                      backgroundColor: rightPanelButtonColors?.editColor || '#6b7280',
                      color: getContrastingTextColor(rightPanelButtonColors?.editColor || '#6b7280'),
                      fontSize: `${scaledButtonSize}px`,
                      padding: `${scaledGap * 0.5}px ${scaledGap}px`,
                      gap: scaledGap,
                    }}
                    className="group hover:opacity-90 text-white font-medium rounded-lg transition-colors flex items-center"
                    title="Edit Game"
                  >
                    <svg className="group- hover:animate-edit-pen group-hover:animate-edit-pen" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: scaledIconSize, height: scaledIconSize }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}

                {game.modManagerUrl && (
                  <button
                    onClick={async () => {
                      if (game.id) {
                        try {
                          const result = await window.electronAPI.launchModManager(game.id);
                          if (!result.success && result.error) {
                            console.error('Error launching mod manager:', result.error);
                          }
                        } catch (err) {
                          console.error('Error opening mod manager:', err);
                        }
                      }
                    }}
                    data-controller-action="mod-manager"
                    style={{
                      backgroundColor: rightPanelButtonColors?.modManagerColor || '#a855f7',
                      color: getContrastingTextColor(rightPanelButtonColors?.modManagerColor || '#a855f7'),
                      fontSize: `${scaledButtonSize}px`,
                      padding: `${scaledGap * 0.5}px ${scaledGap}px`,
                      gap: scaledGap,
                    }}
                    className="group hover:opacity-90 text-white font-medium rounded-lg transition-colors flex items-center"
                    title="Open Mod Manager"
                  >
                    <svg className="group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: scaledIconSize, height: scaledIconSize }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Mod Manager
                  </button>
                )}

                <button
                  onClick={() => onPlay?.(game)}
                  disabled={isLaunching || isRunning}
                  data-controller-action="play"
                  style={{
                    backgroundColor: rightPanelButtonColors?.playColor || '#0ea5e9',
                    color: getContrastingTextColor(rightPanelButtonColors?.playColor || '#0ea5e9'),
                    fontSize: `${scaledButtonSize}px`,
                    padding: `${scaledGap * 0.5}px ${scaledGap * 1.5}px`,
                    gap: scaledGap,
                  }}
                  className="group rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity text-white font-medium"
                >
                  <svg className="group- hover:animate-play-pulse group-hover:animate-play-pulse" fill="currentColor" viewBox="0 0 24 24" style={{ width: scaledIconSize, height: scaledIconSize }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {isLaunching ? 'Launching...' : isRunning ? 'Running' : 'Play'}
                </button>
              </>
            );

            const linksComponent = game && (
              <GameLinks
                game={game}
                onUpdateLinks={async (newLinks) => {
                  const updatedGame = { ...game, links: newLinks };
                  if (onUpdateGameInState) onUpdateGameInState(updatedGame);
                  if (onSaveGame) await onSaveGame(updatedGame);
                }}
                displayMode="icons"
                visibleTypes={visibleLinkTypesFromProps ?? visibleLinkTypes}
                displayOrder={linkDisplayOrderFromProps ?? linkDisplayOrder ?? undefined}
                buttonSize={scaledButtonSize}
                disableAnimatedIcons={disableAnimatedIconsBySettings}
              />
            );

            if (rightPanelButtonLocation === 'left') {
              return (
                <>
                  <div className="flex items-center flex-shrink-0" style={{ gap: scaledGap }}>{actionButtons}</div>
                  <div className="flex items-center flex-wrap justify-end flex-1 px-2" style={{ gap: scaledGap }}>{linksComponent}</div>
                </>
              );
            }

            if (rightPanelButtonLocation === 'right') {
              return (
                <>
                  <div className="flex items-center flex-wrap justify-start flex-1 px-2" style={{ gap: scaledGap }}>{linksComponent}</div>
                  <div className="flex items-center flex-shrink-0" style={{ gap: scaledGap }}>{actionButtons}</div>
                </>
              );
            }

            // Middle
            return (
              <>
                <div className="flex-1 flex justify-start items-center px-2 flex-wrap" style={{ gap: scaledGap }}>{linksComponent}</div>
                <div className="flex-none flex items-center justify-center flex-shrink-0" style={{ gap: scaledGap }}>{actionButtons}</div>
                <div className="flex-1"></div>
              </>
            );
          })()}
          </div>
        </div>
        );
      })()}
    </div>
  );
};
