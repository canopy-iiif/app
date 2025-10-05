import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const commonIgnores = [
  '**/node_modules/**',
  '**/site/**',
  '**/dist/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/playwright-report/**',
  '**/test-results/**',
  '**/tests/e2e-artifacts/**',
  '**/packages/app/ui/dist/**',
  'packages/app/ui/dist/**/*',
  'packages/app/ui/server.mjs',
  '**/tests/coverage/**',
  'tests/coverage/**/*',
];

const reactHooksFlatRecommended = reactHooksPlugin.configs['flat/recommended'];

const commonRules = {
  'react/react-in-jsx-scope': 'off',
  'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],
  'import/order': 'off',
  'import/no-unresolved': 'off',
  'react/prop-types': 'off',
  'no-empty': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  'no-useless-escape': 'off',
  quotes: 'off',
  semi: 'off',
};

export default [
  {
    ignores: commonIgnores,
    linterOptions: {
      reportUnusedDisableDirectives: 0,
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    ignores: commonIgnores,
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ...js.configs.recommended.languageOptions?.parserOptions,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    linterOptions: {
      ...(js.configs.recommended.linterOptions ?? {}),
      reportUnusedDisableDirectives: 0,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importPlugin.flatConfigs.recommended.rules,
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksFlatRecommended.rules,
      ...commonRules,
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: commonIgnores,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [new URL('../tsconfig.json', import.meta.url).pathname],
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    linterOptions: {
      ...(tseslint.configs?.recommended?.linterOptions ?? {}),
      reportUnusedDisableDirectives: 0,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksFlatRecommended.rules,
      ...commonRules,
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    files: ['tests/**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    ignores: commonIgnores,
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 0,
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 0,
    },
  },
];
