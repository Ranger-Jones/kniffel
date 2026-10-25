import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(import.meta.dirname, 'src'),
  // In Tests (Node, kein React-Server) ist der Import erlaubt.
  'server-only': path.resolve(import.meta.dirname, 'tests/server-only-stub.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['src/**/*.test.ts'], environment: 'node' } },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 30_000,
          setupFiles: ['tests/integration/setup-env.ts'],
        },
      },
    ],
  },
});
