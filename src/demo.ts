import * as path from 'path';
import { TreeShakeSDK } from './index';
import * as fs from 'fs';

async function main() {
  // Path fix + enhancement: Allow custom demoFolder via options (fallback 'demo/src')
  const rootDir = path.resolve(__dirname, '..', '..'); // handles dist/src
  const demoProjectPath = path.resolve(rootDir, 'demo/src'); // default fallback
  const outputDir = path.resolve(rootDir, 'demo/dist');
  
  // Ensure output dir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sdk = new TreeShakeSDK({
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

main().catch(console.error);
