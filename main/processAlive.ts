/**
 * True if a process with this PID exists. Signal 0 checks existence without delivering a signal,
 * and works the same on every platform. Unlike parsing `tasklist` output, it doesn't depend on the
 * Windows display language (A14).
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to another user.
    return (error as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}
