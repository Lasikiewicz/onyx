## 2024-05-18 - Fix Cross-Site Scripting (XSS) in Game Descriptions
**Vulnerability:** External or user-provided HTML for game descriptions was being rendered directly via `dangerouslySetInnerHTML` without any sanitization in React components (`LibraryCarousel.tsx` and `GameDetailsPanel.tsx`). This exposed the application to Cross-Site Scripting (XSS).
**Learning:** `dangerouslySetInnerHTML` should never be trusted with unsanitized data, even if it is fetched from internal game library metadata, as metadata can be compromised or maliciously crafted.
**Prevention:** Always sanitize any external or user-provided HTML using `DOMPurify` before rendering it via `dangerouslySetInnerHTML`.

## 2026-03-15 - Fix Command Injection in Windows Game Launcher
**Vulnerability:** Game launch arguments and executable paths on Windows were passed to `spawn` with `shell: true` via a constructed `startCmd` string, introducing a command injection risk.
**Learning:** Using `shell: true` on Windows allows attackers to inject arbitrary shell commands via specially crafted executable paths or launch arguments.
**Prevention:** Use `child_process.spawn` with `shell: false` and `windowsVerbatimArguments: true` on Windows, and manually quote arguments containing spaces, instead of relying on the shell or `start` command.
