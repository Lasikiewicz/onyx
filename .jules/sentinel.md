## 2024-05-24 - Unsafe child process execution in Windows Registry queries
**Vulnerability:** Execution of Windows Registry commands using `child_process.exec` and `child_process.execSync` which invoke commands via a shell (e.g., cmd.exe), creating an OS Command Injection vulnerability.
**Learning:** Even when reading from the Windows Registry to determine launcher detection (`LauncherDetectionService.ts`) or user preferences (`InstallerPreferenceService.ts`), wrapping commands in string templates sent to a shell allows special characters in variables to break out of the intended query.
**Prevention:** Always use `child_process.execFile` or `child_process.execFileSync` and pass arguments as an array so they are safely passed directly to the binary (`reg.exe`) without shell interpolation.
