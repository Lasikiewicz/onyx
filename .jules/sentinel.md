## 2024-05-24 - XSS Vulnerability in Game Description
**Vulnerability:** XSS vulnerability when rendering game descriptions. The application uses `dangerouslySetInnerHTML` to render user-provided or external game descriptions without any sanitization.
**Learning:** `dangerouslySetInnerHTML` is inherently dangerous and can lead to Cross-Site Scripting (XSS) if the input contains malicious scripts.
**Prevention:** Always sanitize external or user-provided HTML input using a library like `DOMPurify` before rendering it with `dangerouslySetInnerHTML`.
