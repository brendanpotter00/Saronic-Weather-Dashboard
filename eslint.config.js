import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore build output and sibling git worktrees under .claude/ (each carries its own tsconfig,
  // which otherwise trips typescript-eslint's "multiple candidate TSConfigRootDirs").
  globalIgnores(['dist', 'coverage', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      // Pin the project root so sibling-worktree tsconfigs can't make root detection ambiguous.
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
