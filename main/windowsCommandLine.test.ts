import { describe, expect, it } from 'vitest';
import { buildWindowsCommandLine, quoteWindowsArgument } from './windowsCommandLine.js';

describe('quoteWindowsArgument (A5)', () => {
  const cases: Array<[string, string]> = [
    ['plain', 'plain'],
    ['-windowed', '-windowed'],
    ['has space', '"has space"'],
    ['say "hi"', '"say \\"hi\\""'],
    ['', '""'],
    ['C:\\My Games\\', '"C:\\My Games\\\\"'],
    ['a\\"b c', '"a\\\\\\"b c"'],
    ['tab\there', '"tab\there"'],
  ];

  it.each(cases)('quotes %j as %s', (input, expected) => {
    expect(quoteWindowsArgument(input)).toBe(expected);
  });
});

describe('buildWindowsCommandLine (A5)', () => {
  it('keeps a value with spaces as one argument', () => {
    expect(buildWindowsCommandLine(['-level', 'My Map', '-fast'])).toBe('-level "My Map" -fast');
  });

  it('returns an empty string for no arguments', () => {
    expect(buildWindowsCommandLine([])).toBe('');
  });
});
