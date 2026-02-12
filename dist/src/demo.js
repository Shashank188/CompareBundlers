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
const path = __importStar(require("path"));
const index_1 = require("./index");
const fs = __importStar(require("fs"));
async function main() {
    // Path fix + enhancement: Allow custom demoFolder via options (fallback 'demo/src')
    const rootDir = path.resolve(__dirname, '..', '..'); // handles dist/src
    const demoProjectPath = path.resolve(rootDir, 'demo/src'); // default fallback
    const outputDir = path.resolve(rootDir, 'demo/dist');
    // Ensure output dir
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const sdk = new index_1.TreeShakeSDK({
        demoProjectPath,
        entryPoint: 'index.ts',
        outputDir,
        production: true
    });
    console.log('Starting tree shaking comparison SDK demo...');
    const report = await sdk.runComparison();
    console.log('Comparison Report:');
    console.dir(report, { depth: null });
    // Save to JSON
    const reportPath = path.join(outputDir, 'comparison-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);
    // Enhancement #3: Generate HTML report too (table of analyses/summary)
    const htmlPath = path.join(outputDir, 'comparison-report.html');
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>Tree Shaking Comparison Report</title>
<style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; } th { background: #f2f2f2; }</style>
</head>
<body>
<h1>Tree Shaking Comparison: ${report.projectName}</h1>
<table>
<tr><th>Bundler</th><th>Eliminated</th><th>Retained Unused</th><th>Size (B)</th><th>Time (ms)</th><th>Warnings</th><th>Errors</th></tr>
${report.analyses.map(a => `<tr><td>${a.bundler}</td><td>${a.eliminatedSymbols}</td><td>${a.retainedUnused}</td><td>${a.bundleSizeBytes}</td><td>${a.buildTimeMs.toFixed(0)}</td><td>${a.warnings.length}</td><td>${a.errors.length}</td></tr>`).join('')}
</table>
<p>Summary: Best=${report.summary.bestTreeShaker}, Total Elim=${report.summary.totalEliminated}, Avg Time=${report.summary.avgBuildTimeMs.toFixed(0)}ms</p>
</body></html>`;
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`HTML report saved to ${htmlPath}`);
}
main().catch(err => {
    console.error('Demo failed:', err);
    process.exit(1); // ensure exit 1 on error
});
//# sourceMappingURL=demo.js.map