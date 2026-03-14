## 2024-03-14 - Inline styles referencing undefined variables

**Learning:** When injecting variables into CSS string literals inside React style props (e.g., `containIntrinsicSize: 'auto ${tileHeight}px'`), ensure the variable is defined in the current scope or has a reliable fallback to prevent generating invalid CSS values like `auto undefinedpx` or `NaNpx` which can crash the component tree.
**Action:** When adding inline dynamic CSS, always trace the variables back to their declaration to confirm they exist in the scope where the style object is being constructed. If falling back to defaults from a props object (like `listViewOptions.tileHeight ?? listViewSize`), use that exact fallback logic inline instead of assuming an intermediary variable exists.
