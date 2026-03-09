## 2024-05-24 - Frontend Performance Optimization for List Views
**Learning:** Using `contentVisibility: 'auto'` and `containIntrinsicSize` acts as a lightweight native browser alternative to complex virtualization for long list views like the library. Additionally, deferring off-screen assets with `loading="lazy"` on images and `preload="none"` on videos significantly reduces unnecessary early resource loading.
**Action:** Apply this combination (contentVisibility/containIntrinsicSize and lazy media loading) in large lists that don't yet justify full virtualized components.
