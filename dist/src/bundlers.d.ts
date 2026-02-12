export interface BundleMetrics {
    bundlePath: string;
    sizeBytes: number;
    buildTimeMs: number;
    warnings: string[];
    errors: string[];
}
export declare class BundlerRunner {
    private demoPath;
    private outputBase;
    constructor(demoPath: string, outputBase: string);
    bundleWithWebpack(entry: string, outputDir: string): Promise<BundleMetrics>;
    bundleWithVite(entry: string, outputDir: string): Promise<BundleMetrics>;
    bundleWithRolldown(entry: string, outputDir: string): Promise<BundleMetrics>;
    private createWebpackConfig;
    private createViteConfig;
    private createRolldownConfig;
}
