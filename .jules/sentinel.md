## 2024-05-18 - Fix Cross-Site Scripting (XSS) in Game Descriptions
**Vulnerability:** External or user-provided HTML for game descriptions was being rendered directly via `dangerouslySetInnerHTML` without any sanitization in React components (`LibraryCarousel.tsx` and `GameDetailsPanel.tsx`). This exposed the application to Cross-Site Scripting (XSS).
**Learning:** `dangerouslySetInnerHTML` should never be trusted with unsanitized data, even if it is fetched from internal game library metadata, as metadata can be compromised or maliciously crafted.
**Prevention:** Always sanitize any external or user-provided HTML using `DOMPurify` before rendering it via `dangerouslySetInnerHTML`.
## 2026-03-11 - Prevent Command Injection with execFile
**Vulnerability:** Unsanitized user inputs and dynamic variables passed to `exec` and `execSync` without using array arguments can allow command injection. Shell features like `2>nul` add further complexity and security risk.
**Learning:** The `exec` and `execSync` commands pass arguments to a shell and interpret shell syntax, exposing the app to injection if arguments aren't strictly controlled.
**Prevention:** Strictly use `child_process.execFile` or `execFileSync` with an array of arguments to invoke binaries safely without going through a shell, avoiding shell syntax injection vectors.
