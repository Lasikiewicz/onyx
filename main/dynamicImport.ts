/**
 * Helper to perform dynamic imports that won't be transpiled to require() by TSC.
 * This is necessary for loading ESM modules in a CommonJS environment.
 */
export async function dynamicImport<T>(moduleName: string): Promise<T> {
    // Use new Function to hide import() from TSC
    const importer = new Function('m', 'return import(m)');
    return importer(moduleName);
}
