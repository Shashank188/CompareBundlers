import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { SourceMapConsumer } from 'source-map';
import { BundleAnalysis, SymbolInfo } from './types';

export class BundleAnalyzer {
  /**
   * Enhanced with comprehensive error handling (per task requirement):
   * - Input validation for paths/symbols.
   * - Try/catch around all FS reads, JSON parse, Babel parse/traverse, SourceMapConsumer.
   * - Specific error messages; graceful fallbacks where possible (e.g., no map).
   * - Ensures robustness for post-bundle analysis even on corrupt bundles.
   */
  async analyzeBundle(bundlePath: string, originalSymbols: Map<string, SymbolInfo>, bundlerName: string, sourceRoot: string): Promise<BundleAnalysis> {
    // Input validation
    if (!bundlePath || typeof bundlePath !== 'string') {
      throw new Error(`[BundleAnalyzer] Invalid bundlePath: ${bundlePath}`);
    }
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`[BundleAnalyzer] Bundle file not found: ${bundlePath}`);
    }
    if (!originalSymbols || !(originalSymbols instanceof Map) || originalSymbols.size === 0) {
      throw new Error(`[BundleAnalyzer] Invalid or empty originalSymbols for ${bundlerName}`);
    }
    if (!bundlerName || !sourceRoot) {
      throw new Error('[BundleAnalyzer] Missing required params: bundlerName or sourceRoot');
    }

    let bundleContent: string;
    let mapContent: any = null;
    let consumer: SourceMapConsumer | null = null;

    try {
      bundleContent = fs.readFileSync(bundlePath, 'utf8');
    } catch (err: any) {
      throw new Error(`[BundleAnalyzer] Failed to read bundle at ${bundlePath}: ${err.message}`);
    }

    // Try to find sourcemap (wrapped)
    try {
      const mapMatch = bundleContent.match(/\/\/# sourceMappingURL=(.+\.map)/);
      if (mapMatch) {
        const mapPath = path.join(path.dirname(bundlePath), mapMatch[1]);
        if (fs.existsSync(mapPath)) {
          const mapStr = fs.readFileSync(mapPath, 'utf8');
          mapContent = JSON.parse(mapStr);
        }
      } else {
        console.warn(`[BundleAnalyzer] No sourcemap found for ${bundlerName}`);
      }
    } catch (err: any) {
      console.warn(`[BundleAnalyzer] Sourcemap processing failed for ${bundlerName} (continuing): ${err.message}`);
    }

    const retainedSymbols: SymbolInfo[] = [];
    const reasons: Record<string, string> = {};

    // AST parse with error handling
    let ast: any;
    try {
      ast = parse(bundleContent, { sourceType: 'module' });
    } catch (err: any) {
      throw new Error(`[BundleAnalyzer] Babel parse failed for ${bundlerName} bundle: ${err.message}`);
    }
    
    const foundSymbols = new Set<string>();
    
    try {
      traverse(ast, {
        Identifier(path) {
          if (path.node.name && !path.scope.hasBinding(path.node.name)) { // rough
            foundSymbols.add(path.node.name);
          }
        },
        ExportNamedDeclaration(path) {
          if (path.node.specifiers) {
            path.node.specifiers.forEach(spec => {
              if (t.isIdentifier(spec.exported)) {
                foundSymbols.add(spec.exported.name);
              }
            });
          }
        }
      });
    } catch (err: any) {
      console.warn(`[BundleAnalyzer] AST traversal error (partial results): ${err.message}`);
    }

    // Source map consumer
    try {
      if (mapContent) {
        consumer = await new SourceMapConsumer(mapContent);
      }
    } catch (err: any) {
      console.warn(`[BundleAnalyzer] SourceMapConsumer failed: ${err.message}`);
      consumer = null;
    }

    // Symbol processing
    try {
      originalSymbols.forEach((sym, key) => {
        const isRetained = this.isSymbolRetained(sym, foundSymbols, bundleContent, consumer, sourceRoot);
        // FIXED: Preserve original sym.isUsed...
        const updatedSym: SymbolInfo = { ...sym }; // keep original isUsed
        
        if (isRetained) {
          retainedSymbols.push(updatedSym);
          if (!sym.isUsed) {
            reasons[key] = this.getRetentionReason(sym, bundlerName);
          }
        }
      });
    } catch (err: any) {
      throw new Error(`[BundleAnalyzer] Symbol analysis failed for ${bundlerName}: ${err.message}`);
    } finally {
      if (consumer) {
        try {
          consumer.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    }

    const totalExports = originalSymbols.size;
    const eliminated = totalExports - retainedSymbols.length;
    // retainedUnused now correctly computes...
    const retainedUnused = retainedSymbols.filter(s => !s.isUsed).length;

    return {
      bundler: bundlerName,
      retainedSymbols,
      eliminatedSymbols: eliminated,
      retainedUnused: retainedUnused,
      totalExports: totalExports,
      reasons
    };
  }

  private isSymbolRetained(sym: SymbolInfo, foundSymbols: Set<string>, bundleContent: string, consumer: SourceMapConsumer | null, sourceRoot: string): boolean {
    // Check if name appears in bundle
    if (foundSymbols.has(sym.name)) {
      return true;
    }
    
    // Check for mangled or inlined
    if (bundleContent.includes(sym.name)) {
      return true;
    }
    
    // Source map check - if original position present
    if (consumer) {
      // Rough: search for original file references
      if (bundleContent.includes(sym.module)) {
        return true; // conservative
      }
    }
    
    // For side effects, assume retained
    if (sym.module.includes('side-effects')) {
      return true;
    }
    
    return false;
  }

  private getRetentionReason(sym: SymbolInfo, bundler: string): string {
    if (sym.module.includes('side-effects')) {
      return 'Side effects in module prevent full elimination';
    }
    if (bundler === 'webpack') {
      return 'Webpack conservative tree shaking due to export analysis';
    } else if (bundler === 'vite') {
      return 'Rollup tree shaking with sideEffect flag consideration';
    } else {
      return 'Rolldown specific retention (new bundler behavior)';
    }
  }
}
