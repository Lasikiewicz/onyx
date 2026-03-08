## 2024-03-08 - Use content-visibility as a lightweight list virtualization alternative
**Learning:** For frontend performance, use CSS `contentVisibility: 'auto'` paired with `containIntrinsicSize` on list item containers (e.g., within `LibraryListView`) as a lightweight, native browser alternative to virtualization.
**Action:** Always add these CSS properties to list items when dealing with large lists that don't use full virtualization.
