import { platform } from 'node:os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Service to read installer preferences (e.g., from registry)
 */
export class InstallerPreferenceService {
  /**
   * Read suspend feature preference from Windows Registry
   * Returns null if not found or on non-Windows systems
   */
  static async readSuspendFeaturePreference(): Promise<boolean | null> {
    if (platform() !== 'win32') {
      return null;
    }

    try {
      // Read from registry: HKCU\Software\Onyx\Features\SuspendEnabled
      const command = `reg query "HKCU\\Software\\Onyx\\Features" /v SuspendEnabled 2>nul`;
      const { stdout } = await execAsync(command, { encoding: 'utf8' });
      
      // Parse registry output
      // Format: "SuspendEnabled    REG_SZ    1" or "SuspendEnabled    REG_SZ    0"
      const match = stdout.match(/SuspendEnabled\s+REG_SZ\s+(\d)/);
      if (match && match[1]) {
        return match[1] === '1';
      }
      
      return null;
    } catch (error) {
      // Registry key doesn't exist or access denied - this is fine
      // It means the installer didn't set a preference (user didn't install with feature)
      return null;
    }
  }

  /**
   * Alternative: Read from config file if registry access fails
   * This would be set during installation to: %APPDATA%\Onyx\installer-config.json
   */
  static async readSuspendFeaturePreferenceFromFile(): Promise<boolean | null> {
    // This is a fallback approach if registry doesn't work
    // For now, we'll use registry only
    return null;
  }
}
