## 2024-05-18 - Fix Cross-Site Scripting (XSS) in Game Descriptions
**Vulnerability:** External or user-provided HTML for game descriptions was being rendered directly via `dangerouslySetInnerHTML` without any sanitization in React components (`LibraryCarousel.tsx` and `GameDetailsPanel.tsx`). This exposed the application to Cross-Site Scripting (XSS).
**Learning:** `dangerouslySetInnerHTML` should never be trusted with unsanitized data, even if it is fetched from internal game library metadata, as metadata can be compromised or maliciously crafted.
**Prevention:** Always sanitize any external or user-provided HTML using `DOMPurify` before rendering it via `dangerouslySetInnerHTML`.

## 2024-07-24 - Prevent Command Injection via `exec` in System Shell Calls
**Vulnerability:** Constructing system shell command strings using interpolation or concatenation and executing them with `child_process.exec` opens up the application to Command Injection, especially if any interpolated string could be user-controlled or influenced externally.
**Learning:** `child_process.exec` runs the command inside a shell, which can inadvertently interpret shell metacharacters and execute unauthorized commands if the inputs are not properly sanitized.
**Prevention:** Strictly use `child_process.execFile` (or `execFileSync`) and pass executable arguments as an array instead of string concatenation. This sidesteps the shell and mitigates command injection risks.
