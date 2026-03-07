## 2026-03-07 - ARIA Switch Patterns for Tailwind Toggles
**Learning:** Custom UI toggles (pill switches) built using `<button>` and internal `<span>` elements require `role="switch"`, `aria-checked`, and an `aria-labelledby` linking to the adjacent label text in order to be fully accessible for screen-readers.
**Action:** Always check interactive `div` or custom `button` toggle implementations for missing `role="switch"` and boolean `aria-checked` attributes.
