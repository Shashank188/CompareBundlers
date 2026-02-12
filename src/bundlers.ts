import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { BundleAnalysis } from './types';

export class BundlerRunner {
  constructor(private demoPath: string, private outputBase: string) {}

  async bundleWithWebpack(entry: string, outputDir: string): Promise<string> {
    const configPath = path.join(this.demoPath, 'webpack.config.js');
    this.createWebpackConfig(configPath, entry, outputDir);
    
    try {
      execSync(`npx webpack --config ${configPath} --mode production`, { stdio: 'inherit', cwd: this.demoPath });
      return path.join(outputDir, 'bundle.js');
    } catch (error) {
      console.error('Webpack bundling failed:', error);
      throw error;
    }
  }

  async bundleWithVite(entry: string, outputDir: string): Promise<string> {
    const configPath = path.join(this.demoPath, 'vite.config.ts');
    this.createViteConfig(configPath, entry, outputDir);
    
    try {
      execSync(`npx vite build --config ${configPath}`, { stdio: 'inherit', cwd: this.demoPath });
      return path.join(outputDir, 'assets', 'index-*.js'); // approximate
    } catch (error) {
      console.error('Vite bundling failed:', error);
      throw error;
    }
  }

  async bundleWithRolldown(entry: string, outputDir: string): Promise<string> {
    const configPath = path.join(this.demoPath, 'rolldown.config.js');
    this.createRolldownConfig(configPath, entry, outputDir);
    
    try {
      execSync(`npx rolldown --config ${configPath}`, { stdio: 'inherit', cwd: this.demoPath });
      return path.join(outputDir, 'bundle.js');
    } catch (error) {
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
