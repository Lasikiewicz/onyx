## 2024-05-24 - React component optimization pattern for highly iterated components
**Learning:** For highly iterated components (like `GameCard`), pure utility functions (e.g., `formatPlaytime`, `toRgba`) should be hoisted out of the render scope to the module level, and the component should be wrapped in `React.memo` to reduce garbage collection pressure and prevent unnecessary re-renders.
**Action:** Always check if utility functions in heavily rendered components can be hoisted. Check if `React.memo` is missing.
