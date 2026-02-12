import { BundleAnalysis, SymbolInfo } from './types';
export declare class BundleAnalyzer {
    analyzeBundle(bundlePath: string, originalSymbols: Map<string, SymbolInfo>, bundlerName: string, sourceRoot: string): Promise<BundleAnalysis>;
    private isSymbolRetained;
    private getRetentionReason;
}
