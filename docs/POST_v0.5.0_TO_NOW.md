# Onyx Update Roundup: v0.5.0 → v0.7.9

From v0.5.0 to today, Onyx has had a major quality and usability jump.  
This post highlights the biggest improvements in plain English.

## At a Glance

- **Current version:** v0.7.9
- **Range covered:** v0.5.0 (2026-02-26) to v0.7.9 (2026-03-04)
- **Theme of this cycle:** faster library experience, better metadata/image tooling, safer updates, and stronger stability in packaged builds.

## Biggest Improvements Since v0.5.0

### 1) Image + Metadata Management got a full overhaul

- Manage Metadata actions were expanded and clarified (full refresh, images-only, links-only, optimizer flows).
- Image search became multi-provider and much smarter, with provider status, filtering, and better progress visibility.
- Link handling became more consistent across Settings, Game Details, and Game Manager.
- Manual folder icon presets were added and now apply consistently across library surfaces.
- Metadata source labels and launcher/platform naming are now normalized for cleaner display.

**Why it matters:** less manual cleanup, better artwork quality, and fewer mismatches when importing large libraries.

### 2) Animation and media support improved significantly

- Added broad `.webm` support across library views, details, and Game Manager surfaces.
- Added dedicated animation controls, including global kill-switches and category-specific toggles.
- Improved pause behavior for overlays/menus so animated media does not distract or consume unnecessary CPU.
- Added filtering to exclude problematic animated assets during search/upload flows.
- Fixed edge cases like coverflow reflection issues for video-backed artwork.

**Why it matters:** richer visuals with more control and better performance.

### 3) Performance and optimization became much more robust

- Added smarter image prefetching across grid/list/carousel/coverflow and nearby-item warming.
- Reworked optimizer fallback chain and diagnostics (worker/FFmpeg/Sharp), especially for animated WebP edge cases.
- Added runtime diagnostics and downloadable optimization logs for easier troubleshooting.
- Improved packaging/runtime parity so optimization behaves consistently in dev, alpha, and release builds.
- Added safeguards for hangs/timeouts and improved responsiveness during heavy optimization workloads.

**Why it matters:** faster browsing, smoother transitions, and fewer optimization failures in real-world libraries.

### 4) Updates and release notes became cleaner and more reliable

- Update modal changelog rendering was redesigned for cleaner, easier-to-scan formatting.
- Changelog fetching gained stronger validation/fallback behavior to avoid blank or malformed notes.
- Added changelog-driven release-note generation for more consistent alpha/main release workflows.
- Improved update modal usability (scrolling behavior, content structure, action placement, and state handling).

**Why it matters:** users can trust in-app update information and act on it quickly.

### 5) Stability, security, and crash handling improved

- Strengthened protocol and URL validation in multiple paths (including IPC/external URL flows).
- Fixed startup/update coordination races that could cause hangs or delayed scans.
- Improved crash reporting with clearer saved reports and better JS/native error capture.
- Fixed multiple packaged-build issues (dependency unpacking, runtime module resolution, worker paths).
- Added and maintained test/build fixes to keep CI and release pipelines healthy.

**Why it matters:** fewer production surprises and better tools for diagnosing rare failures.

## UX / Product polish highlights

- Onboarding was expanded with better setup flow, clearer API guidance, and manual-folder controls.
- Add Games and Game Manager flows now communicate progress and cancellation states more clearly.
- Navbar/tray/update surfaces received repeated quality-of-life polish for readability and consistency.
- Link visibility/order and icon presentation in Game Details are more predictable and configurable.

## Version Milestones (Quick Read)

- **v0.5.x:** foundation for suspend/resume settings, optimization controls, Manage Metadata flow improvements, and update changelog source reliability.
- **v0.6.0+:** “optimized update” era with heavy work on image pipeline reliability, diagnostics, packaged runtime parity, and animation/media control.
- **v0.7.x:** refinement pass focused on update UX quality, metadata management correctness, icon/label consistency, and onboarding/manual-folder polish.

## Bottom Line

From v0.5.0 to v0.7.9, Onyx shifted from feature-building to **system hardening and workflow polish**.  
The app is now faster to browse, safer to update, easier to manage at scale, and more reliable in packaged builds.

---

For full itemized notes by version, see [CHANGELOG.md](../CHANGELOG.md).
