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
- Retained-but-unused symbols
- Retention reasons (e.g., side effects)
- Summary with best performer

