
import { defineConfig } from 'rolldown';

export default defineConfig({
  input: './index.ts',
  output: {
    dir: '../dist/rolldown',
    entryFileNames: 'bundle.js',
    format: 'esm',
    sourcemap: true,
  },
  treeshake: true,
});
