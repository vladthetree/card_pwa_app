import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // VM contexts keep file isolation without paying for a new process/worker
    // per test file. A fixed limit also recycles workers before the VM module
    // cache can grow without bounds on long watch sessions.
    pool: 'vmThreads',
    vmMemoryLimit: '512MB',
    testTimeout: 10000,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/sm2.ts', 'src/utils/fsrs.ts', 'src/db/queries.ts', 'src/services/AlgorithmMigrationService.ts'],
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
