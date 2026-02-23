# Resolution-Aware Preferences Architecture

## Overview
The `user-preferences.json` file now organizes all view-specific settings by screen resolution (720p, 1080p, 1440p, 4K), making it easier to manage settings for different display configurations.

## New Structure

```json
{
  "sections": {
    "720p": {
      "gridView": { ... },
      "listView": { ... },
      "logoView": { ... },
      "carouselView": { ... },
      "coverflowView": { ... }
    },
    "1080p": {
      "gridView": { ... },
      "listView": { ... },
      "logoView": { ... },
      "carouselView": { ... },
      "coverflowView": { ... }
    },
    "1440p": {
      "gridView": { ... },
      "listView": { ... },
      "logoView": { ... },
      "carouselView": { ... },
      "coverflowView": { ... }
    },
    "4K": {
      "gridView": { ... },
      "listView": { ... },
      "logoView": { ... },
      "carouselView": { ... },
      "coverflowView": { ... }
    }
  },
  "currentResolution": "1080p",
  ... other settings ...
}
```

## Key Features

### 1. **Resolution Detection**
- The service automatically detects your screen's resolution on startup using Electron's `screen` API
- Detected resolution is stored in `currentResolution` field
- Resolution categories:
  - `720p`: height >= 720 and < 1080
  - `1080p`: height >= 1080 and < 1440
  - `1440p`: height >= 1440 and < 2160
  - `4K`: height >= 2160

### 2. **Automatic Section Loading**
- When loading preferences, the app automatically reads from the correct resolution's section
- Falls back to 1080p if the detected resolution's section doesn't exist
- Settings from the appropriate resolution section override default values

### 3. **Per-Resolution Settings**
Each resolution category contains identical view structures, allowing you to:
- Set different grid sizes for different screen resolutions
- Adjust panel widths based on display size
- Configure fanart heights appropriate for the resolution
- Maintain separate per-game custom settings for each resolution

### 4. **Backward Compatibility**
- Old preferences without resolution nesting are automatically migrated
- Missing resolution sections are generated with default values
- No data loss during migration

## Implementation Details

### Service Methods

#### `getCurrentResolution(): Promise<ResolutionKey>`
- Detects current screen resolution using Electron's screen API
- Returns one of: `'720p'`, `'1080p'`, `'1440p'`, `'4K'`
- Default fallback: `'1080p'`

#### `buildReadableSections(preferences: UserPreferences)`
- Creates resolution-nested sections for all 4 resolution categories
- Each resolution contains all 5 view modes (grid, list, logo, carousel, coverflow)
- Includes inline documentation comments for user readability

#### `extractFromSections(sections, currentResolution?): Promise<Partial<UserPreferences>>`
- Extracts settings from the current resolution's sections
- Converts nested structure back to flat preferences for app use
- Preserves per-game custom settings separately for each resolution

### Type Definitions

```typescript
sections?: {
  '720p'?: {
    gridView?: Record<string, any>;
    listView?: Record<string, any>;
    logoView?: Record<string, any>;
    carouselView?: Record<string, any>;
    coverflowView?: Record<string, any>;
  };
  '1080p'?: { ... };
  '1440p'?: { ... };
  '4K'?: { ... };
};
currentResolution?: '720p' | '1080p' | '1440p' | '4K';
```

## Benefits

1. **Clearer Organization**: Settings are explicitly grouped by resolution, making it obvious which settings apply to which screen size
2. **Multi-Monitor Support**: Easily maintain different configurations for different displays
3. **Resolution-Specific Optimization**: Fine-tune UI elements for optimal viewing at each resolution
4. **Better Documentation**: Each resolution section is clearly labeled in the JSON file
5. **Future-Proof**: Easy to add new resolution categories (e.g., 8K) in the future

## Migration Path

### From Old Structure
```json
{
  "sections": {
    "gridView": { "settings": {...} },
    "listView": { "settings": {...} }
  }
}
```

### To New Structure
```json
{
  "sections": {
    "1080p": {
      "gridView": { "settings": {...} },
      "listView": { "settings": {...} }
    },
    "1440p": {
      "gridView": { "settings": {...} },
      "listView": { "settings": {...} }
    },
    ...
  },
  "currentResolution": "1080p"
}
```

## Example Use Cases

### Scenario 1: Laptop + External Monitor
- Laptop: 1080p screen → loads settings from `sections['1080p']`
- External 4K monitor → automatically switches to `sections['4K']` when app moves to that display

### Scenario 2: Per-Resolution Customization
- Set `gridSize: 119` for 1080p (more compact)
- Set `gridSize: 150` for 4K (larger tiles to utilize extra pixels)
- Set `gridSize: 90` for 720p (smaller tiles for limited space)

### Scenario 3: Multi-User Setup
- User A on 1080p: Prefers smaller UI elements → customize `sections['1080p']`
- User A on 4K: Prefers larger UI elements → customize `sections['4K']`
- Settings automatically apply based on which display is active

## Technical Notes

- **Async Resolution Detection**: Resolution detection is async to properly interface with Electron's screen API
- **Performance**: Resolution detection happens once during service initialization
- **Storage Efficiency**: Duplicate fields are stripped before saving to disk
- **Validation**: Invalid resolution keys fall back to 1080p default
