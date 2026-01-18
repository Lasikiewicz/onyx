

/**
 * Normalize title for comparison
 */
export function normalizeTitle(title: string): string {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
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

    return matrix[len2][len1];
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
        return 1.0;
    }

    const editDistance = levenshteinDistance(longer, shorter);
    return 1 - editDistance / longer.length;
}

/**
 * Calculate word overlap between two strings
 */
export function calculateWordOverlap(str1: string, str2: string): number {
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

/**
 * Score a search result match against a scanned game
 */
export interface MatchScore {
    confidence: number;
    reasons: string[];
}

export function scoreMatch(scannedTitle: string, candidate: any, scannedAppId?: string): MatchScore {
    let confidence = 0;
    const reasons: string[] = [];

    const scannedNormalized = normalizeTitle(scannedTitle);
    const candidateNormalized = normalizeTitle(candidate.title || '');

    // 1. Exact Title Match (50% weight)
    if (scannedNormalized === candidateNormalized) {
        confidence += 0.5;
        reasons.push('exact title match');
    } else {
        // Fuzzy match
        const similarity = calculateSimilarity(scannedNormalized, candidateNormalized);
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
    if (scannedAppId && candidate.steamAppId) {
        if (scannedAppId === candidate.steamAppId.toString()) {
            confidence += 0.4;
            reasons.push('steam app id match');
        } else {
            // Wrong App ID - reduce confidence
            confidence -= 0.2;
            reasons.push('steam app id mismatch');
        }
    } else if (candidate.steamAppId && candidate.source === 'steam') {
        // Give a small bonus for Steam games, but ONLY if title is reasonably close
        const titleSimilarity = calculateSimilarity(scannedNormalized, candidateNormalized);
        if (titleSimilarity > 0.7) {
            confidence += 0.2;
            reasons.push('steam game with similar title');
        } else if (titleSimilarity > 0.5) {
            confidence += 0.1;
            reasons.push('steam game with somewhat similar title');
        } else {
            reasons.push('steam game but title mismatch');
        }
    }

    // 4. Provider Priority Bonus
    if (candidate.source === 'steam' && candidate.steamAppId) {
        confidence += 0.1;
        reasons.push('steam provider match');
    }

    // 5. Penalties
    if (scannedNormalized !== candidateNormalized) {
        const wordOverlap = calculateWordOverlap(scannedNormalized, candidateNormalized);
        if (wordOverlap < 0.3) {
            confidence -= 0.5;
            reasons.push('low word overlap');
        }

        const lengthDiff = Math.abs(scannedNormalized.length - candidateNormalized.length);
        if (lengthDiff > Math.max(scannedNormalized.length, candidateNormalized.length) * 0.5) {
            confidence -= 0.4;
            reasons.push('significant title length difference');
        }

        // Check for title suffix mismatch
        const scannedWords = scannedNormalized.split(/\s+/);
        const candidateWords = candidateNormalized.split(/\s+/);

        const minLen = Math.min(scannedWords.length, candidateWords.length);
        let prefixMatchCount = 0;
        for (let i = 0; i < minLen; i++) {
            if (scannedWords[i] === candidateWords[i]) {
                prefixMatchCount++;
            } else {
                break;
            }
        }

        if (prefixMatchCount > 0 && prefixMatchCount < Math.max(scannedWords.length, candidateWords.length)) {
            const scannedSuffix = scannedWords.slice(prefixMatchCount).join(' ');
            const candidateSuffix = candidateWords.slice(prefixMatchCount).join(' ');

            if (scannedSuffix && candidateSuffix && calculateSimilarity(scannedSuffix, candidateSuffix) < 0.5) {
                confidence -= 0.5;
                reasons.push(`title suffix mismatch: "${scannedSuffix}" vs "${candidateSuffix}"`);
            }
        }
    }

    // Clamp confidence to 0-1
    confidence = Math.max(0, Math.min(1, confidence));

    return { confidence, reasons };
}

/**
 * Strip demo-related words from a title
 */
export function stripDemoIndicator(title: string): { stripped: string; isDemo: boolean } {
    const demoIndicators = [
        /\s+prologue\s+demo$/i,
        /\s+demo\s+version$/i,
        /\s+demo$/i,
        /\s+prologue$/i,
        /\s+trial$/i,
        /\s+beta$/i,
        /\s+alpha$/i,
        /\s+playtest$/i,
        /demo$/i,
        /prologue$/i,
        /\s*\[Demo\]\s*$/i,
        /\s*\(Demo\)\s*$/i,
        /\s*\[Prologue\]\s*$/i,
        /\s*\(Prologue\)\s*$/i,
        /\s*\[Trial\]\s*$/i,
        /\s*\(Trial\)\s*$/i,
    ];

    let stripped = title;
    let isDemo = false;

    while (true) {
        let changed = false;
        for (const indicator of demoIndicators) {
            if (indicator.test(stripped)) {
                stripped = stripped.replace(indicator, '').trim();
                isDemo = true;
                changed = true;
                break;
            }
        }
        if (!changed) break;
    }

    return { stripped, isDemo };
}

/**
 * Find the best match from search results
 */
export function findBestMatch(scannedTitle: string, searchResults: any[], scannedAppId?: string): any | null {
    if (!searchResults || searchResults.length === 0) {
        return null;
    }

    // Score all results
    const scoredResults = searchResults.map(result => ({
        result,
        score: scoreMatch(scannedTitle, result, scannedAppId),
    }));

    // Sort by confidence (highest first)
    scoredResults.sort((a, b) => b.score.confidence - a.score.confidence);

    const bestMatch = scoredResults[0];

    if (bestMatch.score.confidence >= 0.3) {
        return bestMatch.result;
    }

    return null;
}


/**
 * Determine auto categories for a game based on logic and folder configs
 */
export function determineAutoCategories(
    game: any,
    folderConfigs: Record<string, { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[] }>
): string[] {
    let categories: string[] = [];

    // Check for demo indicator
    const { isDemo } = stripDemoIndicator(game.title);
    if (isDemo) {
        categories.push('Demos');
    }

    // Check for auto-categories from folder configs
    if (game.source === 'manual_folder' && game.installPath) {
        const matchingConfig = Object.values(folderConfigs).find(config => {
            if (!config.enabled || !config.autoCategory || config.autoCategory.length === 0) {
                return false;
            }
            const normalizePath = (path: string) => path.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '');
            const configPath = normalizePath(config.path);
            const installPath = normalizePath(game.installPath);

            return installPath === configPath || installPath.startsWith(configPath + '/');
        });

        if (matchingConfig && matchingConfig.autoCategory) {
            categories = [...categories, ...matchingConfig.autoCategory];
        }
    }

    return [...new Set(categories)]; // Unique
}
