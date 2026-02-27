# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Animated Images Cause Switching Delays
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - games with animated images (GIF/WebP/APNG) in boxart, banner, or background
  - Test that switching to games with animated images completes within 100ms without visible stutter
  - Test cases: animated boxart, animated banner, animated background with blur, multiple animated images, rapid switching
  - The test assertions should verify: switchDuration < 100ms AND noVisibleStutter
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "switching to game with animated WebP boxart takes 200-500ms instead of <100ms")
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Static Image Performance Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (games with static PNG/JPG images only)
  - Observe: switching between games with static images is instant (<100ms) on unfixed code
  - Observe: switching to games with no images (placeholder) is instant on unfixed code
  - Observe: image load errors display fallback correctly on unfixed code
  - Observe: CSS animations for static images work correctly on unfixed code
  - Write property-based tests capturing observed behavior patterns:
    - For all games with static images only, switching completes within 100ms
    - For all games with no images, switching completes within 100ms
    - For all image load errors, fallback behavior displays correctly
    - For all static images, CSS animations apply smoothly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for animated image game switching performance

  - [x] 3.1 Add image preloading mechanism in GameDetailsPanel
    - Implement useEffect hook that preloads next/previous game images when a game is selected
    - Use Image() constructor to load images before display
    - Use img.decode() for static images to ensure they're ready
    - For animated images, wait for onload event to ensure first frame is decoded
    - Add imageReady state variable to track when image is decoded
    - Render placeholder or previous image until imageReady is true
    - _Bug_Condition: isBugCondition(input) where input.newGame has animated images (GIF/WebP/APNG) in boxart, banner, hero, or alternativeBanner AND hasBlurFilter OR hasCSSAnimation AND switchingPerformance > 100ms_
    - _Expected_Behavior: switchDuration < 100ms AND noVisibleStutter for all animated image switches_
    - _Preservation: Static image switching, no-image switching, error handling, and CSS animations must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Optimize CSS for animated images in GameDetailsPanel
    - Add animated image detection using regex: /\.(gif|webp)(\?|$)/i
    - Add will-change: transform to animated image elements for compositor layer promotion
    - Add contain: layout style paint to isolate animated images from layout recalculations
    - Reduce or disable blur filter for animated images (from 40px to 10px or 0px)
    - _Bug_Condition: isBugCondition(input) where animated images with blur filter cause expensive compositing_
    - _Expected_Behavior: switchDuration < 100ms by reducing compositing cost_
    - _Preservation: Static image blur and visual effects must remain unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.3 Defer CSS animations until images are loaded in GameDetailsPanel
    - Remove game-image-transition and game-logo-transition classes initially
    - Add these classes only after image onload event fires
    - Prevent browser from animating opacity while decoding frames
    - _Bug_Condition: isBugCondition(input) where CSS animations overlap with frame decoding_
    - _Expected_Behavior: switchDuration < 100ms by eliminating animation/decoding race condition_
    - _Preservation: Static image animation timing must remain unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.4 Optimize background image rendering in App.tsx
    - Detect if backgroundImageUrl is animated using regex
    - Reduce or disable blur filter for animated backgrounds
    - Add will-change: transform and contain properties for animated backgrounds
    - Implement preload logic for background images before switching
    - _Bug_Condition: isBugCondition(input) where animated background with blur causes 300-800ms delay_
    - _Expected_Behavior: switchDuration < 100ms for animated backgrounds_
    - _Preservation: Static background rendering must remain unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.5 Add conditional animation classes in game-transitions.css
    - Create .game-image-transition-fast with 200ms duration (instead of 450ms)
    - Create .game-logo-transition-fast with 250ms duration (instead of 500ms)
    - Apply faster animations to animated images to reduce overlap with frame decoding
    - _Bug_Condition: isBugCondition(input) where long CSS animations overlap with decoding_
    - _Expected_Behavior: switchDuration < 100ms with faster animations for animated images_
    - _Preservation: Static image animation durations must remain unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Animated Images Switch Instantly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify switching to games with animated images completes within 100ms
    - Verify no visible stutter during switching
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Static Image Performance Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify static image switching still instant (<100ms)
    - Verify no-image switching still instant
    - Verify error handling still works correctly
    - Verify CSS animations for static images still work correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
