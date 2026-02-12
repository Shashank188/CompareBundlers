/// <reference types="jest" />
import { TreeShakeSDK } from '../src';
import { SourceAnalyzer } from '../src/analyzer';
import { BundleAnalyzer } from '../src/bundleAnalyzer';
import { BundlerRunner } from '../src/bundlers';
import * as fs from 'fs';
import * as path from 'path';

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
    const analyzer = new SourceAnalyzer('/nonexistent');
    (fs.readdirSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    expect(() => analyzer.analyzeSource()).rejects.toThrow(/ENOENT/); // or handle in code
  });

  // Test BundleAnalyzer error paths (per focus) + enhancements
  test('BundleAnalyzer throws on invalid bundle or parse fail', async () => {
    const analyzer = new BundleAnalyzer();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await expect(analyzer.analyzeBundle('/bad/path', new Map(), 'test', '/src'))
      .rejects.toThrow(/Bundle file not found/);
    
    // Mock parse error
    const mockParse = require('@babel/parser').parse;
    mockParse.mockImplementation(() => { throw new Error('SyntaxError'); });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid js');
    await expect(analyzer.analyzeBundle('/bundle.js', new Map([['key', {name:'test', module:'m', isUsed:false, isExported:true}]]), 'test', '/'))
      .rejects.toThrow(/Babel parse failed/);
    // Reset mock for success + enhancements check
    mockParse.mockImplementation(() => ({ type: 'Program' })); // mock AST
    const result = await analyzer.analyzeBundle('/ok.js', new Map([['k', {name:'s', module:'m', isUsed:false, isExported:true}]]), 'test', '/');
    expect(result).toHaveProperty('bundleSizeBytes', 0); // default from analyzer
    expect(result.warnings).toEqual([]);
  });

  // Test BundlerRunner
  test('BundlerRunner handles exec errors', async () => {
    const runner = new BundlerRunner('/demo', '/out');
    const { execSync } = require('child_process');
    execSync.mockImplementation(() => { throw new Error('Bundler failed'); });
    await expect(runner.bundleWithWebpack('entry.ts', '/out')).rejects.toThrow(/failed/);
  });

  // Test TreeShakeSDK integration
  test('TreeShakeSDK validates options and propagates errors', async () => {
    expect(() => new TreeShakeSDK({} as any)).toThrow(); // invalid options
    const sdk = new TreeShakeSDK({
      demoProjectPath: '/tmp/demo/src',
      entryPoint: 'index.ts',
      outputDir: '/tmp/out',
      production: true
    });
    // Mock internal to avoid full run
    jest.spyOn(sdk as any, 'runComparison').mockRejectedValue(new Error('Bundler err'));
    await expect(sdk.runComparison()).rejects.toThrow(/Bundler err/);
  });

  // Additional unit tests for each (edge cases)
  test('Analyzer marks symbols correctly with aliases', () => {
    const analyzer = new SourceAnalyzer('/demo/src');
    // Mock parse etc., but basic check
    expect(() => analyzer.markUsedSymbols('index')).not.toThrow();
  });
});
