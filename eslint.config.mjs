import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'node_modules/**',
      'build/**',
      'website/dist/**',
      'package-lock.json',
      'scripts/**',
      'resources/**',
    ],
  },
  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-duplicates': 'error',
      'no-dupe-else-if': 'error',
    },
  },
  {
    files: ['main/**/*.ts', 'renderer/**/*.{ts,tsx}', 'vite.config.mts', 'vitest.config.mts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    rules: {
      'import/no-duplicates': 'error',
      'no-dupe-else-if': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['renderer/**/*.{ts,tsx,mts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: [
      'renderer/src/App.tsx',
      'renderer/src/components/GameManager.tsx',
      'renderer/src/components/OnyxSettingsModal.tsx',
      'main/ImportService.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'renderer/tests/**/*.tsx', 'vitest.setup.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'import/no-duplicates': 'off',
      'no-dupe-else-if': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
