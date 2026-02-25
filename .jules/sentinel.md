## 2025-02-18 - Unrestricted openExternal
**Vulnerability:** `LauncherService.launchModManager` used `modManagerUrl.includes('://')` to detect URLs, allowing unsafe protocols like `file://` to be passed to `shell.openExternal`.
**Learning:** `shell.openExternal` is dangerous with untrusted protocols.
**Prevention:** Use `new URL()` to parse and validate `protocol` against an explicit whitelist (e.g., `http:`, `https:`).
