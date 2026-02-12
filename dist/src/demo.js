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
    // Path fix for built/demo context (enhancement compatible)
    const rootDir = path.resolve(__dirname, '..', '..'); // handles dist/src
    const demoProjectPath = path.resolve(rootDir, 'demo/src');
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
}
main().catch(console.error);
//# sourceMappingURL=demo.js.map