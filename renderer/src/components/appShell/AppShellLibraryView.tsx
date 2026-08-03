import { Suspense, lazy, type RefObject } from 'react';
import { LibraryGrid } from '../LibraryGrid';
import { LibraryCardView } from '../LibraryCardView';
import { LibraryListView, type ListViewOptions } from '../LibraryListView';
import type { Game } from '../../types/game';
import type { WelcomeScreenProps } from '../WelcomeScreen';
import type { RightClickMenuEditorSection } from '../rightClickMenu/RightClickMenuHeader';
import { AppShellCategoryBar } from './AppShellCategoryBar';

const LibraryCarousel = lazy(() =>
  import('../LibraryCarousel').then((module) => ({ default: module.LibraryCarousel })),
);
const LibraryCoverFlow = lazy(() =>
  import('../LibraryCoverFlow').then((module) => ({ default: module.LibraryCoverFlow })),
);
const WelcomeScreen = lazy(() =>
  import('../WelcomeScreen').then((module) => ({ default: module.WelcomeScreen })),
);

const lazyRenderFallback = null;

type LibraryViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';

interface AppShellLibraryViewProps {
  activeGameId: string | null;
  gridSmartFill: boolean;
  gridMaximizeSpace: boolean;
  panelWidth: number;
  onPanelWidthChange?: (width: number) => void;
  carouselGameTilePadding: number;
  carouselViewProps: {
    carouselButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
    carouselButtonSize: number;
    carouselDescriptionSize: number;
    carouselLogoSize: number;
    detailsBarSize: number;
    isViewFlipped: boolean;
    onCarouselButtonSizeChange: (size: number) => void;
    onCarouselDescriptionSizeChange: (size: number) => void;
    onCarouselLogoSizeChange: (size: number) => void;
    onDetailsBarSizeChange: (size: number) => void;
    onEmptySpaceRightClick: (x: number, y: number) => void;
    selectedBoxArtSize: number;
    showCarouselDetails: boolean;
    showCarouselLogos: boolean;
  };
  cardColumns: number;
  cardPostersOnly: boolean;
  cardSmartFill: boolean;
  categoriesAlignment: 'left' | 'center' | 'right';
  categoriesPosition: 'top' | 'bottom';
  categoriesSize: number;
  coverFlowButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  coverFlowButtonPosition: 'left' | 'middle' | 'right';
  coverFlowCoverSize: number;
  coverFlowReflection: number;
  coverFlowShowButtons: boolean;
  coverFlowSideOpacity: number;
  coverFlowVerticalOffset: number;
  disableAnimatedBoxarts: boolean;
  disableAnimatedLogos: boolean;
  displayGames: Game[];
  error: string | null;
  forceShowInitialOnboarding: boolean;
  gameTilePadding: number;
  gridContainerRef: RefObject<HTMLDivElement>;
  gridDescriptionSize: number;
  gridSize: number;
  hasFavoriteGames: boolean;
  hideGameTitles: boolean;
  isHiddenView: boolean;
  listViewOptions: ListViewOptions;
  listViewSize: number;
  loading: boolean;
  logoBackgroundColor: string;
  logoBackgroundOpacity: number;
  logoPosition: 'top' | 'middle' | 'bottom' | 'underneath';
  logoSize: number;
  onCategoryChange: (category: string | null) => void;
  onEditCategories: (game: Game) => void;
  onEditGame: (game: Game) => void;
  onEditImages: (game: Game) => void;
  onEmptySpaceMenu: (x: number, y: number, initialEditorSection?: RightClickMenuEditorSection | null) => void;
  onFixMatch: (game: Game) => void;
  onGameClick: (game: Game) => void;
  onGameContextMenu: (game: Game, x: number, y: number) => void;
  onHideGame: (game: Game) => void;
  onPlay: (game: Game) => Promise<void>;
  onReorder: (games: Game[]) => Promise<void>;
  onToggleFavorite: (game: Game) => Promise<void>;
  onTogglePin: (game: Game) => Promise<void>;
  onUnhideGame: (game: Game) => Promise<void>;
  onUninstallGame: (game: Game) => Promise<void>;
  pinnedCategories: string[];
  selectedCategory: string | null;
  setGridSize: (size: number) => void;
  showCategories: boolean;
  showLogoOverBoxart: boolean;
  viewMode: LibraryViewMode;
  welcomeScreenProps: WelcomeScreenProps;
}

export function AppShellLibraryView({
  activeGameId,
  gridSmartFill,
  gridMaximizeSpace,
  panelWidth,
  onPanelWidthChange,
  carouselGameTilePadding,
  carouselViewProps,
  cardColumns,
  cardPostersOnly,
  cardSmartFill,
  categoriesAlignment,
  categoriesPosition,
  categoriesSize,
  coverFlowButtonColors,
  coverFlowButtonPosition,
  coverFlowCoverSize,
  coverFlowReflection,
  coverFlowShowButtons,
  coverFlowSideOpacity,
  coverFlowVerticalOffset,
  disableAnimatedBoxarts,
  disableAnimatedLogos,
  displayGames,
  error,
  forceShowInitialOnboarding,
  gameTilePadding,
  gridContainerRef,
  gridDescriptionSize,
  gridSize,
  hasFavoriteGames,
  hideGameTitles,
  isHiddenView,
  listViewOptions,
  listViewSize,
  loading,
  logoBackgroundColor,
  logoBackgroundOpacity,
  logoPosition,
  logoSize,
  onCategoryChange,
  onEditCategories,
  onEditGame,
  onEditImages,
  onEmptySpaceMenu,
  onFixMatch,
  onGameClick,
  onGameContextMenu,
  onHideGame,
  onPlay,
  onReorder,
  onToggleFavorite,
  onTogglePin,
  onUnhideGame,
  onUninstallGame,
  pinnedCategories,
  selectedCategory,
  setGridSize,
  showCategories,
  showLogoOverBoxart,
  viewMode,
  welcomeScreenProps,
}: AppShellLibraryViewProps) {
  const isCarouselLikeView = viewMode === 'carousel' || viewMode === 'coverflow';
  const showPinnedCategories = showCategories && !isCarouselLikeView && pinnedCategories.length > 0;
  const libraryContentPadding = showCategories && !isCarouselLikeView
    ? categoriesPosition === 'top'
      ? 'px-4 pb-4 pt-0'
      : 'px-4 pt-4 pb-0'
    : '';

  return (
    <div className={`flex flex-col overflow-hidden ${isCarouselLikeView ? 'w-full' : 'flex-1'}`}>
      <div
        ref={gridContainerRef}
        data-controller-library-surface
        className={`flex-1 overflow-y-auto relative z-10 ${isCarouselLikeView ? '' : (showCategories && (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo' || viewMode === 'card') ? 'p-0' : 'p-4')}`}
        onContextMenuCapture={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest('[data-game-card]')) {
            event.preventDefault();
            event.stopPropagation();
            onEmptySpaceMenu(event.clientX, event.clientY, 'games-view');
          }
        }}
        onContextMenu={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest('[data-game-card]')) {
            event.preventDefault();
            event.stopPropagation();
            onEmptySpaceMenu(event.clientX, event.clientY, 'games-view');
          }
        }}
      >
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-100">Loading game library...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded p-4 mb-4">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="h-full flex flex-col">
            {showPinnedCategories && categoriesPosition === 'top' && (
              <AppShellCategoryBar
                alignment={categoriesAlignment}
                hasFavoriteGames={hasFavoriteGames}
                pinnedCategories={pinnedCategories}
                selectedCategory={selectedCategory}
                size={categoriesSize}
                onCategoryChange={onCategoryChange}
              />
            )}
            {displayGames.length > 0 && !forceShowInitialOnboarding ? (
              <div className={`flex-1 overflow-y-auto animate-onyx-grid-fade min-h-0 ${libraryContentPadding}`}>
                {(viewMode === 'grid' || viewMode === 'logo') && (
                  <LibraryGrid
                    games={displayGames}
                    onReorder={onReorder}
                    onPlay={onPlay}
                    onGameClick={onGameClick}
                    onEdit={onEditGame}
                    onEditImages={onEditImages}
                    onEditCategories={onEditCategories}
                    onFavorite={onToggleFavorite}
                    onPin={onTogglePin}
                    onFixMatch={onFixMatch}
                    onHide={onHideGame}
                    onUnhide={onUnhideGame}
                    isHiddenView={isHiddenView}
                    gridSize={gridSize}
                    logoSize={logoSize}
                    onGridSizeChange={setGridSize}
                    gameTilePadding={gameTilePadding}
                    hideGameTitles={hideGameTitles}
                    showLogoOverBoxart={showLogoOverBoxart}
                    logoPosition={logoPosition}
                    useLogosInsteadOfBoxart={viewMode === 'logo'}
                    smartFill={gridSmartFill}
                    maximizeSpace={gridMaximizeSpace}
                    panelWidth={panelWidth}
                    onPanelWidthChange={onPanelWidthChange}
                    logoBackgroundColor={logoBackgroundColor}
                    logoBackgroundOpacity={logoBackgroundOpacity}
                    descriptionSize={gridDescriptionSize}
                    disableAnimatedBoxarts={disableAnimatedBoxarts}
                    disableAnimatedLogos={disableAnimatedLogos}
                    onGameContextMenu={onGameContextMenu}
                    onEmptySpaceClick={onEmptySpaceMenu}
                    viewMode={viewMode}
                  />
                )}
                {viewMode === 'card' && (
                  <LibraryCardView
                    games={displayGames}
                    onReorder={onReorder}
                    onPlay={onPlay}
                    onGameClick={onGameClick}
                    columns={cardColumns}
                    postersOnly={cardPostersOnly}
                    smartFill={cardSmartFill}
                    gameTilePadding={gameTilePadding}
                    onGameContextMenu={onGameContextMenu}
                    onEmptySpaceClick={onEmptySpaceMenu}
                    disableAnimatedBoxarts={disableAnimatedBoxarts}
                    disableAnimatedLogos={disableAnimatedLogos}
                  />
                )}
                {viewMode === 'coverflow' && (
                  <Suspense fallback={lazyRenderFallback}>
                    <LibraryCoverFlow
                      games={displayGames}
                      onPlay={onPlay}
                      onGameClick={onGameClick}
                      onEdit={onEditGame}
                      onEditImages={onEditImages}
                      onEditCategories={onEditCategories}
                      onFavorite={onToggleFavorite}
                      onPin={onTogglePin}
                      onFixMatch={onFixMatch}
                      onHide={onHideGame}
                      onUnhide={onUnhideGame}
                      onUninstall={onUninstallGame}
                      isHiddenView={isHiddenView}
                      activeGameId={activeGameId}
                      coverSize={coverFlowCoverSize}
                      reflectionStrength={coverFlowReflection / 100}
                      verticalOffset={coverFlowVerticalOffset}
                      sideOpacity={coverFlowSideOpacity}
                      showButtons={coverFlowShowButtons}
                      buttonPosition={coverFlowButtonPosition}
                      buttonColors={coverFlowButtonColors}
                      onEmptySpaceRightClick={onEmptySpaceMenu}
                    />
                  </Suspense>
                )}
                {viewMode === 'carousel' && (
                  <Suspense fallback={lazyRenderFallback}>
                    <LibraryCarousel
                      games={displayGames}
                      onPlay={onPlay}
                      onGameClick={onGameClick}
                      onEdit={onEditGame}
                      onEditImages={onEditImages}
                      onEditCategories={onEditCategories}
                      onFavorite={onToggleFavorite}
                      onPin={onTogglePin}
                      onFixMatch={onFixMatch}
                      onHide={onHideGame}
                      onUnhide={onUnhideGame}
                      onUninstall={onUninstallGame}
                      isHiddenView={isHiddenView}
                      activeGameId={activeGameId}
                      gameTilePadding={carouselGameTilePadding}
                      {...carouselViewProps}
                    />
                  </Suspense>
                )}
                {viewMode === 'list' && (
                  <LibraryListView
                    games={displayGames}
                    onPlay={onPlay}
                    onGameClick={onGameClick}
                    onEdit={onEditGame}
                    onEditImages={onEditImages}
                    onEditCategories={onEditCategories}
                    onFavorite={onToggleFavorite}
                    onPin={onTogglePin}
                    onFixMatch={onFixMatch}
                    onHide={onHideGame}
                    onUnhide={onUnhideGame}
                    onUninstall={onUninstallGame}
                    isHiddenView={isHiddenView}
                    hideGameTitles={hideGameTitles}
                    listViewOptions={listViewOptions}
                    listViewSize={listViewSize}
                    onEmptySpaceClick={onEmptySpaceMenu}
                  />
                )}
              </div>
            ) : (
              <Suspense fallback={lazyRenderFallback}>
                <WelcomeScreen {...welcomeScreenProps} />
              </Suspense>
            )}
            {showPinnedCategories && categoriesPosition === 'bottom' && (
              <AppShellCategoryBar
                alignment={categoriesAlignment}
                hasFavoriteGames={hasFavoriteGames}
                pinnedCategories={pinnedCategories}
                selectedCategory={selectedCategory}
                size={categoriesSize}
                onCategoryChange={onCategoryChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
