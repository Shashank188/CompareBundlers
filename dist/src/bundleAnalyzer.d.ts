import { BundleAnalysis, SymbolInfo } from './types';
export declare class BundleAnalyzer {
    /**
     * Enhanced with comprehensive error handling (per task requirement):
     * - Input validation for paths/symbols.
     * - Try/catch around all FS reads, JSON parse, Babel parse/traverse, SourceMapConsumer.
     * - Specific error messages; graceful fallbacks where possible (e.g., no map).
     * - Ensures robustness for post-bundle analysis even on corrupt bundles.
     */
    analyzeBundle(bundlePath: string, originalSymbols: Map<string, SymbolInfo>, bundlerName: string, sourceRoot: string): Promise<BundleAnalysis>;
    private isSymbolRetained;
    private getRetentionReason;
}
