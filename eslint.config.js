// ESLint v9 flat config
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Node globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        NodeJS: 'readonly',
        // Web globals occasionally used
        atob: 'readonly',
        btoa: 'readonly',
        crypto: 'readonly',
        // Vitest/Jest test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Defer unused-var checking to the TS-aware rule.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Same for no-redeclare: the stock rule flags TS branded-type patterns
      // (`type Foo = ...; const Foo = ...`) that are legal in TS. TS itself
      // already catches genuine redeclarations, so we turn the rule off.
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      // The project uses `any` deliberately in several spots (API response unknowns, test doubles).
      '@typescript-eslint/no-explicit-any': 'off',
      // TS handles undeclared identifiers; ESLint's no-undef is noisy on TS types.
      'no-undef': 'off',
      // Allow empty catch blocks that intentionally swallow errors at boundaries.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Terminal/ANSI/YAML-escape sanitizers legitimately match control chars.
      'no-control-regex': 'off',
      // Escaping a char inside a regex is harmless; the rule produces false positives.
      'no-useless-escape': 'off',
    },
  },
];
