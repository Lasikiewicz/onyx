## 2025-03-06 - [XSS Vulnerability in Game Descriptions]
**Vulnerability:** Game descriptions were rendered using `dangerouslySetInnerHTML` in `LibraryCarousel.tsx` and `GameDetailsPanel.tsx` without prior sanitization, leading to a Cross-Site Scripting (XSS) vulnerability.
**Learning:** Rendering untrusted or external HTML descriptions directly via React's `dangerouslySetInnerHTML` allows for malicious scripts to be executed within the Electron application context.
**Prevention:** Always sanitize external HTML strings using a library like `DOMPurify` before injecting them via `dangerouslySetInnerHTML` in React components.
