import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore build output and sibling git worktrees: each worktree under .claude/ carries its own
  // tsconfig, which otherwise makes typescript-eslint see "multiple candidate TSConfigRootDirs"
  // and error out on every file.
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
      // Pin the project root to this config's directory so root auto-detection can't be made
      // ambiguous by tsconfigs in sibling worktrees.
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
