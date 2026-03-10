## 2026-03-10 - Add aria labels to missing game action buttons
**Learning:** Found missing aria labels in the `BottomBar` component which handles main actions per game, causing non-accessible UI actions to screen-readers.
**Action:** When adding or checking `icon-only` buttons, make sure `aria-label` is always added, and `aria-pressed` for toggles. Ensure to include tests using testing-library to confirm these attributes are presented.
