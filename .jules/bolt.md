## 2024-05-23 - LibraryListView Performance
**Learning:** `LibraryListView` renders all items without virtualization, leading to massive DOM size and slow load times.
**Action:** Use `loading="lazy"` on images and consider implementing virtualization with `react-window` for future scalability.
**Insight:** `GameCard` uses `loading="lazy"`, but `LibraryListView` re-implements the view without it, causing inconsistency and performance degradation.
