export interface SymbolInfo {
  name: string;
  module: string;
  isUsed: boolean;
  isExported: boolean;
  retentionReason?: string;
}

export interface DependencyGraph {
  modules: Map<string, Set<string>>;
  exports: Map<string, Set<string>>;
  imports: Map<string, Map<string, string>>;
}

export interface BundleAnalysis {
  bundler: string;
  retainedSymbols: SymbolInfo[];
  eliminatedSymbols: number;
  retainedUnused: number;
  totalExports: number;
  reasons: Record<string, string>;
}

export interface ComparisonReport {
  projectName: string;
  analyses: BundleAnalysis[];
  summary: {
    bestTreeShaker: string;
    totalEliminated: number;
    comparison: Record<string, number>;
  };
}

export interface TreeShakeSDKOptions {
  demoProjectPath: string;
  entryPoint: string;
  outputDir: string;
  production: boolean;
}
