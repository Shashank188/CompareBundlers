# Compare Bundlers Tree Shaking SDK

A TypeScript SDK that measures and compares tree shaking effectiveness across Webpack, Vite (Rollup), and Rolldown.

## Features
- Analyzes pre-bundle source to build symbol-level dependency graph
- Bundles demo project with equivalent production settings
- Post-bundle analysis using AST and source maps
- Generates structured comparison report
- Demonstrates unused imports, dead exports, barrel re-exports, side-effectful modules

## Usage
```bash
npm install
npm run build
npm run demo
```

This runs the demo and outputs `demo/dist/comparison-report.json` with results.

## Demo Project
Located in `demo/src/` showcasing:
- `utils.ts`: mixed used/unused exports
- `barrel.ts`: barrel re-exports
- `side-effects.ts`: side effects
- `index.ts`: selective imports

## Core Library
Import `TreeShakeSDK` from the package for custom usage.

## Report Output
Includes:
- Eliminated exports count per bundler
- Retained-but-unused symbols (now correctly computed; see fix below)
- Retention reasons (e.g., side effects)
- Summary with best performer

## Fix for retainedUnused (v1.0.1)
**Issue**: In `src/bundleAnalyzer.ts:59`, `isUsed` was incorrectly overridden with retention status, causing `retainedUnused` to always be 0 (line 73 comment noted this).

**Fix**: Preserve original `sym.isUsed` (from pre-bundle graph) in `updatedSym`; compute `retainedUnused` from original usage. This accurately identifies "retained-but-unused" exports (e.g., dead code kept due to side-effects or bundler heuristics). Updated comment and logic in `analyzeBundle()`.

Rerun `npm run demo` to see non-zero `retainedUnused` values.


## Fixes for Additional Issues (v1.0.2)
1. **Exclude config TS files (issue #1)**: Updated `getAllTsFiles()` in `src/analyzer.ts` to skip `*config*` files. Prevents bundler-generated configs from entering symbol graph/comparison (avoids noise in pre-bundle analysis).

2. **Remove unused exports (issue #2)**: Deleted `exports` key from `DependencyGraph` (in `types.ts` + `analyzer.ts`). Was populated in `parseFile` but never consumed.

3. **Symbol key/alias mismatch (issue #3)**: In `src/analyzer.ts`:
   - `parseFile`: ImportDeclaration now keys on source *exportName* (e.g., `usedBarrel` not alias `barrelUsed`).
   - `markUsedSymbols`: Direct lookup with exportName.
   - Resolves incorrect `isUsed` for aliases/barrels → proper `retainedUnused` (e.g., usedBarrel now correctly `isUsed: true` in reports).

Rerun `npm run demo` (totalExports may vary slightly due to exclusions; alias handling improved). All fixes documented inline + here. Version bumped.


## Report Enhancements (v1.0.3)
Added to BundleAnalysis/ComparisonReport:
1. **bundleSizeBytes**: Post-bundle output size (bytes) per bundler.
2. **buildTimeMs**: Measured bundling duration.
3. **warnings/errors**: Captured from bundler stdout/stderr (tracked in BundlerRunner).

**Summary aggregates**: totalBundleSizeBytes, avgBuildTimeMs, totalWarnings, totalErrors.

**Implementation**: Timing via `process.hrtime`, output capture in execSync (stdio pipe), metrics propagated in SDK + BundleAnalysis. Updated tests, demo report, types.

Rerun `npm run demo` for enriched JSON (e.g., sizes ~100-500B, times ~ms).

