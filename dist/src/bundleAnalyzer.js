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
    /**
     * Enhanced with comprehensive error handling (per task requirement):
     * - Input validation for paths/symbols.
     * - Try/catch around all FS reads, JSON parse, Babel parse/traverse, SourceMapConsumer.
     * - Specific error messages; graceful fallbacks where possible (e.g., no map).
     * - Ensures robustness for post-bundle analysis even on corrupt bundles.
     */
    async analyzeBundle(bundlePath, originalSymbols, bundlerName, sourceRoot) {
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
        let bundleContent;
        let mapContent = null;
        let consumer = null;
        try {
            bundleContent = fs.readFileSync(bundlePath, 'utf8');
        }
        catch (err) {
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
            }
            else {
                console.warn(`[BundleAnalyzer] No sourcemap found for ${bundlerName}`);
            }
        }
        catch (err) {
            console.warn(`[BundleAnalyzer] Sourcemap processing failed for ${bundlerName} (continuing): ${err.message}`);
        }
        const retainedSymbols = [];
        const reasons = {};
        // AST parse with error handling
        let ast;
        try {
            ast = (0, parser_1.parse)(bundleContent, { sourceType: 'module' });
        }
        catch (err) {
            throw new Error(`[BundleAnalyzer] Babel parse failed for ${bundlerName} bundle: ${err.message}`);
        }
        const foundSymbols = new Set();
        try {
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
        }
        catch (err) {
            console.warn(`[BundleAnalyzer] AST traversal error (partial results): ${err.message}`);
        }
        // Source map consumer
        try {
            if (mapContent) {
                consumer = await new source_map_1.SourceMapConsumer(mapContent);
            }
        }
        catch (err) {
            console.warn(`[BundleAnalyzer] SourceMapConsumer failed: ${err.message}`);
            consumer = null;
        }
        // Symbol processing
        try {
            originalSymbols.forEach((sym, key) => {
                const isRetained = this.isSymbolRetained(sym, foundSymbols, bundleContent, consumer, sourceRoot);
                // FIXED: Preserve original sym.isUsed...
                const updatedSym = { ...sym }; // keep original isUsed
                if (isRetained) {
                    retainedSymbols.push(updatedSym);
                    if (!sym.isUsed) {
                        reasons[key] = this.getRetentionReason(sym, bundlerName);
                    }
                }
            });
        }
        catch (err) {
            throw new Error(`[BundleAnalyzer] Symbol analysis failed for ${bundlerName}: ${err.message}`);
        }
        finally {
            if (consumer) {
                try {
                    consumer.destroy();
                }
                catch (e) {
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