/**
 * Build a Windows command line from separate arguments, using the MSVCRT quoting rules that
 * CommandLineToArgvW and most game executables parse. Windows PowerShell 5.1 joins an
 * '-ArgumentList' array with spaces and does no quoting, so a value with spaces gets split
 * (A5). Pass the result as one string instead.
 */
export function quoteWindowsArgument(arg: string): string {
  if (arg.length > 0 && !/[\s"]/.test(arg)) return arg;

  let out = '"';
  let backslashes = 0;
  for (const ch of arg) {
    if (ch === '\\') {
      backslashes++;
      continue;
    }
    if (ch === '"') {
      // Backslashes before a quote are doubled, and the quote itself is escaped.
      out += '\\'.repeat(backslashes * 2 + 1) + '"';
    } else {
      out += '\\'.repeat(backslashes) + ch;
    }
    backslashes = 0;
  }
  // Trailing backslashes must be doubled so they don't escape the closing quote.
  out += '\\'.repeat(backslashes * 2) + '"';
  return out;
}

export function buildWindowsCommandLine(args: string[]): string {
  return args.map(quoteWindowsArgument).join(' ');
}
