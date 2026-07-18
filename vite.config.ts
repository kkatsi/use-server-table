import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'tanstack/index': 'src/tanstack/index.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // Peer deps stay external — never bundle them.
      external: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-table'],
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
