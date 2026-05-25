import { defineConfig, mergeConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

// Test config is kept separate from vite.config.ts: build and test change for
// different reasons. Vitest ignores vite.config.ts when this file exists, so we
// mergeConfig() to keep the React plugin (JSX transform) applied to test files.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom', // component tests need a DOM
      globals: true, // describe/it/expect without imports; enables jest-dom matchers
      setupFiles: ['./src/test/setup.ts'],
      // Don't run the duplicate test suites inside sibling git worktrees (separate checkouts
      // under .claude/) — they inflate the run and aren't this branch's code.
      exclude: [...configDefaults.exclude, '.claude/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        // Count every source file, not just ones a test imported — otherwise an
        // entirely untested file is invisible and the 90% number lies.
        all: true,
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/main.tsx', // ReactDOM bootstrap; nothing to unit-test
          'src/**/*.d.ts',
          'src/model.ts', // type-only domain model, emits no runtime JS
          'src/forecast/responseTypes.ts', // type-only raw API shapes
          'src/test/**', // the setup file itself
        ],
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  }),
);
