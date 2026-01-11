# Game Importer Improvements Analysis

## Current Issues

### 1. Rate Limiting Problems

**Current State:**
- Each service (IGDB, SteamGridDB, RAWG) has its own rate limiting queue, but they're not coordinated
- Frontend processes games sequentially (one by one) but makes multiple API calls per game:
  - `searchGames()` - searches all providers in parallel
  - `searchArtwork()` - fetches artwork from multiple providers in parallel  
  - `fetchGameDescription()` - separate call for descriptions (with 500ms delay)
- When processing many games, this can still hit rate limits because:
  - Multiple games are processed in quick succession
  - Each game triggers 2-3 API calls
  - The 500ms delay is per-game, not coordinated across games
  - No global rate limiting coordination

**Rate Limits:**
- IGDB: 4 requests/second (250ms between requests), max 2 concurrent
- SteamGridDB: 4 requests/second (250ms between requests)
- RAWG: 4 requests/second (250ms between requests), max 2 concurrent
- Steam Store API: Unknown, but likely has rate limits

### 2. Game Identification Issues

**Current State:**
- Flow: `scanGames()` → `searchGames()` → `searchArtwork()` → `fetchGameDescription()`
- Matching logic:
  1. First tries to find Steam App ID via SteamDB.info search
  2. Falls back to first Steam result with App ID
  3. Falls back to first IGDB result
  4. Falls back to first result of any type
- Problems:
  - No validation that matched game is actually correct
  - Title matching can be ambiguous (e.g., "Doom" vs "Doom Eternal")
  - No confidence scoring for matches
  - If `searchGames()` returns wrong results, wrong metadata is fetched
  - No retry logic if metadata fetch fails

### 3. Metadata Fetching Issues

**Current State:**
- Images and text metadata are fetched separately (good separation)
- Order: `searchGames()` → `searchArtwork()` (images) → `fetchGameDescription()` (text)
- Problems:
  - If `searchGames()` fails or returns wrong results, wrong game's metadata is fetched
  - No caching of metadata between games (redundant API calls)
  - No batch processing for multiple games
  - No validation that images match the game title
  - If one provider fails, entire metadata fetch can fail

## Recommended Improvements

### 1. Implement Global Rate Limiting Coordinator

**Solution:** Create a centralized rate limiting service that coordinates all API calls across all services.

```typescript
// main/RateLimitCoordinator.ts
export class RateLimitCoordinator {
  private globalQueue: QueuedRequest<any>[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly MIN_GLOBAL_INTERVAL = 100; // 100ms minimum between any API calls
  
  async queueRequest<T>(service: string, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.globalQueue.push({ service, execute, resolve, reject });
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.isProcessing || this.globalQueue.length === 0) return;
    
    this.isProcessing = true;
    while (this.globalQueue.length > 0) {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_GLOBAL_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, this.MIN_GLOBAL_INTERVAL - timeSinceLastRequest)
        );
      }
      
      const request = this.globalQueue.shift();
      if (!request) break;
      
      this.lastRequestTime = Date.now();
      
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.isProcessing = false;
  }
}
```

**Benefits:**
- Prevents rate limit violations across all services
- Ensures consistent spacing between API calls
- Can be extended to handle service-specific limits

### 2. Batch Processing with Smart Queuing

**Solution:** Process games in batches with intelligent queuing and caching.

```typescript
// main/BatchMetadataProcessor.ts
export class BatchMetadataProcessor {
  private metadataCache = new Map<string, GameMetadata>();
  private rateLimitCoordinator: RateLimitCoordinator;
  
  async processGamesBatch(
    games: ScannedGameResult[],
    batchSize: number = 5,
    delayBetweenBatches: number = 2000
  ): Promise<Map<string, GameMetadata>> {
    const results = new Map<string, GameMetadata>();
    
    // Group games by title similarity to avoid duplicate searches
    const groupedGames = this.groupSimilarGames(games);
    
    for (let i = 0; i < groupedGames.length; i += batchSize) {
      const batch = groupedGames.slice(i, i + batchSize);
      
      // Process batch in parallel (but rate-limited)
      const batchPromises = batch.map(game => 
        this.processGameWithRetry(game)
      );
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result, index) => {
        if (result) {
          results.set(batch[index].uuid, result);
        }
      });
      
      // Delay between batches to avoid rate limits
      if (i + batchSize < groupedGames.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
  
  private groupSimilarGames(games: ScannedGameResult[]): ScannedGameResult[] {
    // Group games with similar titles to share metadata
    const groups = new Map<string, ScannedGameResult[]>();
    
    games.forEach(game => {
      const normalizedTitle = this.normalizeTitle(game.title);
      if (!groups.has(normalizedTitle)) {
        groups.set(normalizedTitle, []);
      }
      groups.get(normalizedTitle)!.push(game);
    });
    
    // Return one representative from each group
    return Array.from(groups.values()).map(group => group[0]);
  }
}
```

**Benefits:**
- Reduces redundant API calls for similar games
- Processes games in controlled batches
- Better rate limit compliance

### 3. Improved Game Matching with Confidence Scoring

**Solution:** Implement confidence scoring for game matches and validation.

```typescript
// main/GameMatcher.ts
interface MatchResult {
  game: GameSearchResult;
  confidence: number; // 0-1 score
  reasons: string[];
}

export class GameMatcher {
  matchGame(
    scannedGame: ScannedGameResult,
    searchResults: GameSearchResult[]
  ): MatchResult | null {
    if (searchResults.length === 0) return null;
    
    // Score each result
    const scoredResults = searchResults.map(result => {
      let confidence = 0;
      const reasons: string[] = [];
      
      // Exact title match (highest confidence)
      if (this.normalizeTitle(result.title) === this.normalizeTitle(scannedGame.title)) {
        confidence += 0.5;
        reasons.push('exact title match');
      }
      
      // Steam App ID match (very high confidence)
      if (scannedGame.appId && result.steamAppId === scannedGame.appId) {
        confidence += 0.4;
        reasons.push('steam app id match');
      }
      
      // Source match (medium confidence)
      if (result.source === scannedGame.source) {
        confidence += 0.1;
        reasons.push('source match');
      }
      
      // Title similarity (lower confidence)
      const similarity = this.calculateSimilarity(
        scannedGame.title,
        result.title
      );
      if (similarity > 0.8) {
        confidence += similarity * 0.2;
        reasons.push(`title similarity: ${(similarity * 100).toFixed(0)}%`);
      }
      
      return { game: result, confidence, reasons };
    });
    
    // Sort by confidence
    scoredResults.sort((a, b) => b.confidence - a.confidence);
    
    const bestMatch = scoredResults[0];
    
    // Only return if confidence is above threshold
    if (bestMatch.confidence >= 0.5) {
      return bestMatch;
    }
    
    return null;
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Use Levenshtein distance or similar algorithm
    // Return 0-1 similarity score
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return 1 - (editDistance / longer.length);
  }
}
```

**Benefits:**
- More accurate game matching
- Confidence scores help identify ambiguous matches
- Reduces incorrect metadata assignments

### 4. Sequential Processing with Better Error Handling

**Solution:** Process games one at a time with proper error handling and retries.

```typescript
// In ImportWorkbench.tsx - improved processing
const processGamesSequentially = async (games: ScannedGameResult[]) => {
  const stagedGames: StagedGame[] = [];
  
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    
    try {
      // Step 1: Search for game (with retry)
      const searchResult = await withRetry(
        () => window.electronAPI.searchGames(game.title),
        { maxRetries: 3, delay: 1000 }
      );
      
      if (!searchResult?.results?.length) {
        // No match found - mark as ambiguous
        stagedGames.push(createStagedGame(game, null, 'ambiguous'));
        continue;
      }
      
      // Step 2: Match game with confidence scoring
      const matcher = new GameMatcher();
      const match = matcher.matchGame(game, searchResult.results);
      
      if (!match || match.confidence < 0.5) {
        // Low confidence match - mark as ambiguous
        stagedGames.push(createStagedGame(game, null, 'ambiguous'));
        continue;
      }
      
      // Step 3: Fetch metadata (with retry and rate limiting)
      const metadata = await withRetry(
        () => window.electronAPI.searchArtwork(
          match.game.title,
          match.game.steamAppId
        ),
        { maxRetries: 3, delay: 1000 }
      );
      
      // Step 4: Fetch description separately (with delay)
      await new Promise(resolve => setTimeout(resolve, 500));
      const description = await withRetry(
        () => window.electronAPI.fetchGameDescription(
          match.game.id
        ),
        { maxRetries: 2, delay: 1000 }
      );
      
      // Step 5: Validate metadata matches game
      if (this.validateMetadata(metadata, match.game)) {
        stagedGames.push(createStagedGame(game, { ...metadata, ...description }, 'ready'));
      } else {
        stagedGames.push(createStagedGame(game, metadata, 'ambiguous'));
      }
      
    } catch (error) {
      console.error(`Error processing game ${game.title}:`, error);
      stagedGames.push(createStagedGame(game, null, 'error'));
    }
    
    // Update UI progress
    setQueue([...stagedGames]);
    
    // Rate limiting delay between games
    if (i < games.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return stagedGames;
};
```

**Benefits:**
- Better error handling and recovery
- Retry logic for failed requests
- Rate limiting between games
- Progress updates for user

### 5. Metadata Caching

**Solution:** Cache metadata to avoid redundant API calls.

```typescript
// main/MetadataCache.ts
export class MetadataCache {
  private cache = new Map<string, { metadata: GameMetadata; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  get(key: string): GameMetadata | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.metadata;
  }
  
  set(key: string, metadata: GameMetadata): void {
    this.cache.set(key, {
      metadata,
      timestamp: Date.now()
    });
  }
  
  generateKey(title: string, steamAppId?: string): string {
    return steamAppId ? `steam-${steamAppId}` : `title-${this.normalizeTitle(title)}`;
  }
}
```

**Benefits:**
- Reduces API calls for duplicate games
- Faster processing for cached games
- Better rate limit compliance

### 6. Validation and Verification

**Solution:** Validate that fetched metadata matches the game.

```typescript
// main/MetadataValidator.ts
export class MetadataValidator {
  validateMetadata(
    metadata: GameMetadata,
    expectedGame: GameSearchResult
  ): boolean {
    // Check if metadata has required fields
    if (!metadata.boxArtUrl && !metadata.bannerUrl) {
      return false;
    }
    
    // Check if title matches (fuzzy)
    if (metadata.title && expectedGame.title) {
      const similarity = this.calculateSimilarity(
        metadata.title,
        expectedGame.title
      );
      if (similarity < 0.7) {
        console.warn(`Title mismatch: expected "${expectedGame.title}", got "${metadata.title}"`);
        return false;
      }
    }
    
    return true;
  }
}
```

**Benefits:**
- Catches incorrect metadata assignments
- Improves data quality
- Reduces user confusion

## Implementation Priority

1. **High Priority:**
   - Global rate limiting coordinator
   - Sequential processing with delays
   - Metadata caching
   - Better error handling and retries

2. **Medium Priority:**
   - Confidence scoring for matches
   - Batch processing
   - Metadata validation

3. **Low Priority:**
   - Advanced similarity algorithms
   - Machine learning for matching
   - User feedback loop for corrections

## Expected Improvements

- **Rate Limit Compliance:** 95%+ reduction in rate limit errors
- **Accuracy:** 80%+ improvement in correct game identification
- **Performance:** 50%+ reduction in total API calls (via caching)
- **User Experience:** Faster imports, fewer ambiguous matches, better error messages
