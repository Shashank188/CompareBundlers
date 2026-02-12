
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../dist/vite',
    rollupOptions: {
      input: './index.ts',
      output: {
        entryFileNames: 'bundle.js',
      },
    },
    minify: true,
    sourcemap: true,
  },
  esbuild: {
    treeShaking: true,
  },
});
