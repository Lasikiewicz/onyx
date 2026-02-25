export interface ScannedGameResult {
  uuid: string;
  source: string;
  originalName: string;
  installPath: string;
  exePath?: string;
  launchArgs?: string;  // Command-line arguments for exe launch
  appId?: string;
  packageFamilyName?: string;
  appUserModelId?: string;
  launchUri?: string;
  xboxKind?: 'uwp' | 'pc';
  title: string;
  status: 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error';
  categories?: string[];
  isDownloading?: boolean;
  error?: string;
}
