# Security

## Reporting a vulnerability

If you believe you have found a security vulnerability in Onyx, please report it responsibly.

**Do not open a public GitHub issue for security-sensitive bugs.** Public issues can be seen by anyone and could lead to abuse.

Instead:

1. **Preferred**: Open a [private security advisory](https://github.com/Lasikiewicz/onyx/security/advisories/new) on this repository. This allows maintainers to discuss and fix the issue before disclosure.
2. If you cannot use the advisory form, contact the project maintainers through the repository (e.g. via the contact method listed in the repository or CODE_OF_CONDUCT.md) and describe the issue in private.

We will acknowledge your report and work with you to understand and address the issue. We ask that you allow a reasonable time for a fix before any public disclosure.

## Security practices in this project

- API credentials (IGDB, RAWG, SteamGridDB) are not shipped with the app; users configure their own keys in Settings or via environment variables.
- Credentials are stored in the OS credential store (e.g. Windows Credential Locker) when available, with an electron-store fallback.
- The repository runs automated secret scanning (see `npm run scan:secrets` and `.github/workflows/secret-scan.yml`) to reduce the risk of committed secrets.

Thank you for helping keep Onyx and its users safe.
