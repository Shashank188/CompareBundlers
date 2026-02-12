import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import { DependencyGraph, SymbolInfo } from './types';

export class SourceAnalyzer {
  private graph: DependencyGraph = {
    modules: new Map(),
    exports: new Map(),
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
        files.push(fullPath);
      }
    }
    return files;
  }

  private async parseFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.projectRoot, filePath).replace(/\.ts$/, '');
    
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['typescript']
    });

    const moduleExports = new Set<string>();
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
          if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
            moduleImports.set(spec.local.name, source);
          } else if (t.isImportDefaultSpecifier(spec)) {
            moduleImports.set(spec.local.name, source);
          }
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
  markUsedSymbols(entryPoint: string) {
    // Basic traversal from entry, mark imported symbols as used
    const visited = new Set<string>();
    const queue = [entryPoint.replace(/\.ts$/, '')];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const imports = this.graph.imports.get(current) || new Map();
      imports.forEach((source, local) => {
        const sourceMod = source.startsWith('./') ? path.join(path.dirname(current), source).replace(/^\.\//, '') : source;
        const symKey = `${sourceMod}:${local}`;
        const sym = this.symbols.get(symKey);
        if (sym) {
          sym.isUsed = true;
        }
        queue.push(sourceMod);
      });
    }
  }
}
