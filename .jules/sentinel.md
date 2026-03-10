## 2024-05-18 - Fix Cross-Site Scripting (XSS) in Game Descriptions
**Vulnerability:** External or user-provided HTML for game descriptions was being rendered directly via `dangerouslySetInnerHTML` without any sanitization in React components (`LibraryCarousel.tsx` and `GameDetailsPanel.tsx`). This exposed the application to Cross-Site Scripting (XSS).
**Learning:** `dangerouslySetInnerHTML` should never be trusted with unsanitized data, even if it is fetched from internal game library metadata, as metadata can be compromised or maliciously crafted.
**Prevention:** Always sanitize any external or user-provided HTML using `DOMPurify` before rendering it via `dangerouslySetInnerHTML`.
