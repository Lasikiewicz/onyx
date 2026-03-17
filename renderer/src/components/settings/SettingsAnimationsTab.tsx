import React from 'react';
import { SettingsSection, SettingsToggle } from './SettingsComponents';

interface SettingsAnimationsTabProps {
  disableAllAnimations: boolean;
  disableAnimatedBanners: boolean;
  disableAnimatedBoxarts: boolean;
  disableAnimatedBackgrounds: boolean;
  disableAnimatedIcons: boolean;
  disableAnimatedLogos: boolean;
  onSetDisableAllAnimations: (checked: boolean) => void;
  onSetDisableAnimatedBanners: (checked: boolean) => void;
  onSetDisableAnimatedBoxarts: (checked: boolean) => void;
  onSetDisableAnimatedBackgrounds: (checked: boolean) => void;
  onSetDisableAnimatedIcons: (checked: boolean) => void;
  onSetDisableAnimatedLogos: (checked: boolean) => void;
}

export const SettingsAnimationsTab: React.FC<SettingsAnimationsTabProps> = ({
  disableAllAnimations,
  disableAnimatedBanners,
  disableAnimatedBoxarts,
  disableAnimatedBackgrounds,
  disableAnimatedIcons,
  disableAnimatedLogos,
  onSetDisableAllAnimations,
  onSetDisableAnimatedBanners,
  onSetDisableAnimatedBoxarts,
  onSetDisableAnimatedBackgrounds,
  onSetDisableAnimatedIcons,
  onSetDisableAnimatedLogos,
}) => {
  return (
    <div className="space-y-6 p-6">
      <SettingsSection title="Animations" description="Control animated UI and artwork to reduce CPU usage">
        <SettingsToggle
          label="Disable all animations"
          description="Turn off UI motion and animated artwork. Some changes may require restart."
          checked={disableAllAnimations}
          onChange={onSetDisableAllAnimations}
        />
        <SettingsToggle
          label="Disable animated banners"
          description="Stop animated hero/banner artwork from animating."
          checked={disableAnimatedBanners}
          disabled={disableAllAnimations}
          onChange={onSetDisableAnimatedBanners}
        />
        <SettingsToggle
          label="Disable animated boxarts"
          description="Force boxart tiles to stay static even when animated versions exist."
          checked={disableAnimatedBoxarts}
          disabled={disableAllAnimations}
          onChange={onSetDisableAnimatedBoxarts}
        />
        <SettingsToggle
          label="Disable animated alt banners"
          description="Prevent animated alternative banner backgrounds from animating."
          checked={disableAnimatedBackgrounds}
          disabled={disableAllAnimations}
          onChange={onSetDisableAnimatedBackgrounds}
        />
        <SettingsToggle
          label="Disable animated icons"
          description="Disable animations on small icon-style artwork and badges."
          checked={disableAnimatedIcons}
          disabled={disableAllAnimations}
          onChange={onSetDisableAnimatedIcons}
        />
        <SettingsToggle
          label="Disable animated logos"
          description="Disable animations on game and publisher logos."
          checked={disableAnimatedLogos}
          disabled={disableAllAnimations}
          onChange={onSetDisableAnimatedLogos}
        />
      </SettingsSection>
    </div>
  );
};
