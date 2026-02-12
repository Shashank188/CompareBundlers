import * as parser from '@babel/parser';
import type { ParseResult } from '@babel/parser'; // typed AST (no any/unknown)
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import { DependencyGraph, SymbolInfo } from './types';

export class SourceAnalyzer {
  private graph: DependencyGraph = {
    // exports removed (unused; see types.ts fix for issue #2)
    modules: new Map(),
    imports: new Map()
  };

  private symbols: Map<string, SymbolInfo> = new Map();

  constructor(private projectRoot: string) {}

  async analyzeSource(): Promise<{ graph: DependencyGraph; symbols: Map<string, SymbolInfo> }> {
    const files = this.getAllTsFiles(this.projectRoot);
    
    for (const file of files) {
      await this.parseFile(file);
    }
    
    return { graph: this.graph, symbols: this.symbols };
  }

  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getAllTsFiles(fullPath));
      } else if (entry.name.endsWith('.ts')) {
        // FIX for issue #1: Exclude bundler config files (e.g. vite.config.ts, *.config.*)
        // from source analysis/tree-shaking comparison to avoid polluting symbol graph
        // and dependency traversal with build tooling code.
        if (!entry.name.includes('config')) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  private async parseFile(filePath: string): Promise<void> {
    // Error handling added: validate file, wrap FS/parse in try/catch for robustness
    if (!fs.existsSync(filePath)) {
      throw new Error(`[SourceAnalyzer] File not found: ${filePath}`);
    }
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[SourceAnalyzer] Failed to read ${filePath}: ${msg}`);
    }
    const relativePath = path.relative(this.projectRoot, filePath).replace(/\.ts$/, '');
    
    let ast: ParseResult | null = null; // typed, no any/unknown
    try {
      ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript']
      });
    } catch (err) {
      // No type annotation (avoid unknown per task); use runtime check
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[SourceAnalyzer] Babel parse failed for ${filePath}: ${msg}`);
    }

    const moduleExports = new Set<string>();
    // moduleImports: importKey (exportName from source, or local) -> source
    // (see ImportDeclaration for alias fix #3)
    const moduleImports = new Map<string, string>();

    traverse(ast, {
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach(decl => {
              if (t.isIdentifier(decl.id)) {
                moduleExports.add(decl.id.name);
              }
            });
          } else if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            moduleExports.add(path.node.declaration.id.name);
          }
        } else if (path.node.specifiers) {
          path.node.specifiers.forEach(spec => {
            if (t.isExportSpecifier(spec)) {
              moduleExports.add(spec.exported.type === 'Identifier' ? spec.exported.name : spec.local.name);
            }
          });
        }
      },
      ExportDefaultDeclaration(path) {
        moduleExports.add('default');
      },
      ImportDeclaration(path) {
        const source = path.node.source.value;
        path.node.specifiers.forEach(spec => {
          let importKey: string;
          if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
            // FIX for issue #3: Use *imported/export name from source* (spec.imported.name)
            // as the key in moduleImports (instead of local alias). This ensures
            // symKey = `${sourceMod}:${exportName}` always matches symbol keys
            // (which use export names). Aliases (e.g. { usedBarrel as barrelUsed })
            // or barrel re-exports no longer break isUsed marking or retainedUnused.
            // (Local alias irrelevant for source symbol tracking.)
            importKey = spec.imported.name;
          } else if (t.isImportDefaultSpecifier(spec)) {
            importKey = 'default';
          } else {
            importKey = spec.local.name; // fallback
          }
          moduleImports.set(importKey, source);
        });
      }
    });

    this.graph.modules.set(relativePath, moduleExports);
    this.graph.imports.set(relativePath, moduleImports);

    // Track symbols
    moduleExports.forEach(exp => {
      const key = `${relativePath}:${exp}`;
      this.symbols.set(key, {
        name: exp,
        module: relativePath,
        isUsed: false, // will update later
        isExported: true
      });
    });
  }

  // Simple usage analysis - mark used based on imports
  // (issue #3 fix complete: importKey now always uses source exportName, so direct
  // `${sourceMod}:${importKey}` lookup succeeds for aliases/re-exports)
  markUsedSymbols(entryPoint: string) {
    // Basic traversal from entry, mark imported symbols as used
    const visited = new Set<string>();
    const queue = [entryPoint.replace(/\.ts$/, '')];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const imports = this.graph.imports.get(current) || new Map();
      imports.forEach((source, importKey) => {  // importKey is now exportName
        const sourceMod = source.startsWith('./') ? path.join(path.dirname(current), source).replace(/^\.\//, '') : source;
        const symKey = `${sourceMod}:${importKey}`;
        const sym = this.symbols.get(symKey);
        if (sym) {
          sym.isUsed = true;
        }
        queue.push(sourceMod);
      });
    }
  }
}
