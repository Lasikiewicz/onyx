import { ConfirmationDialog } from '../ConfirmationDialog';
import { CustomDefaultsManager } from '../CustomDefaultsManager';

export type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
export type ResolutionKey = '720p' | '1080p' | '1440p' | '4K';

export interface RightClickMenuModalsProps {
  viewMode: ViewMode;
  screenResolution: ResolutionKey;
  activeGameId?: string | null;
  activeGameTitle?: string;
  showCustomDefaultsModal: boolean;
  showResetConfirmation: boolean;
  showClearPerGameConfirm: boolean;
  resetResolution: string;
  onCloseCustomDefaults: () => void;
  onCloseResetConfirmation: () => void;
  onResetCurrentView: () => void;
  onResetAllViews: () => void;
  onClearPerGameOverrides: () => void;
  onSkipClearPerGameOverrides: () => void;
  onSettingsImported?: () => void;
}

function viewModeLabel(mode: ViewMode): string {
  switch (mode) {
    case 'grid':
      return 'Grid';
    case 'list':
      return 'List';
    case 'logo':
      return 'Logo';
    case 'coverflow':
      return 'Cover Flow';
    case 'carousel':
      return 'Carousel';
    default:
      return 'View';
  }
}

export function RightClickMenuModals({
  viewMode,
  screenResolution,
  activeGameId,
  activeGameTitle,
  showCustomDefaultsModal,
  showResetConfirmation,
  showClearPerGameConfirm,
  resetResolution,
  onCloseCustomDefaults,
  onCloseResetConfirmation,
  onResetCurrentView,
  onResetAllViews,
  onClearPerGameOverrides,
  onSkipClearPerGameOverrides,
  onSettingsImported,
}: RightClickMenuModalsProps) {
  return (
    <>
      <CustomDefaultsManager
        isOpen={showCustomDefaultsModal}
        onClose={onCloseCustomDefaults}
        currentViewMode={viewMode}
        currentResolution={screenResolution}
        activeGameId={activeGameId}
        onSettingsChange={onSettingsImported}
      />

      <ConfirmationDialog
        isOpen={showResetConfirmation}
        title="Reset to Defaults"
        message={`Reset view settings to defaults for ${resetResolution} resolution?`}
        note="This will reset all customization settings to their default values based on your screen resolution."
        primaryActionText={`Reset ${viewModeLabel(viewMode)} View`}
        secondaryActionText="Reset All Views"
        onPrimaryAction={onResetCurrentView}
        onSecondaryAction={onResetAllViews}
        onConfirm={onResetCurrentView}
        onCancel={onCloseResetConfirmation}
        variant="default"
      />

      <ConfirmationDialog
        isOpen={showClearPerGameConfirm}
        title="Clear Per-Game Overrides"
        message={`Also clear per-game logo size overrides for ${activeGameTitle ?? 'this game'}?`}
        note="This will remove any custom logo sizes you've set specifically for this game across all views."
        confirmText="Clear Overrides"
        cancelText="Keep Overrides"
        onConfirm={onClearPerGameOverrides}
        onCancel={onSkipClearPerGameOverrides}
        variant="default"
      />
    </>
  );
}
