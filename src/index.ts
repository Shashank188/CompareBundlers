import * as fs from 'fs';
import * as path from 'path';
import { TreeShakeSDKOptions, ComparisonReport, BundleAnalysis, SymbolInfo } from './types';
import { SourceAnalyzer } from './analyzer';
import { BundlerRunner } from './bundlers';
import { BundleAnalyzer } from './bundleAnalyzer';

export class TreeShakeSDK {
  private options: TreeShakeSDKOptions;
  private sourceAnalyzer: SourceAnalyzer;
  private bundlerRunner: BundlerRunner;
  private bundleAnalyzer: BundleAnalyzer;

  constructor(options: TreeShakeSDKOptions) {
    // Error handling: validate options (fixes test + robustness)
    if (!options || !options.demoProjectPath || !options.entryPoint || !options.outputDir) {
      throw new Error('[TreeShakeSDK] Invalid options: missing required paths/entryPoint');
    }
    if (!fs.existsSync(options.demoProjectPath)) {
      throw new Error(`[TreeShakeSDK] Demo project path not found: ${options.demoProjectPath}`);
    }
    this.options = options;
    this.sourceAnalyzer = new SourceAnalyzer(options.demoProjectPath);
    this.bundlerRunner = new BundlerRunner(options.demoProjectPath, options.outputDir);
    this.bundleAnalyzer = new BundleAnalyzer();
  }

  async runComparison(): Promise<ComparisonReport> {
    console.log('Analyzing pre-bundle source code...');
    const { symbols } = await this.sourceAnalyzer.analyzeSource();
    this.sourceAnalyzer.markUsedSymbols(this.options.entryPoint);

    console.log('Bundling with Webpack...');
    const webpackOutDir = path.join(this.options.outputDir, 'webpack');
    fs.mkdirSync(webpackOutDir, { recursive: true });
    const webpackBundle = await this.bundlerRunner.bundleWithWebpack(this.options.entryPoint, webpackOutDir);

    console.log('Bundling with Vite...');
    const viteOutDir = path.join(this.options.outputDir, 'vite');
    fs.mkdirSync(viteOutDir, { recursive: true });
    const viteBundle = await this.bundlerRunner.bundleWithVite(this.options.entryPoint, viteOutDir);

    console.log('Bundling with Rolldown...');
    const rolldownOutDir = path.join(this.options.outputDir, 'rolldown');
    fs.mkdirSync(rolldownOutDir, { recursive: true });
    const rolldownBundle = await this.bundlerRunner.bundleWithRolldown(this.options.entryPoint, rolldownOutDir);

    // Analyze each
    console.log('Analyzing bundles...');
    const analyses: BundleAnalysis[] = [];
    
    const webpackAnalysis = await this.bundleAnalyzer.analyzeBundle(webpackBundle, symbols, 'webpack', this.options.demoProjectPath);
    analyses.push(webpackAnalysis);
    
    // For Vite, find the actual bundle file
    let viteActualBundle = path.join(viteOutDir, 'bundle.js');
    if (!fs.existsSync(viteActualBundle)) {
      // Find any js file
      const files = fs.readdirSync(viteOutDir);
      const jsFile = files.find(f => f.endsWith('.js'));
      if (jsFile) viteActualBundle = path.join(viteOutDir, jsFile);
    }
    const viteAnalysis = await this.bundleAnalyzer.analyzeBundle(viteActualBundle, symbols, 'vite', this.options.demoProjectPath);
    analyses.push(viteAnalysis);
    
    const rolldownAnalysis = await this.bundleAnalyzer.analyzeBundle(rolldownBundle, symbols, 'rolldown', this.options.demoProjectPath);
    analyses.push(rolldownAnalysis);

    const report: ComparisonReport = {
      projectName: 'demo-tree-shake-project',
      analyses,
      summary: {
        bestTreeShaker: this.findBestTreeShaker(analyses),
        totalEliminated: analyses.reduce((sum, a) => sum + a.eliminatedSymbols, 0),
        comparison: this.generateComparison(analyses)
      }
    };

    return report;
  }

  private findBestTreeShaker(analyses: BundleAnalysis[]): string {
    const maxElim = Math.max(...analyses.map(a => a.eliminatedSymbols));
    const best = analyses.find(a => a.eliminatedSymbols === maxElim);
    return best ? best.bundler : 'unknown';
  }

  private generateComparison(analyses: BundleAnalysis[]): Record<string, number> {
    const comp: Record<string, number> = {};
    analyses.forEach(a => {
      comp[a.bundler] = a.eliminatedSymbols;
    });
    return comp;
  }

  // Optional runtime validation
  async validateRetention(bundlePath: string, symbols: SymbolInfo[]): Promise<boolean[]> {
    // Simple: run the bundle and see console or something, but lightweight
    console.log('Runtime validation skipped for demo (can exec node bundle)');
    return symbols.map(() => true);
  }
}
