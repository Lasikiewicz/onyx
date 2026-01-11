import { ScannedGameResult } from './ImportService.js';
import { GameSearchResult } from './MetadataProvider.js';

export interface MatchScore {
  confidence: number; // 0-1 score
  reasons: string[];
}

export interface MatchResult {
  game: GameSearchResult;
  confidence: number;
  reasons: string[];
}

/**
 * Service for matching scanned games with search results
 * Uses confidence scoring to determine the best match
 */
export class GameMatcher {
  /**
   * Calculate match score for a candidate result
   */
  calculateMatchScore(
    scanned: ScannedGameResult,
    candidate: GameSearchResult
  ): MatchScore {
    let confidence = 0;
    const reasons: string[] = [];

    // 1. Exact Title Match (50% weight)
    const titleNormalized = this.normalizeTitle(scanned.title);
    const candidateNormalized = this.normalizeTitle(candidate.title);

    if (titleNormalized === candidateNormalized) {
      confidence += 0.5;
      reasons.push('exact title match');
    } else {
      // Fuzzy match
      const similarity = this.calculateSimilarity(titleNormalized, candidateNormalized);
      if (similarity > 0.9) {
        confidence += 0.4;
        reasons.push(`very similar title (${(similarity * 100).toFixed(0)}%)`);
      } else if (similarity > 0.7) {
        confidence += 0.2;
        reasons.push(`similar title (${(similarity * 100).toFixed(0)}%)`);
      } else if (similarity > 0.5) {
        confidence += 0.1;
        reasons.push(`somewhat similar title (${(similarity * 100).toFixed(0)}%)`);
      } else {
        reasons.push(`low title similarity (${(similarity * 100).toFixed(0)}%)`);
      }
    }

    // 2. Steam App ID Match (40% weight) - Highest confidence
    if (scanned.appId && candidate.steamAppId) {
      if (scanned.appId === candidate.steamAppId.toString()) {
        confidence += 0.4;
        reasons.push('steam app id match');
      } else {
        // Wrong App ID - reduce confidence
        confidence -= 0.2;
        reasons.push('steam app id mismatch');
      }
    }

    // 3. Source Match (10% weight)
    if (scanned.source === candidate.source) {
      confidence += 0.1;
      reasons.push('source match');
    }

    // 4. Provider Priority Bonus
    // Steam results are more reliable for Steam games
    if (scanned.source === 'steam' && candidate.source === 'steam') {
      confidence += 0.1;
      reasons.push('steam provider match');
    }

    // 5. Penalties
    // If candidate has very different title, penalize
    if (titleNormalized !== candidateNormalized) {
      const wordOverlap = this.calculateWordOverlap(titleNormalized, candidateNormalized);
      if (wordOverlap < 0.3) {
        confidence -= 0.2;
        reasons.push('low word overlap');
      }
    }

    // Clamp confidence to 0-1
    confidence = Math.max(0, Math.min(1, confidence));

    return { confidence, reasons };
  }

  /**
   * Match a scanned game with search results
   */
  matchGame(
    scannedGame: ScannedGameResult,
    searchResults: GameSearchResult[]
  ): MatchResult | null {
    if (searchResults.length === 0) {
      return null;
    }

    // Score each result
    const scoredResults = searchResults.map(result => {
      const score = this.calculateMatchScore(scannedGame, result);
      return {
        game: result,
        confidence: score.confidence,
        reasons: score.reasons,
      };
    });

    // Sort by confidence (highest first)
    scoredResults.sort((a, b) => b.confidence - a.confidence);

    return scoredResults[0];
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
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
   * Calculate Levenshtein distance between two strings
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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate word overlap between two strings
   */
  private calculateWordOverlap(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 0));

    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }

    let overlap = 0;
    words1.forEach(word => {
      if (words2.has(word)) {
        overlap++;
      }
    });

    return overlap / Math.max(words1.size, words2.size);
  }
}

// Singleton instance
let gameMatcherInstance: GameMatcher | null = null;

export function getGameMatcher(): GameMatcher {
  if (!gameMatcherInstance) {
    gameMatcherInstance = new GameMatcher();
  }
  return gameMatcherInstance;
}
