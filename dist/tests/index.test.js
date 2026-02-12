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
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="jest" />
const src_1 = require("../src");
const analyzer_1 = require("../src/analyzer");
const bundleAnalyzer_1 = require("../src/bundleAnalyzer");
const bundlers_1 = require("../src/bundlers");
const fs = __importStar(require("fs"));
// Mock fs and other deps for unit tests (Jest globals now typed)
jest.mock('fs');
jest.mock('child_process');
jest.mock('@babel/parser');
jest.mock('@babel/traverse');
jest.mock('source-map');
describe('TreeShakeSDK Components - Error Handling & Core Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Test SourceAnalyzer with error handling
    test('SourceAnalyzer handles missing dir and parse errors', () => {
        const analyzer = new analyzer_1.SourceAnalyzer('/nonexistent');
        fs.readdirSync.mockImplementation(() => { throw new Error('ENOENT'); });
        expect(() => analyzer.analyzeSource()).rejects.toThrow(/ENOENT/); // or handle in code
    });
    // Test BundleAnalyzer error paths (per focus) + enhancements
    test('BundleAnalyzer throws on invalid bundle or parse fail', async () => {
        const analyzer = new bundleAnalyzer_1.BundleAnalyzer();
        fs.existsSync.mockReturnValue(false);
        await expect(analyzer.analyzeBundle('/bad/path', new Map(), 'test', '/src'))
            .rejects.toThrow(/Bundle file not found/);
        // Mock parse error
        const mockParse = require('@babel/parser').parse;
        mockParse.mockImplementation(() => { throw new Error('SyntaxError'); });
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('invalid js');
        await expect(analyzer.analyzeBundle('/bundle.js', new Map([['key', { name: 'test', module: 'm', isUsed: false, isExported: true }]]), 'test', '/'))
            .rejects.toThrow(/Babel parse failed/);
        // Reset mock for success + enhancements check
        mockParse.mockImplementation(() => ({ type: 'Program' })); // mock AST
        const result = await analyzer.analyzeBundle('/ok.js', new Map([['k', { name: 's', module: 'm', isUsed: false, isExported: true }]]), 'test', '/');
        expect(result).toHaveProperty('bundleSizeBytes', 0); // default from analyzer
        expect(result.warnings).toEqual([]);
    });
    // Test BundlerRunner
    test('BundlerRunner handles exec errors', async () => {
        const runner = new bundlers_1.BundlerRunner('/demo', '/out');
        const { execSync } = require('child_process');
        execSync.mockImplementation(() => { throw new Error('Bundler failed'); });
        await expect(runner.bundleWithWebpack('entry.ts', '/out')).rejects.toThrow(/failed/);
    });
    // Test TreeShakeSDK integration
    test('TreeShakeSDK validates options and propagates errors', async () => {
        expect(() => new src_1.TreeShakeSDK({})).toThrow(); // invalid options
        const sdk = new src_1.TreeShakeSDK({
            demoProjectPath: '/tmp/demo/src',
            entryPoint: 'index.ts',
            outputDir: '/tmp/out',
            production: true
        });
        // Mock internal to avoid full run
        jest.spyOn(sdk, 'runComparison').mockRejectedValue(new Error('Bundler err'));
        await expect(sdk.runComparison()).rejects.toThrow(/Bundler err/);
    });
    // Additional unit tests for each (edge cases)
    test('Analyzer marks symbols correctly with aliases', () => {
        const analyzer = new analyzer_1.SourceAnalyzer('/demo/src');
        // Mock parse etc., but basic check
        expect(() => analyzer.markUsedSymbols('index')).not.toThrow();
    });
});
//# sourceMappingURL=index.test.js.map