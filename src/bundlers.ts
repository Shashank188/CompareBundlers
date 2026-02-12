import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process'; // use for stdout + stderr capture (enhancement #1)
import { BundleAnalysis } from './types';

// Bundle metrics interface for enhancements (size, time, warnings/errors tracking)
export interface BundleMetrics {
  bundlePath: string;
  sizeBytes: number;
  buildTimeMs: number;
  warnings: string[];
  errors: string[];
}

export class BundlerRunner {
  constructor(private demoPath: string, private outputBase: string) {}

  async bundleWithWebpack(entry: string, outputDir: string): Promise<BundleMetrics> {
    const start = process.hrtime.bigint();
    const configPath = path.join(this.demoPath, 'webpack.config.js');
    this.createWebpackConfig(configPath, entry, outputDir);
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Capture stdout + stderr for complete warnings/errors (enhancement #1: merge outputs)
      const result = spawnSync('npx', [`webpack`, `--config`, configPath, `--mode`, `production`, `--stats`, `detailed`], {
        cwd: this.demoPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const output = (result.stdout || '') + (result.stderr || '');
      if (output.includes('warning') || output.includes('WARN')) {
        warnings.push(...output.split('\n').filter(l => l.toLowerCase().includes('warn') || l.toLowerCase().includes('error')));
      }
      const bundlePath = path.join(outputDir, 'bundle.js');
      const sizeBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
      const buildTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { bundlePath, sizeBytes, buildTimeMs, warnings, errors };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      console.error('Webpack bundling failed:', msg);
      throw error;
    }
  }

  async bundleWithVite(entry: string, outputDir: string): Promise<BundleMetrics> {
    const start = process.hrtime.bigint();
    const configPath = path.join(this.demoPath, 'vite.config.ts');
    this.createViteConfig(configPath, entry, outputDir);
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Capture stdout + stderr merge for warnings/errors (enhancement #1)
      const result = spawnSync('npx', [`vite`, `build`, `--config`, configPath, `--debug`], {
        cwd: this.demoPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const output = (result.stdout || '') + (result.stderr || '');
      if (output.includes('warning')) warnings.push(...output.split('\n').filter(l => l.toLowerCase().includes('warn') || l.toLowerCase().includes('error')));
      // Find actual bundle (Vite may name variably)
      let bundlePath = path.join(outputDir, 'bundle.js');
      if (!fs.existsSync(bundlePath)) {
        const files = fs.readdirSync(outputDir).find(f => f.endsWith('.js'));
        if (files) bundlePath = path.join(outputDir, files);
      }
      const sizeBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
      const buildTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { bundlePath, sizeBytes, buildTimeMs, warnings, errors };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      console.error('Vite bundling failed:', msg);
      throw error;
    }
  }

  async bundleWithRolldown(entry: string, outputDir: string): Promise<BundleMetrics> {
    const start = process.hrtime.bigint();
    const configPath = path.join(this.demoPath, 'rolldown.config.js');
    this.createRolldownConfig(configPath, entry, outputDir);
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Capture stdout + stderr merge (enhancement #1)
      const result = spawnSync('npx', [`rolldown`, `--config`, configPath, `--verbose`], {
        cwd: this.demoPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const output = (result.stdout || '') + (result.stderr || '');
      if (output.includes('warning')) warnings.push(...output.split('\n').filter(l => l.toLowerCase().includes('warn') || l.toLowerCase().includes('error')));
      const bundlePath = path.join(outputDir, 'bundle.js');
      const sizeBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
      const buildTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { bundlePath, sizeBytes, buildTimeMs, warnings, errors };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      console.error('Rolldown bundling failed:', msg);
      throw error;
    }
  }

  private createWebpackConfig(configPath: string, entry: string, outputDir: string) {
    const config = `
const path = require('path');
module.exports = {
  entry: './${entry}',
  output: {
    path: path.resolve(__dirname, '${path.relative(this.demoPath, outputDir)}'),
    filename: 'bundle.js',
    clean: true,
  },
  mode: 'production',
  optimization: {
    usedExports: true,
    minimize: true,
  },
  module: {
    rules: [
      {
        test: /\\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
`;
    fs.writeFileSync(configPath, config);
  }

  private createViteConfig(configPath: string, entry: string, outputDir: string) {
    const config = `
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '${path.relative(this.demoPath, outputDir)}',
    rollupOptions: {
      input: './${entry}',
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
`;
    fs.writeFileSync(configPath, config);
  }

  private createRolldownConfig(configPath: string, entry: string, outputDir: string) {
    const config = `
import { defineConfig } from 'rolldown';

export default defineConfig({
  input: './${entry}',
  output: {
    dir: '${path.relative(this.demoPath, outputDir)}',
    entryFileNames: 'bundle.js',
    format: 'esm',
    sourcemap: true,
  },
  treeshake: true,
});
`;
    fs.writeFileSync(configPath, config);
  }
}
