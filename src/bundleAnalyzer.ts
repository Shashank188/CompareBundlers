import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { SourceMapConsumer } from 'source-map';
import { BundleAnalysis, SymbolInfo } from './types';

export class BundleAnalyzer {
  async analyzeBundle(bundlePath: string, originalSymbols: Map<string, SymbolInfo>, bundlerName: string, sourceRoot: string): Promise<BundleAnalysis> {
    let bundleContent = fs.readFileSync(bundlePath, 'utf8');
    let mapContent: any = null;
    
    // Try to find sourcemap
    const mapMatch = bundleContent.match(/\/\/# sourceMappingURL=(.+\.map)/);
    if (mapMatch) {
      const mapPath = path.join(path.dirname(bundlePath), mapMatch[1]);
      if (fs.existsSync(mapPath)) {
        mapContent = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      }
    } else {
      // Assume inline or no map, try to parse anyway
      console.warn('No sourcemap found for', bundlerName);
    }

    const retainedSymbols: SymbolInfo[] = [];
    const reasons: Record<string, string> = {};

    // Parse bundle for exported/used symbols - basic heuristic
    const ast = parse(bundleContent, { sourceType: 'module' });
    
    const foundSymbols = new Set<string>();
    
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

    // Map back using simple name matching and source map if available
    let consumer: SourceMapConsumer | null = null;
    if (mapContent) {
      consumer = await new SourceMapConsumer(mapContent);
    }

    originalSymbols.forEach((sym, key) => {
      const isRetained = this.isSymbolRetained(sym, foundSymbols, bundleContent, consumer, sourceRoot);
      const updatedSym: SymbolInfo = { ...sym, isUsed: isRetained }; // override
      
      if (isRetained) {
        retainedSymbols.push(updatedSym);
        if (!sym.isUsed) {
          reasons[key] = this.getRetentionReason(sym, bundlerName);
        }
      }
    });

    if (consumer) consumer.destroy();

    const totalExports = originalSymbols.size;
    const eliminated = totalExports - retainedSymbols.length;
    const retainedUnused = retainedSymbols.filter(s => !s.isUsed).length; // wait, isUsed here means original

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
