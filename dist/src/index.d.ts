import { TreeShakeSDKOptions, ComparisonReport, SymbolInfo } from './types';
export declare class TreeShakeSDK {
    private options;
    private sourceAnalyzer;
    private bundlerRunner;
    private bundleAnalyzer;
    constructor(options: TreeShakeSDKOptions);
    runComparison(): Promise<ComparisonReport>;
    private findBestTreeShaker;
    private generateComparison;
    validateRetention(bundlePath: string, symbols: SymbolInfo[]): Promise<boolean[]>;
}
