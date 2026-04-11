import { config } from 'dotenv';
config({ path: ['.env.test.local', '.env.local', '.env'] });
import { defineConfig } from 'vitest/config';

const isLiveMode = process.env.USE_LIVE_API === '1';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: isLiveMode ? 15_000 : 5_000,
    hookTimeout: isLiveMode ? 15_000 : 10_000,
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
    server: {
      deps: {
        inline: ['absmartly-api-mocks'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/',
      ],
    },
  },
});
