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

