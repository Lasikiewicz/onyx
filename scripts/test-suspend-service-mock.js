const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

(async () => {
  try {
    // Build main TS so we can require compiled service
    execSync('npx tsc -p main/tsconfig.json', { stdio: 'inherit' });

    const { ProcessSuspendService } = require(path.join(__dirname, '..', 'dist-electron', 'ProcessSuspendService'));

    // Fake runner that records commands. Reject native NtSuspendProcess/NtResumeProcess
    // scripts (Method 1) so the service falls through to the Suspend-Process cmdlet (Method 2).
    const commands = [];
    const fakeRunner = async (command, args = []) => {
      const scriptArg = args.join(' ');
      // Method 1 uses NtSuspendProcess / NtResumeProcess via Add-Type — simulate failure
      if (scriptArg.includes('NtSuspendProcess') || scriptArg.includes('NtResumeProcess')) {
        throw Object.assign(new Error('Command failed'), { stdout: '', stderr: 'Simulated native failure', code: 1 });
      }
      commands.push({ command, args });
      // simulate success for all other commands (e.g. Suspend-Process / Resume-Process cmdlets)
      return { stdout: 'ok', stderr: '', code: 0 };
    };

    const svc = new ProcessSuspendService(fakeRunner);
    svc.isWindows = true; // force Windows behavior in tests

    // Test invalid PID
    try {
      await svc.suspendProcess(-1);
      console.error('Expected invalid PID to throw');
      process.exit(1);
    } catch (err) {
      assert.ok(err.message === 'Invalid PID');
    }

    // Test valid suspendProcess uses powershell with expected args
    const pid = 12345;
    const result = await svc.suspendProcess(pid);
    assert.strictEqual(result, true);
    assert.ok(commands.some(c => c.command.startsWith('powershell') && c.args.join(' ').includes(`Suspend-Process -Id ${pid}`)));

    // Test resume
    const res = await svc.resumeProcess(pid);
    assert.strictEqual(res, true);
    assert.ok(commands.some(c => c.command.startsWith('powershell') && c.args.join(' ').includes(`Resume-Process -Id ${pid}`)));

    console.log('✓ ProcessSuspendService mock tests passed');
    process.exit(0);
  } catch (err) {
    console.error('ProcessSuspendService mock tests failed:', err);
    process.exit(1);
  }
})();
