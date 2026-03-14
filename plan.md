1. **Optimize Image Loading in `LibraryListView`**: Add `loading="lazy"` to `<img>` tags to defer loading of off-screen media. This will speed up initial render times, especially for large libraries. Note: do not add `preload="none"` on `<video>` tags if they have `autoPlay`, per instructions.
2. **Add `contentVisibility` to List Items**: Add `contentVisibility: 'auto'` and `containIntrinsicSize` to list item containers in `LibraryListView` (`renderer/src/components/LibraryListView.tsx`) to act as a lightweight virtualization alternative, deferring the rendering of off-screen DOM nodes.
3. **Move Expensive Computations Out of Render Scope**: `formatDate` recreates a date format on every call. It can be moved outside of the render scope and potentially optimized by caching an `Intl.DateTimeFormat` instance.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit**: Create PR with the performance details.
