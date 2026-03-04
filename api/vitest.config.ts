import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    pool: 'threads',
    // Reusing the worker context avoids repeated Nest/bootstrap imports across files.
    isolate: false,
    // Keep file execution deterministic now that shared module state removes the import bottleneck.
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/modules/auth/auth.controller.ts',
        'src/modules/auth/authenticated-user.guard.ts',
        'src/modules/auth/permissions.guard.ts',
        'src/modules/tickets/tickets.controller.ts',
        'src/modules/monitoring/monitoring.controller.ts',
        'src/common/http/pagination.ts',
        'src/common/request-id.ts',
      ],
      exclude: ['src/tests/**'],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 75,
        lines: 75,
      },
    },
  },
});

