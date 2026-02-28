## 2025-02-28 - React List Rendering Performance Optimization
**Learning:** For highly iterated components (like `GameCard` in library grids/lists), defining pure utility functions (e.g., `formatPlaytime`, `toRgba`) inside the render scope creates significant garbage collection pressure by recreating the functions for every item on every render.
**Action:** Always hoist pure utility functions out to the module level, and wrap list-item components in `React.memo` to prevent expensive re-renders when parent state (like list selection/focus) changes but the item props do not.
