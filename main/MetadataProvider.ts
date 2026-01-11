/**
 * MetadataProvider interface for aggregating game metadata from multiple sources
 */
export interface GameSearchResult {
  id: string;
  title: string;
  source: string; // Provider identifier (e.g., 'igdb', 'steamgriddb', 'steam')
  externalId?: string | number; // Provider-specific ID (e.g., IGDB game ID, Steam App ID)
  steamAppId?: string; // Steam App ID if available
}

export interface GameDescription {
  description?: string;
  summary?: string;
  releaseDate?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  ageRating?: string;
  rating?: number;
  platforms?: string[];
  categories?: string[];
}

export interface GameArtwork {
  boxArtUrl?: string;
  bannerUrl?: string;
  logoUrl?: string;
  heroUrl?: string;
  iconUrl?: string; // Game icon (typically 32x32 or 64x64)
  screenshots?: string[];
  // Resolution info for selecting highest quality
  boxArtResolution?: { width: number; height: number };
  bannerResolution?: { width: number; height: number };
  logoResolution?: { width: number; height: number };
  heroResolution?: { width: number; height: number };
  iconResolution?: { width: number; height: number };
}

export interface GameInstallInfo {
  installPath?: string;
  installSize?: number;
  executablePath?: string;
  platform?: string;
}

/**
 * MetadataProvider interface
 * Each provider implements methods to fetch specific types of metadata
 */
export interface MetadataProvider {
  /**
   * Provider identifier (e.g., 'igdb', 'steamgriddb', 'steam')
   */
  readonly name: string;

  /**
   * Check if the provider is available/configured
   */
  isAvailable(): boolean;

  /**
   * Search for games by title
   * @param title Game title to search for
   * @param steamAppId Optional Steam App ID to help with matching
   * @returns Array of search results
   */
  search(title: string, steamAppId?: string): Promise<GameSearchResult[]>;

  /**
   * Get game description and metadata by ID
   * @param id Provider-specific game ID
   * @returns Game description and metadata
   */
  getDescription(id: string): Promise<GameDescription | null>;

  /**
   * Get game artwork/images by ID
   * @param id Provider-specific game ID
   * @param steamAppId Optional Steam App ID for better matching
   * @returns Game artwork with resolution information
   */
  getArtwork(id: string, steamAppId?: string): Promise<GameArtwork | null>;

  /**
   * Get game install information (if applicable)
   * @param id Provider-specific game ID
   * @returns Install information
   */
  getInstallInfo?(id: string): Promise<GameInstallInfo | null>;
}
