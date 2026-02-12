export declare class BundlerRunner {
    private demoPath;
    private outputBase;
    constructor(demoPath: string, outputBase: string);
    bundleWithWebpack(entry: string, outputDir: string): Promise<string>;
    bundleWithVite(entry: string, outputDir: string): Promise<string>;
    bundleWithRolldown(entry: string, outputDir: string): Promise<string>;
    private createWebpackConfig;
    private createViteConfig;
    private createRolldownConfig;
}
