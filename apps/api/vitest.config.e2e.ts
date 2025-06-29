import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    environment: 'node',
    include: ['src/**/*.e2e.test.ts', 'tests/e2e/**/*.test.ts'],
    exclude: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/*.integration.test.ts',
      'node_modules/**/*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: [
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/mocks/**'
      ]
    },
    globals: true,
    setupFiles: ['src/test/e2e-setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './src/test')
    }
  }
});