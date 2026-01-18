import { Game } from './game';
import { StagedGame } from './importer';

/**
 * Common editable fields shared between Game and StagedGame.
 * Used by GamePropertiesPanel to work with both types.
 */
export interface EditableGameFields {
  title: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  categories?: string[];
  ageRating?: string;
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  heroUrl?: string;
  iconUrl?: string;
  screenshots?: string[];
  platform?: string;
  lockedFields?: {
    title?: boolean;
    boxArtUrl?: boolean;
    bannerUrl?: boolean;
    logoUrl?: boolean;
    exePath?: boolean;
    description?: boolean;
    [key: string]: boolean | undefined;
  };
}

/**
 * Discriminated union for the panel to know which mode it's operating in.
 */
export type EditableGame = 
  | { isStaged: true; game: StagedGame }
  | { isStaged: false; game: Game };

/**
 * Extract common fields from either Game or StagedGame.
 */
export function toEditableFields(source: Game | StagedGame): EditableGameFields {
  return {
    title: source.title,
    description: source.description,
    releaseDate: source.releaseDate,
    genres: source.genres,
    developers: source.developers,
    publishers: source.publishers,
    categories: source.categories,
    ageRating: source.ageRating,
    boxArtUrl: source.boxArtUrl,
    bannerUrl: source.bannerUrl,
    logoUrl: source.logoUrl,
    heroUrl: source.heroUrl,
    iconUrl: (source as Game).iconUrl,
    screenshots: source.screenshots,
    platform: (source as any).platform,
    lockedFields: source.lockedFields,
  };
}

/**
 * Merge edited fields back into a Game object.
 */
export function mergeIntoGame(original: Game, edited: EditableGameFields): Game {
  return {
    ...original,
    title: edited.title,
    description: edited.description,
    releaseDate: edited.releaseDate,
    genres: edited.genres,
    developers: edited.developers,
    publishers: edited.publishers,
    categories: edited.categories,
    ageRating: edited.ageRating,
    boxArtUrl: edited.boxArtUrl,
    bannerUrl: edited.bannerUrl,
    logoUrl: edited.logoUrl,
    heroUrl: edited.heroUrl,
    iconUrl: edited.iconUrl,
    screenshots: edited.screenshots,
    lockedFields: edited.lockedFields,
  };
}

/**
 * Merge edited fields back into a StagedGame object.
 */
export function mergeIntoStagedGame(original: StagedGame, edited: EditableGameFields): StagedGame {
  return {
    ...original,
    title: edited.title,
    description: edited.description,
    releaseDate: edited.releaseDate,
    genres: edited.genres,
    developers: edited.developers,
    publishers: edited.publishers,
    categories: edited.categories,
    ageRating: edited.ageRating,
    boxArtUrl: edited.boxArtUrl,
    bannerUrl: edited.bannerUrl,
    logoUrl: edited.logoUrl,
    heroUrl: edited.heroUrl,
    screenshots: edited.screenshots,
    platform: edited.platform,
    lockedFields: edited.lockedFields,
  };
}
