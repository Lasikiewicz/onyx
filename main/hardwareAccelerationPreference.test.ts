import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readHardwareAccelerationEnabled } from './hardwareAccelerationPreference';

describe('readHardwareAccelerationEnabled', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onyx-hwaccel-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const writePrefs = (content: string) => {
    fs.writeFileSync(path.join(dir, 'user-preferences.json'), content, 'utf8');
  };

  it('is enabled when the preferences file is missing', () => {
    expect(readHardwareAccelerationEnabled(dir)).toBe(true);
  });

  it('is disabled when the saved preference is false', () => {
    writePrefs(JSON.stringify({ preferences: { enableHardwareAcceleration: false } }));
    expect(readHardwareAccelerationEnabled(dir)).toBe(false);
  });

  it('is enabled when the saved preference is true', () => {
    writePrefs(JSON.stringify({ preferences: { enableHardwareAcceleration: true } }));
    expect(readHardwareAccelerationEnabled(dir)).toBe(true);
  });

  it('defaults to enabled when the key is absent', () => {
    writePrefs(JSON.stringify({ preferences: { minimizeToTray: true } }));
    expect(readHardwareAccelerationEnabled(dir)).toBe(true);
  });

  it('reads the preference when the file starts with a byte-order mark', () => {
    writePrefs('﻿' + JSON.stringify({ preferences: { enableHardwareAcceleration: false } }));
    expect(readHardwareAccelerationEnabled(dir)).toBe(false);
  });

  it('defaults to enabled when the file is corrupt', () => {
    writePrefs('{ not json');
    expect(readHardwareAccelerationEnabled(dir)).toBe(true);
  });
});
