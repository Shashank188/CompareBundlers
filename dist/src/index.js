"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeShakeSDK = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const analyzer_1 = require("./analyzer");
const bundlers_1 = require("./bundlers");
const bundleAnalyzer_1 = require("./bundleAnalyzer");
class TreeShakeSDK {
    constructor(options) {
        // Error handling: validate options (fixes test + robustness)
        if (!options || !options.demoProjectPath || !options.entryPoint || !options.outputDir) {
            throw new Error('[TreeShakeSDK] Invalid options: missing required paths/entryPoint');
        }
        if (!fs.existsSync(options.demoProjectPath)) {
            throw new Error(`[TreeShakeSDK] Demo project path not found: ${options.demoProjectPath}`);
        }
        this.options = options;
        this.sourceAnalyzer = new analyzer_1.SourceAnalyzer(options.demoProjectPath);
        this.bundlerRunner = new bundlers_1.BundlerRunner(options.demoProjectPath, options.outputDir);
        this.bundleAnalyzer = new bundleAnalyzer_1.BundleAnalyzer();
    }
    async runComparison() {
        try {
            console.log('Analyzing pre-bundle source code...');
            const { symbols } = await this.sourceAnalyzer.analyzeSource();
            this.sourceAnalyzer.markUsedSymbols(this.options.entryPoint);
            // Enhanced bundling with metrics (size/time/warnings/errors)
            console.log('Bundling with Webpack...');
            const webpackOutDir = path.join(this.options.outputDir, 'webpack');
            fs.mkdirSync(webpackOutDir, { recursive: true });
            const webpackMetrics = await this.bundlerRunner.bundleWithWebpack(this.options.entryPoint, webpackOutDir);
            console.log('Bundling with Vite...');
            const viteOutDir = path.join(this.options.outputDir, 'vite');
            fs.mkdirSync(viteOutDir, { recursive: true });
            const viteMetrics = await this.bundlerRunner.bundleWithVite(this.options.entryPoint, viteOutDir);
            console.log('Bundling with Rolldown...');
            const rolldownOutDir = path.join(this.options.outputDir, 'rolldown');
            fs.mkdirSync(rolldownOutDir, { recursive: true });
            const rolldownMetrics = await this.bundlerRunner.bundleWithRolldown(this.options.entryPoint, rolldownOutDir);
            // Analyze each with metrics
            console.log('Analyzing bundles...');
            const analyses = [];
            const webpackAnalysis = await this.bundleAnalyzer.analyzeBundle(webpackMetrics.bundlePath, symbols, 'webpack', this.options.demoProjectPath);
            analyses.push({ ...webpackAnalysis, bundleSizeBytes: webpackMetrics.sizeBytes, buildTimeMs: webpackMetrics.buildTimeMs, warnings: webpackMetrics.warnings, errors: webpackMetrics.errors });
            // For Vite, use metrics path
            const viteActualBundle = viteMetrics.bundlePath;
            const viteAnalysis = await this.bundleAnalyzer.analyzeBundle(viteActualBundle, symbols, 'vite', this.options.demoProjectPath);
            analyses.push({ ...viteAnalysis, bundleSizeBytes: viteMetrics.sizeBytes, buildTimeMs: viteMetrics.buildTimeMs, warnings: viteMetrics.warnings, errors: viteMetrics.errors });
            const rolldownAnalysis = await this.bundleAnalyzer.analyzeBundle(rolldownMetrics.bundlePath, symbols, 'rolldown', this.options.demoProjectPath);
            analyses.push({ ...rolldownAnalysis, bundleSizeBytes: rolldownMetrics.sizeBytes, buildTimeMs: rolldownMetrics.buildTimeMs, warnings: rolldownMetrics.warnings, errors: rolldownMetrics.errors });
            // Enhanced summary with aggregates
            const report = {
                projectName: 'demo-tree-shake-project',
                analyses,
                summary: {
                    bestTreeShaker: this.findBestTreeShaker(analyses),
                    totalEliminated: analyses.reduce((sum, a) => sum + a.eliminatedSymbols, 0),
                    comparison: this.generateComparison(analyses),
                    // New enhancements
                    totalBundleSizeBytes: analyses.reduce((sum, a) => sum + a.bundleSizeBytes, 0),
                    avgBuildTimeMs: analyses.reduce((sum, a) => sum + a.buildTimeMs, 0) / analyses.length,
                    totalWarnings: analyses.reduce((sum, a) => sum + a.warnings.length, 0),
                    totalErrors: analyses.reduce((sum, a) => sum + a.errors.length, 0)
                }
            };
            return report;
        }
        catch (err) {
            // Fail process with code 1 on any bundler/error (per task)
            console.error('[TreeShakeSDK] Fatal error during comparison (exiting 1):', err);
            process.exit(1);
        }
    }
    findBestTreeShaker(analyses) {
        const maxElim = Math.max(...analyses.map(a => a.eliminatedSymbols));
        const best = analyses.find(a => a.eliminatedSymbols === maxElim);
        return best ? best.bundler : 'unknown';
    }
    generateComparison(analyses) {
        const comp = {};
        analyses.forEach(a => {
            comp[a.bundler] = a.eliminatedSymbols;
        });
        return comp;
    }
    // Optional runtime validation
    async validateRetention(bundlePath, symbols) {
        // Simple: run the bundle and see console or something, but lightweight
        console.log('Runtime validation skipped for demo (can exec node bundle)');
        return symbols.map(() => true);
    }
}
exports.TreeShakeSDK = TreeShakeSDK;
//# sourceMappingURL=index.js.map