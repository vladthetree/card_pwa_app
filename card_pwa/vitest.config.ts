import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
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
