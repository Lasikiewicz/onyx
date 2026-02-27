# Animated Image Game Switching Performance Bugfix Design

## Overview

This bugfix addresses intermittent performance delays when switching between games that have animated images (GIFs, WebPs, APNGs) in their boxart, banners, or background images. The root cause is that animated images trigger browser decoding and rendering on every frame, and when combined with CSS animations (fadeIn, fadeInScale) and CSS filters (blur, brightness), the browser must perform expensive compositing operations that can block the main thread. The fix will optimize image loading by preloading images, using CSS containment, and potentially deferring animation start until images are decoded.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when switching to a game with animated images (GIF/WebP/APNG) in boxart, banner, or background
- **Property (P)**: The desired behavior - instant game switching without noticeable pauses regardless of image type
- **Preservation**: Existing instant switching behavior for static images and all other UI interactions must remain unchanged
- **GameDetailsPanel**: The React component in `renderer/src/components/GameDetailsPanel.tsx` that displays game details including background images, logos, and boxart
- **App.tsx**: The main application component in `renderer/src/App.tsx` that renders the full-page background image
- **CSS Transitions**: Animation classes in `renderer/src/styles/game-transitions.css` that apply fadeIn/fadeInScale effects to images
- **Image Decoding**: Browser process of decompressing and preparing images for rendering, which is synchronous for animated formats
- **Compositing**: Browser process of combining layers with filters/transforms, which can be expensive for animated images

## Bug Details

### Fault Condition

The bug manifests when switching to a game that has animated images (GIF, WebP, or APNG format) in any of the following locations: boxart, banner, hero image, or background. The browser must decode each frame of the animated image while simultaneously applying CSS animations (fadeIn 450ms, fadeInScale 500ms) and CSS filters (blur, brightness). This creates a performance bottleneck where:

1. The animated image starts decoding frames immediately on src change
2. CSS animations trigger repaints on every animation frame
3. CSS filters (blur 40px, brightness) require expensive pixel operations on each animated frame
4. The browser's compositor must handle multiple animated layers simultaneously
5. The main thread can become blocked waiting for image decoding and compositing

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type GameSwitchEvent
  OUTPUT: boolean
  
  RETURN (input.newGame.boxArtUrl MATCHES /\.(gif|webp)(\?|$)/i
         OR input.newGame.bannerUrl MATCHES /\.(gif|webp)(\?|$)/i
         OR input.newGame.heroUrl MATCHES /\.(gif|webp)(\?|$)/i
         OR input.newGame.alternativeBannerUrl MATCHES /\.(gif|webp)(\?|$)/i)
         AND (hasBlurFilter OR hasCSSAnimation)
         AND switchingPerformance > 100ms
END FUNCTION
```

### Examples

- **Example 1**: User switches from Game A (static PNG boxart) to Game B (animated WebP boxart). Expected: instant switch. Actual: 200-500ms pause before Game B displays.
- **Example 2**: User rapidly navigates through games using arrow keys, landing on a game with animated GIF banner. Expected: smooth navigation. Actual: noticeable stutter when the animated image loads.
- **Example 3**: User switches to a game with animated background image while blur filter is active. Expected: instant switch with smooth blur. Actual: 300-800ms delay as browser decodes and applies blur to animated frames.
- **Edge Case**: User switches to a game with multiple animated images (animated boxart + animated banner). Expected: instant switch. Actual: compounded delay as multiple animated images decode simultaneously.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Switching between games with static images (PNG, JPG) must continue to work instantly as it currently does
- All CSS animations and transitions for static images must remain unchanged
- Image error handling and fallback behavior must continue to work correctly
- All other UI interactions (clicking, hovering, scrolling) must remain unaffected

**Scope:**
All inputs that do NOT involve animated images (GIF, WebP, APNG) should be completely unaffected by this fix. This includes:
- Games with only static PNG/JPG images
- Games with no images (placeholder display)
- Mouse interactions with game cards and buttons
- Keyboard navigation between games with static images
- All other view modes (grid, list, logo, carousel, coverflow) when displaying static images

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Synchronous Image Decoding**: Animated images (GIF/WebP) require frame-by-frame decoding that happens synchronously on the main thread when the src attribute changes. Unlike static images which can use `decode()` API, animated images start playing immediately, blocking the UI.

2. **CSS Filter Performance**: The blur filter (`blur(40px)`) applied to background images in App.tsx requires expensive pixel operations. When applied to animated images, this filter must be recalculated for every frame of the animation, causing significant performance overhead.

3. **Multiple Animated Layers**: The GameDetailsPanel renders multiple image elements simultaneously:
   - Background image with blur filter (line 408-416 in GameDetailsPanel.tsx)
   - Blurred background overlay for logo area (line 418-441, only for non-animated images)
   - Logo image with fadeInScale animation
   - Boxart image with fadeIn animation
   When multiple of these are animated, the browser must composite all layers on every frame.

4. **CSS Animation Timing**: The CSS animations (`game-image-transition` with 450ms fadeIn, `game-logo-transition` with 500ms fadeInScale) start immediately when the component mounts, before the animated image has fully loaded its first frame. This creates a race condition where the browser is trying to animate opacity/scale while simultaneously decoding animated frames.

5. **No Image Preloading**: Images are loaded on-demand when the game is selected. There's no preloading mechanism to decode images before they're displayed, so the decoding cost is paid during the switch operation.

## Correctness Properties

Property 1: Fault Condition - Animated Images Switch Instantly

_For any_ game switch where the new game has animated images (GIF, WebP, APNG) in boxart, banner, or background, the fixed code SHALL complete the switch within 100ms, with no noticeable pause or stutter in the UI, by optimizing image decoding and compositing.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Static Image Performance

_For any_ game switch where the new game has only static images (PNG, JPG) or no images, the fixed code SHALL produce exactly the same instant switching behavior as the original code, preserving the current fast performance for static images.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `renderer/src/components/GameDetailsPanel.tsx`

**Function**: `GameDetailsPanel` component

**Specific Changes**:
1. **Add Image Preloading**: Implement a preload mechanism that uses the `Image()` constructor to load and decode images before they're displayed. For animated images, this ensures the first frame is ready before switching.
   - Add a `useEffect` hook that preloads the next/previous game images when a game is selected
   - Use `img.decode()` for static images to ensure they're ready before display
   - For animated images, wait for `onload` event to ensure first frame is decoded

2. **Optimize CSS for Animated Images**: Detect animated images and apply optimized rendering strategies
   - Add `will-change: transform` to animated image elements to promote them to their own compositor layer
   - Use `contain: layout style paint` to isolate animated images from layout recalculations
   - Consider reducing or disabling blur filter for animated images to reduce compositing cost

3. **Defer CSS Animations**: Delay the start of CSS animations until images are loaded
   - Remove `game-image-transition` and `game-logo-transition` classes initially
   - Add these classes only after the image `onload` event fires
   - This prevents the browser from animating opacity while decoding frames

4. **Add Loading State**: Implement a loading state that prevents rendering until images are ready
   - Add a `imageReady` state variable that tracks when the image is decoded
   - Render a placeholder or previous image until `imageReady` is true
   - This ensures the switch appears instant because the new image only displays when ready

5. **Optimize Blur Filter**: Conditionally apply blur filter based on image type
   - Detect animated images using regex: `/\.(gif|webp)(\?|$)/i`
   - Reduce blur amount for animated images (e.g., from 40px to 10px)
   - Or disable blur entirely for animated images to eliminate compositing cost

**File**: `renderer/src/App.tsx`

**Function**: Background rendering section (around line 1758)

**Specific Changes**:
1. **Optimize Background Blur**: Apply the same animated image detection and blur optimization
   - Detect if `backgroundImageUrl` is animated
   - Reduce or disable blur filter for animated backgrounds
   - Add `will-change: transform` and `contain` properties for animated backgrounds

2. **Add Image Preloading**: Preload background images before switching
   - Implement similar preload logic as GameDetailsPanel
   - Ensure background image is decoded before applying to the div

**File**: `renderer/src/styles/game-transitions.css`

**Function**: Animation definitions

**Specific Changes**:
1. **Add Conditional Animation Class**: Create a new class for animated images with reduced animation duration
   - Add `.game-image-transition-fast` with 200ms duration instead of 450ms
   - Add `.game-logo-transition-fast` with 250ms duration instead of 500ms
   - Apply these faster animations to animated images to reduce the overlap with frame decoding

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create a test environment with games that have animated images (GIF, WebP) in various positions (boxart, banner, background). Measure the time from game selection to full render completion. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Animated Boxart Test**: Switch to a game with animated WebP boxart (will show >100ms delay on unfixed code)
2. **Animated Banner Test**: Switch to a game with animated GIF banner (will show >100ms delay on unfixed code)
3. **Animated Background Test**: Switch to a game with animated background + blur filter (will show >300ms delay on unfixed code)
4. **Multiple Animated Images Test**: Switch to a game with both animated boxart and animated banner (will show compounded delay on unfixed code)
5. **Rapid Switching Test**: Rapidly switch between games with animated images using arrow keys (will show stuttering on unfixed code)

**Expected Counterexamples**:
- Game switching takes 200-800ms instead of <100ms when animated images are present
- Possible causes: synchronous image decoding, expensive blur filter compositing, CSS animation overlap with frame decoding

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL gameSwitchEvent WHERE isBugCondition(gameSwitchEvent) DO
  startTime := getCurrentTime()
  switchToGame(gameSwitchEvent.newGame)
  endTime := getCurrentTime()
  switchDuration := endTime - startTime
  ASSERT switchDuration < 100ms
  ASSERT noVisibleStutter(gameSwitchEvent)
END FOR
```

**Test Plan**: After implementing the fix, run the same test cases as exploratory checking and measure performance. Verify that switching to games with animated images completes within 100ms.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL gameSwitchEvent WHERE NOT isBugCondition(gameSwitchEvent) DO
  ASSERT switchToGame_original(gameSwitchEvent) = switchToGame_fixed(gameSwitchEvent)
  ASSERT switchDuration_fixed < 100ms
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for static images and other interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Static Image Switching**: Observe that switching between games with static PNG/JPG images is instant on unfixed code, then verify this continues after fix
2. **No Image Switching**: Observe that switching to games with no images (placeholder) is instant on unfixed code, then verify this continues after fix
3. **Error Handling**: Observe that image load errors display fallback correctly on unfixed code, then verify this continues after fix
4. **CSS Animations**: Observe that CSS animations for static images work correctly on unfixed code, then verify this continues after fix

### Unit Tests

- Test image preloading logic for both static and animated images
- Test animated image detection regex for various URL formats
- Test CSS class application timing (animations should start after image load)
- Test blur filter optimization for animated vs static images
- Test loading state transitions (not ready -> ready)

### Property-Based Tests

- Generate random game libraries with mixed static and animated images, verify all switches complete within 100ms
- Generate random image URLs (static and animated), verify correct detection and optimization
- Generate random rapid switching sequences, verify no stuttering or performance degradation
- Test across different view modes (grid, list, logo, carousel, coverflow) to ensure consistent performance

### Integration Tests

- Test full game switching flow with animated images in all positions (boxart, banner, background)
- Test switching between games with different image type combinations (static to animated, animated to static, animated to animated)
- Test that visual feedback (CSS animations) occurs smoothly when switching to games with animated images
- Test that blur filter and other visual effects work correctly with animated images
- Test rapid navigation through a library with mixed static and animated images
