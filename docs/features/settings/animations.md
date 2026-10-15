# Settings Animations Tab

## What This Feature Does

Controls whether UI and artwork animation features remain active at runtime.

## User-Facing Surfaces

- `Onyx Settings` -> `Animations` tab.
- Main section: `Animations`.

## Settings and Toggles

- `Disable all animations` -> `disableAllAnimations`
- `Disable animated banners` -> `disableAnimatedBanners`
- `Disable animated boxarts` -> `disableAnimatedBoxarts`
- `Disable animated alt banners` -> `disableAnimatedBackgrounds`
- `Disable animated icons` -> `disableAnimatedIcons`
- `Disable animated logos` -> `disableAnimatedLogos`

## Confirmed End-to-End Flows

1. User changes animation toggles.
2. Save persists preferences.
3. App reloads preferences and updates CSS/runtime animation decisions.
4. Main UI components read combined disable flags plus overlay state.

## Discovery and Data Sources

- Settings UI: [SettingsAnimationsTab.tsx](../../../renderer/src/components/settings/SettingsAnimationsTab.tsx), mounted by [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx).
- Runtime consumers include [`App.tsx`](../../../renderer/src/App.tsx), [`GameDetailsPanel.tsx`](../../../renderer/src/components/GameDetailsPanel.tsx), and image/display selection logic.

## Data Model and Persistence

- Stored in user preferences.
- `disableAllAnimations` acts as a master override over per-type flags.
- **WebP format treatment**: WebP images are treated as static for the purpose of the disable flags (banners, logos, etc.) to prevent them from being hidden when animations are disabled, as many WebP assets are single-frame.
- Legacy animation preference fields still exist for compatibility.

## Failure Modes and Triage

### Symptom: Videos keep playing while the window is hidden or the artwork is off screen

- `renderer/src/hooks/useAnimatedMediaPolicy.ts` pauses every `<video>` while `document.visibilityState` is `hidden` (minimised or closed to tray), and pauses a video that an `IntersectionObserver` reports as not intersecting.
- Resume happens only for videos the policy paused, marked with `data-onyx-paused-by-policy`. A video that was already stopped is not started. Visibility and scroll pauses keep the playback position, unlike the settings pauses, which rewind to the first frame.
- Check the marker attribute on the element first. Its absence means the policy did not pause it.

### Symptom: Icons still animate after disabling

- Confirm `disableAllAnimations` or `disableAnimatedIcons` was reloaded into app state.
- Check whether a component is bypassing shared flags.

## File Ownership Map

- **Renderer**
  - [SettingsAnimationsTab.tsx](../../../renderer/src/components/settings/SettingsAnimationsTab.tsx)
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [App.tsx](../../../renderer/src/App.tsx)
  - [GameDetailsPanel.tsx](../../../renderer/src/components/GameDetailsPanel.tsx)
- **Main process**
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
