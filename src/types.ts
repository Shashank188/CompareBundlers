export interface SymbolInfo {
  name: string;
  module: string;
  isUsed: boolean;
  isExported: boolean;
  retentionReason?: string;
}

export interface DependencyGraph {
  // exports key removed (was unused; cleanup for issue #2)
  modules: Map<string, Set<string>>;
  imports: Map<string, Map<string, string>>;
}

export interface BundleAnalysis {
  bundler: string;
  retainedSymbols: SymbolInfo[];
  eliminatedSymbols: number;
  retainedUnused: number;
  totalExports: number;
  reasons: Record<string, string>;
  // Enhancements (per task): bundle metrics + warning/error tracking
  bundleSizeBytes: number;
  buildTimeMs: number;
  warnings: string[];
  errors: string[];
}

export interface ComparisonReport {
  projectName: string;
  analyses: BundleAnalysis[];
  summary: {
    bestTreeShaker: string;
    totalEliminated: number;
    comparison: Record<string, number>;
    // Enhancements: aggregate bundle metrics
    totalBundleSizeBytes: number;
    avgBuildTimeMs: number;
    totalWarnings: number;
    totalErrors: number;
  };
}

export interface TreeShakeSDKOptions {
  demoProjectPath: string;
  entryPoint: string;
  outputDir: string;
  production: boolean;
}
