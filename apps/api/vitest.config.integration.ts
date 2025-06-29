import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/*.e2e.test.ts',
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
    setupFiles: ['src/test/integration-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
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