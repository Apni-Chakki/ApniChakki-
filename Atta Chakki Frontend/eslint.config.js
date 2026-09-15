import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Warn (never error) when a file gets too long — target per .claude/rules/code-quality.md
      // Refactor plan: CODE_QUALITY_AUDIT.md Phase 3 addresses existing offenders.
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      // Prefer `const` unless a reassignment happens.
      'prefer-const': 'warn',
      // Enforce triple-equals; avoids the JS coercion footguns.
      'eqeqeq': ['warn', 'always'],
      // Discourage `var`.
      'no-var': 'warn',
    },
  },
  {
    // Data-only files that legitimately need to be long (translation tables etc.)
    files: ['**/utils/translations.js', '**/utils/lahoreLocations.js'],
    rules: {
      'max-lines': 'off',
    },
  },
])
