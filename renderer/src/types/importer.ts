export type ImportStatus = 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error';
export type ImportSource = 'steam' | 'epic' | 'gog' | 'xbox' | 'ubisoft' | 'rockstar' | 'ea' | 'battle' | 'manual_file' | 'manual_folder';

export interface StagedGame {
  uuid: string; // Temporary unique ID for the UI list
  source: ImportSource;
  
  // File System Info
  originalName: string; // e.g. "Doom Eternal" or "doom_eternal.exe"
  installPath: string;
  exePath?: string;
  launchArgs?: string;  // Command-line arguments for exe launch
  appId?: string; // For Steam/Epic IDs
  packageFamilyName?: string;
  appUserModelId?: string;
  launchUri?: string;
  xboxKind?: 'uwp' | 'pc';
  
  // Metadata (Editable)
  title: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  categories?: string[];
  ageRating?: string;
  rating?: number;
  platform?: string;
  scrapedMetadata?: any; // Raw result from IGDB/SteamGridDB
  
  // Visuals (Selected URLs)
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  heroUrl?: string;
  screenshots?: string[];
  
  // Locked fields (prevent editing)
  lockedFields?: {
    title?: boolean;
    boxArtUrl?: boolean;
    bannerUrl?: boolean;
    logoUrl?: boolean;
    exePath?: boolean;
    description?: boolean;
    releaseDate?: boolean;
    [key: string]: boolean | undefined;
  };
  
  status: ImportStatus;
  isSelected: boolean;
  isIgnored?: boolean;
}
