"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceAnalyzer = void 0;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SourceAnalyzer {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.graph = {
            modules: new Map(),
            exports: new Map(),
            imports: new Map()
        };
        this.symbols = new Map();
    }
    async analyzeSource() {
        const files = this.getAllTsFiles(this.projectRoot);
        for (const file of files) {
            await this.parseFile(file);
        }
        return { graph: this.graph, symbols: this.symbols };
    }
    getAllTsFiles(dir) {
        const files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.getAllTsFiles(fullPath));
            }
            else if (entry.name.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
        return files;
    }
    async parseFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectRoot, filePath).replace(/\.ts$/, '');
        const ast = parser.parse(content, {
            sourceType: 'module',
            plugins: ['typescript']
        });
        const moduleExports = new Set();
        const moduleImports = new Map();
        (0, traverse_1.default)(ast, {
            ExportNamedDeclaration(path) {
                if (path.node.declaration) {
                    if (t.isVariableDeclaration(path.node.declaration)) {
                        path.node.declaration.declarations.forEach(decl => {
                            if (t.isIdentifier(decl.id)) {
                                moduleExports.add(decl.id.name);
                            }
                        });
                    }
                    else if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                        moduleExports.add(path.node.declaration.id.name);
                    }
                }
                else if (path.node.specifiers) {
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
                    }
                    else if (t.isImportDefaultSpecifier(spec)) {
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
    markUsedSymbols(entryPoint) {
        // Basic traversal from entry, mark imported symbols as used
        const visited = new Set();
        const queue = [entryPoint.replace(/\.ts$/, '')];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
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
exports.SourceAnalyzer = SourceAnalyzer;
//# sourceMappingURL=analyzer.js.map