export type BigScreenDisplayChoice = 'current' | 'primary' | number;

export interface BigScreenLaunchFlags {
  bigScreen: boolean;
  bigScreenDisplay?: BigScreenDisplayChoice;
}

export interface BigScreenDisplayInfo {
  id: number;
  primary: boolean;
  width: number;
  height: number;
}

export interface BringToFrontSyncResult {
  shortcutRequested: boolean;
  shortcutRegistered: boolean;
  shortcut?: string;
  reason?: string;
  guideEnabled: boolean;
}

export interface SunshineInstallReport {
  host: 'sunshine' | 'apollo';
  appsJson: string;
  hasOnyxEntry: boolean;
}

export interface SunshineDetectResult {
  installs: SunshineInstallReport[];
  packaged: boolean;
  commandPreview: string;
  imageAvailable: boolean;
}

export interface SunshineFileResult {
  appsJson: string;
  success: boolean;
  error?: string;
  backupPath?: string;
  removed?: number;
}

export interface SunshineWriteResult {
  success: boolean;
  error?: string;
  results: SunshineFileResult[];
}
