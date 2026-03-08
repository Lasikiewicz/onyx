## 2024-05-18 - Prevent XSS in dynamically rendered React HTML
**Vulnerability:** External HTML (such as game descriptions) was rendered directly into the DOM using `dangerouslySetInnerHTML` without sanitization.
**Learning:** `dangerouslySetInnerHTML` is extremely prone to Cross-Site Scripting (XSS) if the source data is user-provided or from an unverified external source. The application did not sanitize this data before rendering.
**Prevention:** Always use `DOMPurify` (e.g. `DOMPurify.sanitize()`) when rendering external or user-provided HTML via `dangerouslySetInnerHTML` in React components to prevent XSS.
