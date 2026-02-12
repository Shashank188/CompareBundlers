import { DependencyGraph, SymbolInfo } from './types';
export declare class SourceAnalyzer {
    private projectRoot;
    private graph;
    private symbols;
    constructor(projectRoot: string);
    analyzeSource(): Promise<{
        graph: DependencyGraph;
        symbols: Map<string, SymbolInfo>;
    }>;
    private getAllTsFiles;
    private parseFile;
    markUsedSymbols(entryPoint: string): void;
}
