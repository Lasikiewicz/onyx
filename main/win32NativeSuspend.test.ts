import { spawn } from 'child_process';
import { describe, expect, it } from 'vitest';
import { loadWin32SuspendPort } from './win32NativeSuspend.js';

describe('win32 native suspend port', () => {
  it('loads once and lists a process this test spawned', async () => {
    const port = loadWin32SuspendPort();
    if (process.platform !== 'win32') {
      expect(port).toBeNull();
      expect(loadWin32SuspendPort()).toBeNull();
      return;
    }

    expect(port).not.toBeNull();
    expect(loadWin32SuspendPort()).toBe(port);

    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000000)'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    try {
      expect(child.pid).toBeGreaterThan(0);
      let children: number[] = [];
      for (let attempt = 0; attempt < 25; attempt += 1) {
        children = port!.childPids(process.pid);
        if (children.includes(child.pid!)) break;
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      expect(children).toContain(child.pid);
      expect(children.every((pid) => Number.isInteger(pid) && pid > 4)).toBe(true);
    } finally {
      if (child.pid) {
        try { process.kill(child.pid); } catch { /* already gone */ }
      }
    }
  });
});
