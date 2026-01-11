import { app } from 'electron';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { platform, arch, release, cpus, totalmem, freemem } from 'node:os';
import { GameStore } from './GameStore.js';
import { UserPreferencesService } from './UserPreferencesService.js';
import { AppConfigService } from './AppConfigService.js';

interface BugReportData {
  timestamp: string;
  appVersion: string;
  appName: string;
  userDescription: string;
  systemInfo: {
    platform: string;
    arch: string;
    osRelease: string;
    nodeVersion: string;
    electronVersion: string;
    cpuCount: number;
    totalMemory: number;
    freeMemory: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  appState: {
    gameCount: number;
    preferences: any;
    appConfigs: any[];
    manualFolders: any[];
  };
  recentErrors: string[];
  consoleLogs: string[];
  imageOperations: string[];
}

export class BugReportService {
  private logBuffer: string[] = [];
  private errorBuffer: string[] = [];
  private imageOperationBuffer: string[] = []; // Track image operations
  private maxBufferSize = 1000; // Keep last 1000 log entries
  private maxImageOps = 100; // Keep last 100 image operations
  private logsDir: string;

  constructor() {
    // Determine logs directory
    const userDataPath = app.getPath('userData');
    this.logsDir = join(userDataPath, 'logs');
    
    // Ensure logs directory exists
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }

    // Capture console output
    this.setupConsoleCapture();
  }

  private setupConsoleCapture() {
    // Intercept console methods to capture logs
    const originalLog = console.log.bind(console);
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logBuffer.push(`[LOG] ${new Date().toISOString()} - ${message}`);
      if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
      }
      originalLog(...args);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logBuffer.push(`[ERROR] ${new Date().toISOString()} - ${message}`);
      this.errorBuffer.push(`[ERROR] ${new Date().toISOString()} - ${message}`);
      
      // Track image-related errors
      if (message.toLowerCase().includes('logo') || 
          message.toLowerCase().includes('image') || 
          message.toLowerCase().includes('url') ||
          message.toLowerCase().includes('cache')) {
        this.imageOperationBuffer.push(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (this.imageOperationBuffer.length > this.maxImageOps) {
          this.imageOperationBuffer.shift();
        }
      }
      
      if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
      }
      if (this.errorBuffer.length > 100) {
        this.errorBuffer.shift();
      }
      originalError(...args);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logBuffer.push(`[WARN] ${new Date().toISOString()} - ${message}`);
      
      // Track image-related warnings (especially URL format issues)
      if (message.toLowerCase().includes('logo') || 
          message.toLowerCase().includes('image') || 
          message.toLowerCase().includes('url') ||
          message.toLowerCase().includes('format') ||
          message.toLowerCase().includes('cache')) {
        this.imageOperationBuffer.push(`[WARN] ${new Date().toISOString()} - ${message}`);
        if (this.imageOperationBuffer.length > this.maxImageOps) {
          this.imageOperationBuffer.shift();
        }
      }
      
      if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
      }
      originalWarn(...args);
    };
  }

  async generateBugReport(userDescription: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const gameStore = new GameStore();
      const userPreferencesService = new UserPreferencesService();
      const appConfigService = new AppConfigService();

      // Gather system information
      const systemInfo = {
        platform: platform(),
        arch: arch(),
        osRelease: release(),
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        cpuCount: cpus().length,
        totalMemory: totalmem(),
        freeMemory: freemem(),
        memoryUsage: process.memoryUsage(),
      };

      // Gather app state
      const games = await gameStore.getLibrary();
      const preferences = await userPreferencesService.getPreferences().catch(() => ({}));
      const appConfigsRecord = await appConfigService.getAppConfigs().catch(() => ({}));
      const appConfigs = Object.values(appConfigsRecord);
      const manualFolders = await appConfigService.getManualFolders().catch(() => []);

      const appState = {
        gameCount: games.length,
        preferences: preferences,
        appConfigs: appConfigs,
        manualFolders: manualFolders,
      };

      // Get recent errors and logs
      const recentErrors = [...this.errorBuffer].slice(-50); // Last 50 errors
      const consoleLogs = [...this.logBuffer].slice(-200); // Last 200 log entries
      const imageOperations = [...this.imageOperationBuffer].slice(-50); // Last 50 image operations

      // Create bug report data
      const bugReport: BugReportData = {
        timestamp: new Date().toISOString(),
        appVersion: app.getVersion(),
        appName: app.getName(),
        userDescription: userDescription || 'No description provided',
        systemInfo,
        appState,
        recentErrors,
        consoleLogs,
        imageOperations,
      };

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `bug-report-${timestamp}.txt`;
      const filePath = join(this.logsDir, filename);

      // Format the report as readable text
      const reportText = this.formatReport(bugReport);

      // Write to file
      writeFileSync(filePath, reportText, 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      console.error('Error generating bug report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatReport(data: BugReportData): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('BUG REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Generated: ${data.timestamp}`);
    lines.push(`App: ${data.appName} v${data.appVersion}`);
    lines.push('');

    // User Description
    lines.push('-'.repeat(80));
    lines.push('USER DESCRIPTION');
    lines.push('-'.repeat(80));
    lines.push(data.userDescription);
    lines.push('');

    // System Information
    lines.push('-'.repeat(80));
    lines.push('SYSTEM INFORMATION');
    lines.push('-'.repeat(80));
    lines.push(`Platform: ${data.systemInfo.platform}`);
    lines.push(`Architecture: ${data.systemInfo.arch}`);
    lines.push(`OS Release: ${data.systemInfo.osRelease}`);
    lines.push(`Node.js Version: ${data.systemInfo.nodeVersion}`);
    lines.push(`Electron Version: ${data.systemInfo.electronVersion}`);
    lines.push(`CPU Count: ${data.systemInfo.cpuCount}`);
    lines.push(`Total Memory: ${(data.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    lines.push(`Free Memory: ${(data.systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    lines.push(`Memory Usage:`);
    lines.push(`  Heap Used: ${(data.systemInfo.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  Heap Total: ${(data.systemInfo.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  RSS: ${(data.systemInfo.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  External: ${(data.systemInfo.memoryUsage.external / 1024 / 1024).toFixed(2)} MB`);
    lines.push('');

    // App State
    lines.push('-'.repeat(80));
    lines.push('APP STATE');
    lines.push('-'.repeat(80));
    lines.push(`Total Games: ${data.appState.gameCount}`);
    lines.push(`App Configs: ${data.appState.appConfigs.length}`);
    lines.push(`Manual Folders: ${data.appState.manualFolders.length}`);
    lines.push('');
    lines.push('Preferences:');
    lines.push(JSON.stringify(data.appState.preferences, null, 2));
    lines.push('');

    // Recent Errors
    if (data.recentErrors.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('RECENT ERRORS');
      lines.push('-'.repeat(80));
      data.recentErrors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error}`);
      });
      lines.push('');
    }

    // Image Operations (if any)
    if (data.imageOperations.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('IMAGE OPERATIONS & URL FORMAT ISSUES');
      lines.push('-'.repeat(80));
      lines.push('This section contains warnings and errors related to image caching,');
      lines.push('URL format conversions, and logo/image operations:');
      lines.push('');
      data.imageOperations.forEach((op) => {
        lines.push(op);
      });
      lines.push('');
    }

    // Console Logs
    if (data.consoleLogs.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('RECENT CONSOLE LOGS');
      lines.push('-'.repeat(80));
      data.consoleLogs.forEach((log) => {
        lines.push(log);
      });
      lines.push('');
    }

    lines.push('='.repeat(80));
    lines.push('END OF BUG REPORT');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  getLogsDirectory(): string {
    return this.logsDir;
  }
}
