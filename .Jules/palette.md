## 2024-03-06 - Accessible Icon Buttons in LibraryCarousel

**Learning:** When using `<button>` elements with SVG icons instead of text, `aria-label` is crucial for screen readers to convey the button's purpose. Furthermore, setting `aria-hidden="true"` and `focusable="false"` on the inner `<svg>` element prevents screen readers from redundantly announcing the graphic or trapping focus incorrectly within the button. For toggleable buttons (like 'Favorite'), `aria-pressed` must also be managed dynamically to signal state changes.

**Action:** Consistently apply semantic rendering patterns (`aria-label`, `aria-pressed` for toggles, and `aria-hidden="true" focusable="false"` on SVGs) to all newly created or updated icon-only interactive elements to ensure complete and correct screen-reader usability.
