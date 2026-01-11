import { GameMetadata } from './MetadataFetcherService.js';
import { GameSearchResult } from './MetadataProvider.js';

/**
 * Validates that fetched metadata matches the expected game
 */
export class MetadataValidator {
  /**
   * Validate metadata matches the expected game
   */
  validateMetadata(
    metadata: GameMetadata,
    expectedGame: GameSearchResult
  ): boolean {
    // Check if metadata has required fields
    if (!metadata.boxArtUrl && !metadata.bannerUrl) {
      console.warn('[MetadataValidator] Missing required image fields');
      return false;
    }

    // Check if title matches (fuzzy)
    if (expectedGame.title) {
      const similarity = this.calculateSimilarity(
        this.normalizeTitle(metadata.description || ''),
        this.normalizeTitle(expectedGame.title)
      );

      // If we have a description, check if it mentions the game title
      if (metadata.description) {
        const descriptionLower = metadata.description.toLowerCase();
        const titleLower = expectedGame.title.toLowerCase();
        
        // Check if title appears in description (common pattern)
        if (!descriptionLower.includes(titleLower) && similarity < 0.3) {
          console.warn(`[MetadataValidator] Title mismatch: expected "${expectedGame.title}", description doesn't match`);
          // Don't fail validation for this, but log it
        }
      }
    }

    // Check data quality
    if (metadata.boxArtUrl && !this.isValidUrl(metadata.boxArtUrl)) {
      console.warn('[MetadataValidator] Invalid boxArtUrl');
      return false;
    }

    if (metadata.bannerUrl && !this.isValidUrl(metadata.bannerUrl)) {
      console.warn('[MetadataValidator] Invalid bannerUrl');
      return false;
    }

    return true;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return 1 - editDistance / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let metadataValidatorInstance: MetadataValidator | null = null;

export function getMetadataValidator(): MetadataValidator {
  if (!metadataValidatorInstance) {
    metadataValidatorInstance = new MetadataValidator();
  }
  return metadataValidatorInstance;
}
