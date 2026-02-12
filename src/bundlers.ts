import * as fs from 'fs';
import * as path from 'path';
import { execSync, ExecSyncOptions } from 'child_process';
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
      // Capture output for warnings/errors tracking (enhancement)
      const stdout = execSync(`npx webpack --config ${configPath} --mode production --stats detailed`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.demoPath,
        encoding: 'utf8'
      });
      if (stdout.includes('warning') || stdout.includes('WARN')) warnings.push(...stdout.split('\n').filter(l => l.toLowerCase().includes('warn')));
      const bundlePath = path.join(outputDir, 'bundle.js');
      const sizeBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
      const buildTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { bundlePath, sizeBytes, buildTimeMs, warnings, errors };
    } catch (error: any) {
      errors.push(error.message || String(error));
      console.error('Webpack bundling failed:', error);
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
      // Capture output for tracking (enhancement #3)
      const stdout = execSync(`npx vite build --config ${configPath} --debug`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.demoPath,
        encoding: 'utf8'
      });
      if (stdout.includes('warning')) warnings.push(...stdout.split('\n').filter(l => l.toLowerCase().includes('warn')));
      // Find actual bundle (Vite may name variably)
      let bundlePath = path.join(outputDir, 'bundle.js');
      if (!fs.existsSync(bundlePath)) {
        const files = fs.readdirSync(outputDir).find(f => f.endsWith('.js'));
        if (files) bundlePath = path.join(outputDir, files);
      }
      const sizeBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
      const buildTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { bundlePath, sizeBytes, buildTimeMs, warnings, errors };
    } catch (error: any) {
      errors.push(error.message || String(error));
      console.error('Vite bundling failed:', error);
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
      const stdout = execSync(`npx rolldown --config ${configPath} --verbose`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.demoPath,
        encoding: 'utf8'
      });
      if (stdout.includes('warning')) warnings.push(...stdout.split('\n').filter(l => l.toLowerCase().includes('warn')));
      const bundlePath = path.join(outputDir, 'bundle.js');
      const sizeBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
      const buildTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { bundlePath, sizeBytes, buildTimeMs, warnings, errors };
    } catch (error: any) {
      errors.push(error.message || String(error));
      console.error('Rolldown bundling failed:', error);
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
