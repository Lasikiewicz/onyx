import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import * as os from 'node:os';

/**
 * Parses binary .dmp crash files locally to extract interesting strings
 * that might hint at the cause of the native crash (DLLs, error names, etc.)
 */
export async function analyzeCrashDumps() {
    const crashDumpsDir = app.getPath('crashDumps');
    if (!fs.existsSync(crashDumpsDir)) return;

    try {
        const files = findDmpFiles(crashDumpsDir);
        for (const file of files) {
            if (!file.endsWith('.dmp')) continue;

            const reportPath = file.replace('.dmp', '-report.txt');
            if (fs.existsSync(reportPath)) {
                continue; // Already analyzed
            }

            console.log(`[CrashAnalyzer] Analyzing native crash dump: ${file}`);
            const report = analyzeDumpFile(file);
            fs.writeFileSync(reportPath, report, 'utf-8');
            console.log(`[CrashAnalyzer] Wrote readable crash report to: ${reportPath}`);
        }
    } catch (err) {
        console.warn(`[CrashAnalyzer] Failed to analyze crash dumps:`, err);
    }
}

function findDmpFiles(dir: string): string[] {
    const result: string[] = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                result.push(...findDmpFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.dmp')) {
                result.push(fullPath);
            }
        }
    } catch (err) { }
    return result;
}

function analyzeDumpFile(filePath: string): string {
    try {
        const buf = fs.readFileSync(filePath);

        // Extract Ascii strings
        const asciiText = buf.toString('ascii').replace(/[^\x20-\x7E\r\n]/g, '');
        const asciiMatches = asciiText.match(/[A-Za-z0-9_\-\.\/\\]{5,}/g) || [];

        // Extract UTF16LE strings (Windows often uses UTF16)
        const utf16Text = buf.toString('utf16le').replace(/[\x00-\x1F\x7F-\xFF]/g, '');
        const utf16Matches = utf16Text.match(/[A-Za-z0-9_\-\.\/\\]{5,}/g) || [];

        const allMatches = [...asciiMatches, ...utf16Matches];

        // Filter for interesting strings
        const interesting = Array.from(new Set(allMatches)).filter(s => {
            const lower = s.toLowerCase();
            return lower.includes('error') ||
                lower.includes('exception') ||
                lower.includes('access violation') ||
                lower.endsWith('.dll') ||
                lower.endsWith('.exe') ||
                lower.endsWith('.node') ||
                lower.endsWith('.js');
        });

        const isOom = asciiText.toLowerCase().includes('out of memory') || utf16Text.toLowerCase().includes('out of memory');
        const isAccessViolation = asciiText.toLowerCase().includes('access violation') || utf16Text.toLowerCase().includes('access violation');

        const lines = [
            `=== Onyx Native Crash Report ===`,
            `Date Analyzed: ${new Date().toISOString()}`,
            `Original Dump: ${path.basename(filePath)}`,
            `OS: ${os.type()} ${os.release()} ${os.arch()}`,
            `App Version: ${app.getVersion()}`,
            ``,
            `--- Potential Crash Causes ---`,
            `Out of Memory: ${isOom ? 'YES' : 'NO'}`,
            `Access Violation: ${isAccessViolation ? 'YES' : 'NO'}`,
            ``,
            `--- Extracted Libraries & Error Strings ---`,
            `This is a heuristic extraction from the binary dump.`,
            `Not all of these caused the crash, but the culprit is often among them:`,
            ...interesting.map(s => ` - ${s}`),
            ``,
            `--- End of Report ---`
        ];

        return lines.join('\n');
    } catch (err: any) {
        return `Failed to analyze dump file: ${err.message}`;
    }
}

/**
 * Configures basic global error handlers for the main process
 * writing standard text logs instead of crashing natively.
 */
export function setupJavaScriptErrorHandler() {
    const crashDumpsDir = app.getPath('crashDumps');
    if (!fs.existsSync(crashDumpsDir)) {
        fs.mkdirSync(crashDumpsDir, { recursive: true });
    }

    const logError = (type: string, error: any) => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logPath = path.join(crashDumpsDir, `js-crash-${timestamp}.txt`);

            const lines = [
                `=== Onyx JavaScript Crash Report ===`,
                `Time: ${new Date().toISOString()}`,
                `Type: ${type}`,
                `OS: ${os.type()} ${os.release()} ${os.arch()}`,
                `App Version: ${app.getVersion()}`,
                `Memory: ${JSON.stringify(process.memoryUsage())}`,
                ``,
                `--- Error Details ---`,
                error instanceof Error ? error.stack || error.message : String(error),
                ``,
                `--- End of Report ---`
            ];

            fs.writeFileSync(logPath, lines.join('\n'), 'utf-8');
            console.error(`[ErrorHandler] ${type} written to ${logPath}`);
        } catch (e) {
            console.error(`[ErrorHandler] Failed to write crash log:`, e);
        }
    };

    process.on('uncaughtException', (error) => {
        logError('Uncaught Exception', error);
        // Usually a good idea to exit after an uncaught exception in Node
        // app.exit(1); 
    });

    process.on('unhandledRejection', (reason) => {
        logError('Unhandled Promise Rejection', reason);
    });
}
