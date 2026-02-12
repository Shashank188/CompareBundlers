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
exports.BundleAnalyzer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("@babel/parser");
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const source_map_1 = require("source-map");
class BundleAnalyzer {
    async analyzeBundle(bundlePath, originalSymbols, bundlerName, sourceRoot) {
        let bundleContent = fs.readFileSync(bundlePath, 'utf8');
        let mapContent = null;
        // Try to find sourcemap
        const mapMatch = bundleContent.match(/\/\/# sourceMappingURL=(.+\.map)/);
        if (mapMatch) {
            const mapPath = path.join(path.dirname(bundlePath), mapMatch[1]);
            if (fs.existsSync(mapPath)) {
                mapContent = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
            }
        }
        else {
            // Assume inline or no map, try to parse anyway
            console.warn('No sourcemap found for', bundlerName);
        }
        const retainedSymbols = [];
        const reasons = {};
        // Parse bundle for exported/used symbols - basic heuristic
        const ast = (0, parser_1.parse)(bundleContent, { sourceType: 'module' });
        const foundSymbols = new Set();
        (0, traverse_1.default)(ast, {
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
        let consumer = null;
        if (mapContent) {
            consumer = await new source_map_1.SourceMapConsumer(mapContent);
        }
        originalSymbols.forEach((sym, key) => {
            const isRetained = this.isSymbolRetained(sym, foundSymbols, bundleContent, consumer, sourceRoot);
            const updatedSym = { ...sym, isUsed: isRetained }; // override
            if (isRetained) {
                retainedSymbols.push(updatedSym);
                if (!sym.isUsed) {
                    reasons[key] = this.getRetentionReason(sym, bundlerName);
                }
            }
        });
        if (consumer)
            consumer.destroy();
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
    isSymbolRetained(sym, foundSymbols, bundleContent, consumer, sourceRoot) {
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
    getRetentionReason(sym, bundler) {
        if (sym.module.includes('side-effects')) {
            return 'Side effects in module prevent full elimination';
        }
        if (bundler === 'webpack') {
            return 'Webpack conservative tree shaking due to export analysis';
        }
        else if (bundler === 'vite') {
            return 'Rollup tree shaking with sideEffect flag consideration';
        }
        else {
            return 'Rolldown specific retention (new bundler behavior)';
        }
    }
}
exports.BundleAnalyzer = BundleAnalyzer;
//# sourceMappingURL=bundleAnalyzer.js.map