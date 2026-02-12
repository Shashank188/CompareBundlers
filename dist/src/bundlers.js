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
exports.BundlerRunner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class BundlerRunner {
    constructor(demoPath, outputBase) {
        this.demoPath = demoPath;
        this.outputBase = outputBase;
    }
    async bundleWithWebpack(entry, outputDir) {
        const configPath = path.join(this.demoPath, 'webpack.config.js');
        this.createWebpackConfig(configPath, entry, outputDir);
        try {
            (0, child_process_1.execSync)(`npx webpack --config ${configPath} --mode production`, { stdio: 'inherit', cwd: this.demoPath });
            return path.join(outputDir, 'bundle.js');
        }
        catch (error) {
            console.error('Webpack bundling failed:', error);
            throw error;
        }
    }
    async bundleWithVite(entry, outputDir) {
        const configPath = path.join(this.demoPath, 'vite.config.ts');
        this.createViteConfig(configPath, entry, outputDir);
        try {
            (0, child_process_1.execSync)(`npx vite build --config ${configPath}`, { stdio: 'inherit', cwd: this.demoPath });
            return path.join(outputDir, 'assets', 'index-*.js'); // approximate
        }
        catch (error) {
            console.error('Vite bundling failed:', error);
            throw error;
        }
    }
    async bundleWithRolldown(entry, outputDir) {
        const configPath = path.join(this.demoPath, 'rolldown.config.js');
        this.createRolldownConfig(configPath, entry, outputDir);
        try {
            (0, child_process_1.execSync)(`npx rolldown --config ${configPath}`, { stdio: 'inherit', cwd: this.demoPath });
            return path.join(outputDir, 'bundle.js');
        }
        catch (error) {
            console.error('Rolldown bundling failed:', error);
            throw error;
        }
    }
    createWebpackConfig(configPath, entry, outputDir) {
        const config = `
const path = require('path');
module.exports = {
  entry: './${entry}',
  output: {
    path: path.resolve(__dirname, '${path.relative(this.demoPath, outputDir)}'),
    filename: 'bundle.js',
    clean: true,
  },
  mode: 'production',
  optimization: {
    usedExports: true,
    minimize: true,
  },
  module: {
    rules: [
      {
        test: /\\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
`;
        fs.writeFileSync(configPath, config);
    }
    createViteConfig(configPath, entry, outputDir) {
        const config = `
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '${path.relative(this.demoPath, outputDir)}',
    rollupOptions: {
      input: './${entry}',
      output: {
        entryFileNames: 'bundle.js',
      },
    },
    minify: true,
    sourcemap: true,
  },
  esbuild: {
    treeShaking: true,
  },
});
`;
        fs.writeFileSync(configPath, config);
    }
    createRolldownConfig(configPath, entry, outputDir) {
        const config = `
import { defineConfig } from 'rolldown';

export default defineConfig({
  input: './${entry}',
  output: {
    dir: '${path.relative(this.demoPath, outputDir)}',
    entryFileNames: 'bundle.js',
    format: 'esm',
    sourcemap: true,
  },
  treeshake: true,
});
`;
        fs.writeFileSync(configPath, config);
    }
}
exports.BundlerRunner = BundlerRunner;
//# sourceMappingURL=bundlers.js.map