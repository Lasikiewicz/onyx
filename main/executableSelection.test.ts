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

  describe('Linux executables', () => {
    it('detects Unreal shipping binaries that carry no extension or a launcher script', () => {
      expect(isUnrealShippingExecutable(
        '/home/user/Games/ExampleProject/Binaries/Linux/ExampleProject-Linux-Shipping',
      )).toBe(true);

      expect(isUnrealShippingExecutable(
        '/home/user/Games/ExampleProject/Binaries/Linux/ExampleProject-Shipping.sh',
      )).toBe(true);
    });

    it('still requires a Binaries folder, so a bare root binary is not a shipping build', () => {
      expect(isUnrealShippingExecutable('/home/user/Games/ExampleProject/ExampleProject-Linux-Shipping'))
        .toBe(false);
    });

    it('does not treat an unrelated trailing extension as a shipping build', () => {
      expect(isUnrealShippingExecutable(
        '/home/user/Games/ExampleProject/Binaries/Linux/ExampleProject-Linux-Shipping.debug',
      )).toBe(false);
    });

    it('groups nested Linux shipping binaries at the project directory', () => {
      expect(getUnrealShippingRootDirectory(
        '/home/user/Games/Example/ExampleProject/Binaries/Linux/ExampleProject-Linux-Shipping',
      )).toBe('/home/user/Games/Example/ExampleProject');
    });

    it('prefers a Linux shipping binary over a shallow launcher script', () => {
      const installRoot = '/home/user/Games/Example Project';
      const launcher = `${installRoot}/start.sh`;
      const shipping = `${installRoot}/ExampleProject/Binaries/Linux/ExampleProject-Linux-Shipping`;

      expect(selectBestGameExecutable([launcher, shipping], installRoot, 'Example Project'))
        .toBe(shipping);
    });

    it('matches a native binary against the title despite its architecture extension', () => {
      const installRoot = '/home/user/Games/Example Game';
      const nativeExe = `${installRoot}/Example Game.x86_64`;
      const helperExe = `${installRoot}/tools/ExampleHelper.x86_64`;

      // Only works if the extension is stripped before comparing to the title, otherwise this
      // scores as a partial match and loses its advantage over other candidates.
      expect(selectBestGameExecutable([helperExe, nativeExe], installRoot, 'Example Game'))
        .toBe(nativeExe);
    });
  });
});
