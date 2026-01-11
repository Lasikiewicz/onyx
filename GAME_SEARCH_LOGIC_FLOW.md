# Complete Game Search Logic Flow

This document describes the complete logic flow for searching and matching games when all recommendations are implemented.

## High-Level Flow

```
Scan Game → Search → Match & Score → Validate → Fetch Metadata → Cache → Return
```

## Detailed Step-by-Step Flow

### Phase 1: Initial Search

#### Step 1.1: Check Cache First
```typescript
// Before making any API calls, check if we have cached metadata
const cacheKey = metadataCache.generateKey(scannedGame.title, scannedGame.appId);
const cachedMetadata = metadataCache.get(cacheKey);

if (cachedMetadata) {
  // Validate cached metadata is still valid
  if (metadataValidator.validateMetadata(cachedMetadata, { title: scannedGame.title })) {
    return {
      status: 'ready',
      metadata: cachedMetadata,
      source: 'cache'
    };
  }
}
```

#### Step 1.2: Prepare Search Query
```typescript
// Normalize the game title for better matching
const normalizedTitle = normalizeTitle(scannedGame.title);
const searchQuery = {
  title: normalizedTitle,
  steamAppId: scannedGame.appId, // If available (Steam games)
  source: scannedGame.source
};
```

#### Step 1.3: Search All Providers (Rate Limited)
```typescript
// All searches go through the global rate limiter
const searchResults = await rateLimitCoordinator.queueRequest('search', async () => {
  // Search across all providers in parallel (but rate limited)
  const searchPromises = [
    // Priority 1: Steam Store API (if we have App ID or it's a Steam game)
    scannedGame.source === 'steam' || scannedGame.appId
      ? steamProvider.search(searchQuery.title, searchQuery.steamAppId)
      : Promise.resolve([]),
    
    // Priority 2: IGDB (for all games)
    igdbProvider.search(searchQuery.title, searchQuery.steamAppId),
    
    // Priority 3: RAWG (for non-Steam games or as fallback)
    !scannedGame.appId
      ? rawgProvider.search(searchQuery.title, searchQuery.steamAppId)
      : Promise.resolve([]),
    
    // Priority 4: SteamGridDB (for artwork, not matching)
    steamGridDBProvider.search(searchQuery.title, searchQuery.steamAppId)
  ];
  
  const results = await Promise.allSettled(searchPromises);
  
  // Combine all successful results
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
});
```

**Rate Limiting:**
- All searches wait in global queue
- Minimum 100ms between any API calls
- Service-specific limits still apply (IGDB: 250ms, etc.)

### Phase 2: Match Scoring & Selection

#### Step 2.1: Score All Search Results
```typescript
const scoredMatches = searchResults.map(result => {
  const score = gameMatcher.calculateMatchScore(scannedGame, result);
  return {
    result,
    score,
    confidence: score.confidence,
    reasons: score.reasons
  };
});

// Sort by confidence (highest first)
scoredMatches.sort((a, b) => b.confidence - a.confidence);
```

#### Step 2.2: Match Scoring Algorithm
```typescript
calculateMatchScore(scanned: ScannedGameResult, candidate: GameSearchResult): MatchScore {
  let confidence = 0;
  const reasons: string[] = [];
  
  // 1. Exact Title Match (50% weight)
  const titleNormalized = normalizeTitle(scanned.title);
  const candidateNormalized = normalizeTitle(candidate.title);
  
  if (titleNormalized === candidateNormalized) {
    confidence += 0.5;
    reasons.push('exact title match');
  } else {
    // Fuzzy match
    const similarity = calculateSimilarity(titleNormalized, candidateNormalized);
    if (similarity > 0.9) {
      confidence += 0.4;
      reasons.push(`very similar title (${(similarity * 100).toFixed(0)}%)`);
    } else if (similarity > 0.7) {
      confidence += 0.2;
      reasons.push(`similar title (${(similarity * 100).toFixed(0)}%)`);
    } else if (similarity > 0.5) {
      confidence += 0.1;
      reasons.push(`somewhat similar title (${(similarity * 100).toFixed(0)}%)`);
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
    const wordOverlap = calculateWordOverlap(titleNormalized, candidateNormalized);
    if (wordOverlap < 0.3) {
      confidence -= 0.2;
      reasons.push('low word overlap');
    }
  }
  
  // Clamp confidence to 0-1
  confidence = Math.max(0, Math.min(1, confidence));
  
  return { confidence, reasons };
}
```

#### Step 2.3: Select Best Match
```typescript
const bestMatch = scoredMatches[0];

// Confidence thresholds:
// - >= 0.8: High confidence (auto-accept)
// - >= 0.5: Medium confidence (accept but mark for review)
// - < 0.5: Low confidence (mark as ambiguous)

if (!bestMatch || bestMatch.confidence < 0.5) {
  return {
    status: 'ambiguous',
    reason: 'no high-confidence match found',
    candidates: scoredMatches.slice(0, 5) // Top 5 for user review
  };
}

// If confidence is medium, we'll still use it but mark for user review
const matchStatus = bestMatch.confidence >= 0.8 ? 'matched' : 'ambiguous';
```

### Phase 3: Metadata Fetching

#### Step 3.1: Fetch Artwork (Rate Limited)
```typescript
// Wait for rate limiter before fetching artwork
const artworkMetadata = await rateLimitCoordinator.queueRequest('artwork', async () => {
  // Priority order for artwork:
  // 1. Steam CDN (if we have App ID) - official, highest quality
  // 2. SteamGridDB - community images, good quality
  // 3. IGDB - fallback
  
  const artworkPromises: Array<{ promise: Promise<GameArtwork | null>; source: string; priority: number }> = [];
  
  // Priority 1: Steam CDN
  if (bestMatch.result.steamAppId && steamProvider.isAvailable()) {
    artworkPromises.push({
      promise: steamProvider.getArtwork(`steam-${bestMatch.result.steamAppId}`, bestMatch.result.steamAppId),
      source: 'steam',
      priority: 1
    });
  }
  
  // Priority 2: SteamGridDB
  if (steamGridDBProvider.isAvailable()) {
    artworkPromises.push({
      promise: steamGridDBProvider.getArtwork(bestMatch.result.id, bestMatch.result.steamAppId),
      source: 'steamgriddb',
      priority: 2
    });
  }
  
  // Priority 3: IGDB
  if (igdbProvider.isAvailable()) {
    artworkPromises.push({
      promise: igdbProvider.getArtwork(bestMatch.result.id, bestMatch.result.steamAppId),
      source: 'igdb',
      priority: 3
    });
  }
  
  // Execute in priority order, but stop when we get box art
  let mergedArtwork: GameArtwork = {};
  
  for (const { promise, source, priority } of artworkPromises.sort((a, b) => a.priority - b.priority)) {
    try {
      const artwork = await promise;
      if (artwork) {
        mergedArtwork = mergeArtwork(mergedArtwork, artwork, source);
        // If we have box art, we can stop (but still fetch others for completeness)
        if (mergedArtwork.boxArtUrl) {
          // Continue to get other images (banner, logo) but box art is priority
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch artwork from ${source}:`, error);
      // Continue to next provider
    }
  }
  
  return mergedArtwork;
});
```

#### Step 3.2: Delay Between Artwork and Description
```typescript
// Add delay to avoid rate limits
await new Promise(resolve => setTimeout(resolve, 500));
```

#### Step 3.3: Fetch Text Metadata (Rate Limited)
```typescript
const textMetadata = await rateLimitCoordinator.queueRequest('description', async () => {
  // Priority order for text metadata:
  // 1. Steam Store API (if we have App ID) - most reliable
  // 2. RAWG (if available) - comprehensive
  // 3. IGDB - fallback
  
  const descriptionPromises: Promise<GameDescription | null>[] = [];
  
  // Priority 1: Steam Store API
  if (bestMatch.result.steamAppId && steamProvider.isAvailable()) {
    descriptionPromises.push(
      steamProvider.getDescription(`steam-${bestMatch.result.steamAppId}`)
    );
  }
  
  // Priority 2: RAWG
  if (rawgProvider.isAvailable()) {
    descriptionPromises.push(
      rawgProvider.getDescription(bestMatch.result.id)
    );
  }
  
  // Priority 3: IGDB
  if (igdbProvider.isAvailable()) {
    descriptionPromises.push(
      igdbProvider.getDescription(bestMatch.result.id)
    );
  }
  
  // Execute in priority order, use first successful result
  for (const promise of descriptionPromises) {
    try {
      const description = await promise;
      if (description && (description.description || description.summary)) {
        return description;
      }
    } catch (error) {
      console.warn('Failed to fetch description:', error);
      // Continue to next provider
    }
  }
  
  return null;
});
```

### Phase 4: Validation & Caching

#### Step 4.1: Validate Metadata
```typescript
const mergedMetadata: GameMetadata = {
  ...artworkMetadata,
  ...textMetadata,
  title: bestMatch.result.title
};

// Validate that metadata matches the game
const isValid = metadataValidator.validateMetadata(mergedMetadata, bestMatch.result);

if (!isValid) {
  console.warn(`Metadata validation failed for ${scannedGame.title}`);
  return {
    status: 'ambiguous',
    reason: 'metadata validation failed',
    metadata: mergedMetadata // Still return what we have
  };
}
```

#### Step 4.2: Cache Metadata
```typescript
// Cache the metadata for future use
const cacheKey = metadataCache.generateKey(
  bestMatch.result.title,
  bestMatch.result.steamAppId
);
metadataCache.set(cacheKey, mergedMetadata);
```

#### Step 4.3: Return Result
```typescript
return {
  status: matchStatus, // 'matched' or 'ambiguous'
  confidence: bestMatch.confidence,
  matchReasons: bestMatch.reasons,
  metadata: mergedMetadata,
  matchedGame: bestMatch.result,
  source: 'api'
};
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Game Search Flow                          │
└─────────────────────────────────────────────────────────────┘

1. INPUT: ScannedGameResult
   ├─ title: "Doom Eternal"
   ├─ source: "steam"
   ├─ appId: "782330"
   └─ installPath: "C:\Games\Doom Eternal"

2. CHECK CACHE
   ├─ Generate cache key: "steam-782330"
   ├─ Cache hit? → Return cached metadata (if valid)
   └─ Cache miss? → Continue to search

3. SEARCH PHASE (Rate Limited)
   ├─ Normalize title: "doom eternal"
   ├─ Search Steam Store API (if Steam game)
   ├─ Search IGDB
   ├─ Search RAWG (if no Steam App ID)
   └─ Search SteamGridDB (for artwork)
   
   Rate Limiting:
   ├─ Wait in global queue
   ├─ Minimum 100ms between calls
   └─ Service-specific limits apply

4. MATCH SCORING
   ├─ Score each result:
   │  ├─ Exact title match: +0.5
   │  ├─ Steam App ID match: +0.4
   │  ├─ Source match: +0.1
   │  └─ Similarity score: +0.0-0.4
   │
   ├─ Sort by confidence
   └─ Select best match

5. CONFIDENCE CHECK
   ├─ >= 0.8: High confidence → 'matched'
   ├─ >= 0.5: Medium confidence → 'ambiguous'
   └─ < 0.5: Low confidence → 'ambiguous' (show candidates)

6. FETCH ARTWORK (Rate Limited)
   ├─ Priority 1: Steam CDN (if App ID available)
   ├─ Priority 2: SteamGridDB
   └─ Priority 3: IGDB
   
   Rate Limiting:
   └─ Wait in global queue

7. DELAY
   └─ Wait 500ms before description fetch

8. FETCH DESCRIPTION (Rate Limited)
   ├─ Priority 1: Steam Store API (if App ID available)
   ├─ Priority 2: RAWG
   └─ Priority 3: IGDB
   
   Rate Limiting:
   └─ Wait in global queue

9. MERGE METADATA
   ├─ Combine artwork from all sources
   ├─ Combine text metadata (priority order)
   └─ Create final GameMetadata object

10. VALIDATE
    ├─ Check required fields (boxArtUrl or bannerUrl)
    ├─ Validate title matches
    └─ Check data quality

11. CACHE
    └─ Store metadata in cache for future use

12. RETURN RESULT
    ├─ status: 'matched' | 'ambiguous' | 'error'
    ├─ confidence: 0.0-1.0
    ├─ metadata: GameMetadata
    └─ matchedGame: GameSearchResult
```

## Error Handling & Retries

### Retry Logic
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; delay: number }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 401/403 (auth errors)
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
      
      // Retry on rate limit (429) or network errors
      if (error.response?.status === 429 || error.code === 'ECONNRESET') {
        if (attempt < options.maxRetries) {
          const delay = options.delay * Math.pow(2, attempt); // Exponential backoff
          console.warn(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Don't retry on other errors
      throw error;
    }
  }
  
  throw lastError!;
}
```

### Graceful Degradation
```typescript
// If one provider fails, continue with others
const results = await Promise.allSettled([
  steamProvider.search(title),
  igdbProvider.search(title),
  rawgProvider.search(title)
]);

// Use successful results, ignore failures
const successfulResults = results
  .filter(r => r.status === 'fulfilled')
  .flatMap(r => r.value);
```

## Rate Limiting Strategy

### Global Coordinator
```typescript
// All API calls go through this coordinator
class RateLimitCoordinator {
  private globalQueue: QueuedRequest[] = [];
  private lastRequestTime = 0;
  private readonly MIN_GLOBAL_INTERVAL = 100; // 100ms minimum
  
  async queueRequest<T>(service: string, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.globalQueue.push({ service, execute, resolve, reject });
      this.processQueue();
    });
  }
  
  private async processQueue() {
    while (this.globalQueue.length > 0) {
      // Wait for minimum interval
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
  }
}
```

### Service-Specific Limits
- **IGDB**: 4 req/sec (250ms), max 2 concurrent
- **SteamGridDB**: 4 req/sec (250ms)
- **RAWG**: 4 req/sec (250ms), max 2 concurrent
- **Steam Store API**: Unknown, but we add 500ms delay between artwork and description

## Example: Complete Search Flow

```typescript
// Example: Searching for "Doom Eternal" (Steam game)

1. Input:
   {
     title: "Doom Eternal",
     source: "steam",
     appId: "782330"
   }

2. Cache Check:
   - Key: "steam-782330"
   - Cache miss → Continue

3. Search:
   - Steam Store API: Found (App ID 782330)
   - IGDB: Found (ID 11169)
   - RAWG: Found (ID 3498)
   - SteamGridDB: Found (ID 782330)

4. Scoring:
   - Steam result: confidence = 0.9 (App ID match + exact title)
   - IGDB result: confidence = 0.6 (exact title, no App ID)
   - RAWG result: confidence = 0.5 (similar title)
   - SteamGridDB: confidence = 0.4 (App ID match, but used for artwork only)

5. Best Match:
   - Steam result (confidence: 0.9) → 'matched'

6. Fetch Artwork:
   - Steam CDN: ✓ (box art, banner, logo)
   - SteamGridDB: ✓ (additional images)
   - IGDB: ✓ (screenshots)

7. Fetch Description:
   - Steam Store API: ✓ (full description, genres, developers)
   - RAWG: (not needed, Steam has it)
   - IGDB: (not needed, Steam has it)

8. Merge:
   - Box art: Steam CDN (highest priority)
   - Banner: Steam CDN
   - Logo: SteamGridDB
   - Description: Steam Store API
   - Genres: Steam Store API
   - Developers: Steam Store API

9. Validate:
   - Title matches: ✓
   - Has box art: ✓
   - Has description: ✓
   - Valid: ✓

10. Cache:
    - Store in cache with key "steam-782330"

11. Return:
    {
      status: 'matched',
      confidence: 0.9,
      metadata: { ... },
      matchedGame: { ... }
    }
```

## Benefits of This Flow

1. **Rate Limit Compliance**: All calls go through global coordinator
2. **Accurate Matching**: Confidence scoring prevents wrong matches
3. **Efficient**: Caching reduces redundant API calls
4. **Resilient**: Retry logic and graceful degradation
5. **Fast**: Parallel searches where possible, sequential where needed
6. **Validated**: Metadata validation ensures correctness
