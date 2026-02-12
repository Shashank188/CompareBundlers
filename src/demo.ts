import * as path from 'path';
import { TreeShakeSDK } from './index';
import * as fs from 'fs';

async function main() {
  // Path fix for built/demo context (enhancement compatible)
  const rootDir = path.resolve(__dirname, '..', '..'); // handles dist/src
  const demoProjectPath = path.resolve(rootDir, 'demo/src');
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
}

main().catch(console.error);
