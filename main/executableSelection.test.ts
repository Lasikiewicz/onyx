import { describe, expect, it } from 'vitest';
import {
  getUnrealShippingRootDirectory,
  isUnrealShippingExecutable,
  selectBestGameExecutable,
} from './executableSelection.js';

describe('executableSelection', () => {
  it('detects Unreal Engine shipping executables under Binaries folders', () => {
    expect(isUnrealShippingExecutable(
      'C:\\Games\\LEGO Batman Legacy of the Dark Knight\\LEGOBatmanLotDK\\Binaries\\Win64\\LEGOBatmanLotDK-Win64-Shipping.exe',
    )).toBe(true);

    expect(isUnrealShippingExecutable(
      'C:\\Games\\LEGO Batman Legacy of the Dark Knight\\LEGOBatmanLotDK.exe',
    )).toBe(false);
  });

  it('prefers Unreal Engine shipping executables over shallow bootstrap executables', () => {
    const installRoot = 'C:\\Games\\LEGO Batman Legacy of the Dark Knight';
    const bootstrapExe = `${installRoot}\\LEGOBatmanLotDK.exe`;
    const shippingExe = `${installRoot}\\LEGOBatmanLotDK\\Binaries\\Win64\\LEGOBatmanLotDK-Win64-Shipping.exe`;

    expect(selectBestGameExecutable(
      [bootstrapExe, shippingExe],
      installRoot,
      'LEGO Batman Legacy of the Dark Knight',
    )).toBe(shippingExe);
  });

  it('groups nested Unreal Engine shipping executables at the project directory', () => {
    expect(getUnrealShippingRootDirectory(
      'C:\\Games\\Example\\ExampleProject\\Binaries\\Win64\\ExampleProject-Win64-Shipping.exe',
    )).toBe('C:/Games/Example/ExampleProject');
  });

  it('keeps exact root executable matches when no shipping executable is present', () => {
    const installRoot = 'D:\\Games\\Example Game';
    const rootExe = `${installRoot}\\Example Game.exe`;
    const helperExe = `${installRoot}\\Tools\\ExampleHelper.exe`;

    expect(selectBestGameExecutable(
      [helperExe, rootExe],
      installRoot,
      'Example Game',
    )).toBe(rootExe);
  });
});
