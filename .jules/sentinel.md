
## 2025-02-28 - Unvalidated External Protocol Launch

**Vulnerability:** Arbitrary protocol execution via `shell.openExternal`. The `LauncherService.ts` method `launchModManager` was opening unsanitized `modManagerUrl` strings. If a game config contained a malicious URL (e.g., `file://`, `smb://`, `javascript://`), Electron would execute it, potentially leading to local file access or remote code execution.
**Learning:** External URLs in Electron applications represent a significant attack vector. Input validation was inconsistently applied; it existed inline in `appHandlers.ts` but was entirely missing in the `LauncherService.ts` execution flow.
**Prevention:** Always validate external URL protocols against a strict whitelist before passing them to `shell.openExternal`. Extract the validation logic into a centralized security utility (`SecurityUtils.ts`) and enforce its use across all boundary interfaces (IPC and Launcher routines).
