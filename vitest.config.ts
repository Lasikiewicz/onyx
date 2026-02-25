import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['main/**/*.{test,spec}.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './main'),
        },
    },
});
